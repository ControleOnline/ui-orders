import {useCallback, useEffect, useMemo, useRef, useState} from 'react'

import {api} from '@controleonline/ui-common/src/api'
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService'
import {
  canManagePosCheckOrders,
  POS_CHECK_ORDER_TYPE_NONE,
  resolvePosCheckOrderType,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap'
import {useStore} from '@store'
import {resolveCounterDestinationFromOrders} from '@controleonline/ui-orders/src/react/utils/counterOrderFlow'
import {
  buildLinkedOrderMetadata,
  getLinkedOrderContext,
  isLinkedChildOrder,
  isLinkedParentOrder,
  matchesLinkedOrderExternalCode,
} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'

const normalizeStatusKey = value => String(value || '').trim().toLowerCase()
const DRAFT_SALE_ORDER_TYPE = 'cart'
const LINKED_CHILD_ORDER_TYPE = 'sale'
const LINKED_ORDER_CODE_REQUIRED_ERROR = 'LINKED_ORDER_CODE_REQUIRED'
const RECENT_LINKED_ORDER_INPUT_TTL_MS = 20 * 1000

const buildStatusIriFromId = value => {
  const normalizedId = String(value || '').replace(/\D/g, '')
  return normalizedId ? `/statuses/${normalizedId}` : null
}

const normalizeId = value => {
  const normalizedId = String(value || '').replace(/\D/g, '')
  return normalizedId || null
}

const extractCollectionItems = response => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.member)) return response.member
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member']
  return []
}

let posOpenOrderStatusIriCache = null
const pendingEnsureActiveOrderRequests = new Map()

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
            [DRAFT_SALE_ORDER_TYPE, LINKED_CHILD_ORDER_TYPE].includes(
              normalizeStatusKey(order?.orderType),
            )
          )
        : normalizeStatusKey(order?.orderType) === DRAFT_SALE_ORDER_TYPE
    )
  )
}

const buildPosDraftOrderStorageKey = (companyId, deviceId) =>
  `pdv-active-order:${normalizeId(companyId) || '0'}:${normalizeId(deviceId) || '0'}`

