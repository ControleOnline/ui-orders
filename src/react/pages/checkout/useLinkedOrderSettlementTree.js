import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Alert} from 'react-native'
import {api} from '@controleonline/ui-common/src/api'
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService'
import {
  POS_CHECK_ORDER_TYPE_NONE,
  resolvePosCheckOrderTypeForShop,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap'
import {
  normalizeBooleanConfig,
  SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY,
} from '@controleonline/ui-common/src/react/utils/shopConfig'
import {colors} from '@controleonline/../../src/styles/colors'
import {resolveThemePalette} from '@controleonline/../../src/styles/branding'
import {useStore} from '@store'
import {
  buildLinkedOrderMetadata,
  getLinkedOrderContext,
  isLinkedParentOrder,
  normalizeEntityId,
  normalizeLinkedOrderType,
  resolveLinkedOrderLabel,
} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'
import {
  buildCheckoutRouteParams,
  buildManagerPdvRouteParams,
  buildOrderDetailsRouteParams,
} from '@controleonline/ui-orders/src/react/utils/orderRoute'
import {
  normalizeText,
  normalizeStatusKey,
  extractCollectionItems,
  buildStatusIriFromId,
  toEntityIri,
  isTerminalOrder,
  summarizeInvoices,
  collectOrderDescendants,
  resolveOpenOrderStatusIri,
} from './linkedOrderSettlementHelpers'
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
const loyaltyCouponsEnabled = useMemo(
  () => {
    const hasLoyaltyCouponsEnabledKey = Object.prototype.hasOwnProperty.call(
      currentCompany?.configs || {},
      SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY,
    );
    return hasLoyaltyCouponsEnabledKey
      ? normalizeBooleanConfig(
          currentCompany?.configs?.[SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY],
        )
      : true;
  },
  [currentCompany?.configs],
)
const linkedOrderType = useMemo(
  () =>
    (() => {
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
    })(),
  [currentCompany?.configs, loyaltyCouponsEnabled, route?.params?.orderType, runtimeDeviceConfig?.configs],
)
const orderLabel = resolveLinkedOrderLabel(linkedOrderType)
const preferredInputType = useMemo(
  () =>
    normalizeStatusKey(runtimeDeviceConfig?.configs?.['check-type']) || 'manual',
  [runtimeDeviceConfig?.configs],
)
const companyId = normalizeEntityId(currentCompany)
const companyIri = companyId ? `/people/${companyId}` : null
const canUseSettlementScreen = linkedOrderType !== POS_CHECK_ORDER_TYPE_NONE
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
const invoiceSummary = useMemo(() => summarizeInvoices(treeInvoices), [treeInvoices])
const primaryOrderTotal = Number(primaryOrder?.price || 0)
const pendingAmount = useMemo(
  () => Math.max(primaryOrderTotal - invoiceSummary.paidAmount, 0),
  [invoiceSummary.paidAmount, primaryOrderTotal],
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
const buildSettlementPayload = useCallback(
  ({
    baseOrder = null,
    externalCode = '',
    inputType = '',
    mainOrderId = null,
    statusIri = null,
  } = {}) => {
    const baseContext = getLinkedOrderContext(baseOrder)
    const resolvedProviderIri =
      toEntityIri(baseOrder?.provider, 'people') || companyIri
    const resolvedStatusIri =
      statusIri || toEntityIri(baseOrder?.status, 'statuses')
    const resolvedExternalCode = normalizeText(
      externalCode || baseContext.externalCode,
    )
    const payload = {
      app: baseOrder?.app || 'POS',
      orderType: linkedOrderType,
      ...(resolvedProviderIri ? {provider: resolvedProviderIri} : {}),
      ...(resolvedStatusIri ? {status: resolvedStatusIri} : {}),
      ...(resolvedExternalCode ? {externalCode: resolvedExternalCode} : {}),
      otherInformations: buildLinkedOrderMetadata({
        inputType: inputType || baseContext.inputType || preferredInputType,
        orderType: linkedOrderType,
      }),
    }
    const baseOrderId = normalizeEntityId(baseOrder)
    if (baseOrderId) {
      payload.id = Number(baseOrderId)
    }
    if (mainOrderId) {
      payload.mainOrderId = Number(mainOrderId)
    }
    return payload
  },
  [companyIri, linkedOrderType, preferredInputType],
)
const resolveSettlementRootOrder = useCallback(
  async order => {
    let resolvedOrder = order
    const visitedOrderIds = new Set()
    while (normalizeEntityId(resolvedOrder?.mainOrderId || resolvedOrder?.mainOrder)) {
      const nextOrderId = normalizeEntityId(
        resolvedOrder?.mainOrderId || resolvedOrder?.mainOrder,
      )
      if (!nextOrderId || visitedOrderIds.has(nextOrderId)) {
        break
      }
      visitedOrderIds.add(nextOrderId)
      const nextOrder = await ordersActions.get(nextOrderId).catch(() => null)
      if (!nextOrder) {
        break
      }
      resolvedOrder = nextOrder
    }
    return resolvedOrder
  },
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
      const [rootOrder, companyOrders, invoices] = await Promise.all([
        ordersActions.get(rootOrderId),
        ordersActions.getItems({
          app: 'POS',
          provider: companyIri,
          'status.realStatus': 'open',
          'order[id]': 'DESC',
        }),
        invoiceActions.getItems({
          'order.order': `/orders/${rootOrderId}`,
        }),
      ])
      const descendants = collectOrderDescendants(
        rootOrderId,
        extractCollectionItems(companyOrders),
      )
      selectPrimaryOrder(rootOrder)
      setTreeOrders(descendants)
      setTreeInvoices(extractCollectionItems(invoices))
    } catch (error) {
      showError?.(
        error?.message ||
          `Unable to load the ${orderLabel.toLowerCase()} settlement tree.`,
      )
    } finally {
      setLoadingTree(false)
    }
  },
  [companyIri, invoiceActions, orderLabel, ordersActions, selectPrimaryOrder, showError],
)
const findSettlementOrderByCode = useCallback(
  async externalCode => {
    if (!companyIri || !linkedOrderType || !externalCode) {
      return null
    }
    const normalizedExternalCode = normalizeText(externalCode)
    const legacyQuery = {
      app: 'POS',
      orderType: linkedOrderType,
      provider: companyIri,
      'status.realStatus': 'open',
      'order[id]': 'DESC',
    }
    const query = {
      ...legacyQuery,
      externalCode: normalizedExternalCode,
    }
    const exactSettlementOrders = await ordersActions.getItems(query)
    const exactMatch = extractCollectionItems(exactSettlementOrders).find(
      orderItem => {
        const orderContext = getLinkedOrderContext(orderItem)
        return normalizeText(orderContext.externalCode) !== '' &&
          normalizeText(orderContext.externalCode).toLowerCase() ===
            normalizeText(externalCode).toLowerCase()
      },
    )
    if (exactMatch) {
      return exactMatch
    }
    const settlementOrders = await ordersActions.getItems({
      ...legacyQuery,
    })
    return (
      extractCollectionItems(settlementOrders).find(orderItem => {
        const orderContext = getLinkedOrderContext(orderItem)
        return normalizeText(orderContext.externalCode) !== '' &&
          normalizeText(orderContext.externalCode).toLowerCase() ===
            normalizeText(externalCode).toLowerCase()
      }) || null
    )
  },
  [companyIri, linkedOrderType, ordersActions],
)
const ensureSettlementOrder = useCallback(
  async linkedOrderInput => {
    const externalCode = normalizeText(linkedOrderInput?.externalCode)
    const inputType = normalizeText(linkedOrderInput?.inputType) || preferredInputType
    if (!externalCode || !companyIri) {
      return null
    }
    const existingOrder = await findSettlementOrderByCode(externalCode)
    if (existingOrder) {
      return existingOrder
    }
    const openOrderStatusIri = await resolveOpenOrderStatusIri(
      defaultCompany?.configs?.['pos-default-status'],
    )
    return ordersActions.save(
      buildSettlementPayload({
        externalCode,
        inputType,
        statusIri: openOrderStatusIri,
      }),
    )
  },
  [
    buildSettlementPayload,
    companyIri,
    defaultCompany?.configs,
    findSettlementOrderByCode,
    ordersActions,
    preferredInputType,
  ],
)
const reopenSettlementOrderIfPaid = useCallback(
  async order => {
    if (
      normalizeStatusKey(order?.status?.realStatus) !== 'open' ||
      normalizeStatusKey(order?.status?.status) !== 'paid'
    ) {
      return order
    }
    const openOrderStatusIri = await resolveOpenOrderStatusIri(
      defaultCompany?.configs?.['pos-default-status'],
    )
    return ordersActions.save(
      buildSettlementPayload({
        baseOrder: order,
        externalCode: getLinkedOrderContext(order).externalCode,
        inputType: getLinkedOrderContext(order).inputType || preferredInputType,
        mainOrderId: normalizeEntityId(order?.mainOrderId || order?.mainOrder) || null,
        statusIri: openOrderStatusIri,
      }),
    )
  },
  [buildSettlementPayload, defaultCompany?.configs, ordersActions, preferredInputType],
)
const linkExistingInvoicesToPrimary = useCallback(
  async (primaryOrderId, settlementOrder) => {
    const settlementOrderId = normalizeEntityId(settlementOrder)
    if (!settlementOrderId || !primaryOrderId || settlementOrderId === primaryOrderId) {
      return
    }
    const invoices = await invoiceActions.getItems({
      'order.order': `/orders/${settlementOrderId}`,
    })
    for (const invoice of extractCollectionItems(invoices)) {
      const invoiceIri = toEntityIri(invoice, 'invoices')
      if (!invoiceIri) {
        continue
      }
      await api.post('/order_invoices', {
        invoice: invoiceIri,
        order: `/orders/${primaryOrderId}`,
        realPrice: Number(invoice?.price || 0),
      })
    }
  },
  [invoiceActions],
)
const mergeSettlementOrderIntoPrimary = useCallback(
  async ({primaryRootOrder, secondaryRootOrder, linkedOrderInput}) => {
    const primaryOrderId = normalizeEntityId(primaryRootOrder)
    const secondaryOrderId = normalizeEntityId(secondaryRootOrder)
    if (!primaryOrderId || !secondaryOrderId || primaryOrderId === secondaryOrderId) {
      return primaryRootOrder
    }
    const secondaryContext = getLinkedOrderContext(secondaryRootOrder)
    await ordersActions.save(
      buildSettlementPayload({
        baseOrder: secondaryRootOrder,
        externalCode:
          secondaryContext.externalCode || linkedOrderInput?.externalCode || '',
        inputType:
          secondaryContext.inputType ||
          linkedOrderInput?.inputType ||
          preferredInputType,
        mainOrderId: primaryOrderId,
      }),
    )
    await reopenSettlementOrderIfPaid(primaryRootOrder)
    await linkExistingInvoicesToPrimary(primaryOrderId, secondaryRootOrder)
    return ordersActions.get(primaryOrderId).catch(() => primaryRootOrder)
  },
  [
    buildSettlementPayload,
    linkExistingInvoicesToPrimary,
    ordersActions,
    preferredInputType,
    reopenSettlementOrderIfPaid,
  ],
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
  }
}
