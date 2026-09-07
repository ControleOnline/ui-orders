import {useCallback} from 'react';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {
  createInvoiceForGatewayFreePayment,
  normalizeMoneyInputText,
  parseMoneyInputValue,
  resolveCashPaymentDetails,
} from '@controleonline/ui-common/src/react/utils/cashPayment';
import {
  clearCreateInvoiceOnlyMode,
  isCreateInvoiceOnlyMode,
} from '@controleonline/ui-orders/src/react/utils/createInvoiceSession';
import {
  normalizeGatewayPaymentError,
  runConfiguredGatewayPayment,
} from '@controleonline/ui-common/src/react/services/paymentGatewayExecution';
import {
  buildRemotePaymentRequestKey,
  REMOTE_PAYMENT_MESSAGE_STORE,
  REMOTE_PAYMENT_REQUEST_ACTION,
} from '@controleonline/ui-common/src/react/utils/remotePayment';
import {getPaymentOptionLabel as resolvePaymentOptionLabel} from '@controleonline/ui-common/src/react/utils/paymentOptions';
import {
  PAYMENT_CHANNEL_LOCAL,
  resolvePosPaidInvoiceStatusIri,
} from './checkoutStatusHelpers';
import {
  CHECKOUT_COMPLETION_DESTINATION,
  resolveCheckoutCompletionPolicy,
} from './checkoutCompletionPolicy';