const resolvePosOpenOrderStatusIri = async fallbackStatusId => {
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

export const getOrderPeopleValue = order =>
  order?.people ||
  order?.client ||
  order?.customer ||
  null

export const isLinkedOrderCodeRequiredError = error =>
  error?.code === LINKED_ORDER_CODE_REQUIRED_ERROR

export default function usePosCartSession({
  companyId = null,
  deviceId = null,
  defaultStatusId = null,
  allowLinkedOrderManagement = null,
  requestLinkedOrderInput = null,
} = {}) {
  const ordersStore = useStore('orders')
  const cartStore = useStore('cart')
  const deviceConfigStore = useStore('device_config')
  const ordersActions = ordersStore.actions
  const cartActions = cartStore.actions
  const {item: storedOrder} = ordersStore.getters
  const {item: runtimeDeviceConfig} = deviceConfigStore.getters
  const {showPrompt} = useMessage() || {}
  const [activeOrderState, setActiveOrderState] = useState(null)
  const linkedOrderType = useMemo(
    () => resolvePosCheckOrderType(runtimeDeviceConfig?.configs),
    [runtimeDeviceConfig?.configs],
  )
  const usesLinkedCheckOrders = linkedOrderType !== POS_CHECK_ORDER_TYPE_NONE
  const canManageLinkedOrders = useMemo(
    () =>
      typeof allowLinkedOrderManagement === 'boolean'
        ? allowLinkedOrderManagement
        : canManagePosCheckOrders(runtimeDeviceConfig?.configs),
    [allowLinkedOrderManagement, runtimeDeviceConfig?.configs],
  )
  const checkInputType = useMemo(
    () =>
      String(runtimeDeviceConfig?.configs?.['check-type'] || 'manual')
        .trim()
        .toLowerCase(),
    [runtimeDeviceConfig?.configs],
  )

  const storageKey = useMemo(
    () => buildPosDraftOrderStorageKey(companyId, deviceId),
    [companyId, deviceId],
  )

  const activeOrder = useMemo(() => {
    if (isOpenPosCartOrder(activeOrderState, {usesLinkedCheckOrders})) {
      return activeOrderState
    }
    if (isOpenPosCartOrder(storedOrder, {usesLinkedCheckOrders})) {
      return storedOrder
    }
    return null
  }, [activeOrderState, storedOrder, usesLinkedCheckOrders])
  const activeOrderId = normalizeId(activeOrder?.id || activeOrder?.['@id'])
  const storedOrderId = normalizeId(storedOrder?.id || storedOrder?.['@id'])
  const activeOrderIdRef = useRef(activeOrderId)
  const storedOrderIdRef = useRef(storedOrderId)
  const lastLinkedOrderInputRef = useRef(null)

  useEffect(() => {
    if (activeOrderId) {
      activeOrderIdRef.current = activeOrderId
    }
  }, [activeOrderId])

  useEffect(() => {
    if (storedOrderId) {
      storedOrderIdRef.current = storedOrderId
    }
  }, [storedOrderId])

  const clearStoredDraftOrderId = useCallback(() => {
    if (typeof localStorage === 'undefined' || !storageKey) return
    localStorage.removeItem(storageKey)
  }, [storageKey])

  const rememberDraftOrderId = useCallback(order => {
    const orderId = normalizeId(order?.id || order?.['@id'])
    if (typeof localStorage === 'undefined' || !storageKey || !orderId) return
    localStorage.setItem(storageKey, orderId)
  }, [storageKey])

  const syncActiveOrderState = useCallback(order => {
    if (order && isOpenPosCartOrder(order, {usesLinkedCheckOrders})) {
      rememberDraftOrderId(order)
      setActiveOrderState(order)
      if (typeof ordersActions.syncOrder === 'function') {
        ordersActions.syncOrder(order)
      } else {
        ordersActions.setItem(order)
      }
      return order
    }

    clearStoredDraftOrderId()
    setActiveOrderState(null)
    ordersActions.setItem({})
    return null
  }, [
    clearStoredDraftOrderId,
    ordersActions,
    rememberDraftOrderId,
    usesLinkedCheckOrders,
  ])

  const readStoredDraftOrderId = useCallback(() => {
    if (typeof localStorage === 'undefined' || !storageKey) return null
    return normalizeId(localStorage.getItem(storageKey))
  }, [storageKey])

  const buildOrderPayload = useCallback((
    statusIri,
    peopleIri = null,
    orderId = null,
    orderType = DRAFT_SALE_ORDER_TYPE,
    extraOptions = {},
  ) => {
    const payload = {
      app: 'POS',
      provider: '/people/' + companyId,
      status: statusIri,
      orderType,
    }

    if (orderId) {
      payload.id = Number(orderId)
    }

    if (peopleIri !== undefined) {
      payload.people = peopleIri
    }

    const normalizedExternalCode = String(
      extraOptions.externalCode || '',
    ).trim()
    if (normalizedExternalCode) {
      payload.externalCode = normalizedExternalCode
    }

    if (extraOptions.otherInformations) {
      payload.otherInformations = extraOptions.otherInformations
    }

    if (extraOptions.mainOrderId) {
      const normalizedMainOrderId = normalizeId(extraOptions.mainOrderId)
      if (normalizedMainOrderId) {
        payload.mainOrderId = Number(normalizedMainOrderId)
      }
    }

    if (extraOptions.includeDevice !== false && deviceId) {
      payload['device.device'] = deviceId
    }

    return payload
  }, [companyId, deviceId])

  async function requestLinkedOrderCode() {
    const buildMissingLinkedOrderCodeError = () => {
      const missingLinkedOrderCodeError = new Error(
        global.t?.t('orders', 'message', 'linkedOrderCodeRequired') ||
          'A tab or table code is required to continue.',
      )
      missingLinkedOrderCodeError.code = LINKED_ORDER_CODE_REQUIRED_ERROR
      return missingLinkedOrderCodeError
    }

    const buildLinkedOrderManagementError = () => {
      const orderLabel =
        linkedOrderType === 'table'
          ? global.t?.t('orders', 'title', 'table') || 'Table'
          : global.t?.t('orders', 'title', 'tab') || 'Tab'

      return new Error(
        global.t?.t(
          'orders',
          'message',
          'linkedOrderManagementDisabled',
        ) ||
          `This device can only use ${orderLabel.toLowerCase()}s that are already open.`,
      )
    }

    const validateLinkedOrderInput = async linkedOrderInput => {
      const externalCode = String(linkedOrderInput?.externalCode || '').trim()
      const linkedOrderInputType = String(
        linkedOrderInput?.inputType || checkInputType,
      )
        .trim()
        .toLowerCase()

      if (!externalCode) {
        throw buildMissingLinkedOrderCodeError()
      }

      const orderOpenStatusIri = await resolvePosOpenOrderStatusIri(defaultStatusId)

      if (!orderOpenStatusIri) {
        throw new Error('Nao foi possivel resolver o status open/open do pedido no PDV.')
      }

      const settlementOrder = await ensureSettlementOrder({
        externalCode,
        peopleIri: getOrderPeopleValue(activeOrder)?.['@id'] || null,
        statusIri: orderOpenStatusIri,
      })

      if (!settlementOrder) {
        throw buildLinkedOrderManagementError()
      }

      return {
        externalCode,
        inputType: linkedOrderInputType,
        settlementOrder,
      }
    }

    if (typeof requestLinkedOrderInput === 'function') {
      const requestedInput = await requestLinkedOrderInput({
        orderType: linkedOrderType,
        preferredInputType: checkInputType,
        validateInput: validateLinkedOrderInput,
      })

      if (typeof requestedInput === 'string') {
        return {
          externalCode: String(requestedInput || '').trim(),
          inputType: checkInputType,
        }
      }

      return {
        externalCode: String(requestedInput?.externalCode || '').trim(),
        inputType: String(requestedInput?.inputType || checkInputType)
          .trim()
          .toLowerCase(),
        settlementOrder: requestedInput?.settlementOrder || null,
      }
    }

    const orderLabel =
      linkedOrderType === 'table'
        ? global.t?.t('orders', 'title', 'table') || 'Table'
        : global.t?.t('orders', 'title', 'tab') || 'Tab'
    const readMethodLabel =
      checkInputType === 'barcode'
        ? global.t?.t('orders', 'label', 'barcode') || 'barcode'
        : checkInputType === 'rfid'
          ? global.t?.t('orders', 'label', 'rfid') || 'NFC / RFID'
          : global.t?.t('orders', 'label', 'code') || 'code'
    const promptValue = await showPrompt?.({
      title:
        global.t?.t('orders', 'title', 'identifyOrderBase') ||
        `Identify ${orderLabel}`,
      message:
        global.t?.t('orders', 'message', 'enterLinkedOrderCode') ||
        `Inform the ${readMethodLabel} for this ${orderLabel.toLowerCase()}.`,
      placeholder:
        global.t?.t('orders', 'placeholder', 'linkedOrderCode') ||
        `${orderLabel} ${global.t?.t('orders', 'label', 'code') || 'code'}`,
      confirmLabel: global.t?.t('orders', 'button', 'confirm') || 'Confirm',
      cancelLabel: global.t?.t('orders', 'button', 'cancel') || 'Cancel',
    })

    return {
      externalCode: String(promptValue || '').trim(),
      inputType: checkInputType,
    }
  }

  const findOpenSettlementOrder = useCallback(async externalCode => {
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
    const query = {
      ...legacyQuery,
      externalCode: normalizedExternalCode,
    }

    const exactItems = await cartActions.getItems(query)
    const exactMatch = (Array.isArray(exactItems) ? exactItems : []).find(orderItem =>
      matchesLinkedOrderExternalCode(orderItem, externalCode, linkedOrderType),
    )

    if (exactMatch) {
      return exactMatch
    }

    const items = await cartActions.getItems({
      ...legacyQuery,
    })

    return (Array.isArray(items) ? items : []).find(orderItem =>
      matchesLinkedOrderExternalCode(orderItem, externalCode, linkedOrderType),
    ) || null
  }, [cartActions, companyId, linkedOrderType])

  const findOpenLinkedSessionOrder = useCallback(async mainOrderId => {
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
      .filter(orderItem =>
        isOpenPosCartOrder(orderItem, {usesLinkedCheckOrders: true}),
      )
      .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))[0] || null
  }, [cartActions, companyId, deviceId])

  const ensureSettlementOrder = useCallback(async ({
    externalCode,
    peopleIri = null,
    statusIri,
  }) => {
    const existingOrder = await findOpenSettlementOrder(externalCode)
    if (existingOrder) {
      return existingOrder
    }

    if (!canManageLinkedOrders) {
      return null
    }

    return ordersActions.save(
      buildOrderPayload(
        statusIri,
        peopleIri,
        null,
        linkedOrderType,
        {
          includeDevice: false,
          externalCode,
          otherInformations: buildLinkedOrderMetadata({
            inputType: checkInputType,
            orderType: linkedOrderType,
          }),
        },
      ),
    )
  }, [
    buildOrderPayload,
    canManageLinkedOrders,
    checkInputType,
    findOpenSettlementOrder,
    linkedOrderType,
    ordersActions,
  ])

  const normalizeDraftOrderType = useCallback(async order => {
    if (!isOpenPosCartOrder(order, {usesLinkedCheckOrders})) {
      return order
    }

    const orderId = normalizeId(order?.id || order?.['@id'])
    const statusIri =
      order?.status?.['@id'] ||
      buildStatusIriFromId(order?.status?.id)

    if (!orderId || !statusIri) {
      return order
    }

    const linkedOrderContext = getLinkedOrderContext(order)
    if (usesLinkedCheckOrders && isLinkedChildOrder(order)) {
      if (normalizeStatusKey(order?.orderType) === LINKED_CHILD_ORDER_TYPE) {
        return order
      }

      try {
        return await ordersActions.save(
          buildOrderPayload(
            statusIri,
            getOrderPeopleValue(order)?.['@id'] || null,
            orderId,
            LINKED_CHILD_ORDER_TYPE,
            {
              mainOrderId: linkedOrderContext.mainOrderId,
              externalCode: linkedOrderContext.externalCode,
              otherInformations: buildLinkedOrderMetadata({
                inputType: linkedOrderContext.inputType || checkInputType,
                orderType: linkedOrderContext.orderType || linkedOrderType,
              }),
            },
          ),
        )
      } catch {
        return order
      }
    }

    if (normalizeStatusKey(order?.orderType) === DRAFT_SALE_ORDER_TYPE) {
      return order
    }

    try {
      return await ordersActions.save(
        buildOrderPayload(
          statusIri,
          getOrderPeopleValue(order)?.['@id'] || null,
          orderId,
          DRAFT_SALE_ORDER_TYPE,
        ),
      )
    } catch {
      return order
    }
  }, [
    buildOrderPayload,
    checkInputType,
    linkedOrderType,
    ordersActions,
    usesLinkedCheckOrders,
  ])

  const loadOpenPosDraftOrders = useCallback(async () => {
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
      .filter(orderItem =>
        isOpenPosCartOrder(orderItem, {usesLinkedCheckOrders}),
      )
      .sort(
        (left, right) =>
          Number(right?.id || 0) - Number(left?.id || 0),
      )
  }, [cartActions, companyId, deviceId, usesLinkedCheckOrders])

  const refreshActiveOrder = useCallback(async orderId => {
    const targetId = normalizeId(
      orderId ||
      activeOrderIdRef.current ||
      storedOrderIdRef.current,
    )

    if (!targetId) {
      return syncActiveOrderState(null)
    }

    try {
      const refreshedOrder = await ordersActions.get(targetId)
      return syncActiveOrderState(await normalizeDraftOrderType(refreshedOrder))
    } catch {
      return syncActiveOrderState(null)
    }
  }, [
    normalizeDraftOrderType,
    ordersActions,
    syncActiveOrderState,
  ])

  const loadStoredDraftOrder = useCallback(async () => {
    const storedOrderId = readStoredDraftOrderId()
    if (!storedOrderId) {
      return syncActiveOrderState(null)
    }

    return refreshActiveOrder(storedOrderId)
  }, [readStoredDraftOrderId, refreshActiveOrder, syncActiveOrderState])

  const materializeOpenPosOrder = useCallback(async orderCandidate => {
    const normalizedOrder = await normalizeDraftOrderType(orderCandidate)

    if (isOpenPosCartOrder(normalizedOrder, {usesLinkedCheckOrders})) {
      return normalizedOrder
    }

    const orderId = normalizeId(
      orderCandidate?.id ||
      orderCandidate?.['@id'] ||
      normalizedOrder?.id ||
      normalizedOrder?.['@id'],
    )

    if (!orderId) {
      return normalizedOrder || orderCandidate || null
    }

    try {
      const hydratedOrder = await ordersActions.get(orderId)
      const normalizedHydratedOrder = await normalizeDraftOrderType(hydratedOrder)
      return normalizedHydratedOrder || normalizedOrder || orderCandidate || null
    } catch {
      return normalizedOrder || orderCandidate || null
    }
  }, [
    normalizeDraftOrderType,
    ordersActions,
    usesLinkedCheckOrders,
  ])

  const getRecentLinkedOrderInput = useCallback(() => {
    const cachedInput = lastLinkedOrderInputRef.current
    const externalCode = String(cachedInput?.externalCode || '').trim()
    const createdAt = Number(cachedInput?.createdAt || 0)

    if (!externalCode || !createdAt) {
      return null
    }

    if (Date.now() - createdAt > RECENT_LINKED_ORDER_INPUT_TTL_MS) {
      return null
    }

    return cachedInput
  }, [])

  const ensureActiveOrder = useCallback(async (
    peopleIri = getOrderPeopleValue(activeOrder)?.['@id'] || null,
    options = {},
  ) => {
    const forceNew = options?.forceNew === true
    const providedLinkedOrderInput = options?.linkedOrderInput

    if (forceNew) {
      syncActiveOrderState(null)
    } else if (activeOrder) {
      return syncActiveOrderState(await materializeOpenPosOrder(activeOrder))
    }

    if (!forceNew && storageKey && pendingEnsureActiveOrderRequests.has(storageKey)) {
      return pendingEnsureActiveOrderRequests.get(storageKey)
    }

    const ensureRequest = (async () => {
      if (!forceNew) {
        const storedDraftOrder = await loadStoredDraftOrder()
        if (storedDraftOrder) {
          return storedDraftOrder
        }
      }

      if (!companyId) {
        throw new Error('Empresa nao disponivel para criar o carrinho POS.')
      }

      const orderOpenStatusIri = await resolvePosOpenOrderStatusIri(defaultStatusId)

      if (!orderOpenStatusIri) {
        throw new Error('Nao foi possivel resolver o status open/open do pedido no PDV.')
      }

      if (usesLinkedCheckOrders) {
        const linkedOrderInput =
          (
            providedLinkedOrderInput && {
              externalCode: String(providedLinkedOrderInput?.externalCode || '').trim(),
              inputType: String(
                providedLinkedOrderInput?.inputType || checkInputType,
              )
                .trim()
                .toLowerCase(),
              settlementOrder: providedLinkedOrderInput?.settlementOrder || null,
            }
          ) ||
          getRecentLinkedOrderInput() ||
          (await requestLinkedOrderCode())
        const externalCode = String(linkedOrderInput?.externalCode || '').trim()
        const linkedOrderInputType = String(
          linkedOrderInput?.inputType || checkInputType,
        )
          .trim()
          .toLowerCase()

        if (!externalCode) {
          const missingLinkedOrderCodeError = new Error(
            global.t?.t('orders', 'message', 'linkedOrderCodeRequired') ||
              'A tab or table code is required to continue.',
          )
          missingLinkedOrderCodeError.code = LINKED_ORDER_CODE_REQUIRED_ERROR
          throw missingLinkedOrderCodeError
        }

        const settlementOrder =
          linkedOrderInput?.settlementOrder ||
          (await ensureSettlementOrder({
            externalCode,
            peopleIri,
            statusIri: orderOpenStatusIri,
          }))

        lastLinkedOrderInputRef.current = {
          createdAt: Date.now(),
          externalCode,
          inputType: linkedOrderInputType,
          settlementOrder,
        }

        if (!settlementOrder) {
          const orderLabel =
            linkedOrderType === 'table'
              ? global.t?.t('orders', 'title', 'table') || 'Table'
              : global.t?.t('orders', 'title', 'tab') || 'Tab'

          throw new Error(
            global.t?.t(
              'orders',
              'message',
              'linkedOrderManagementDisabled',
            ) ||
              `This device can only use ${orderLabel.toLowerCase()}s that are already open.`,
          )
        }

        const settlementOrderId = normalizeId(settlementOrder?.id || settlementOrder?.['@id'])
        
        if (!settlementOrderId) {
          throw new Error(
            global.t?.t('orders', 'message', 'invalidSettlementOrder') ||
              'Unable to retrieve valid settlement order ID.',
          )
        }

        const existingLinkedOrder = await findOpenLinkedSessionOrder(settlementOrderId)

        if (existingLinkedOrder) {
          return syncActiveOrderState(
            await materializeOpenPosOrder(existingLinkedOrder),
          )
        }

        const createdLinkedOrder = await ordersActions.save(
          buildOrderPayload(
            orderOpenStatusIri,
            peopleIri,
            null,
            LINKED_CHILD_ORDER_TYPE,
            {
              externalCode,
              otherInformations: buildLinkedOrderMetadata({
                inputType: linkedOrderInputType,
                orderType: linkedOrderType,
              }),
            },
          ),
        )

        // Backend não grava mainOrderId no POST, sempre fazer UPDATE
        const orderIri = createdLinkedOrder['@id'] || `/orders/${normalizeId(createdLinkedOrder.id)}`
        const linkedOrder = await ordersActions.save({
          '@id': orderIri,
          id: Number(normalizeId(createdLinkedOrder.id)),
          mainOrderId: Number(settlementOrderId),
        })

        console.log('✅ [POS Cart] Pedido criado - PAI:', settlementOrderId, 'FILHO:', linkedOrder?.id, 'mainOrderId:', linkedOrder?.mainOrderId)

        return syncActiveOrderState(
          await materializeOpenPosOrder(linkedOrder),
        )
      }

      const createdOrder = await ordersActions.save(
        buildOrderPayload(orderOpenStatusIri, peopleIri, null, DRAFT_SALE_ORDER_TYPE),
      )

      return syncActiveOrderState(
        await materializeOpenPosOrder(createdOrder),
      )
    })()

    if (storageKey) {
      pendingEnsureActiveOrderRequests.set(storageKey, ensureRequest)
    }

    try {
      return await ensureRequest
    } finally {
      if (storageKey) {
        pendingEnsureActiveOrderRequests.delete(storageKey)
      }
    }
  }, [
    activeOrder,
    buildOrderPayload,
    companyId,
    defaultStatusId,
    ensureSettlementOrder,
    findOpenLinkedSessionOrder,
    loadStoredDraftOrder,
    materializeOpenPosOrder,
    getRecentLinkedOrderInput,
    ordersActions,
    requestLinkedOrderCode,
    storageKey,
    syncActiveOrderState,
    usesLinkedCheckOrders,
    canManageLinkedOrders,
    checkInputType,
    linkedOrderType,
    requestLinkedOrderInput,
  ])

  const syncOrderPeople = useCallback(async nextPeople => {
    const currentOrder = activeOrder || storedOrder

    if (!currentOrder?.id || !companyId) {
      return currentOrder
    }

    const currentPeopleIri =
      getOrderPeopleValue(currentOrder)?.['@id'] ||
      null
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
      usesLinkedCheckOrders && isLinkedChildOrder(currentOrder)
        ? LINKED_CHILD_ORDER_TYPE
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
  }, [
    activeOrder,
    buildOrderPayload,
    checkInputType,
    companyId,
    defaultStatusId,
    linkedOrderType,
    ordersActions,
    storedOrder,
    syncActiveOrderState,
    usesLinkedCheckOrders,
  ])

  const prepareNewDraftOrder = useCallback(() => {
    syncActiveOrderState(null)
  }, [syncActiveOrderState])

  const resolveCounterStartDestination = useCallback(async () => {
    const openDraftOrders = await loadOpenPosDraftOrders()
    const initialDestination = resolveCounterDestinationFromOrders(
      openDraftOrders,
    )

    if (initialDestination.orderCount === 0) {
      syncActiveOrderState(null)
      return initialDestination
    }

    if (initialDestination.orderCount > 1) {
      syncActiveOrderState(null)
      return initialDestination
    }

    const singleOrderId = normalizeId(
      initialDestination.order?.id || initialDestination.order?.['@id'],
    )
    let detailedOrder = initialDestination.order

    if (singleOrderId) {
      detailedOrder = (await refreshActiveOrder(singleOrderId)) || detailedOrder
    } else if (detailedOrder) {
      detailedOrder =
        syncActiveOrderState(await normalizeDraftOrderType(detailedOrder)) ||
        detailedOrder
    }

    const finalDestination = resolveCounterDestinationFromOrders([
      detailedOrder,
    ])

    return finalDestination
  }, [
    loadOpenPosDraftOrders,
    normalizeDraftOrderType,
    refreshActiveOrder,
    syncActiveOrderState,
  ])

  return {
    activeOrder,
    canManageLinkedOrders,
    clearStoredDraftOrderId,
    ensureActiveOrder,
    usesLinkedCheckOrders,
    loadStoredDraftOrder,
    loadOpenPosDraftOrders,
    prepareNewDraftOrder,
    refreshActiveOrder,
    resolveCounterStartDestination,
    syncActiveOrderState,
    syncOrderPeople,
  }
}
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
