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
