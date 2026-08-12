import {useCallback, useEffect, useMemo} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';
import {normalizeGatewayPaymentError} from '@controleonline/ui-common/src/react/services/paymentGatewayExecution';
import {
  appendSyntheticOrderInvoice,
  resolveNextOperationalPayable,
} from '@controleonline/ui-orders/src/react/utils/checkoutInvoices';
import {resolvePeopleId} from '@controleonline/ui-orders/src/react/utils/checkoutLoyaltyCpf';

export default function useCheckoutOrderLifecycle({
  clearStoredDraftOrderId,
  ensureActiveOrder,
  invoiceActions,
  invoiceMessage,
  invoiceMessages,
  invoices,
  isAutoPrintEnabled,
  materializedCheckoutOrder,
  order,
  orderInvoicesActions,
  orderProducts,
  ordersActions,
  ordersGetters,
  payable,
  printActions,
  requiresLoyaltyCpfStep,
  rewardableLoyaltyCard,
  routeOrderId,
  selectedLoyaltyPerson,
  setMaterializedCheckoutOrder,
  storedOrderInvoices,
  loyaltyCpfStepSkipped,
}) {
  const remainingAmount = useMemo(() => {
    const payableValue = Math.abs(Number(payable || 0));
    return payableValue > 0 ? payableValue : Number(order?.price || 0);
  }, [order?.price, payable]);

  const resolveOrderRemainingAmount = useCallback(
    currentOrder => {
      const currentPayable = Math.abs(Number(currentOrder?.payable || 0));
      if (currentPayable > 0) return currentPayable;

      const currentPrice = Number(currentOrder?.price || 0);
      if (currentPrice > 0) return currentPrice;

      const currentProductsTotal = (
        Array.isArray(currentOrder?.orderProducts) ? currentOrder.orderProducts : []
      ).reduce(
        (sum, item) =>
          sum +
          Number(item?.total ?? Number(item?.price || 0) * Number(item?.quantity || 0)),
        0,
      );
      if (currentProductsTotal > 0) return currentProductsTotal;

      const orderProductsTotal = (Array.isArray(orderProducts) ? orderProducts : [])
        .reduce(
          (sum, item) =>
            sum +
            Number(item?.total ?? Number(item?.price || 0) * Number(item?.quantity || 0)),
          0,
        );
      return orderProductsTotal > 0 ? orderProductsTotal : remainingAmount;
    },
    [orderProducts, remainingAmount],
  );

  const checkoutPaymentOrder = materializedCheckoutOrder || order;
  const effectiveRemainingAmount = useMemo(
    () => resolveOrderRemainingAmount(checkoutPaymentOrder),
    [checkoutPaymentOrder, resolveOrderRemainingAmount],
  );

  const appendInvoiceToStore = useCallback(
    invoiceData => {
      if (!invoiceData) return;
      const nextInvoices = [
        ...(Array.isArray(invoices) ? invoices : []).filter(
          item => item?.id !== invoiceData?.id,
        ),
        invoiceData,
      ];
      invoiceActions.setItems(nextInvoices);
    },
    [invoiceActions, invoices],
  );

  const appendOrderInvoiceToStore = useCallback(
    (invoiceData, realPrice = null) => {
      if (!invoiceData) return;
      orderInvoicesActions.setItems(
        appendSyntheticOrderInvoice(storedOrderInvoices, {
          invoice: invoiceData,
          orderIri: order?.['@id'] || (routeOrderId ? `/orders/${routeOrderId}` : ''),
          realPrice,
        }),
      );
    },
    [order?.['@id'], orderInvoicesActions, routeOrderId, storedOrderInvoices],
  );

  const resolveNextPayableAfterPayment = useCallback(
    (paidAmount, currentOrder = null) =>
      resolveNextOperationalPayable({
        paidAmount,
        payable,
        remainingAmount: resolveOrderRemainingAmount(currentOrder),
      }),
    [payable, resolveOrderRemainingAmount],
  );

  const syncLoyaltySelectionToOrder = useCallback(
    async currentOrder => {
      if (!requiresLoyaltyCpfStep) return currentOrder || order;

      const targetOrderId = resolvePeopleId(currentOrder?.id) || routeOrderId;
      if (!targetOrderId) return currentOrder || order;

      const selectedPeopleId = resolvePeopleId(selectedLoyaltyPerson?.id);
      const nextClient = selectedPeopleId ? `/people/${selectedPeopleId}` : null;
      const currentClientId = resolvePeopleId(currentOrder?.client || order?.client);
      const shouldClearSelection =
        loyaltyCpfStepSkipped && !selectedPeopleId && currentClientId;
      const hasSameSelection = currentClientId === selectedPeopleId;

      if (!shouldClearSelection && hasSameSelection) return currentOrder || order;

      try {
        const updatedOrder = await ordersActions.save({
          id: targetOrderId,
          client: nextClient,
          payer: nextClient,
        });
        if (updatedOrder) {
          ordersActions.syncOrder?.(updatedOrder);
          return updatedOrder;
        }
      } catch (error) {
        invoiceActions.setError(
          error?.message ||
            'Pagamento confirmado, mas nao foi possivel vincular o CPF ao pedido.',
        );
      }

      return currentOrder || order;
    },
    [
      invoiceActions,
      loyaltyCpfStepSkipped,
      order,
      ordersActions,
      requiresLoyaltyCpfStep,
      routeOrderId,
      selectedLoyaltyPerson?.id,
    ],
  );

  const closeRewardableLoyaltyParentOrder = useCallback(async () => {
    const loyaltyParentOrderId = resolvePeopleId(
      rewardableLoyaltyCard?.card?.id || rewardableLoyaltyCard?.card?.['@id'],
    );
    if (!loyaltyParentOrderId) return true;

    try {
      const response = await api.fetch(
        `${ordersGetters.resourceEndpoint}/${loyaltyParentOrderId}/delivered`,
        {method: 'POST', body: {}},
      );
      if ((response?.result?.errno ?? 0) !== 0) {
        invoiceActions.setError(
          response?.result?.errmsg ||
            'Nao foi possivel fechar o cartao fidelidade.',
        );
        return false;
      }
      return true;
    } catch (error) {
      invoiceActions.setError(
        normalizeGatewayPaymentError(
          error,
          'Pagamento confirmado, mas nao foi possivel fechar o cartao fidelidade.',
        ),
      );
      return false;
    }
  }, [
    invoiceActions,
    ordersGetters.resourceEndpoint,
    rewardableLoyaltyCard?.card?.['@id'],
    rewardableLoyaltyCard?.card?.id,
  ]);

  const resolveCheckoutOrderForPayment = useCallback(
    async currentOrder => {
      const currentOrderId = resolvePeopleId(currentOrder?.id || currentOrder?.['@id']);
      if (currentOrderId && resolveOrderRemainingAmount(currentOrder) > 0.009) {
        return currentOrder;
      }

      if (typeof ensureActiveOrder === 'function') {
        try {
          const activeOrder = await ensureActiveOrder();
          if (activeOrder && resolveOrderRemainingAmount(activeOrder) > 0.009) {
            setMaterializedCheckoutOrder(activeOrder);
            ordersActions.syncOrder?.(activeOrder);
            return activeOrder;
          }
        } catch {}
      }

      if (!routeOrderId || typeof ordersActions.get !== 'function') {
        return currentOrder || order;
      }

      try {
        const fetchedOrder = await ordersActions.get(routeOrderId);
        if (fetchedOrder) {
          setMaterializedCheckoutOrder(fetchedOrder);
          ordersActions.syncOrder?.(fetchedOrder);
          return fetchedOrder;
        }
      } catch {
        return currentOrder || order;
      }

      return currentOrder || order;
    },
    [
      ensureActiveOrder,
      order,
      ordersActions,
      resolveOrderRemainingAmount,
      routeOrderId,
      setMaterializedCheckoutOrder,
    ],
  );

  const resetCompletedOrderState = useCallback(() => {
    clearStoredDraftOrderId();
    ordersActions.setItem(null);
    invoiceActions.setItems([]);
    orderInvoicesActions.setItems([]);
    ordersActions.setPayable(0);
    if (isAutoPrintEnabled) printActions.setReload(true);
  }, [
    clearStoredDraftOrderId,
    invoiceActions,
    isAutoPrintEnabled,
    orderInvoicesActions,
    ordersActions,
    printActions,
  ]);

  useFocusEffect(
    useCallback(() => {
      invoiceActions.setError('');
      invoiceActions.setMessage(null);
      if (!routeOrderId || String(order?.id || '') === String(routeOrderId)) return;
      ordersActions.get(routeOrderId);
    }, [invoiceActions, order?.id, ordersActions, routeOrderId]),
  );

  useEffect(() => {
    if (
      invoiceMessages &&
      invoiceMessages.length > 0 &&
      (!invoiceMessage || Object.keys(invoiceMessage).length === 0)
    ) {
      const nextMessages = [...invoiceMessages];
      invoiceActions.setMessage(nextMessages.pop());
      invoiceActions.setMessages(nextMessages);
    }
  }, [invoiceActions, invoiceMessage, invoiceMessages]);

  return {
    appendInvoiceToStore,
    appendOrderInvoiceToStore,
    checkoutPaymentOrder,
    closeRewardableLoyaltyParentOrder,
    effectiveRemainingAmount,
    remainingAmount,
    resetCompletedOrderState,
    resolveCheckoutOrderForPayment,
    resolveNextPayableAfterPayment,
    resolveOrderRemainingAmount,
    syncLoyaltySelectionToOrder,
  };
}
