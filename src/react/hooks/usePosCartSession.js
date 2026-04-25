import {useCallback, useEffect, useMemo, useRef, useState} from 'react'

import {api} from '@controleonline/ui-common/src/api'
import {useStore} from '@store'

const normalizeStatusKey = value => String(value || '').trim().toLowerCase()
const DRAFT_SALE_ORDER_TYPE = 'cart'

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

export const isOpenPosCartOrder = order =>
  String(order?.app || '').trim().toUpperCase() === 'POS' &&
  normalizeStatusKey(order?.status?.realStatus) === 'open' &&
  normalizeStatusKey(order?.status?.status) === 'open'

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
        itemsPerPage: 10,
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

export default function usePosCartSession({
  companyId = null,
  deviceId = null,
  defaultStatusId = null,
} = {}) {
  const ordersStore = useStore('orders')
  const ordersActions = ordersStore.actions
  const {item: storedOrder} = ordersStore.getters
  const [activeOrderState, setActiveOrderState] = useState(null)

  const storageKey = useMemo(
    () => buildPosDraftOrderStorageKey(companyId, deviceId),
    [companyId, deviceId],
  )

  const activeOrder = useMemo(() => {
    if (isOpenPosCartOrder(activeOrderState)) return activeOrderState
    if (isOpenPosCartOrder(storedOrder)) return storedOrder
    return null
  }, [activeOrderState, storedOrder])
  const activeOrderId = normalizeId(activeOrder?.id || activeOrder?.['@id'])
  const storedOrderId = normalizeId(storedOrder?.id || storedOrder?.['@id'])
  const activeOrderIdRef = useRef(activeOrderId)
  const storedOrderIdRef = useRef(storedOrderId)

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
    if (order && isOpenPosCartOrder(order)) {
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
  }, [clearStoredDraftOrderId, ordersActions, rememberDraftOrderId])

  const readStoredDraftOrderId = useCallback(() => {
    if (typeof localStorage === 'undefined' || !storageKey) return null
    return normalizeId(localStorage.getItem(storageKey))
  }, [storageKey])

  const buildOrderPayload = useCallback((
    statusIri,
    peopleIri = null,
    orderId = null,
    orderType = DRAFT_SALE_ORDER_TYPE,
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

    if (deviceId) {
      payload['device.device'] = deviceId
    }

    return payload
  }, [companyId, deviceId])

  const normalizeDraftOrderType = useCallback(async order => {
    if (
      !isOpenPosCartOrder(order) ||
      normalizeStatusKey(order?.orderType) === DRAFT_SALE_ORDER_TYPE
    ) {
      return order
    }

    const orderId = normalizeId(order?.id || order?.['@id'])
    const statusIri =
      order?.status?.['@id'] ||
      buildStatusIriFromId(order?.status?.id)

    if (!orderId || !statusIri) {
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
  }, [buildOrderPayload, ordersActions])

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

  const ensureActiveOrder = useCallback(async (peopleIri = getOrderPeopleValue(activeOrder)?.['@id'] || null) => {
    if (activeOrder) {
      return syncActiveOrderState(await normalizeDraftOrderType(activeOrder))
    }

    if (storageKey && pendingEnsureActiveOrderRequests.has(storageKey)) {
      return pendingEnsureActiveOrderRequests.get(storageKey)
    }

    const ensureRequest = (async () => {
      const storedDraftOrder = await loadStoredDraftOrder()
      if (storedDraftOrder) {
        return storedDraftOrder
      }

      if (!companyId) {
        throw new Error('Empresa nao disponivel para criar o carrinho POS.')
      }

      const orderOpenStatusIri = await resolvePosOpenOrderStatusIri(defaultStatusId)

      if (!orderOpenStatusIri) {
        throw new Error('Nao foi possivel resolver o status open/open do pedido no PDV.')
      }

      const createdOrder = await ordersActions.save(
        buildOrderPayload(orderOpenStatusIri, peopleIri, null, DRAFT_SALE_ORDER_TYPE),
      )

      return syncActiveOrderState(createdOrder)
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
    loadStoredDraftOrder,
    normalizeDraftOrderType,
    ordersActions,
    storageKey,
    syncActiveOrderState,
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

    const updatedOrder = await ordersActions.save(
      buildOrderPayload(
        currentStatusIri,
        nextPeopleIri,
        currentOrder.id,
        DRAFT_SALE_ORDER_TYPE,
      ),
    )

    return syncActiveOrderState(updatedOrder)
  }, [
    activeOrder,
    buildOrderPayload,
    companyId,
    ordersActions,
    storedOrder,
    syncActiveOrderState,
  ])

  return {
    activeOrder,
    clearStoredDraftOrderId,
    ensureActiveOrder,
    loadStoredDraftOrder,
    refreshActiveOrder,
    syncActiveOrderState,
    syncOrderPeople,
  }
}
