const normalizeId = value => String(value || '').replace(/\D+/g, '') || null

const buildSessionKey = (companyId, deviceId) => {
  const company = normalizeId(companyId)
  const device = normalizeId(deviceId)
  return company ? `${company}:${device || '0'}` : null
}

const activePosOrders = new Map()
const confirmedReceipts = new Map()

export const setActivePosOrderContext = ({companyId, deviceId, order, confirmed = false, confirmedAt = Date.now()} = {}) => {
  const key = buildSessionKey(companyId, deviceId)
  if (!key) return

  const id = normalizeId(order?.id || order?.['@id'])
  confirmedReceipts.delete(key)
  if (!id) {
    activePosOrders.delete(key)
    return
  }

  if (confirmed && Number.isFinite(confirmedAt) && confirmedAt <= Date.now()) {
    confirmedReceipts.set(key, {id, at: confirmedAt})
  }
  activePosOrders.set(key, {
    ...order,
    id: order?.id || Number(id),
    '@id': order?.['@id'] || `/orders/${id}`,
  })
}

export const getActivePosOrderContext = ({companyId, deviceId} = {}) => {
  const key = buildSessionKey(companyId, deviceId)
  return key ? activePosOrders.get(key) || null : null
}

// Consume only a fresh acknowledgment for the same company, device and order.
export const consumeConfirmedPosOrderContext = ({companyId, deviceId, orderId} = {}) => {
  const key = buildSessionKey(companyId, deviceId)
  const receipt = confirmedReceipts.get(key)
  if (!receipt || receipt.id !== normalizeId(orderId)) return null
  confirmedReceipts.delete(key)
  return Date.now() - receipt.at < 30000 ? activePosOrders.get(key) || null : null
}

export const clearActivePosOrderContexts = () => {
  activePosOrders.clear()
  confirmedReceipts.clear()
}
