const normalizeId = value => String(value || '').replace(/\D+/g, '') || null

const buildSessionKey = (companyId, deviceId) => {
  const company = normalizeId(companyId)
  const device = normalizeId(deviceId)
  return company ? `${company}:${device || '0'}` : null
}

const activePosOrders = new Map()

export const setActivePosOrderContext = ({companyId, deviceId, order} = {}) => {
  const key = buildSessionKey(companyId, deviceId)
  if (!key) return

  const id = normalizeId(order?.id || order?.['@id'])
  if (!id) {
    activePosOrders.delete(key)
    return
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

export const clearActivePosOrderContexts = () => activePosOrders.clear()
