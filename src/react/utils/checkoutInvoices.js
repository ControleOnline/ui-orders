const roundMoney = value => Math.round(Number(value || 0) * 100) / 100

export const normalizeCheckoutEntityId = value => {
  if (!value) return ''

  if (typeof value === 'object') {
    return normalizeCheckoutEntityId(value.id || value['@id'] || value.invoice)
  }

  const matches = String(value).match(/\d+/g)
  return matches ? matches[matches.length - 1] : ''
}

export const resolvePaidAmountForOrder = ({
  order = null,
  orderInvoices = [],
} = {}) => {
  const orderId = normalizeCheckoutEntityId(order)

  if (!orderId || !Array.isArray(orderInvoices)) {
    return 0
  }

  const paid = orderInvoices.reduce((sum, orderInvoice) => {
    if (normalizeCheckoutEntityId(orderInvoice?.order) !== orderId) {
      return sum
    }

    const realPrice = Number(
      orderInvoice?.realPrice ?? orderInvoice?.real_price ?? 0,
    )

    return Number.isFinite(realPrice) ? sum + realPrice : sum
  }, 0)

  return roundMoney(paid)
}

export const resolveNextOperationalPayable = ({
  paidAmount = 0,
  payable = 0,
  remainingAmount = 0,
} = {}) => {
  const resolvedPaidAmount = Math.max(Number(paidAmount || 0), 0)
  const currentPayable = Number(payable || 0)
  const baselinePending =
    currentPayable < -0.009
      ? Math.abs(currentPayable)
      : Math.max(Number(remainingAmount || 0), 0)

  return roundMoney(resolvedPaidAmount - baselinePending)
}

export const resolveOperationalDisplayAmount = ({
  orderTotal = 0,
  pendingAmount = 0,
  receivedAmount = 0,
} = {}) => {
  const resolvedReceivedAmount = Math.max(Number(receivedAmount || 0), 0)

  if (resolvedReceivedAmount > 0.009) {
    return roundMoney(Math.max(Number(pendingAmount || 0), 0))
  }

  return roundMoney(Math.max(Number(orderTotal || 0), 0))
}

export const resolveOperationalDisplayLabelKey = ({
  pendingAmount = 0,
  receivedAmount = 0,
} = {}) => {
  const resolvedReceivedAmount = Math.max(Number(receivedAmount || 0), 0)
  const resolvedPendingAmount = Math.max(Number(pendingAmount || 0), 0)

  if (resolvedReceivedAmount <= 0.009) {
    return 'localTotal'
  }

  return resolvedPendingAmount > 0.009 ? 'pending' : 'paid'
}

/**
 * Resolves the remaining balance shown in the Checkout screen, scoped to the
 * order that belongs to the current route.
 *
 * @param {object} params
 * @param {boolean} params.isOrderScopedToRoute - True when the stored order ID
 *   matches the route order ID.  When false the store still holds data from a
 *   previous order and must not be used as the balance for this one.
 * @param {number|string|null} params.orderPrice - The persisted Order.price.
 * @param {number} params.payable - The global store payable (paid − price),
 *   which tracks the remaining balance after partial payments.
 * @returns {number} Rounded remaining amount in money units (≥ 0).
 */
export const resolveCheckoutRemainingAmount = ({
  isOrderScopedToRoute = false,
  orderPrice = 0,
  payable = 0,
} = {}) => {
  // Guard: only trust global payable when the stored order belongs to this
  // route.  A non-zero payable from a previous checkout session must not
  // be shown as the balance for the new order.
  if (!isOrderScopedToRoute) {
    return 0
  }

  // payable = paid − price, so Math.abs(payable) is the outstanding balance.
  // Use it when non-zero because it reflects partial payments already recorded.
  const payableValue = Math.abs(Number(payable || 0))
  if (payableValue > 0.009) {
    return roundMoney(payableValue)
  }

  // No payments yet: the persisted Order.price is the authoritative total.
  return roundMoney(Math.max(Number(orderPrice || 0), 0))
}

export const appendSyntheticOrderInvoice = (
  items,
  {invoice = null, orderIri = '', realPrice = null} = {},
) => {
  const safeItems = Array.isArray(items) ? items : []

  if (!invoice || typeof invoice !== 'object') {
    return safeItems
  }

  const invoiceId = normalizeCheckoutEntityId(invoice)
  const nextItems = invoiceId
    ? safeItems.filter(
        item => normalizeCheckoutEntityId(item?.invoice || item) !== invoiceId,
      )
    : [...safeItems]
  const resolvedRealPrice =
    realPrice ?? invoice?.realPrice ?? invoice?.real_price ?? invoice?.price ?? 0

  return [
    ...nextItems,
    {
      ...(invoiceId ? {id: `local-${invoiceId}`} : {}),
      ...(orderIri ? {order: orderIri} : {}),
      invoice,
      realPrice: roundMoney(resolvedRealPrice),
    },
  ]
}
