export const getEntityId = entity => {
  if (!entity) return null

  if (typeof entity === 'number' || typeof entity === 'string') {
    const matches = String(entity).match(/\d+/g)
    return matches ? Number(matches[matches.length - 1]) : null
  }

  if (typeof entity === 'object') {
    if (entity.id) return Number(entity.id)
    if (entity['@id']) {
      const matches = String(entity['@id']).match(/\d+/g)
      return matches ? Number(matches[matches.length - 1]) : null
    }
  }

  return null
}

export const getEmbeddedOrderProducts = order => {
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

export const resolveEmbeddedOrderProducts = order => ({
  hasOwnOrderProducts:
    !!order && Object.prototype.hasOwnProperty.call(order, 'orderProducts'),
  orderProducts: getEmbeddedOrderProducts(order),
})
