import {
  buildLinkedOrderMetadata,
  getLinkedOrderContext,
  isLinkedChildOrder,
} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'
import {
  DRAFT_SALE_ORDER_TYPE,
  LINKED_SALE_ORDER_TYPE,
  buildStatusIriFromId,
  normalizeStatusKey,
} from '@controleonline/ui-orders/src/react/utils/posCartHelpers'
import {
  getOrderPeopleValue,
  resolvePosOpenOrderStatusIri,
} from './status'

export const syncPosOrderPeople = async ({
  activeOrder,
  buildOrderPayload,
  checkInputType,
  companyId,
  defaultStatusId,
  linkedOrderType,
  nextPeople,
  ordersActions,
  storedOrder,
  syncActiveOrderState,
  usesLinkedCheckOrders,
}) => {
  const currentOrder = activeOrder || storedOrder

  if (!currentOrder?.id || !companyId) {
    return currentOrder
  }

  const currentPeopleIri = getOrderPeopleValue(currentOrder)?.['@id'] || null
  const nextPeopleIri = nextPeople?.['@id'] || null

  if (currentPeopleIri === nextPeopleIri) {
    return currentOrder
  }

  const currentStatusIri =
    currentOrder?.status?.['@id'] ||
    buildStatusIriFromId(currentOrder?.status?.id)

  if (!currentStatusIri) {
    return currentOrder
  }

  const currentLinkedOrderContext = getLinkedOrderContext(currentOrder)
  const nextOrderType =
    usesLinkedCheckOrders &&
    isLinkedChildOrder(currentOrder) &&
    normalizeStatusKey(currentOrder?.orderType) === LINKED_SALE_ORDER_TYPE
      ? LINKED_SALE_ORDER_TYPE
      : DRAFT_SALE_ORDER_TYPE
  const updatedOrder = await ordersActions.save(
    buildOrderPayload(
      currentStatusIri,
      nextPeopleIri,
      currentOrder.id,
      nextOrderType,
      usesLinkedCheckOrders && isLinkedChildOrder(currentOrder)
        ? {
            mainOrderId: currentLinkedOrderContext.mainOrderId,
            externalCode: currentLinkedOrderContext.externalCode,
            otherInformations: buildLinkedOrderMetadata({
              inputType: currentLinkedOrderContext.inputType || checkInputType,
              orderType: currentLinkedOrderContext.orderType || linkedOrderType,
            }),
          }
        : {},
    ),
  )

  if (usesLinkedCheckOrders && currentLinkedOrderContext.mainOrderId) {
    const orderOpenStatusIri = await resolvePosOpenOrderStatusIri(defaultStatusId)

    if (orderOpenStatusIri) {
      await ordersActions.save(
        buildOrderPayload(
          orderOpenStatusIri,
          nextPeopleIri,
          currentLinkedOrderContext.mainOrderId,
          currentLinkedOrderContext.orderType || linkedOrderType,
          {
            includeDevice: false,
            externalCode: currentLinkedOrderContext.externalCode,
            otherInformations: buildLinkedOrderMetadata({
              inputType: currentLinkedOrderContext.inputType || checkInputType,
              orderType: currentLinkedOrderContext.orderType || linkedOrderType,
            }),
          },
        ),
      )
    }
  }

  return syncActiveOrderState(updatedOrder)
}
