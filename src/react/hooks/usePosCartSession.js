import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService'
import {
  canManagePosCheckOrders,
  POS_CHECK_ORDER_TYPE_TAB,
  POS_CHECK_ORDER_TYPE_TABLE,
  resolvePosCheckOrderTypeForShop,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap'
import {useStore} from '@store'
import {isLinkedChildOrder} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'

import {
  normalizeStatusKey,
  buildStatusIriFromId,
  normalizeId,
  DRAFT_SALE_ORDER_TYPE,
  RECENT_LINKED_ORDER_INPUT_TTL_MS,
} from '@controleonline/ui-orders/src/react/utils/posCartHelpers'
import {
  buildCancelledOrderCreationError,
  buildPosDraftOrderStorageKey,
  getOrderPeopleValue,
  isLinkedOrderCodeRequiredError,
  isOpenPosCartOrder,
  isPosOrderCreationCancelledError,
} from '@controleonline/ui-orders/src/react/hooks/posCartSession/status'
import {requestPosLinkedOrderCode} from '@controleonline/ui-orders/src/react/hooks/posCartSession/linkedOrderInput'
import {buildPosOrderPayload} from '@controleonline/ui-orders/src/react/hooks/posCartSession/orderPayload'
import {
  createEnsureActiveOrderRequestKey,
  runEnsureActiveOrder,
} from '@controleonline/ui-orders/src/react/hooks/posCartSession/ensureActiveOrder'
import {
  materializeOpenPosOrder as materializeOpenPosOrderHelper,
  refreshPosActiveOrder,
  resolveCounterStartDestinationFromSession,
} from '@controleonline/ui-orders/src/react/hooks/posCartSession/hydration'
import {syncPosOrderPeople} from '@controleonline/ui-orders/src/react/hooks/posCartSession/peopleSync'
import {
  ensureSettlementOrder as ensureSettlementOrderHelper,
  findOpenLinkedSessionOrder as findOpenLinkedSessionOrderHelper,
  loadOpenPosDraftOrders as loadOpenPosDraftOrdersHelper,
} from '@controleonline/ui-orders/src/react/hooks/posCartSession/linkedOrders'

export {
  getOrderPeopleValue,
  isLinkedOrderCodeRequiredError,
  isOpenPosCartOrder,
  isPosOrderCreationCancelledError,
}

const pendingEnsureActiveOrderRequests = new Map()

export default function usePosCartSession({
  companyId = null,
  deviceId = null,
  defaultStatusId = null,
  allowLinkedOrderManagement = null,
  requestLinkedOrderInput = null,
  companyConfigs = null,
} = {}) {
  const ordersStore = useStore('orders')
  const orderProductsStore = useStore('order_products')
  const cartStore = useStore('cart')
  const deviceConfigStore = useStore('device_config')
  const ordersActions = ordersStore.actions
  const orderProductsActions = orderProductsStore.actions
  const cartActions = cartStore.actions
  const {item: storedOrder} = ordersStore.getters
  const {item: runtimeDeviceConfig} = deviceConfigStore.getters
  const {showPrompt} = useMessage() || {}
  const [activeOrderState, setActiveOrderState] = useState(null)
  const linkedOrderType = useMemo(
    () =>
      resolvePosCheckOrderTypeForShop(
        runtimeDeviceConfig?.configs,
        companyConfigs,
      ),
    [companyConfigs, runtimeDeviceConfig?.configs],
  )
  /*
   * @agents Stamp configures loyalty behavior at checkout. Only tabs and
   * tables require a linked parent order and an identification code.
   */
  const usesLinkedCheckOrders =
    linkedOrderType === POS_CHECK_ORDER_TYPE_TAB ||
    linkedOrderType === POS_CHECK_ORDER_TYPE_TABLE
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
  ) =>
    buildPosOrderPayload({
      companyId,
      deviceId,
      extraOptions,
      orderId,
      orderType,
      peopleIri,
      statusIri,
    }),
  [companyId, deviceId])

  const findOpenLinkedSessionOrder = useCallback(async mainOrderId => {
    return findOpenLinkedSessionOrderHelper({
      cartActions,
      companyId,
      deviceId,
      mainOrderId,
    })
  }, [cartActions, companyId, deviceId])

  const ensureSettlementOrder = useCallback(async ({
    externalCode,
    peopleIri = null,
    statusIri,
  }) => {
    return ensureSettlementOrderHelper({
      buildOrderPayload,
      canManageLinkedOrders,
      cartActions,
      checkInputType,
      companyId,
      externalCode,
      linkedOrderType,
      ordersActions,
      peopleIri,
      statusIri,
    })
  }, [
    buildOrderPayload,
    canManageLinkedOrders,
    cartActions,
    checkInputType,
    companyId,
    linkedOrderType,
    ordersActions,
  ])

  const requestLinkedOrderCode = useCallback(
    () =>
      requestPosLinkedOrderCode({
        activeOrder,
        checkInputType,
        defaultStatusId,
        ensureSettlementOrder,
        linkedOrderType,
        requestLinkedOrderInput,
        showPrompt,
      }),
    [
      activeOrder,
      checkInputType,
      defaultStatusId,
      ensureSettlementOrder,
      linkedOrderType,
      requestLinkedOrderInput,
      showPrompt,
    ],
  )

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

    if (usesLinkedCheckOrders && isLinkedChildOrder(order)) {
      /*
       * @agents A linked POS child remains a cart while the waiter is adding items.
       * Promotion to sale belongs to the explicit confirmation/production action.
       */
      return order
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
    ordersActions,
    usesLinkedCheckOrders,
  ])

  const loadOpenPosDraftOrders = useCallback(async () => {
    return loadOpenPosDraftOrdersHelper({
      cartActions,
      companyId,
      deviceId,
      usesLinkedCheckOrders,
    })
  }, [cartActions, companyId, deviceId, usesLinkedCheckOrders])

  const refreshActiveOrder = useCallback(async orderId => {
    return refreshPosActiveOrder({
      activeOrderId: activeOrderIdRef.current,
      normalizeDraftOrderType,
      orderProductsActions,
      ordersActions,
      storedOrderId: storedOrderIdRef.current,
      syncActiveOrderState,
      targetOrderId: orderId,
    })
  }, [
    normalizeDraftOrderType,
    orderProductsActions,
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
    return materializeOpenPosOrderHelper({
      normalizeDraftOrderType,
      orderCandidate,
      ordersActions,
      usesLinkedCheckOrders,
    })
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
    const requestSignal = options?.signal || null
    const requestKey = createEnsureActiveOrderRequestKey(storageKey, forceNew)
    const consumer = {signal: requestSignal}

    if (!forceNew && activeOrder) {
      return syncActiveOrderState(await materializeOpenPosOrder(activeOrder))
    }

    const pendingEntry = pendingEnsureActiveOrderRequests.get(requestKey)

    if (pendingEntry) {
      pendingEntry.consumers.add(consumer)
      return pendingEntry.promise
    }

    const requestEntry = {
      consumers: new Set([consumer]),
      promise: null,
    }

    const ensureRequest = runEnsureActiveOrder({
      activeOrder,
      buildCancelledError: buildCancelledOrderCreationError,
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
      rememberLinkedOrderInput: input => {
        lastLinkedOrderInputRef.current = input
      },
      requestEntry,
      requestLinkedOrderCode,
      syncActiveOrderState,
      usesLinkedCheckOrders,
    })

    requestEntry.promise = ensureRequest
    pendingEnsureActiveOrderRequests.set(requestKey, requestEntry)

    try {
      return await ensureRequest
    } finally {
      if (pendingEnsureActiveOrderRequests.get(requestKey) === requestEntry) {
        pendingEnsureActiveOrderRequests.delete(requestKey)
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
    return syncPosOrderPeople({
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
    })
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
    return resolveCounterStartDestinationFromSession({
      loadOpenPosDraftOrders,
      normalizeDraftOrderType,
      refreshActiveOrder,
      syncActiveOrderState,
    })
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
