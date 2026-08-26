import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService'
import {
  POS_CHECK_ORDER_TYPE_NONE,
  resolvePosCheckOrderTypeForShop,
  isPosLocalChargeEnabled,
  canManagePosCheckOrders,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap'
import {
  normalizeBooleanConfig,
  SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY,
} from '@controleonline/ui-common/src/react/utils/shopConfig'
import {colors} from '@controleonline/../../src/styles/colors'
import {resolveThemePalette} from '@controleonline/../../src/styles/branding'
import {useStore} from '@store'
import {
  isLinkedParentOrder,
  normalizeEntityId,
  normalizeLinkedOrderType,
  resolveLinkedOrderLabel,
} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'
import {
  normalizeText,
  normalizeStatusKey,
  summarizeInvoices,
  listPendingCartOrders,
  partitionTreeRounds,
} from './linkedOrderSettlementHelpers'
import {
  buildSettlementPayload as buildSettlementPayloadOp,
  ensureSettlementOrder as ensureSettlementOrderOp,
  findSettlementOrderByCode as findSettlementOrderByCodeOp,
  linkExistingInvoicesToPrimary as linkExistingInvoicesToPrimaryOp,
  loadSettlementTree,
  loadOpenLinkedRootOrders,
  mergeSettlementOrderIntoPrimary as mergeSettlementOrderIntoPrimaryOp,
  reopenSettlementOrderIfPaid as reopenSettlementOrderIfPaidOp,
  resolveSettlementRootOrder as resolveSettlementRootOrderOp,
} from './linkedOrderSettlementTreeOps'

export function useLinkedOrderSettlementTree({navigation, route}) {
  const peopleStore = useStore('people')
  const themeStore = useStore('theme')
  const ordersStore = useStore('orders')
  const invoiceStore = useStore('invoice')
  const deviceConfigStore = useStore('device_config')
  const {showError, showSuccess} = useMessage() || {}
  const {currentCompany, defaultCompany} = peopleStore.getters
  const {colors: themeColors} = themeStore.getters
  const {item: runtimeDeviceConfig} = deviceConfigStore.getters
  const ordersActions = ordersStore.actions
  const invoiceActions = invoiceStore.actions

  const routeRootOrderId = useMemo(
    () => normalizeEntityId(route?.params?.rootOrderId),
    [route?.params?.rootOrderId],
  )

  const loyaltyCouponsEnabled = useMemo(() => {
    const hasLoyaltyCouponsEnabledKey = Object.prototype.hasOwnProperty.call(
      currentCompany?.configs || {},
      SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY,
    )
    return hasLoyaltyCouponsEnabledKey
      ? normalizeBooleanConfig(
          currentCompany?.configs?.[SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY],
        )
      : true
  }, [currentCompany?.configs])

  const linkedOrderType = useMemo(() => {
    const routeOrderType = normalizeLinkedOrderType(route?.params?.orderType)
    if (routeOrderType === 'stamp' && !loyaltyCouponsEnabled) {
      return POS_CHECK_ORDER_TYPE_NONE
    }
    return (
      routeOrderType ||
      resolvePosCheckOrderTypeForShop(
        runtimeDeviceConfig?.configs,
        currentCompany?.configs,
      )
    )
  }, [
    currentCompany?.configs,
    loyaltyCouponsEnabled,
    route?.params?.orderType,
    runtimeDeviceConfig?.configs,
  ])

  const orderLabel = resolveLinkedOrderLabel(linkedOrderType)
  const preferredInputType = useMemo(
    () =>
      normalizeStatusKey(runtimeDeviceConfig?.configs?.['check-type']) ||
      'manual',
    [runtimeDeviceConfig?.configs],
  )
  const companyId = normalizeEntityId(currentCompany)
  const companyIri = companyId ? `/people/${companyId}` : null
  const canUseSettlementScreen = linkedOrderType !== POS_CHECK_ORDER_TYPE_NONE
  const canChargeLocally = isPosLocalChargeEnabled(runtimeDeviceConfig?.configs)
  const canManageRoots = canManagePosCheckOrders(runtimeDeviceConfig?.configs)
  const palette = useMemo(
    () =>
      resolveThemePalette(
        {...themeColors, ...(currentCompany?.theme?.colors || {})},
        colors,
      ),
    [themeColors, currentCompany?.id],
  )

  const linkedOrderEntryResolverRef = useRef(null)
  const [linkedOrderEntryState, setLinkedOrderEntryState] = useState(null)
  const [openRootOrders, setOpenRootOrders] = useState([])
  const [loadingOpenRoots, setLoadingOpenRoots] = useState(false)
  const [primaryOrder, setPrimaryOrder] = useState(null)
  const [treeOrders, setTreeOrders] = useState([])
  const [treeInvoices, setTreeInvoices] = useState([])
  const [loadingTree, setLoadingTree] = useState(false)
  const [actionLoading, setActionLoading] = useState('')

  const selectPrimaryOrder = useCallback(
    order => {
      setPrimaryOrder(order || null)
      navigation.setParams({
        rootOrderId: normalizeEntityId(order) || null,
      })
    },
    [navigation],
  )

  const buildSettlementPayload = useCallback(
    args =>
      buildSettlementPayloadOp({
        ...args,
        companyIri,
        linkedOrderType,
        preferredInputType,
      }),
    [companyIri, linkedOrderType, preferredInputType],
  )

  const resolveSettlementRootOrder = useCallback(
    order => resolveSettlementRootOrderOp(order, ordersActions),
    [ordersActions],
  )

  const refreshSettlementTree = useCallback(
    async targetOrderId => {
      const rootOrderId = normalizeEntityId(targetOrderId)
      if (!companyIri || !rootOrderId) {
        selectPrimaryOrder(null)
        setTreeOrders([])
        setTreeInvoices([])
        return
      }
      setLoadingTree(true)
      try {
        const {rootOrder, descendants, invoices} = await loadSettlementTree({
          rootOrderId,
          companyIri,
          ordersActions,
          invoiceActions,
        })
        selectPrimaryOrder(rootOrder)
        setTreeOrders(descendants)
        setTreeInvoices(invoices)
      } catch (error) {
        showError?.(
          error?.message ||
            `Unable to load the ${orderLabel.toLowerCase()} settlement tree.`,
        )
      } finally {
        setLoadingTree(false)
      }
    },
    [
      companyIri,
      invoiceActions,
      orderLabel,
      ordersActions,
      selectPrimaryOrder,
      showError,
    ],
  )

  const handleRefresh = useCallback(async () => {
    const rootOrderId = normalizeEntityId(primaryOrder) || routeRootOrderId
    if (!rootOrderId) {
      return
    }
    await refreshSettlementTree(rootOrderId)
  }, [primaryOrder, refreshSettlementTree, routeRootOrderId])

  useEffect(() => {
    if (!routeRootOrderId || !companyIri || !canUseSettlementScreen) {
      return
    }
    void refreshSettlementTree(routeRootOrderId)
  }, [canUseSettlementScreen, companyIri, refreshSettlementTree, routeRootOrderId])

  const findSettlementOrderByCode = useCallback(
    externalCode =>
      findSettlementOrderByCodeOp({
        externalCode,
        companyIri,
        linkedOrderType,
        ordersActions,
      }),
    [companyIri, linkedOrderType, ordersActions],
  )

  const ensureSettlementOrder = useCallback(
    linkedOrderInput =>
      ensureSettlementOrderOp({
        linkedOrderInput,
        companyIri,
        preferredInputType,
        defaultCompany,
        ordersActions,
        linkedOrderType,
      }),
    [
      companyIri,
      defaultCompany,
      linkedOrderType,
      ordersActions,
      preferredInputType,
    ],
  )

  const reopenSettlementOrderIfPaid = useCallback(
    order =>
      reopenSettlementOrderIfPaidOp({
        order,
        defaultCompany,
        ordersActions,
        companyIri,
        linkedOrderType,
        preferredInputType,
      }),
    [companyIri, defaultCompany, linkedOrderType, ordersActions, preferredInputType],
  )

  const linkExistingInvoicesToPrimary = useCallback(
    (primaryOrderId, settlementOrder) =>
      linkExistingInvoicesToPrimaryOp({
        primaryOrderId,
        settlementOrder,
        invoiceActions,
      }),
    [invoiceActions],
  )

  const mergeSettlementOrderIntoPrimary = useCallback(
    args =>
      mergeSettlementOrderIntoPrimaryOp({
        ...args,
        preferredInputType,
        companyIri,
        linkedOrderType,
        ordersActions,
        invoiceActions,
        defaultCompany,
      }),
    [
      companyIri,
      defaultCompany,
      invoiceActions,
      linkedOrderType,
      ordersActions,
      preferredInputType,
    ],
  )

  function requestLinkedOrderInput() {
    return new Promise(resolve => {
      linkedOrderEntryResolverRef.current = resolve
      setLinkedOrderEntryState({
        orderType: linkedOrderType,
        preferredInputType,
        validateInput: async linkedOrderInput => {
          const externalCode = normalizeText(linkedOrderInput?.externalCode)
          const inputType =
            normalizeText(linkedOrderInput?.inputType) || preferredInputType
          if (!externalCode) {
            throw new Error(
              global.t?.t('orders', 'message', 'linkedOrderCodeRequired') ||
                `A ${orderLabel.toLowerCase()} code is required to continue.`,
            )
          }
          const settlementOrder = await ensureSettlementOrder({
            externalCode,
            inputType,
          })
          if (!settlementOrder) {
            throw new Error(
              global.t?.t('orders', 'message', 'linkedOrderInvalidCode') ||
                `Nao foi possivel identificar a ${orderLabel.toLowerCase()} informada.`,
            )
          }
          return {
            externalCode,
            inputType,
            settlementOrder,
          }
        },
      })
    })
  }

  const resolveLinkedOrderEntry = useCallback(result => {
    const resolve = linkedOrderEntryResolverRef.current
    linkedOrderEntryResolverRef.current = null
    setLinkedOrderEntryState(null)
    resolve?.(result)
  }, [])

  useEffect(
    () => () => {
      linkedOrderEntryResolverRef.current?.(null)
      linkedOrderEntryResolverRef.current = null
    },
    [],
  )

  const settlementTitle =
    global.t?.t('orders', 'title', 'linkedOrderSettlement') ||
    `${orderLabel} settlement`

  useEffect(() => {
    navigation.setOptions({title: settlementTitle})
  }, [navigation, settlementTitle])

  const invoiceSummary = useMemo(
    () => summarizeInvoices(treeInvoices),
    [treeInvoices],
  )
  const primaryOrderTotal = Number(primaryOrder?.price || 0)
  const pendingAmount = useMemo(
    () => Math.max(primaryOrderTotal - invoiceSummary.paidAmount, 0),
    [invoiceSummary.paidAmount, primaryOrderTotal],
  )
  const refreshOpenRootOrders = useCallback(async () => {
    if (!canUseSettlementScreen || !companyIri || !linkedOrderType) {
      setOpenRootOrders([])
      return []
    }
    setLoadingOpenRoots(true)
    try {
      const roots = await loadOpenLinkedRootOrders({
        companyIri,
        linkedOrderType,
        ordersActions,
      })
      setOpenRootOrders(roots)
      return roots
    } catch (error) {
      showError?.(
        error?.message ||
          `Unable to list open ${orderLabel.toLowerCase()}s.`,
      )
      return []
    } finally {
      setLoadingOpenRoots(false)
    }
  }, [
    canUseSettlementScreen,
    companyIri,
    linkedOrderType,
    orderLabel,
    ordersActions,
    showError,
  ])

  useEffect(() => {
    if (!canUseSettlementScreen || !companyIri) {
      setOpenRootOrders([])
      return
    }
    void refreshOpenRootOrders()
  }, [canUseSettlementScreen, companyIri, linkedOrderType, refreshOpenRootOrders])

  const pendingCartOrders = useMemo(
    () => listPendingCartOrders(treeOrders),
    [treeOrders],
  )
  const treeRounds = useMemo(
    () => partitionTreeRounds(treeOrders),
    [treeOrders],
  )

  const settlementOrders = useMemo(
    () =>
      [
        ...(primaryOrder ? [primaryOrder] : []),
        ...treeOrders.filter(order => isLinkedParentOrder(order)),
      ].filter(Boolean),
    [primaryOrder, treeOrders],
  )
  const childSaleOrders = useMemo(
    () => treeOrders.filter(order => !isLinkedParentOrder(order)),
    [treeOrders],
  )
  const invoiceCards = useMemo(
    () =>
      (Array.isArray(treeInvoices) ? treeInvoices : [])
        .slice()
        .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0)),
    [treeInvoices],
  )

  return {
    palette,
    orderLabel,
    linkedOrderType,
    preferredInputType,
    loadingTree,
    actionLoading,
    setActionLoading,
    primaryOrder,
    settlementOrders,
    childSaleOrders,
    invoiceCards,
    invoiceSummary,
    pendingAmount,
    primaryOrderTotal,
    linkedOrderEntryState,
    resolveLinkedOrderEntry,
    handleRefresh,
    refreshSettlementTree,
    buildSettlementPayload,
    ensureSettlementOrder,
    findSettlementOrderByCode,
    mergeSettlementOrderIntoPrimary,
    linkExistingInvoicesToPrimary,
    reopenSettlementOrderIfPaid,
    resolveSettlementRootOrder,
    ordersActions,
    showError,
    showSuccess,
    defaultCompany,
    navigation,
    canUseSettlementScreen,
    companyIri,
    routeRootOrderId,
    requestLinkedOrderInput,
    currentCompany,
    treeOrders,
    selectPrimaryOrder,
    setTreeOrders,
    setTreeInvoices,
    openRootOrders,
    loadingOpenRoots,
    refreshOpenRootOrders,
    canChargeLocally,
    canManageRoots,
    pendingCartOrders,
    treeRounds,
  }
}
