export const COUNTER_SCREEN_ORDER_HISTORY = 'OrderHistoryPage'
export const COUNTER_SCREEN_ORDER_DETAILS = 'OrderDetails'
export const COUNTER_SCREEN_ADD_PRODUCT = 'AddProductScreen'

export const shouldResumeCounterOrderFlow = ({
  appType,
  isCounterMode,
  resumeCounterFlow,
} = {}) =>
  String(appType || '').trim().toUpperCase() === 'POS' &&
  isCounterMode === true &&
  resumeCounterFlow === true

export const extractEmbeddedOrderProducts = order => {
  if (Array.isArray(order?.orderProducts)) {
    return order.orderProducts
  }

  if (Array.isArray(order?.orderProducts?.member)) {
    return order.orderProducts.member
  }

  if (Array.isArray(order?.orderProducts?.['hydra:member'])) {
    return order.orderProducts['hydra:member']
  }

  return []
}

export const hasCounterOrderProducts = order => {
  const embeddedOrderProducts = extractEmbeddedOrderProducts(order)
  if (embeddedOrderProducts.length > 0) {
    return true
  }

  return Math.abs(Number(order?.price || 0)) > 0.0001
}

export const resolveCounterDestinationFromOrders = orders => {
  const normalizedOrders = Array.isArray(orders) ? orders.filter(Boolean) : []

  if (normalizedOrders.length === 0) {
    return {
      orderCount: 0,
      order: null,
      screen: COUNTER_SCREEN_ADD_PRODUCT,
    }
  }

  if (normalizedOrders.length > 1) {
    return {
      orderCount: normalizedOrders.length,
      order: null,
      screen: COUNTER_SCREEN_ORDER_HISTORY,
    }
  }

  const [singleOrder] = normalizedOrders

  return {
    orderCount: 1,
    order: singleOrder,
    screen: hasCounterOrderProducts(singleOrder)
      ? COUNTER_SCREEN_ORDER_DETAILS
      : COUNTER_SCREEN_ADD_PRODUCT,
  }
}
