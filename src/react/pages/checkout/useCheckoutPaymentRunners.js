import {useCallback} from 'react';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {
  createInvoiceForGatewayFreePayment,
  normalizeMoneyInputText,
} from '@controleonline/ui-common/src/react/utils/cashPayment';
import {
  clearCreateInvoiceOnlyMode,
  isCreateInvoiceOnlyMode,
} from '@controleonline/ui-orders/src/react/utils/createInvoiceSession';
import {tryCreateInvoiceOnlyPayment} from '@controleonline/ui-orders/src/react/utils/createInvoiceCheckout';
import {
  normalizeGatewayPaymentError,
  runConfiguredGatewayPayment,
} from '@controleonline/ui-common/src/react/services/paymentGatewayExecution';
import {
  buildRemotePaymentRequestKey,
  REMOTE_PAYMENT_MESSAGE_STORE,
  REMOTE_PAYMENT_REQUEST_ACTION,
} from '@controleonline/ui-common/src/react/utils/remotePayment';
import {resolvePosPaidInvoiceStatusIri} from './checkoutStatusHelpers';

export default function useCheckoutPaymentRunners(d) {
  const {
    defaultCompany, invoiceActions, order, currentCompany, routeOrderId,
    resolveNextPayableAfterPayment, syncLoyaltySelectionToOrder,
    closeRewardableLoyaltyParentOrder, resetCompletedOrderState, resetToOrderHistory,
    isSingleItemMode, device, appendInvoiceToStore, appendOrderInvoiceToStore,
    ordersActions, navigation, buildOrderDetailsNavigationParams, isCounterMode,
    isSelfServiceMode, resetToCounterDestination, resetToSelfServiceCatalog,
    setSubmittingPayment, setCashReceivedValue, selectedPaymentOption,
    activeSelectedPaymentOption, remainingAmount, localGateway, selectedRemoteDeviceId,
    setPendingRemotePaymentRequest, websocketActions, storagedDevice, setAmountEntryModalMode,
    cashReceivedValue, effectiveRemainingAmount, checkoutPaymentOrder, selectedRemoteDevice,
  } = d;

  const createPaidInvoice = useCallback(
    async (payment, total, currentOrder = null) => {
      const paidStatusIri = await resolvePosPaidInvoiceStatusIri(
        defaultCompany?.configs['pos-paid-status'],
      );

      if (!paidStatusIri) {
        invoiceActions.setError(
          'Nao foi possivel resolver o status pago da invoice do PDV.',
        );
        return null;
      }

      try {
        const targetOrder = currentOrder || order;
        const payload = {
          dueDate: Formatter.getCurrentDate(),
          status: paidStatusIri,
          destinationWallet: payment?.wallet?.['@id'],
          paymentType: payment?.paymentType?.['@id'],
          price: total,
          receiver: '/people/' + currentCompany.id,
          order: targetOrder?.['@id'] || (routeOrderId ? `/orders/${routeOrderId}` : undefined),
        };

        const createdInvoice = await invoiceActions.save(payload);

        if (!createdInvoice) {
          return null;
        }

        clearCreateInvoiceFlagIfActive();

        const paidAmount = Number(createdInvoice.price || 0);
        const nextPayable = resolveNextPayableAfterPayment(paidAmount, targetOrder);
        const syncedOrder = await syncLoyaltySelectionToOrder(targetOrder);
        const resolvedOrder = syncedOrder || targetOrder;

        if (payment?.__loyaltyReward) {
          const loyaltyParentClosed = await closeRewardableLoyaltyParentOrder();
          if (!loyaltyParentClosed) {
            return createdInvoice;
          }

          resetCompletedOrderState();
          resetToOrderHistory();
          return createdInvoice;
        }

        if (isSingleItemMode && nextPayable >= 0) {
          resetCompletedOrderState();
          resetToOrderHistory();
          return createdInvoice;
        }

        if (device?.configs?.['pos-type'] == 'simple') {
          if (nextPayable < 0) {
            appendInvoiceToStore(createdInvoice);
            appendOrderInvoiceToStore(createdInvoice, paidAmount);
            ordersActions.setPayable(nextPayable);
            ordersActions.syncOrder?.(resolvedOrder);
            navigation.navigate(
              'OrderDetails',
              buildOrderDetailsNavigationParams(resolvedOrder),
            );
          } else {
            resetCompletedOrderState();
            if (isCounterMode) {
              resetToCounterDestination();
            } else if (isSelfServiceMode) {
              resetToSelfServiceCatalog();
            } else {
              navigation.navigate('OrderHistoryPage');
            }
          }
        } else {
          appendInvoiceToStore(createdInvoice);
          appendOrderInvoiceToStore(createdInvoice, paidAmount);
          ordersActions.setPayable(nextPayable < 0 ? nextPayable : 0);
          if ((isSelfServiceMode || isCounterMode) && nextPayable >= 0) {
            resetCompletedOrderState();
            if (isCounterMode) {
              resetToCounterDestination();
            } else {
              resetToSelfServiceCatalog();
            }
          } else {
            ordersActions.syncOrder?.(resolvedOrder);
            navigation.navigate(
              'OrderDetails',
              buildOrderDetailsNavigationParams(resolvedOrder),
            );
          }
        }

        return createdInvoice;
      } catch (error) {
        invoiceActions.setError(
          normalizeGatewayPaymentError(
            error,
            'Nao foi possivel registrar o pagamento do pedido.',
          ),
        );
        return null;
      }
    },
    [
      appendInvoiceToStore,
      appendOrderInvoiceToStore,
      buildOrderDetailsNavigationParams,
      currentCompany?.id,
      defaultCompany?.configs,
      device?.configs,
      invoiceActions,
      isCounterMode,
      isSelfServiceMode,
      isSingleItemMode,
      navigation,
      order,
      ordersActions,
      routeOrderId,
      resetToCounterDestination,
      resetToOrderHistory,
      resetCompletedOrderState,
      resetToSelfServiceCatalog,
      closeRewardableLoyaltyParentOrder,
      resolveNextPayableAfterPayment,
      syncLoyaltySelectionToOrder,
    ],
  );

  const handleCashReceivedInputChange = useCallback(text => {
    setCashReceivedValue(normalizeMoneyInputText(text));
  }, []);

  const runLocalPayment = useCallback(
    async ({payment, total, installments = null, currentOrder = null}) => {
      if (!payment?.wallet || !payment?.paymentType) {
        invoiceActions.setError(
          global.t?.t('orders', 'message', 'selectPaymentMethod'),
        );
        return;
      }

      setSubmittingPayment(true);
      try {
        // From Order History "Criar fatura": reuse Checkout UI but never call Cielo/gateway.
        if (isCreateInvoiceOnlyMode()) {
          await createPaidInvoice(payment, total, currentOrder);
          clearCreateInvoiceOnlyMode();
          return;
        }
        if (
          await createInvoiceForGatewayFreePayment({
            payment,
            total,
            createInvoice: gatewayFreePayment =>
              createPaidInvoice(gatewayFreePayment, total, currentOrder),
          })
        ) {
          return;
        }
        const {paidAmount} = await runConfiguredGatewayPayment({
          gateway: localGateway,
          installments,
          order,
          orderProducts,
          payment,
          total,
        });

        await createPaidInvoice(payment, paidAmount, currentOrder);
      } catch (error) {
        invoiceActions.setError(
          normalizeGatewayPaymentError(
            error,
            'Nao foi possivel processar o pagamento local.',
          ),
        );
      } finally {
        setSubmittingPayment(false);
      }
    },
    [
      createPaidInvoice,
      invoiceActions,
      localGateway,
      order,
      order?.['@id'],
      orderProducts,
    ],
  );

  const handleConfirmCashAmountEntry = useCallback(async receivedAmount => {
    const resolvedCashPaymentDetails = resolveCashPaymentDetails({
      allowPartial: cashPaymentContext === PAYMENT_CHANNEL_LOCAL,
      receivedAmount:
        receivedAmount ?? parseMoneyInputValue(cashReceivedValue),
      totalAmount: effectiveRemainingAmount,
    });

    if (resolvedCashPaymentDetails.receivedAmount <= 0.009) {
      invoiceActions.setError('Informe o valor recebido para continuar.');
      return;
    }

    setAmountEntryModalMode('');
    await runLocalPayment({
      currentOrder: checkoutPaymentOrder,
      payment: selectedPayment,
      total: resolvedCashPaymentDetails.appliedAmount,
    });
  }, [
    cashReceivedValue,
    cashPaymentContext,
    checkoutPaymentOrder,
    effectiveRemainingAmount,
    invoiceActions,
    runLocalPayment,
    selectedPayment,
  ]);

  const dispatchRemotePayment = useCallback(
    async ({payment, total, installments = null}) => {
      if (!payment?.wallet || !payment?.paymentType) {
        invoiceActions.setError(
          global.t?.t('orders', 'message', 'selectPaymentMethod'),
        );
        return;
      }

      // Create-invoice-only: never send remote/Cielo payment; persist invoice locally.
      if (isCreateInvoiceOnlyMode()) {
        setSubmittingPayment(true);
        try {
          await createPaidInvoice(payment, total, order);
          clearCreateInvoiceOnlyMode();
        } catch (error) {
          invoiceActions.setError(
            normalizeGatewayPaymentError(
              error,
              'Nao foi possivel registrar a fatura.',
            ),
          );
        } finally {
          setSubmittingPayment(false);
        }
        return;
      }

      if (!selectedRemoteDevice?.deviceId || !order?.id) {
        invoiceActions.setError(
          'Configure um device de pagamento remoto para continuar.',
        );
        return;
      }

      const requestKey = buildRemotePaymentRequestKey({
        orderId: order?.id,
        payment,
        targetDeviceId: selectedRemoteDevice.deviceId,
      });

      setSubmittingPayment(true);
      setPendingRemotePaymentRequest({
        paymentLabel: getPaymentOptionLabel(payment),
        requestKey,
        targetDeviceId: selectedRemoteDevice.deviceId,
        targetDeviceLabel: selectedRemoteDevice.alias,
      });
      try {
        invoiceActions.setError('');
        await websocketActions.send({
          destination: selectedRemoteDevice.deviceId,
          store: REMOTE_PAYMENT_MESSAGE_STORE,
          action: REMOTE_PAYMENT_REQUEST_ACTION,
          requestKey,
          order: order.id,
          total,
          wallet_payment_type: {
            ...payment,
            ...(installments ? {installments} : {}),
          },
          'master-device': storagedDevice?.id,
        });
      } catch (error) {
        setPendingRemotePaymentRequest(null);
        setSubmittingPayment(false);
        invoiceActions.setError(
          normalizeGatewayPaymentError(
            error,
            'Nao foi possivel enviar o pagamento remoto.',
          ),
        );
      }
    },
    [
      invoiceActions,
      order?.id,
      selectedRemoteDevice,
      storagedDevice?.id,
      websocketActions,
    ],
  );

  return {
    createPaidInvoice,
    handleCashReceivedInputChange,
    runLocalPayment,
    handleConfirmCashAmountEntry,
    dispatchRemotePayment,
  };
}
