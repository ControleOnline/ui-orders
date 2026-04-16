import {normalizeEntityId} from '@controleonline/ui-orders/src/utils/orderState'

export const getOrderRouteId = orderOrId => normalizeEntityId(orderOrId)

export const buildOrderDetailsRouteParams = (orderOrId, extraParams = {}) => {
  const orderId = getOrderRouteId(orderOrId)
  const nextParams = {
    ...extraParams,
  }

  if (orderId) {
    nextParams.id = orderId
  }

  return nextParams
}
