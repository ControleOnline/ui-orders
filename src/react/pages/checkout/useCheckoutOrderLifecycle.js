import {useCallback, useEffect, useMemo, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {api} from '@controleonline/ui-common/src/api';
import {normalizeGatewayPaymentError} from '@controleonline/ui-common/src/react/services/paymentGatewayExecution';
import {
  appendSyntheticOrderInvoice,
  filterOrderProductsForOrder,
  normalizeCheckoutEntityId,
  resolveCheckoutRemainingAmount,
  resolveNextOperationalPayable,
} from '@controleonline/ui-orders/src/react/utils/checkoutInvoices';
import {fetchAllHydraCollectionPages} from '@controleonline/ui-orders/src/react/utils/orderProductsHydration';
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
  orderProductsActions,
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
  const [checkoutOrderProductsState, setCheckoutOrderProductsState] = useState({
    complete: true,
    error: '',
    isLoading: false,
    items: [],
    orderId: '',
    totalItems: 0,
  });
  const [checkoutOrderProductsReloadKey, setCheckoutOrderProductsReloadKey] =
    useState(0);
  const activeOrderId = normalizeCheckoutEntityId(order);
  const normalizedCheckoutOrderId = normalizeCheckoutEntityId(routeOrderId || order);
  const isCheckoutOrderCurrent =
    !normalizedCheckoutOrderId ||
    (!!activeOrderId && activeOrderId === normalizedCheckoutOrderId);
  const checkoutOrderProducts = useMemo(() => {
    if (
      checkoutOrderProductsState.orderId === normalizedCheckoutOrderId &&
      checkoutOrderProductsState.complete
    ) {
      return checkoutOrderProductsState.items;
    }

    return filterOrderProductsForOrder(orderProducts, normalizedCheckoutOrderId);
  }, [
    checkoutOrderProductsState.complete,
    checkoutOrderProductsState.items,
    checkoutOrderProductsState.orderId,
    normalizedCheckoutOrderId,
    orderProducts,
  ]);
  const checkoutOrderProductsComplete =
    !normalizedCheckoutOrderId ||
    (checkoutOrderProductsState.orderId === normalizedCheckoutOrderId &&
      checkoutOrderProductsState.complete);
  const canRenderHydratedCheckout =
    isCheckoutOrderCurrent && !checkoutOrderProductsState.isLoading;

  const remainingAmount = useMemo(
    () =>
      resolveCheckoutRemainingAmount({
        order,
        orderProducts: checkoutOrderProducts,
        orderProductsComplete: checkoutOrderProductsComplete,
        payable,
        routeOrderId: normalizedCheckoutOrderId,
      }),
    [
      checkoutOrderProducts,
      checkoutOrderProductsComplete,
      normalizedCheckoutOrderId,
      order,
      payable,
    ],
  );

  const resolveOrderRemainingAmount = useCallback(
    currentOrder => {
      const currentOrderId = normalizeCheckoutEntityId(currentOrder);
      const currentOrderProducts = Array.isArray(currentOrder?.orderProducts)
        ? currentOrder.orderProducts
        : checkoutOrderProducts;
      const resolvedAmount = resolveCheckoutRemainingAmount({
        order: currentOrder || order,
        orderProducts: currentOrderProducts,
        orderProductsComplete: checkoutOrderProductsComplete,
        payable,
        routeOrderId: currentOrderId || normalizedCheckoutOrderId,
      });

      return resolvedAmount > 0 ? resolvedAmount : remainingAmount;
    },
    [
      checkoutOrderProducts,
      checkoutOrderProductsComplete,
      normalizedCheckoutOrderId,
      order,
      payable,
      remainingAmount,
    ],
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
      setMaterializedCheckoutOrder(null);
      setCheckoutOrderProductsReloadKey(current => current + 1);
      ordersActions.setPayable(0);
      orderInvoicesActions.setItems([]);
      orderProductsActions.setItems?.([]);
      ordersActions.get(routeOrderId);
    }, [
      invoiceActions,
      order?.id,
      orderInvoicesActions,
      orderProductsActions,
      ordersActions,
      routeOrderId,
      setMaterializedCheckoutOrder,
    ]),
  );

  useEffect(() => {
    if (!normalizedCheckoutOrderId) {
      setCheckoutOrderProductsState({
        complete: true,
        error: '',
        isLoading: false,
        items: [],
        orderId: '',
        totalItems: 0,
      });
      return undefined;
    }

    let isActive = true;
    setCheckoutOrderProductsState({
      complete: false,
      error: '',
      isLoading: true,
      items: [],
      orderId: normalizedCheckoutOrderId,
      totalItems: 0,
    });

    fetchAllHydraCollectionPages(page =>
      api.fetch('order_products', {
        params: {
          'order.id': Number(normalizedCheckoutOrderId),
          itemsPerPage: 50,
          page,
        },
      }),
    )
      .then(result => {
        if (!isActive) return;

        orderProductsActions.setItems?.(result.items);
        ordersActions.syncOrderProducts?.({
          orderId: Number(normalizedCheckoutOrderId),
          orderProducts: result.items,
        });
        setCheckoutOrderProductsState({
          complete: result.complete,
          error: '',
          isLoading: false,
          items: result.items,
          orderId: normalizedCheckoutOrderId,
          totalItems: result.totalItems,
        });
      })
      .catch(error => {
        if (!isActive) return;

        setCheckoutOrderProductsState({
          complete: false,
          error:
            error?.message ||
            'Nao foi possivel carregar os produtos deste pedido.',
          isLoading: false,
          items: [],
          orderId: normalizedCheckoutOrderId,
          totalItems: 0,
        });
      });

    return () => {
      isActive = false;
    };
  }, [
    checkoutOrderProductsReloadKey,
    normalizedCheckoutOrderId,
    orderProductsActions,
    ordersActions,
  ]);

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
    canRenderHydratedCheckout,
    checkoutPaymentOrder,
    checkoutOrderProducts,
    checkoutOrderProductsError: checkoutOrderProductsState.error,
    closeRewardableLoyaltyParentOrder,
    effectiveRemainingAmount,
    remainingAmount,
    reloadCheckoutOrderProducts: () =>
      setCheckoutOrderProductsReloadKey(current => current + 1),
    resetCompletedOrderState,
    resolveCheckoutOrderForPayment,
    resolveNextPayableAfterPayment,
    resolveOrderRemainingAmount,
    syncLoyaltySelectionToOrder,
  };
}
