import {
  buildLinkedOrderMetadata,
  resolveLinkedOrderLabel,
} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'
import {
  DRAFT_SALE_ORDER_TYPE,
  LINKED_ORDER_CODE_REQUIRED_ERROR,
  normalizeId,
} from '@controleonline/ui-orders/src/react/utils/posCartHelpers'
import {resolvePosOpenOrderStatusIri} from './status'

export const createEnsureActiveOrderRequestKey = (storageKey, forceNew) =>
  `${storageKey}:${forceNew ? 'new' : 'resume'}`

export const hasActiveEnsureConsumer = entry =>
  Array.from(entry?.consumers || []).some(
    consumer => !consumer.signal || consumer.signal.aborted !== true,
  )

export const assertActiveEnsureConsumer = (entry, buildCancelledError) => {
  if (!hasActiveEnsureConsumer(entry)) {
    throw buildCancelledError()
  }
}

export const runEnsureActiveOrder = async ({
  activeOrder,
  buildCancelledError,
  buildOrderPayload,
  checkInputType,
  companyId,
  defaultStatusId,
  ensureSettlementOrder,
  findOpenLinkedSessionOrder,
  forceNew,
  getRecentLinkedOrderInput,
  linkedOrderType,
  loadStoredDraftOrder,
  materializeOpenPosOrder,
  ordersActions,
  peopleIri,
  providedLinkedOrderInput,
  rememberLinkedOrderInput,
  requestEntry,
  requestLinkedOrderCode,
  syncActiveOrderState,
  usesLinkedCheckOrders,
}) => {
  assertActiveEnsureConsumer(requestEntry, buildCancelledError)

  if (!forceNew) {
    const storedDraftOrder = await loadStoredDraftOrder()
    assertActiveEnsureConsumer(requestEntry, buildCancelledError)
    if (storedDraftOrder) {
      return storedDraftOrder
    }
  }

  if (!companyId) {
    throw new Error('Empresa nao disponivel para criar o carrinho POS.')
  }

  const orderOpenStatusIri = await resolvePosOpenOrderStatusIri(defaultStatusId)
  assertActiveEnsureConsumer(requestEntry, buildCancelledError)

  if (!orderOpenStatusIri) {
    throw new Error('Nao foi possivel resolver o status open/open do pedido no PDV.')
  }

  if (usesLinkedCheckOrders) {
    const linkedOrderInput =
      (
        providedLinkedOrderInput && {
          externalCode: String(providedLinkedOrderInput?.externalCode || '').trim(),
          inputType: String(providedLinkedOrderInput?.inputType || checkInputType)
            .trim()
            .toLowerCase(),
          settlementOrder: providedLinkedOrderInput?.settlementOrder || null,
        }
      ) ||
      getRecentLinkedOrderInput() ||
      (await requestLinkedOrderCode())
    assertActiveEnsureConsumer(requestEntry, buildCancelledError)

    const externalCode = String(linkedOrderInput?.externalCode || '').trim()
    const linkedOrderInputType = String(
      linkedOrderInput?.inputType || checkInputType,
    )
      .trim()
      .toLowerCase()

    if (!externalCode) {
      const error = new Error(
        global.t?.t('orders', 'message', 'linkedOrderCodeRequired') ||
          'A tab, table or stamp code is required to continue.',
      )
      error.code = LINKED_ORDER_CODE_REQUIRED_ERROR
      throw error
    }

    const settlementOrder =
      linkedOrderInput?.settlementOrder ||
      (await ensureSettlementOrder({
        externalCode,
        peopleIri,
        statusIri: orderOpenStatusIri,
      }))
    assertActiveEnsureConsumer(requestEntry, buildCancelledError)

    rememberLinkedOrderInput?.({
      createdAt: Date.now(),
      externalCode,
      inputType: linkedOrderInputType,
      settlementOrder,
    })

    if (!settlementOrder) {
      const orderLabel = resolveLinkedOrderLabel(linkedOrderType)
      throw new Error(
        global.t?.t(
          'orders',
          'message',
          'linkedOrderManagementDisabled',
        ) ||
          `This device can only use ${orderLabel.toLowerCase()}s that are already open.`,
      )
    }

    const settlementOrderId = normalizeId(
      settlementOrder?.id || settlementOrder?.['@id'],
    )
    if (!settlementOrderId) {
      throw new Error(
        global.t?.t('orders', 'message', 'invalidSettlementOrder') ||
          'Unable to retrieve valid settlement order ID.',
      )
    }

    const existingLinkedOrder = await findOpenLinkedSessionOrder(settlementOrderId)
    assertActiveEnsureConsumer(requestEntry, buildCancelledError)

    if (existingLinkedOrder) {
      return syncActiveOrderState(
        await materializeOpenPosOrder(existingLinkedOrder),
      )
    }

    if (forceNew) {
      syncActiveOrderState(null)
    }

    const createdLinkedOrder = await ordersActions.save(
      buildOrderPayload(
        orderOpenStatusIri,
        peopleIri,
        null,
        DRAFT_SALE_ORDER_TYPE,
        {
          externalCode,
          otherInformations: buildLinkedOrderMetadata({
            inputType: linkedOrderInputType,
            orderType: linkedOrderType,
          }),
        },
      ),
    )

    const orderIri =
      createdLinkedOrder['@id'] ||
      `/orders/${normalizeId(createdLinkedOrder.id)}`
    const linkedOrder = await ordersActions.save({
      '@id': orderIri,
      id: Number(normalizeId(createdLinkedOrder.id)),
      mainOrderId: Number(settlementOrderId),
    })

    return syncActiveOrderState(
      await materializeOpenPosOrder(linkedOrder),
    )
  }

  assertActiveEnsureConsumer(requestEntry, buildCancelledError)

  if (forceNew) {
    syncActiveOrderState(null)
  }

  const createdOrder = await ordersActions.save(
    buildOrderPayload(orderOpenStatusIri, peopleIri, null, DRAFT_SALE_ORDER_TYPE),
  )

  return syncActiveOrderState(
    await materializeOpenPosOrder(createdOrder),
  )
}
