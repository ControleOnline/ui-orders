import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { useStore } from '@store'
import usePosOrderMaterialization from '@controleonline/ui-orders/src/react/hooks/usePosOrderMaterialization'
import useDebouncedOrderProductQuantitySync from '@controleonline/ui-orders/src/react/hooks/useDebouncedOrderProductQuantitySync'
import useOrderMarketplaceSummary from '../useOrderMarketplaceSummary'
import {
  filterOrderProductsByOrderId,
  resolveEmbeddedOrderProducts,
  choosePreferredOrderProducts,
  formatApiError,
  getEntityId,
  pendingOrderDetailRefreshes,
  recentOrderDetailRefreshStarts,
  ORDER_DETAIL_REFRESH_COOLDOWN_MS,
  resolveEditableOrderType,
  DRAFT_SALE_ORDER_TYPE,
  isTerminalOrderStatus,
} from './helpers'
import {
  mergeOrderProductIntoList,
  mergeOrderWithOrderProducts,
  removeOrderProductFromList,
  withOrderProductQuantity,
} from '@controleonline/ui-orders/src/utils/orderState'

/**
 * Order products sync, invoices load, refresh and marketplace summary for OrderDetails.
 */
export default function useOrderDetailsOrderSync({
  item,
  orderParam,
  routeOrderId,
  routeOrderIri,
  route,
  navigation,
  ordersActions,
  ordersGetters,
  orderInvoicesActions,
  storedOrderInvoiceItems,
  showError,
  showSuccess,
  localRealStatusKey,
  localOrderTypeKey,
  isLocallyTerminalOrder,
  isKds = false,
}) {
  const orderProductsStore = useStore('order_products')
  const { items: storedOrderProducts } = orderProductsStore.getters

  const currentOrderProductsRef = useRef([])
  const storedOrderProductsRef = useRef([])
  const ordersActionsRef = useRef(ordersActions)
  const orderProductsActionsRef = useRef(orderProductsStore.actions)
  const orderInvoicesActionsRef = useRef(orderInvoicesActions)
  const commitResolvedOrderProductsRef = useRef(null)
  const loadOrderInvoicesRef = useRef(null)
  const refreshCurrentOrderInFlightRef = useRef(null)
  const refreshCurrentOrderFingerprintRef = useRef('')
  const showErrorRef = useRef(showError)
  const currentDisplayOrderId = Number(item?.id || orderParam?.id || routeOrderId || 0)
  const filteredStoredOrderProducts = useMemo(
    () => filterOrderProductsByOrderId(storedOrderProducts, currentDisplayOrderId),
    [currentDisplayOrderId, storedOrderProducts],
  )
  const {materializeOrderWithProducts} = usePosOrderMaterialization({
    interactionParams: route?.params,
    navigation,
  })

  useEffect(() => {
    ordersActionsRef.current = ordersActions
  }, [ordersActions])

  useEffect(() => {
    orderProductsActionsRef.current = orderProductsStore.actions
  }, [orderProductsStore.actions])

  useEffect(() => {
    orderInvoicesActionsRef.current = orderInvoicesActions
  }, [orderInvoicesActions])

  useEffect(() => {
    showErrorRef.current = showError
  }, [showError])

  useEffect(() => {
    const currentOrderInvoicesActions = orderInvoicesActionsRef.current

    currentOrderInvoicesActions?.setItems?.([])
    currentOrderInvoicesActions?.setError?.('')
  }, [routeOrderIri])

  const orderInvoices = useMemo(
    () =>
      (Array.isArray(storedOrderInvoiceItems) ? storedOrderInvoiceItems : [])
        .map(orderInvoice => {
          const rawInvoice = orderInvoice?.invoice
          const invoice =
            rawInvoice && typeof rawInvoice === 'object' ? rawInvoice : null
          const invoiceId = getEntityId(rawInvoice)

          if (!invoice && !invoiceId) {
            return null
          }

          return {
            ...(invoice || {}),
            id: invoice?.id || invoiceId,
            '@id': invoice?.['@id'] || (invoiceId ? `/invoices/${invoiceId}` : undefined),
            orderInvoiceId: orderInvoice?.id,
            realPrice:
              orderInvoice?.realPrice ??
              orderInvoice?.real_price ??
              invoice?.realPrice ??
              invoice?.real_price ??
              null,
          }
        })
        .filter(Boolean),
    [storedOrderInvoiceItems],
  )

  const loadOrderInvoices = useCallback(async ({silent = false} = {}) => {
    const currentOrderInvoicesActions = orderInvoicesActionsRef.current

    if (
      !currentOrderInvoicesActions ||
      typeof currentOrderInvoicesActions.getItems !== 'function'
    ) {
      return []
    }

    if (!routeOrderIri) {
      currentOrderInvoicesActions?.setItems?.([])
      currentOrderInvoicesActions?.setError?.('')
      return []
    }

    try {
      const response = await currentOrderInvoicesActions.getItems({
        order: routeOrderIri,
      })

      return Array.isArray(response) ? response : []
    } catch (invoiceError) {
      currentOrderInvoicesActions?.setItems?.([])
      if (!silent) {
        showErrorRef.current?.(formatApiError(invoiceError))
      }
      return []
    }
  }, [routeOrderIri])

  const commitResolvedOrderProducts = useCallback(sourceOrder => {
    const {hasOwnOrderProducts, orderProducts} = resolveEmbeddedOrderProducts(sourceOrder)
    const sourceOrderId = getEntityId(sourceOrder) || currentDisplayOrderId
    const preferredOrderProducts = choosePreferredOrderProducts({
      primaryOrderProducts: orderProducts,
      primaryHasOwnOrderProducts: hasOwnOrderProducts,
      fallbackOrderProducts: filterOrderProductsByOrderId(
        storedOrderProductsRef.current,
        sourceOrderId,
      ),
    })

    if (!hasOwnOrderProducts) {
      return currentOrderProductsRef.current
    }

    currentOrderProductsRef.current = preferredOrderProducts

    if (
      !areOrderProductCollectionsEquivalent(
        storedOrderProductsRef.current,
        preferredOrderProducts,
      )
    ) {
      orderProductsActionsRef.current.setItems(preferredOrderProducts)
    }

    return preferredOrderProducts
  }, [
    currentDisplayOrderId,
  ])

  useEffect(() => {
    commitResolvedOrderProductsRef.current = commitResolvedOrderProducts
  }, [commitResolvedOrderProducts])

  useEffect(() => {
    loadOrderInvoicesRef.current = loadOrderInvoices
  }, [loadOrderInvoices])

  const resolveCurrentOrderRefreshFingerprint = useCallback(
    sourceOrder => {
      const resolvedOrder = sourceOrder || item || orderParam || null

      if (!resolvedOrder) {
        return String(routeOrderId || '')
      }

      const resolvedOrderId = String(getEntityId(resolvedOrder) || routeOrderId || '')
      const resolvedOrderDate = String(
        resolvedOrder?.alterDate ||
          resolvedOrder?.alter_date ||
          resolvedOrder?.updatedAt ||
          resolvedOrder?.updated_at ||
          resolvedOrder?.orderDate ||
          resolvedOrder?.order_date ||
          '',
      ).trim()
      const resolvedOrderStatus = String(
        resolvedOrder?.status?.realStatus ||
          resolvedOrder?.status?.real_status ||
          resolvedOrder?.status?.status ||
          '',
      ).trim()
      const resolvedOrderProducts = Array.isArray(resolvedOrder?.orderProducts)
        ? resolvedOrder.orderProducts
        : []

      return [
        resolvedOrderId,
        resolvedOrderDate,
        resolvedOrderStatus,
        resolvedOrderProducts.length,
      ].join('|')
    },
    [item, orderParam, routeOrderId],
  )

  useEffect(() => {
    storedOrderProductsRef.current = filteredStoredOrderProducts

    if (!hasDetailedOrderProductsPayload(filteredStoredOrderProducts)) {
      return
    }

    currentOrderProductsRef.current = filteredStoredOrderProducts
  }, [filteredStoredOrderProducts])

  useFocusEffect(
    useCallback(() => {
      void loadOrderInvoicesRef.current?.({silent: true})

      return undefined
    }, []),
  )

  const refreshCurrentOrder = useCallback(async ({force = false} = {}) => {
    if (!routeOrderId) {
      return null
    }

    const lastRefreshStart = recentOrderDetailRefreshStarts.get(routeOrderId) || 0
    if (Date.now() - lastRefreshStart < ORDER_DETAIL_REFRESH_COOLDOWN_MS) {
      return item || orderParam || null
    }

    const currentFingerprint = resolveCurrentOrderRefreshFingerprint()
    if (
      !force &&
      refreshCurrentOrderFingerprintRef.current &&
      refreshCurrentOrderFingerprintRef.current === currentFingerprint
    ) {
      return item || orderParam || null
    }

    const pendingRefresh = pendingOrderDetailRefreshes.get(routeOrderId)
    if (pendingRefresh) {
      return pendingRefresh
    }

    if (refreshCurrentOrderInFlightRef.current) {
      return refreshCurrentOrderInFlightRef.current
    }

    const request = ordersActionsRef.current
      .get({
        id: routeOrderId,
        __storeMeta: {
          preserveItem: true,
        },
      })
      .then(refreshedOrder => {
        recentOrderDetailRefreshStarts.set(routeOrderId, Date.now())
        refreshCurrentOrderFingerprintRef.current =
          resolveCurrentOrderRefreshFingerprint(refreshedOrder)
        commitResolvedOrderProductsRef.current?.(refreshedOrder)
        return refreshedOrder
      })
      .finally(() => {
        if (pendingOrderDetailRefreshes.get(routeOrderId) === request) {
          pendingOrderDetailRefreshes.delete(routeOrderId)
        }
        refreshCurrentOrderInFlightRef.current = null
      })

    pendingOrderDetailRefreshes.set(routeOrderId, request)
    refreshCurrentOrderInFlightRef.current = request
    return request
  }, [
    item,
    orderParam,
    resolveCurrentOrderRefreshFingerprint,
    routeOrderId,
  ])
  const refreshIntegrationFinancialData = useCallback(
    async () => loadOrderInvoices({silent: true}),
    [loadOrderInvoices],
  )

  const marketplaceSummary = useOrderMarketplaceSummary({
    order: item,
    initialOrder: orderParam,
    refreshOrder: () => refreshCurrentOrder({force: true}),
    onFinancialGenerated: refreshIntegrationFinancialData,
    isKds,
    navigation,
    showError,
    showSuccess,
  })
  const hasMarketplaceIntegration = marketplaceSummary.hasMarketplaceIntegration

  const buildOrderUpdatePayload = useCallback(changes => {
    const baseOrder = item || orderParam
    const orderId = getEntityId(baseOrder)

    if (!orderId) {
      throw new Error(
        global.t?.t('orders', 'message', 'unableCompleteOperation') ||
          'Não foi possível identificar o pedido para atualizar.',
      )
    }

    const providerIri =
      toEntityIri(baseOrder?.provider, 'people') ||
      orderCompanyIri
    const statusIri = toEntityIri(baseOrder?.status, 'statuses')

    return {
      id: Number(orderId),
      app: baseOrder?.app || 'POS',
      orderType: resolveEditableOrderType(baseOrder?.orderType),
      ...(providerIri ? { provider: providerIri } : {}),
      ...(statusIri ? { status: statusIri } : {}),
      ...changes,
    }
  }, [item, orderParam, orderCompanyIri])

  const canEditItems =
    !hasMarketplaceIntegration &&
    !isTerminalOrderStatus(localRealStatusKey)
  // Item mutations are cart-only; sale and terminal orders stay read-only here.
  const canMutateOrderProducts =
    !hasMarketplaceIntegration &&
    localOrderTypeKey === DRAFT_SALE_ORDER_TYPE &&
    !isLocallyTerminalOrder

  useEffect(() => {
    if (Array.isArray(item?.orderProducts)) {
      commitResolvedOrderProducts(item)
      return
    }

    if (Array.isArray(orderParam?.orderProducts)) {
      commitResolvedOrderProducts(orderParam)
    }
  }, [
    commitResolvedOrderProducts,
    item,
    item?.orderProducts,
    orderParam?.orderProducts,
  ])

  const syncCurrentOrderProducts = useCallback(nextOrderProducts => {
    const normalizedOrderProducts = Array.isArray(nextOrderProducts) ? nextOrderProducts : []
    const baseOrder = item?.id ? item : orderParam

    currentOrderProductsRef.current = normalizedOrderProducts
    orderProductsActionsRef.current.setItems(normalizedOrderProducts)

    if (!baseOrder) {
      return normalizedOrderProducts
    }

    ordersActionsRef.current.syncOrder(
      mergeOrderWithOrderProducts(baseOrder, normalizedOrderProducts),
    )

    return normalizedOrderProducts
  }, [item, orderParam])

  const {
    flushAllChanges: flushPendingOrderProductChanges,
    getScheduledQuantity,
    isOrderProductCommitting,
    scheduleQuantityChange,
  } = useDebouncedOrderProductQuantitySync({
    delay: 1000,
    onOptimisticUpdate: (orderProduct, nextQuantity) => {
      const nextOrderProducts =
        nextQuantity <= 0
          ? removeOrderProductFromList(currentOrderProductsRef.current, orderProduct)
          : mergeOrderProductIntoList(
              currentOrderProductsRef.current,
              withOrderProductQuantity(orderProduct, nextQuantity),
            )

      syncCurrentOrderProducts(nextOrderProducts)
    },
    onCommit: async (orderProduct, targetQuantity) => {
      const orderProductId = String(
        orderProduct?.id || String(orderProduct?.['@id'] || '').replace(/\D/g, ''),
      )

      if (!orderProductId) return

      if (targetQuantity <= 0) {
        await orderProductsActionsRef.current.remove(orderProductId)
        return
      }

      const savedOrderProduct = await orderProductsActionsRef.current.save({
        '@id': orderProduct?.['@id'],
        id: Number(orderProductId),
        quantity: targetQuantity,
      })

      syncCurrentOrderProducts(
        mergeOrderProductIntoList(currentOrderProductsRef.current, savedOrderProduct),
      )
    },
    onError: async error => {
      await refreshCurrentOrder({force: true})
      showError(formatApiError(error))
    },
  })

  const updateCurrentOrder = useCallback(async changes => {
    await flushPendingOrderProductChanges()

    const savedOrder = await ordersActions.save(
      buildOrderUpdatePayload(changes),
    )

    if (savedOrder) {
      if (typeof ordersActions.syncOrder === 'function') {
        ordersActions.syncOrder(savedOrder)
      } else {
        ordersActions.setItem(savedOrder)
      }
    }

    await refreshCurrentOrder({force: true})

    return savedOrder
  }, [
    flushPendingOrderProductChanges,
    ordersActions,
    buildOrderUpdatePayload,
    refreshCurrentOrder,
  ])


  return {
    orderProductsStore,
    currentOrderProductsRef,
    filteredStoredOrderProducts,
    materializeOrderWithProducts,
    orderInvoices,
    loadOrderInvoices,
    commitResolvedOrderProducts,
    resolveCurrentOrderRefreshFingerprint,
    refreshCurrentOrder,
    refreshIntegrationFinancialData,
    marketplaceSummary,
    buildOrderUpdatePayload,
    canEditItems,
    canMutateOrderProducts,
    syncCurrentOrderProducts,
    flushPendingOrderProductChanges,
    getScheduledQuantity,
    isOrderProductCommitting,
    scheduleQuantityChange,
    updateCurrentOrder,
    hasMarketplaceIntegration: marketplaceSummary?.hasMarketplaceIntegration,
  }
}
