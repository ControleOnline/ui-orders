import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import {SafeAreaView} from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/Feather'

import {api} from '@controleonline/ui-common/src/api'
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import {
  POS_CHECK_ORDER_TYPE_NONE,
  resolvePosCheckOrderType,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap'
import {colors} from '@controleonline/../../src/styles/colors'
import {
  resolveThemePalette,
  withOpacity,
} from '@controleonline/../../src/styles/branding'
import {useStore} from '@store'
import LinkedOrderEntrySheet from '@controleonline/ui-orders/src/react/components/LinkedOrderEntrySheet'
import OrderIdentityLabel from '@controleonline/ui-orders/src/react/components/OrderIdentityLabel'
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
import styles from './LinkedOrderSettlementPage.styles'

const normalizeText = value => String(value ?? '').trim()
const normalizeStatusKey = value => normalizeText(value).toLowerCase()

const extractCollectionItems = response => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.member)) return response.member
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member']
  return []
}

const buildStatusIriFromId = value => {
  const normalizedId = String(value || '').replace(/\D/g, '')
  return normalizedId ? `/statuses/${normalizedId}` : null
}

const toEntityIri = (value, resourceName) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    if (value.startsWith('/')) {
      return value
    }

    const normalizedId = value.replace(/\D/g, '').trim()
    return normalizedId ? `/${resourceName}/${normalizedId}` : null
  }

  if (typeof value === 'number') {
    return value > 0 ? `/${resourceName}/${value}` : null
  }

  if (typeof value === 'object') {
    return (
      value?.['@id'] ||
      toEntityIri(value?.id, resourceName) ||
      null
    )
  }

  return null
}

const formatHumanLabel = value =>
  normalizeText(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())

const translateOrderStatus = value => {
  const normalizedStatus = normalizeStatusKey(value)
  if (!normalizedStatus) {
    return ''
  }

  return global.t?.t('orders', 'status', normalizedStatus) || formatHumanLabel(value)
}

const isTerminalOrder = order => {
  const realStatus = normalizeStatusKey(order?.status?.realStatus)
  return ['closed', 'canceled', 'cancelled'].includes(realStatus)
}

const resolveInvoiceStatusLabel = invoice =>
  global.t?.t('orders', 'status', normalizeStatusKey(invoice?.status?.status)) ||
  translateOrderStatus(invoice?.status?.status || invoice?.status?.realStatus)

const resolveInvoicePaymentLabel = invoice =>
  normalizeText(
    invoice?.paymentType?.paymentType ||
      invoice?.paymentType?.payment ||
      invoice?.paymentType?.name,
  ) ||
  (global.t?.t('orders', 'label', 'paymentMethod') || 'Payment')

const summarizeInvoices = invoices => {
  const safeInvoices = Array.isArray(invoices) ? invoices : []

  const paidAmount = safeInvoices.reduce((total, invoice) => {
    if (normalizeStatusKey(invoice?.status?.realStatus) !== 'closed') {
      return total
    }

    return total + Number(invoice?.price || 0)
  }, 0)

  return {
    count: safeInvoices.length,
    paidAmount,
  }
}

const collectOrderDescendants = (rootOrderId, orders) => {
  const childrenByParentId = new Map()

  ;(Array.isArray(orders) ? orders : []).forEach(order => {
    const parentId = normalizeEntityId(order?.mainOrderId || order?.mainOrder)
    const orderId = normalizeEntityId(order)

    if (!parentId || !orderId) {
      return
    }

    if (!childrenByParentId.has(parentId)) {
      childrenByParentId.set(parentId, [])
    }

    childrenByParentId.get(parentId).push(order)
  })

  const descendants = []
  const visited = new Set()

  const walk = (parentId, depth) => {
    const children = childrenByParentId.get(parentId) || []

    children
      .slice()
      .sort((left, right) => Number(left?.id || 0) - Number(right?.id || 0))
      .forEach(child => {
        const childId = normalizeEntityId(child)

        if (!childId || visited.has(childId)) {
          return
        }

        visited.add(childId)
        descendants.push({
          ...child,
          __treeDepth: depth,
        })
        walk(childId, depth + 1)
      })
  }

  walk(rootOrderId, 1)
  return descendants
}

let linkedOrderOpenStatusIriCache = null