export default function useCheckoutPaymentRunners({
  appendInvoiceToStore,
  appendOrderInvoiceToStore,
  buildOrderDetailsNavigationParams,
  cashPaymentContext,
  cashReceivedValue,
  checkoutPaymentOrder,
  closeRewardableLoyaltyParentOrder,
  currentCompany,
  defaultCompany,
  device,
  effectiveRemainingAmount,
  invoiceActions,
  isCounterMode,
  isSelfServiceMode,
  isSingleItemMode,
  localGateway,
  navigation,
  order,
  orderProducts,
  ordersActions,
  resetCompletedOrderState,
  resetToCounterDestination,
  resetToOrderHistory,
  resetToSelfServiceCatalog,
  resolveNextPayableAfterPayment,
  routeOrderId,
  selectedPayment,
  selectedRemoteDevice,
  setAmountEntryModalMode,
  setCashReceivedValue,
  setPendingRemotePaymentRequest,
  setSubmittingPayment,
  storagedDevice,
  syncLoyaltySelectionToOrder,
  websocketActions,
}) {
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
        const createdInvoice = await invoiceActions.save({
          dueDate: Formatter.getCurrentDate(),
          status: paidStatusIri,
          destinationWallet: payment?.wallet?.['@id'],
          paymentType: payment?.paymentType?.['@id'],
          price: total,
          receiver: '/people/' + currentCompany.id,
          order:
            targetOrder?.['@id'] ||
            (routeOrderId ? `/orders/${routeOrderId}` : undefined),
        });

        if (!createdInvoice) return null;
        if (isCreateInvoiceOnlyMode()) clearCreateInvoiceOnlyMode();

        const paidAmount = Number(createdInvoice.price || 0);
        const nextPayable = resolveNextPayableAfterPayment(paidAmount, targetOrder);
        const syncedOrder = await syncLoyaltySelectionToOrder(targetOrder);
        const resolvedOrder = syncedOrder || targetOrder;

        if (payment?.__loyaltyReward) {
          const loyaltyParentClosed = await closeRewardableLoyaltyParentOrder();
          if (!loyaltyParentClosed) return createdInvoice;
          resetCompletedOrderState();
          resetToOrderHistory();
          return createdInvoice;
        }

        const completion = resolveCheckoutCompletionPolicy({
          isCounterMode,
          isSelfServiceMode,
          isSimplePos: device?.configs?.['pos-type'] == 'simple',
          isSingleItemMode,
          remainingAmount: nextPayable,
        });

        if (completion.destination === CHECKOUT_COMPLETION_DESTINATION.ORDER_DETAILS) {
          appendInvoiceToStore(createdInvoice);
          appendOrderInvoiceToStore(createdInvoice, paidAmount);
          ordersActions.setPayable(nextPayable < 0 ? nextPayable : 0);
          ordersActions.syncOrder?.(resolvedOrder);
          navigation.navigate(
            'OrderDetails',
            buildOrderDetailsNavigationParams(resolvedOrder),
          );
          return createdInvoice;
        }

        if (completion.resetCompletedOrder) resetCompletedOrderState();

        if (completion.destination === CHECKOUT_COMPLETION_DESTINATION.COUNTER) {
          resetToCounterDestination();
        } else if (
          completion.destination ===
          CHECKOUT_COMPLETION_DESTINATION.SELF_SERVICE_CATALOG
        ) {
          resetToSelfServiceCatalog();
        } else {
          resetToOrderHistory();
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
      closeRewardableLoyaltyParentOrder,
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
      resetCompletedOrderState,
      resetToCounterDestination,
      resetToOrderHistory,
      resetToSelfServiceCatalog,
      resolveNextPayableAfterPayment,
      routeOrderId,
      syncLoyaltySelectionToOrder,
    ],
  );

  const handleCashReceivedInputChange = useCallback(text => {
    setCashReceivedValue(normalizeMoneyInputText(text));
  }, [setCashReceivedValue]);

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
        ) return;

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
    [createPaidInvoice, invoiceActions, localGateway, order, orderProducts, setSubmittingPayment],
  );

  const handleConfirmCashAmountEntry = useCallback(async receivedAmount => {
    const details = resolveCashPaymentDetails({
      allowPartial: cashPaymentContext === PAYMENT_CHANNEL_LOCAL,
      receivedAmount: receivedAmount ?? parseMoneyInputValue(cashReceivedValue),
      totalAmount: effectiveRemainingAmount,
    });

    if (details.receivedAmount <= 0.009) {
      invoiceActions.setError('Informe o valor recebido para continuar.');
      return;
    }

    setAmountEntryModalMode('');
    await runLocalPayment({
      currentOrder: checkoutPaymentOrder,
      payment: selectedPayment,
      total: details.appliedAmount,
    });
  }, [cashPaymentContext, cashReceivedValue, checkoutPaymentOrder, effectiveRemainingAmount, invoiceActions, runLocalPayment, selectedPayment, setAmountEntryModalMode]);

  const dispatchRemotePayment = useCallback(
    async ({payment, total, installments = null}) => {
      if (!payment?.wallet || !payment?.paymentType) {
        invoiceActions.setError(global.t?.t('orders', 'message', 'selectPaymentMethod'));
        return;
      }

      if (isCreateInvoiceOnlyMode()) {
        setSubmittingPayment(true);
        try {
          await createPaidInvoice(payment, total, order);
          clearCreateInvoiceOnlyMode();
        } catch (error) {
          invoiceActions.setError(
            normalizeGatewayPaymentError(error, 'Nao foi possivel registrar a fatura.'),
          );
        } finally {
          setSubmittingPayment(false);
        }
        return;
      }

      if (!selectedRemoteDevice?.deviceId || !order?.id) {
        invoiceActions.setError('Configure um device de pagamento remoto para continuar.');
        return;
      }

      const requestKey = buildRemotePaymentRequestKey({
        orderId: order?.id,
        payment,
        targetDeviceId: selectedRemoteDevice.deviceId,
      });

      setSubmittingPayment(true);
      setPendingRemotePaymentRequest({
        paymentLabel: resolvePaymentOptionLabel(payment),
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
          wallet_payment_type: {...payment, ...(installments ? {installments} : {})},
          'master-device': storagedDevice?.id,
        });
      } catch (error) {
        setPendingRemotePaymentRequest(null);
        setSubmittingPayment(false);
        invoiceActions.setError(
          normalizeGatewayPaymentError(error, 'Nao foi possivel enviar o pagamento remoto.'),
        );
      }
    },
    [createPaidInvoice, invoiceActions, order, selectedRemoteDevice, setPendingRemotePaymentRequest, setSubmittingPayment, storagedDevice?.id, websocketActions],
  );

  return {
    createPaidInvoice,
    dispatchRemotePayment,
    handleCashReceivedInputChange,
    handleConfirmCashAmountEntry,
    runLocalPayment,
  };
}
