import {useCallback} from 'react';
import {Text, TouchableOpacity} from 'react-native';
import {
  getPaymentGatewayLabel,
  PAYMENT_GATEWAY_INFINITE_PAY,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {
  getPaymentOptionLabel,
  isCashPaymentOption,
} from '@controleonline/ui-common/src/react/utils/paymentOptions';
import {normalizeGatewayPaymentError} from '@controleonline/ui-common/src/react/services/paymentGatewayExecution';
import {resolvePeopleId} from '@controleonline/ui-orders/src/react/utils/checkoutLoyaltyCpf';
import {
  LOYALTY_GIFT_ORDER_PRODUCT_COMMENT,
  PAYMENT_CHANNEL_REMOTE,
} from './checkoutStatusHelpers';
import styles from './Checkout.styles';

export default function useCheckoutPayHandlers(d) {
  const {
    createPaidInvoice, runLocalPayment, dispatchRemotePayment,
    order, checkoutPaymentOrder, resolveCheckoutOrderForPayment,
    ordersActions, orderProductsActions, loyaltyGiftProductId,
    rewardableLoyaltyCard, selectedLoyaltyPerson, invoiceActions,
    navigation, buildOrderDetailsNavigationParams, setSubmittingPayment,
    setInstallmentsModalVisible, setAmountEntryModalMode,
    activeSelectedPaymentOption, remainingAmount, effectiveRemainingAmount,
    isLocalCieloPdv, localGateway, selectedRemoteDeviceId,
    materializedCheckoutOrder, setMaterializedCheckoutOrder,
    cashReceivedValue, isCashAmountEntry,
    selectedPayment, selectedPaymentChannel, selectedRemoteDevice,
    isRemotePaymentSelected, resolveOrderRemainingAmount,
    setCashReceivedValue, setPaymentExplanationVisible,
    handleConfirmCashAmountEntry, setRemoteDeviceModalVisible,
    submittingPayment, orderProducts, setSelectedRemoteDeviceId,
  } = d;

  const handleEdit = orderItem => {
    ordersActions.syncOrder?.(orderItem);
    navigation.navigate(
      'OrderDetails',
      buildOrderDetailsNavigationParams(orderItem),
    );
  };

  const ensureLoyaltyRewardOrderReady = useCallback(
    async currentOrder => {
      const targetOrder = currentOrder || checkoutPaymentOrder || order;
      const targetOrderId = resolvePeopleId(
        targetOrder?.id || targetOrder?.['@id'],
      );

      if (!targetOrderId) {
        return targetOrder;
      }

      const targetOrderProducts = Array.isArray(targetOrder?.orderProducts)
        ? targetOrder.orderProducts
        : Array.isArray(orderProducts)
          ? orderProducts
          : [];
      const hasLoyaltyGiftProduct = targetOrderProducts.some(
        item =>
          String(item?.comment || '').trim() ===
          LOYALTY_GIFT_ORDER_PRODUCT_COMMENT,
      );

      if (hasLoyaltyGiftProduct) {
        return targetOrder;
      }

      if (!loyaltyGiftProductId || typeof ordersActions.addProducts !== 'function') {
        invoiceActions.setError(
          'Nao foi possivel resolver o produto de brinde da fidelidade.',
        );
        return null;
      }

      try {
        const updatedOrder = await ordersActions.addProducts(targetOrderId, [
          {
            product: String(loyaltyGiftProductId),
            quantity: 1,
            comment: LOYALTY_GIFT_ORDER_PRODUCT_COMMENT,
          },
        ]);

        if (updatedOrder) {
          setMaterializedCheckoutOrder(updatedOrder);
          ordersActions.syncOrder?.(updatedOrder);
          return updatedOrder;
        }
      } catch (error) {
        invoiceActions.setError(
          normalizeGatewayPaymentError(
            error,
            'Nao foi possivel registrar o brinde da fidelidade antes do pagamento.',
          ),
        );
        return null;
      }

      return targetOrder;
    },
    [
      checkoutPaymentOrder,
      invoiceActions,
      loyaltyGiftProductId,
      order,
      orderProducts,
      ordersActions,
    ],
  );

  const continueSelectedPayment = useCallback(async currentOrder => {
    if (!selectedPayment?.wallet || !selectedPayment?.paymentType) {
      invoiceActions.setError(
        global.t?.t('orders', 'message', 'selectPaymentMethod'),
      );
      return;
    }

    if (selectedPaymentChannel === PAYMENT_CHANNEL_REMOTE && !selectedRemoteDevice?.deviceId) {
      invoiceActions.setError(
        'Configure um device de pagamento remoto para continuar.',
      );
      return;
    }

    if (selectedPayment?.__loyaltyReward) {
      const rewardReadyOrder = await ensureLoyaltyRewardOrderReady(currentOrder);
      if (!rewardReadyOrder) {
        return;
      }

      await runLocalPayment({
        currentOrder: rewardReadyOrder,
        payment: selectedPayment,
        total: resolveOrderRemainingAmount(rewardReadyOrder),
      });
      return;
    }

    if (isCashPaymentOption(selectedPayment) && !isRemotePaymentSelected) {
      setCashReceivedValue('');
      setAmountEntryModalMode('cash-local');
      return;
    }

    if (
      isRemotePaymentSelected &&
      selectedRemoteDevice?.gateway === PAYMENT_GATEWAY_INFINITE_PAY &&
      selectedPayment.paymentCode &&
      selectedPayment.installments === 'split'
    ) {
      setInstallmentsModalVisible(true);
      return;
    }

    if (isRemotePaymentSelected) {
      await dispatchRemotePayment({
        payment: selectedPayment,
        total: resolveOrderRemainingAmount(currentOrder),
      });
      return;
    }

    if (
      !isRemotePaymentSelected &&
      localGateway === PAYMENT_GATEWAY_INFINITE_PAY &&
      selectedPayment.paymentCode &&
      selectedPayment.installments === 'split'
    ) {
      setInstallmentsModalVisible(true);
      return;
    }

    setAmountEntryModalMode('payment');
  }, [
    dispatchRemotePayment,
    ensureLoyaltyRewardOrderReady,
    invoiceActions,
    isRemotePaymentSelected,
    localGateway,
    resolveOrderRemainingAmount,
    runLocalPayment,
    selectedPayment,
    selectedPaymentChannel,
    selectedRemoteDevice?.deviceId,
  ]);

  const handlePay = useCallback(async materializedOrder => {
    if (!selectedPayment?.wallet || !selectedPayment?.paymentType) {
      invoiceActions.setError(
        global.t?.t('orders', 'message', 'selectPaymentMethod'),
      );
      return;
    }

    const resolvedOrder = await resolveCheckoutOrderForPayment(
      materializedOrder || checkoutPaymentOrder,
    );

    if (materializedOrder) {
      setMaterializedCheckoutOrder(materializedOrder);
      ordersActions.syncOrder?.(materializedOrder);
    }

    if (isRemotePaymentSelected) {
      setPaymentExplanationVisible(true);
      return;
    }

    await continueSelectedPayment(resolvedOrder);
  }, [
    checkoutPaymentOrder,
    continueSelectedPayment,
    invoiceActions,
    isRemotePaymentSelected,
    ordersActions,
    resolveCheckoutOrderForPayment,
    selectedPayment,
  ]);

  const handleConfirmAmountEntry = useCallback(
    async inputValue => {
      if (isCashAmountEntry) {
        await handleConfirmCashAmountEntry(inputValue);
        return;
      }

      setAmountEntryModalMode('');

      await runLocalPayment({
        currentOrder: checkoutPaymentOrder,
        payment: selectedPayment,
        total: inputValue,
      });
    },
    [
      checkoutPaymentOrder,
      handleConfirmCashAmountEntry,
      isCashAmountEntry,
      runLocalPayment,
      selectedPayment,
    ],
  );

  const handleInstallmentsSelect = useCallback(
    async installments => {
      setInstallmentsModalVisible(false);

      if (isRemotePaymentSelected) {
        await dispatchRemotePayment({
          payment: selectedPayment,
          total: effectiveRemainingAmount,
          installments,
        });
        return;
      }

      await runLocalPayment({
        currentOrder: checkoutPaymentOrder,
        payment: selectedPayment,
        total: effectiveRemainingAmount,
        installments,
      });
    },
    [
      checkoutPaymentOrder,
      dispatchRemotePayment,
      effectiveRemainingAmount,
      isRemotePaymentSelected,
      runLocalPayment,
      selectedPayment,
    ],
  );

  const renderRemoteDeviceOption = ({item}) => {
    const active = item.deviceId === selectedRemoteDevice?.deviceId;

    return (
      <TouchableOpacity
        style={[styles.modalItem, active && styles.modalItemActive]}
        disabled={submittingPayment}
        onPress={() => {
          setSelectedRemoteDeviceId(item.deviceId);
          setRemoteDeviceModalVisible(false);
        }}>
        <Text style={styles.modalItemTitle}>{item.alias}</Text>
        <Text style={styles.modalItemSubtitle}>
          {getPaymentGatewayLabel(item.gateway)} • {item.deviceId}
        </Text>
      </TouchableOpacity>
    );
  };
  return {
    handleEdit,
    ensureLoyaltyRewardOrderReady,
    continueSelectedPayment,
    handlePay,
    handleConfirmAmountEntry,
    handleInstallmentsSelect,
    renderRemoteDeviceOption,
  };
}
