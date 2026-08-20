/**
 * Pure helpers for pending cart detection on linked-order settlement trees.
 * Kept free of API/store imports for unit testability (#21).
 */

export const normalizeStatusKey = value => String(value ?? '').trim().toLowerCase()

export const isTerminalOrder = order => {
  const realStatus = normalizeStatusKey(order?.status?.realStatus)
  return ['closed', 'canceled', 'cancelled'].includes(realStatus)
}

/**
 * A pending cart is a non-terminal child order still editable
 * (orderType cart, or open non-parent/non-sale).
 */
export const isPendingCartOrder = order => {
  if (!order || isTerminalOrder(order)) {
    return false
  }
  const orderType = normalizeStatusKey(
    order?.orderType || order?.context?.orderType || '',
  )
  if (orderType === 'sale') {
    return false
  }
  if (orderType === 'cart') {
    return true
  }
  const isParentType = ['table', 'tab', 'stamp'].includes(orderType)
  if (isParentType) {
    return false
  }
  const realStatus = normalizeStatusKey(order?.status?.realStatus)
  return realStatus === 'open' || realStatus === ''
}

export const listPendingCartOrders = orders =>
  (Array.isArray(orders) ? orders : []).filter(isPendingCartOrder)

export const partitionTreeRounds = orders => {
  const safe = Array.isArray(orders) ? orders : []
  const pendingCarts = []
  const sales = []
  const other = []
  safe.forEach(order => {
    if (isPendingCartOrder(order)) {
      pendingCarts.push(order)
      return
    }
    const orderType = normalizeStatusKey(
      order?.orderType || order?.context?.orderType || '',
    )
    if (orderType === 'sale') {
      sales.push(order)
    } else if (!['table', 'tab', 'stamp'].includes(orderType)) {
      other.push(order)
    }
  })
  return {pendingCarts, sales, other}
}