const resolveOpenOrderStatusIri = async fallbackStatusId => {
  if (linkedOrderOpenStatusIriCache) {
    return linkedOrderOpenStatusIriCache
  }

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
      matchedStatus?.['@id'] ||
      buildStatusIriFromId(matchedStatus?.id) ||
      fallbackIri

    if (resolvedIri) {
      linkedOrderOpenStatusIriCache = resolvedIri
    }

    return resolvedIri
  } catch {
    return fallbackIri
  }
}

export default function LinkedOrderSettlementPage({navigation, route}) {
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
  const linkedOrderType = useMemo(
    () =>
      normalizeLinkedOrderType(route?.params?.orderType) ||
      resolvePosCheckOrderType(runtimeDeviceConfig?.configs),
    [route?.params?.orderType, runtimeDeviceConfig?.configs],
  )
  const orderLabel = useMemo(
    () => resolveLinkedOrderLabel(linkedOrderType),
    [linkedOrderType],
  )
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

  useEffect(() => {
    const title =
      global.t?.t('orders', 'title', 'linkedOrderSettlement') ||
      `${orderLabel} settlement`

    navigation.setOptions({title})
  }, [navigation, orderLabel])

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
            itemsPerPage: 300,
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
        itemsPerPage: 25,
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
        itemsPerPage: 250,
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

  const handleIdentifyLinkedOrder = useCallback(async () => {
    if (!canUseSettlementScreen || !companyIri) {
      return
    }

    const linkedOrderInput = await requestLinkedOrderInput()
    const externalCode = normalizeText(linkedOrderInput?.externalCode)

    if (!externalCode) {
      return
    }

    setActionLoading('identify')
    try {
      const settlementOrder =
        linkedOrderInput?.settlementOrder ||
        (await ensureSettlementOrder(linkedOrderInput))
      if (!settlementOrder) {
        throw new Error(
          global.t?.t('orders', 'message', 'linkedOrderCodeRequired') ||
            `A ${orderLabel.toLowerCase()} code is required to continue.`,
        )
      }

      const candidateRootOrder = await resolveSettlementRootOrder(settlementOrder)

      if (!primaryOrder) {
        await refreshSettlementTree(candidateRootOrder)
        showSuccess?.(
          `${orderLabel} ${externalCode} ready for settlement.`,
          {position: 'center'},
        )
        return
      }

      const currentPrimaryRoot = await resolveSettlementRootOrder(primaryOrder)
      const currentPrimaryRootId = normalizeEntityId(currentPrimaryRoot)
      const candidateRootId = normalizeEntityId(candidateRootOrder)

      if (
        currentPrimaryRootId &&
        candidateRootId &&
        currentPrimaryRootId !== candidateRootId
      ) {
        await mergeSettlementOrderIntoPrimary({
          primaryRootOrder: currentPrimaryRoot,
          secondaryRootOrder: candidateRootOrder,
          linkedOrderInput,
        })
        await refreshSettlementTree(currentPrimaryRootId)
        showSuccess?.(
          `${orderLabel} ${externalCode} linked to the primary ${orderLabel.toLowerCase()}.`,
          {position: 'center'},
        )
        return
      }

      await refreshSettlementTree(currentPrimaryRootId || candidateRootId)
      showSuccess?.(
        `${orderLabel} ${externalCode} added to the current settlement.`,
        {position: 'center'},
      )
    } catch (error) {
      showError?.(
        error?.message ||
          `Unable to identify the ${orderLabel.toLowerCase()} for settlement.`,
      )
    } finally {
      setActionLoading('')
    }
  }, [
    canUseSettlementScreen,
    companyIri,
    ensureSettlementOrder,
    mergeSettlementOrderIntoPrimary,
    orderLabel,
    primaryOrder,
    refreshSettlementTree,
    requestLinkedOrderInput,
    resolveSettlementRootOrder,
    showError,
    showSuccess,
  ])

  const handleRefresh = useCallback(async () => {
    const rootOrderId = normalizeEntityId(primaryOrder) || routeRootOrderId
    if (!rootOrderId) {
      return
    }

    await refreshSettlementTree(rootOrderId)
  }, [primaryOrder, refreshSettlementTree, routeRootOrderId])

  const handleOpenOrderDetails = useCallback(
    order => {
      navigation.navigate(
        'OrderDetails',
        buildOrderDetailsRouteParams(
          order,
          buildManagerPdvRouteParams({showBottomCart: false}),
        ),
      )
    },
    [navigation],
  )

  const handleOpenCheckout = useCallback(() => {
    if (!primaryOrder) {
      return
    }

    navigation.navigate(
      'Checkout',
      buildCheckoutRouteParams(
        primaryOrder,
        buildManagerPdvRouteParams({showBottomCart: false}),
      ),
    )
  }, [navigation, primaryOrder])

  const runCloseSettlementTree = useCallback(async () => {
    const primaryOrderId = normalizeEntityId(primaryOrder)
    if (!primaryOrderId) {
      return
    }

    if (pendingAmount > 0.009) {
      showError?.(
        `Pay the full ${orderLabel.toLowerCase()} balance before closing it.`,
      )
      return
    }

    setActionLoading('close')
    try {
      const closeQueue = [...treeOrders]
        .slice()
        .sort(
          (left, right) =>
            Number(right?.__treeDepth || 0) - Number(left?.__treeDepth || 0),
        )
        .concat(primaryOrder)
        .filter(order => !isTerminalOrder(order))

      for (const order of closeQueue) {
        const orderId = normalizeEntityId(order)
        if (!orderId) {
          continue
        }

        await api.post(`/orders/${orderId}/delivered`, {})
      }

      selectPrimaryOrder(null)
      setTreeOrders([])
      setTreeInvoices([])
      showSuccess?.(
        `${orderLabel} settlement closed successfully.`,
        {position: 'center'},
      )
    } catch (error) {
      showError?.(
        error?.message ||
          `Unable to close the ${orderLabel.toLowerCase()} settlement.`,
      )
    } finally {
      setActionLoading('')
    }
  }, [
    orderLabel,
    pendingAmount,
    primaryOrder,
    selectPrimaryOrder,
    showError,
    showSuccess,
    treeOrders,
  ])

  const handleCloseSettlement = useCallback(() => {
    if (!primaryOrder) {
      return
    }

    Alert.alert(
      global.t?.t('orders', 'title', 'settlement') || `${orderLabel} settlement`,
      pendingAmount > 0.009
        ? `This ${orderLabel.toLowerCase()} still has an open balance.`
        : `Close this ${orderLabel.toLowerCase()} and every linked sale order?`,
      pendingAmount > 0.009
        ? [{text: global.t?.t('orders', 'button', 'ok') || 'OK'}]
        : [
            {
              text: global.t?.t('orders', 'button', 'cancel') || 'Cancel',
              style: 'cancel',
            },
            {
              text: global.t?.t('orders', 'button', 'confirm') || 'Confirm',
              onPress: () => {
                void runCloseSettlementTree()
              },
            },
          ],
    )
  }, [orderLabel, pendingAmount, primaryOrder, runCloseSettlementTree])

  useEffect(() => {
    if (!routeRootOrderId || !companyIri || !canUseSettlementScreen) {
      return
    }

    void refreshSettlementTree(routeRootOrderId)
  }, [canUseSettlementScreen, companyIri, refreshSettlementTree, routeRootOrderId])

  if (!currentCompany?.id) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {backgroundColor: palette.background || '#F8FAFC'},
        ]}
        edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={34} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Select a company</Text>
          <Text style={styles.centerStateText}>
            The settlement workflow depends on the active company to find open tabs,
            tables and invoices.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!canUseSettlementScreen) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {backgroundColor: palette.background || '#F8FAFC'},
        ]}
        edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="slash" size={34} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Settlement disabled</Text>
          <Text style={styles.centerStateText}>
            This PDV does not use linked tabs or tables, so the settlement screen
            is hidden here.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const primaryContext = getLinkedOrderContext(primaryOrder)

  return (
    <SafeAreaView
      style={[
        styles.container,
        {backgroundColor: palette.background || '#F8FAFC'},
      ]}
      edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loadingTree}
            onRefresh={() => {
              void handleRefresh()
            }}
            tintColor={palette.primary}
          />
        }>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View
              style={[
                styles.heroIconWrap,
                {backgroundColor: withOpacity(palette.primary, 0.12)},
              ]}>
              <Icon name="layers" size={20} color={palette.primary} />
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>
                {global.t?.t('orders', 'title', 'linkedOrderSettlement') ||
                  `${orderLabel} settlement`}
              </Text>
              <Text style={styles.heroText}>
                {primaryOrder
                  ? `Collect payments, link more ${orderLabel.toLowerCase()}s and close the full settlement tree from here.`
                  : `Identify one or more ${orderLabel.toLowerCase()}s to centralize invoices and collect the remaining balance.`}
              </Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <TouchableOpacity
              activeOpacity={0.88}
              disabled={actionLoading !== ''}
              onPress={() => {
                void handleIdentifyLinkedOrder()
              }}
              style={[
                styles.primaryAction,
                {backgroundColor: palette.primary},
                actionLoading === 'identify' && styles.actionDisabled,
              ]}>
              {actionLoading === 'identify' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="plus-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>
                    {primaryOrder
                      ? `Link ${orderLabel}`
                      : `Identify ${orderLabel}`}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              disabled={!primaryOrder || actionLoading !== ''}
              onPress={handleOpenCheckout}
              style={[
                styles.secondaryAction,
                !primaryOrder && styles.actionDisabled,
              ]}>
              <Icon name="credit-card" size={16} color="#0F172A" />
              <Text style={styles.secondaryActionText}>Open checkout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loadingTree && !primaryOrder ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={palette.primary} />
            <Text style={styles.loadingText}>Loading settlement data...</Text>
          </View>
        ) : null}

        {!primaryOrder ? (
          <View style={styles.emptyCard}>
            <Icon name="hash" size={30} color="#94A3B8" />
            <Text style={styles.emptyTitle}>
              No {orderLabel.toLowerCase()} selected
            </Text>
            <Text style={styles.emptyText}>
              Start by identifying the first {orderLabel.toLowerCase()}. The screen
              will create it when needed and keep every linked sale under the same
              financial root.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.primaryCard}>
              <View style={styles.primaryHeader}>
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>Primary {orderLabel}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => handleOpenOrderDetails(primaryOrder)}
                  style={styles.inlineLink}>
                  <Icon name="external-link" size={14} color={palette.primary} />
                  <Text style={[styles.inlineLinkText, {color: palette.primary}]}>
                    Details
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.primaryCode}>
                {primaryContext.externalCode ||
                  `${orderLabel} #${normalizeEntityId(primaryOrder) || '-'}`}
              </Text>
              <Text style={styles.primarySubtitle}>
                Order #{normalizeEntityId(primaryOrder) || '-'} ·{' '}
                {translateOrderStatus(primaryOrder?.status?.status || primaryOrder?.status?.realStatus)}
              </Text>

              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Total</Text>
                  <Text style={styles.metricValue}>
                    {Formatter.formatMoney(primaryOrderTotal)}
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Paid</Text>
                  <Text style={[styles.metricValue, styles.metricValueSuccess]}>
                    {Formatter.formatMoney(invoiceSummary.paidAmount)}
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Pending</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      pendingAmount > 0.009
                        ? styles.metricValueDanger
                        : styles.metricValueSuccess,
                    ]}>
                    {Formatter.formatMoney(pendingAmount)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Linked {orderLabel}s
                </Text>
                <Text style={styles.sectionMeta}>
                  {settlementOrders.length}
                </Text>
              </View>

              <View style={styles.rowList}>
                {settlementOrders.map(order => {
                  const orderId = normalizeEntityId(order)
                  const orderContext = getLinkedOrderContext(order)
                  const isPrimaryOrder = orderId === normalizeEntityId(primaryOrder)

                  return (
                    <TouchableOpacity
                      key={`settlement-order-${orderId}`}
                      activeOpacity={0.88}
                      onPress={() => handleOpenOrderDetails(order)}
                      style={styles.listRow}>
                      <View style={styles.listRowMain}>
                        <Text style={styles.listRowTitle}>
                          {orderContext.externalCode ||
                            `${orderLabel} #${orderId || '-'}`}
                        </Text>
                        <Text style={styles.listRowSubtitle}>
                          {translateOrderStatus(
                            order?.status?.status || order?.status?.realStatus,
                          )}
                        </Text>
                      </View>

                      <View style={styles.listRowMeta}>
                        {isPrimaryOrder ? (
                          <View style={styles.primaryChip}>
                            <Text style={styles.primaryChipText}>Primary</Text>
                          </View>
                        ) : null}
                        <Text style={styles.listRowAmount}>
                          {Formatter.formatMoney(Number(order?.price || 0))}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Linked sale orders</Text>
                <Text style={styles.sectionMeta}>{childSaleOrders.length}</Text>
              </View>

              {childSaleOrders.length ? (
                <View style={styles.rowList}>
                  {childSaleOrders.map(order => {
                    const orderId = normalizeEntityId(order)

                    return (
                      <TouchableOpacity
                        key={`child-order-${orderId}`}
                        activeOpacity={0.88}
                        onPress={() => handleOpenOrderDetails(order)}
                        style={styles.listRow}>
                        <View style={styles.listRowMain}>
                          <OrderIdentityLabel
                            order={order}
                            primaryTextStyle={styles.listRowTitle}
                            secondaryTextStyle={styles.listRowSubtitle}
                            showSecondary={false}
                          />
                          <Text style={styles.listRowSubtitle}>
                            {translateOrderStatus(
                              order?.status?.status || order?.status?.realStatus,
                            )}
                          </Text>
                        </View>

                        <Text style={styles.listRowAmount}>
                          {Formatter.formatMoney(Number(order?.price || 0))}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              ) : (
                <Text style={styles.emptySectionText}>
                  No sale orders are linked to this {orderLabel.toLowerCase()} yet.
                </Text>
              )}
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Invoices</Text>
                <Text style={styles.sectionMeta}>{invoiceSummary.count}</Text>
              </View>

              {invoiceCards.length ? (
                <View style={styles.rowList}>
                  {invoiceCards.map(invoice => {
                    const invoiceId = normalizeEntityId(invoice)
                    const invoiceClosed =
                      normalizeStatusKey(invoice?.status?.realStatus) === 'closed'

                    return (
                      <View key={`invoice-${invoiceId}`} style={styles.invoiceRow}>
                        <View style={styles.invoiceMain}>
                          <Text style={styles.listRowTitle}>
                            {resolveInvoicePaymentLabel(invoice)}
                          </Text>
                          <Text style={styles.listRowSubtitle}>
                            {Formatter.formatDateYmdTodmY(
                              invoice?.dueDate || invoice?.invoice_date,
                              true,
                            ) || 'No due date'}
                          </Text>
                        </View>

                        <View style={styles.invoiceMeta}>
                          <View
                            style={[
                              styles.invoiceStatusBadge,
                              invoiceClosed
                                ? styles.invoiceStatusBadgeClosed
                                : styles.invoiceStatusBadgeOpen,
                            ]}>
                            <Text
                              style={[
                                styles.invoiceStatusText,
                                invoiceClosed
                                  ? styles.invoiceStatusTextClosed
                                  : styles.invoiceStatusTextOpen,
                              ]}>
                              {resolveInvoiceStatusLabel(invoice)}
                            </Text>
                          </View>
                          <Text style={styles.listRowAmount}>
                            {Formatter.formatMoney(Number(invoice?.price || 0))}
                          </Text>
                        </View>
                      </View>
                    )
                  })}
                </View>
              ) : (
                <Text style={styles.emptySectionText}>
                  No invoices were registered for this settlement yet.
                </Text>
              )}
            </View>

            <View style={styles.footerActions}>
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={actionLoading !== ''}
                onPress={handleOpenCheckout}
                style={[
                  styles.footerPrimaryButton,
                  {backgroundColor: palette.primary},
                  actionLoading !== '' && styles.actionDisabled,
                ]}>
                <Icon name="dollar-sign" size={16} color="#FFFFFF" />
                <Text style={styles.footerPrimaryButtonText}>
                  {pendingAmount > 0.009 ? 'Charge balance' : 'Review payments'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.88}
                disabled={actionLoading === 'close'}
                onPress={handleCloseSettlement}
                style={[
                  styles.footerSecondaryButton,
                  actionLoading === 'close' && styles.actionDisabled,
                ]}>
                {actionLoading === 'close' ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <>
                    <Icon name="check-circle" size={16} color="#0F172A" />
                    <Text style={styles.footerSecondaryButtonText}>Close settlement</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <LinkedOrderEntrySheet
        onCancel={() => resolveLinkedOrderEntry(null)}
        onSubmit={resolveLinkedOrderEntry}
        orderType={linkedOrderEntryState?.orderType || linkedOrderType || 'tab'}
        preferredInputType={linkedOrderEntryState?.preferredInputType || preferredInputType}
        validateInput={linkedOrderEntryState?.validateInput || null}
        visible={!!linkedOrderEntryState}
      />
    </SafeAreaView>
  )
}
