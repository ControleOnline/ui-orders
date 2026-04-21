import {normalizeEntityId} from '@controleonline/ui-orders/src/utils/orderState'

export const getOrderRouteId = orderOrId => normalizeEntityId(orderOrId)

export const buildManagerPdvRouteParams = (extraParams = {}) => ({
  interactionMode: 'pdv',
  showBottomCart: true,
  showBottomToolBar: true,
  ...extraParams,
})

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
