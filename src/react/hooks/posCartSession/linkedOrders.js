import {
  buildLinkedOrderMetadata,
  matchesLinkedOrderExternalCode,
} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'
import {
  DRAFT_SALE_ORDER_TYPE,
  normalizeId,
} from '@controleonline/ui-orders/src/react/utils/posCartHelpers'
import {isOpenPosCartOrder} from './status'

export const findOpenSettlementOrder = async ({
  cartActions,
  companyId,
  externalCode,
  linkedOrderType,
}) => {
  if (!companyId || !linkedOrderType || !externalCode) {
    return null
  }

  const normalizedExternalCode = String(externalCode || '').trim()
  const legacyQuery = {
    app: 'POS',
    orderType: linkedOrderType,
    provider: '/people/' + companyId,
    'status.realStatus': 'open',
    'status.status': 'open',
    'order[id]': 'DESC',
  }
  const exactItems = await cartActions.getItems({
    ...legacyQuery,
    externalCode: normalizedExternalCode,
  })
  const exactMatch = (Array.isArray(exactItems) ? exactItems : []).find(order =>
    matchesLinkedOrderExternalCode(order, externalCode, linkedOrderType),
  )

  if (exactMatch) {
    return exactMatch
  }

  const items = await cartActions.getItems({...legacyQuery})
  return (Array.isArray(items) ? items : []).find(order =>
    matchesLinkedOrderExternalCode(order, externalCode, linkedOrderType),
  ) || null
}

export const findOpenLinkedSessionOrder = async ({
  cartActions,
  companyId,
  deviceId,
  mainOrderId,
}) => {
  if (!companyId || !mainOrderId) {
    return null
  }

  const items = await cartActions.getItems({
    app: 'POS',
    mainOrderId: Number(mainOrderId),
    provider: '/people/' + companyId,
    'status.realStatus': 'open',
    'status.status': 'open',
    'order[id]': 'DESC',
    ...(deviceId ? {'device.device': deviceId} : {}),
  })

  return (Array.isArray(items) ? items : [])
    .filter(order => isOpenPosCartOrder(order, {usesLinkedCheckOrders: true}))
    .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))[0] || null
}

export const ensureSettlementOrder = async ({
  buildOrderPayload,
  canManageLinkedOrders,
  cartActions,
  checkInputType,
  companyId,
  externalCode,
  linkedOrderType,
  ordersActions,
  peopleIri = null,
  statusIri,
}) => {
  const existingOrder = await findOpenSettlementOrder({
    cartActions,
    companyId,
    externalCode,
    linkedOrderType,
  })

  if (existingOrder) {
    return existingOrder
  }

  if (!canManageLinkedOrders) {
    return null
  }

  return ordersActions.save(
    buildOrderPayload(statusIri, peopleIri, null, linkedOrderType, {
      includeDevice: false,
      externalCode,
      otherInformations: buildLinkedOrderMetadata({
        inputType: checkInputType,
        orderType: linkedOrderType,
      }),
    }),
  )
}

export const loadOpenPosDraftOrders = async ({
  cartActions,
  companyId,
  deviceId,
  usesLinkedCheckOrders,
}) => {
  if (!companyId) {
    return []
  }

  const items = await cartActions.getItems({
    app: 'POS',
    provider: '/people/' + companyId,
    'status.realStatus': 'open',
    'status.status': 'open',
    'order[id]': 'DESC',
    ...(deviceId ? {'device.device': deviceId} : {}),
    ...(!usesLinkedCheckOrders ? {orderType: DRAFT_SALE_ORDER_TYPE} : {}),
  })

  return (Array.isArray(items) ? items : [])
    .filter(order => isOpenPosCartOrder(order, {usesLinkedCheckOrders}))
    .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))
}

export const normalizeLinkedOrderId = order =>
  normalizeId(order?.id || order?.['@id'])

export {DRAFT_SALE_ORDER_TYPE}
