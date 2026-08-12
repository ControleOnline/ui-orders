import {api} from '@controleonline/ui-common/src/api'
import {
  getLinkedOrderContext,
  isLinkedParentOrder,
} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'
import {
  normalizeStatusKey,
  buildStatusIriFromId,
  normalizeId,
  extractCollectionItems,
  DRAFT_SALE_ORDER_TYPE,
  LINKED_SALE_ORDER_TYPE,
  LINKED_ORDER_CODE_REQUIRED_ERROR,
  POS_ORDER_CREATION_CANCELLED_ERROR,
  buildCancelledOrderCreationError,
} from '@controleonline/ui-orders/src/react/utils/posCartHelpers'

let posOpenOrderStatusIriCache = null

export const buildPosDraftOrderStorageKey = (companyId, deviceId) =>
  `pdv-active-order:${normalizeId(companyId) || '0'}:${normalizeId(deviceId) || '0'}`

export const resolvePosOpenOrderStatusIri = async fallbackStatusId => {
  if (posOpenOrderStatusIriCache) return posOpenOrderStatusIriCache

  const fallbackIri = buildStatusIriFromId(fallbackStatusId)

  try {
    const response = await api.fetch('statuses', {
      params: {
        context: 'order',
        realStatus: 'open',
        status: 'open',
      },
    })
    const items = extractCollectionItems(response)
    const matchedStatus =
      items.find(
        item =>
          normalizeStatusKey(item?.realStatus) === 'open' &&
          normalizeStatusKey(item?.status) === 'open',
      ) || items[0]
    const resolvedIri =
      matchedStatus?.['@id'] || buildStatusIriFromId(matchedStatus?.id) || fallbackIri

    if (resolvedIri) {
      posOpenOrderStatusIriCache = resolvedIri
    }

    return resolvedIri
  } catch {
    return fallbackIri
  }
}

export const isOpenPosCartOrder = (
  order,
  {usesLinkedCheckOrders = false} = {},
) => {
  const linkedOrderContext = getLinkedOrderContext(order)

  return (
    String(order?.app || '').trim().toUpperCase() === 'POS' &&
    normalizeStatusKey(order?.status?.realStatus) === 'open' &&
    normalizeStatusKey(order?.status?.status) === 'open' &&
    !isLinkedParentOrder(order) &&
    (
      usesLinkedCheckOrders
        ? (
            (
              !!linkedOrderContext.mainOrderId ||
              !!linkedOrderContext.externalCode
            ) &&
            [DRAFT_SALE_ORDER_TYPE, LINKED_SALE_ORDER_TYPE].includes(
              normalizeStatusKey(order?.orderType),
            )
          )
        : normalizeStatusKey(order?.orderType) === DRAFT_SALE_ORDER_TYPE
    )
  )
}

export const getOrderPeopleValue = order =>
  order?.people ||
  order?.client ||
  order?.customer ||
  null

export const isLinkedOrderCodeRequiredError = error =>
  error?.code === LINKED_ORDER_CODE_REQUIRED_ERROR

export const isPosOrderCreationCancelledError = error =>
  error?.code === POS_ORDER_CREATION_CANCELLED_ERROR

export {buildCancelledOrderCreationError}
