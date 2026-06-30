import {normalizeEntityId} from '@controleonline/ui-orders/src/utils/orderState'

export const getOrderRouteId = orderOrId => normalizeEntityId(orderOrId)

const normalizeOrderType = value => String(value || '').trim().toLowerCase()

export const resolveOrderDetailsScreenType = orderOrParams => {
  const orderType = normalizeOrderType(
    orderOrParams?.orderType || orderOrParams?.order_type || '',
  )

  if (orderType === 'delivery') {
    return 'delivery'
  }

  if (orderType === 'sale' || orderType === 'cart') {
    return 'sale'
  }

  return ''
}

export const isPdvRouteContext = params =>
  String(params?.interactionMode || '').trim().toLowerCase() === 'pdv' ||
  params?.showBottomToolBar === true

export const shouldShowOrderHistoryCompanyFilter = ({
  appType,
  params,
} = {}) => String(appType || '').trim().toUpperCase() !== 'POS' &&
  !isPdvRouteContext(params)

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

  const orderType = resolveOrderDetailsScreenType(orderOrId)
  if (orderType) {
    nextParams.orderType = orderType
  }

  return nextParams
}

export const buildAddProductsRouteParams = (orderOrId, extraParams = {}) => ({
  ...buildOrderDetailsRouteParams(orderOrId),
  resumeExistingOrder: true,
  ...extraParams,
})

export const buildCheckoutRouteParams = (orderOrId, extraParams = {}) => ({
  ...buildOrderDetailsRouteParams(orderOrId),
  showBottomCart: false,
  ...extraParams,
})
