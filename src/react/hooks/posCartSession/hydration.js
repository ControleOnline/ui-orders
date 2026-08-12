import {api} from '@controleonline/ui-common/src/api'
import {resolveCounterDestinationFromOrders} from '@controleonline/ui-orders/src/react/utils/counterOrderFlow'
import {
  extractCollectionItems,
  normalizeId,
} from '@controleonline/ui-orders/src/react/utils/posCartHelpers'
import {isOpenPosCartOrder} from './status'

export const refreshPosActiveOrder = async ({
  activeOrderId,
  normalizeDraftOrderType,
  orderProductsActions,
  ordersActions,
  storedOrderId,
  syncActiveOrderState,
  targetOrderId,
}) => {
  const targetId = normalizeId(targetOrderId || activeOrderId || storedOrderId)

  if (!targetId) {
    return syncActiveOrderState(null)
  }

  try {
    const [orderResult, productsResult] = await Promise.allSettled([
      api.fetch(`orders/${targetId}`),
      api.fetch('order_products', {
        params: {'order.id': Number(targetId)},
      }),
    ])

    if (orderResult.status !== 'fulfilled') {
      return syncActiveOrderState(null)
    }

    const normalizedOrder = await normalizeDraftOrderType(orderResult.value)
    const hydratedProducts =
      productsResult.status === 'fulfilled'
        ? extractCollectionItems(productsResult.value)
        : null
    const hydratedOrder =
      Array.isArray(hydratedProducts)
        ? {...normalizedOrder, orderProducts: hydratedProducts}
        : normalizedOrder
    const syncedOrder = syncActiveOrderState(hydratedOrder)

    if (
      Array.isArray(hydratedProducts) &&
      typeof ordersActions.syncOrderProducts === 'function'
    ) {
      orderProductsActions.setItems?.(hydratedProducts)
      return (
        ordersActions.syncOrderProducts({
          orderId: Number(targetId),
          orderProducts: hydratedProducts,
        }) || syncedOrder
      )
    }

    return syncedOrder
  } catch {
    return syncActiveOrderState(null)
  }
}

export const materializeOpenPosOrder = async ({
  normalizeDraftOrderType,
  orderCandidate,
  ordersActions,
  usesLinkedCheckOrders,
}) => {
  const normalizedOrder = await normalizeDraftOrderType(orderCandidate)

  if (isOpenPosCartOrder(normalizedOrder, {usesLinkedCheckOrders})) {
    return normalizedOrder
  }

  const orderId = normalizeId(
    orderCandidate?.id ||
      orderCandidate?.['@id'] ||
      normalizedOrder?.id ||
      normalizedOrder?.['@id'],
  )

  if (!orderId) {
    return normalizedOrder || orderCandidate || null
  }

  try {
    const hydratedOrder = await ordersActions.get(orderId)
    const normalizedHydratedOrder = await normalizeDraftOrderType(hydratedOrder)
    return normalizedHydratedOrder || normalizedOrder || orderCandidate || null
  } catch {
    return normalizedOrder || orderCandidate || null
  }
}

export const resolveCounterStartDestinationFromSession = async ({
  loadOpenPosDraftOrders,
  normalizeDraftOrderType,
  refreshActiveOrder,
  syncActiveOrderState,
}) => {
  const openDraftOrders = await loadOpenPosDraftOrders()
  const initialDestination = resolveCounterDestinationFromOrders(openDraftOrders)

  if (initialDestination.orderCount === 0 || initialDestination.orderCount > 1) {
    syncActiveOrderState(null)
    return initialDestination
  }

  const singleOrderId = normalizeId(
    initialDestination.order?.id || initialDestination.order?.['@id'],
  )
  let detailedOrder = initialDestination.order

  if (singleOrderId) {
    detailedOrder = (await refreshActiveOrder(singleOrderId)) || detailedOrder
  } else if (detailedOrder) {
    detailedOrder =
      syncActiveOrderState(await normalizeDraftOrderType(detailedOrder)) ||
      detailedOrder
  }

  return resolveCounterDestinationFromOrders([detailedOrder])
}
