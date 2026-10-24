const normalizeOrderId = value => {
  const candidate =
    value && typeof value === 'object'
      ? value.id || value['@id']
      : value

  return String(candidate || '').replace(/\D/g, '') || null
}

export const buildAddProductCatalogRouteParams = ({
  activeOrderId,
  routeParams = {},
} = {}) => {
  const orderId =
    normalizeOrderId(activeOrderId) ||
    normalizeOrderId(routeParams.orderId || routeParams.id || routeParams.order)

  return {
    ...routeParams,
    ...(orderId ? {orderId} : {}),
  }
}
