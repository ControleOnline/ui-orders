import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Text,
  TextInput,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native'

import { useFocusEffect } from '@react-navigation/native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@store'
import { api } from '@controleonline/ui-common/src/api'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService'

import {
  buildAddressOptionSummary,
  buildCustomerSearchMeta,
  createEmptyAddressForm,
  formatHumanLabel,
  formatPhoneDisplay,
  normalizePostalCodeInput,
  normalizeText,
  resolveAddressDisplayParts,
} from '@controleonline/ui-common/src/react/utils/entityDisplay'

import { toEntityIri } from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders'
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore'
import css from '@controleonline/ui-orders/src/react/css/orders'
import Icon from 'react-native-vector-icons/MaterialIcons'
import BarcodeInput from '@controleonline/ui-orders/src/react/pages/checkout/BarcodeInput'
import OrderProducts from '@controleonline/ui-ppc/src/react/components/OrderProducts'
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader'
import BottomCart from '@controleonline/ui-orders/src/react/components/cart/BottomCart'
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton'
import AddCompanyModal from '@controleonline/ui-people/src/react/components/AddCompanyModal'
import { getOrderRouteId } from '@controleonline/ui-orders/src/react/utils/orderRoute'
import useDebouncedOrderProductQuantitySync from '@controleonline/ui-orders/src/react/hooks/useDebouncedOrderProductQuantitySync'
import { getPlatformCapabilities, getOrderChannelLabel } from '@assets/ppc/channels'

import {
  mergeOrderProductIntoList,
  mergeOrderWithOrderProducts,
  removeOrderProductFromList,
  withOrderProductQuantity,
} from '@controleonline/ui-orders/src/utils/orderState'

import OrderMarketplaceOverlayHost from './components/OrderMarketplaceOverlayHost'
import OrderExtraDataCard from './components/OrderExtraDataCard'
import OrderSummaryModal from './components/OrderSummaryModal'
import useOrderDetailsVisuals from './useOrderDetailsVisuals'
import useOrderMarketplaceSummary from './useOrderMarketplaceSummary'

import {
  inlineStyle_2116_14,
  inlineStyle_2121_14,
  inlineStyle_2128_20,
  inlineStyle_2181_30,
  inlineStyle_2712_14,
  inlineStyle_2718_20,
  inlineStyle_2725_26,
  inlineStyle_2737_26,
  inlineStyle_2748_24,
  inlineStyle_2782_34,
} from './orderDetails.styles';

import { inlineStyle_2768_24 } from './orderDetails.styles';

const formatApiError = error => {
  if (!error) return global.t?.t('orders', 'message', 'unableCompleteOperation')
  if (typeof error === 'string') return error
  if (Array.isArray(error?.message)) {
    return error.message
      .map(item => item?.message || item?.title || String(item))
      .filter(Boolean)
      .join('\n')
  }

  return error?.message || error?.description || error?.errmsg || global.t?.t('orders', 'message', 'unableCompleteOperation')
}

const TERMINAL_ORDER_STATUSES = ['closed', 'canceled', 'cancelled']

const isTerminalOrderStatus = value =>
  TERMINAL_ORDER_STATUSES.includes(String(value ?? '').trim().toLowerCase())

const resolveInvoiceStatusPresentation = invoice => {
  const rawStatus = normalizeText(invoice?.status?.status)
  const rawRealStatus = normalizeText(invoice?.status?.realStatus || invoice?.status?.real_status)
  const normalizedStatus = rawStatus.toLowerCase()
  const normalizedRealStatus = rawRealStatus.toLowerCase()

  if (
    ['canceled', 'cancelled'].includes(normalizedStatus) ||
    ['canceled', 'cancelled'].includes(normalizedRealStatus)
  ) {
    return {
      label: formatHumanLabel(rawStatus || rawRealStatus || 'Canceled'),
      color: '#EF4444',
      backgroundColor: '#EF444422',
    }
  }

  if (
    normalizedRealStatus === 'closed' ||
    ['closed', 'paid'].includes(normalizedStatus)
  ) {
    return {
      label: formatHumanLabel(rawStatus || rawRealStatus || 'Paid'),
      color: '#16A34A',
      backgroundColor: '#16A34A22',
    }
  }

  if (
    normalizedRealStatus === 'pending' ||
    ['pending', 'waiting payment', 'waiting_payment', 'open'].includes(normalizedStatus)
  ) {
    return {
      label: formatHumanLabel(rawStatus || rawRealStatus || 'Pending'),
      color: '#D97706',
      backgroundColor: '#D9770622',
    }
  }

  return {
    label: formatHumanLabel(rawStatus || rawRealStatus || 'Open'),
    color: '#0EA5E9',
    backgroundColor: '#0EA5E922',
  }
}

const resolveInvoiceTitle = invoice => {
  const categoryName = formatHumanLabel(invoice?.category?.name || invoice?.category?.context)
  if (categoryName) return categoryName

  const invoiceId = String(invoice?.id || '').trim()
  return invoiceId ? `Invoice #${invoiceId}` : 'Invoice'
}

const getEntityId = entity => {
  if (!entity) return null

  if (typeof entity === 'number' || typeof entity === 'string') {
    const matches = String(entity).match(/\d+/g)
    return matches ? Number(matches[matches.length - 1]) : null
  }

  if (typeof entity === 'object') {
    if (entity.id) return Number(entity.id)
    if (entity['@id']) {
      const matches = String(entity['@id']).match(/\d+/g)
      return matches ? Number(matches[matches.length - 1]) : null
    }
  }

  return null
}

const getPeopleLabel = entity =>
  normalizeText(
    entity?.alias ||
    entity?.name ||
    entity?.fantasy_name ||
    entity?.company ||
    entity?.document
  )

const resolveInvoiceKind = (invoice, companyId) => {
  const payerId = getEntityId(invoice?.payer)
  const receiverId = getEntityId(invoice?.receiver)
  const companyIsPayer = !!companyId && payerId === companyId
  const companyIsReceiver = !!companyId && receiverId === companyId

  if (companyIsPayer && !companyIsReceiver) {
    return {
      kind: 'payable',
      label: 'Conta a pagar',
      counterpartyLabel: getPeopleLabel(invoice?.receiver),
    }
  }

  if (companyIsReceiver && !companyIsPayer) {
    return {
      kind: 'receivable',
      label: 'Conta a receber',
      counterpartyLabel: getPeopleLabel(invoice?.payer),
    }
  }

  if (companyIsPayer && companyIsReceiver) {
    return {
      kind: 'transfer',
      label: 'Transferência interna',
      counterpartyLabel: '',
    }
  }

  if (invoice?.sourceWallet && !invoice?.destinationWallet) {
    return {
      kind: 'payable',
      label: 'Conta a pagar',
      counterpartyLabel: getPeopleLabel(invoice?.receiver),
    }
  }

  if (!invoice?.sourceWallet && invoice?.destinationWallet) {
    return {
      kind: 'receivable',
      label: 'Conta a receber',
      counterpartyLabel: getPeopleLabel(invoice?.payer),
    }
  }

  if (invoice?.sourceWallet && invoice?.destinationWallet) {
    return {
      kind: 'transfer',
      label: 'Transferência',
      counterpartyLabel: '',
    }
  }

  return {
    kind: 'unknown',
    label: 'Movimentação financeira',
    counterpartyLabel: getPeopleLabel(invoice?.payer) || getPeopleLabel(invoice?.receiver),
  }
}

const resolvePreferredText = (...values) => {
  for (const value of values) {
    const normalized = normalizeText(value)
    if (normalized) return normalized
  }

  return ''
}

const resolveDocumentLabel = (documentType, documentNumber) => {
  const normalizedType = normalizeText(documentType).toUpperCase()
  if (normalizedType) return normalizedType

  const digits = String(documentNumber ?? '').replace(/\D/g, '')
  if (digits.length === 14) return 'CNPJ'
  if (digits.length === 11) return 'CPF'

  return 'Documento'
}

const formatOrderDateTime = value => {
  if (!value) return ''

  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleString('pt-BR')
  }

  return String(value)
}

const resolveOrderDateValue = order =>
  resolvePreferredText(order?.alterDate, order?.alter_date, order?.orderDate)

const resolveOrderItemUnitLabel = orderProduct =>
  String(
    resolvePreferredText(
      orderProduct?.product?.productUnit?.productUnit,
      orderProduct?.product?.productUnit?.unit,
      orderProduct?.product?.productUnity?.productUnit,
      orderProduct?.product?.productUnity?.unit,
      orderProduct?.productUnit?.productUnit,
      orderProduct?.productUnit?.unit,
      orderProduct?.unit,
      orderProduct?.product?.unit,
    ) || '',
  ).trim().toUpperCase()

const resolveProductUnitLabel = product =>
  resolveOrderItemUnitLabel({ product })

const mergeOrderProductWithResolvedProduct = (orderProduct, resolvedProduct) => {
  if (!orderProduct || !resolvedProduct) return orderProduct

  return {
    ...orderProduct,
    product: {
      ...(orderProduct?.product || {}),
      ...resolvedProduct,
      productUnit:
        resolvedProduct?.productUnit ||
        orderProduct?.product?.productUnit ||
        orderProduct?.product?.productUnity ||
        null,
      productUnity:
        resolvedProduct?.productUnity ||
        resolvedProduct?.productUnit ||
        orderProduct?.product?.productUnity ||
        orderProduct?.product?.productUnit ||
        null,
    },
  }
}

const OrderDetails = ({ route, navigation }) => {
  const routeOrderId = useMemo(
    () => getOrderRouteId(route.params?.id || route.params?.order),
    [route.params?.id, route.params?.order],
  )
  const routeOrderIri = useMemo(
    () => (routeOrderId ? `/orders/${routeOrderId}` : null),
    [routeOrderId],
  )
  const orderParam = useMemo(() => {
    const routeOrder = route.params?.order || null
    if (!routeOrder) return null

    const routeParamOrderId = getOrderRouteId(routeOrder)
    if (routeOrderId && routeParamOrderId && routeParamOrderId !== routeOrderId) {
      return null
    }

    return routeOrder
  }, [route.params?.order, routeOrderId])
  const isKds = !!route.params?.kds
  const useUnifiedKdsLayout = true
  const isTvDisplay = String(route.params?.displayType || '').toLowerCase() === 'tv'
  const shouldHideBottomToolBar = Boolean(route.params?.hideBottomToolBar || isTvDisplay)
  const { showError, showSuccess } = useMessage()
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)
  const insets = useSafeAreaInsets()

  const ordersStore = useStore('orders')
  const { getters: ordersGetters, actions: ordersActions } = ordersStore
  const { item: storedOrderItem, isLoading, error } = ordersGetters
  const item = useMemo(() => {
    if (!routeOrderId) return storedOrderItem
    return getOrderRouteId(storedOrderItem) === routeOrderId ? storedOrderItem : null
  }, [routeOrderId, storedOrderItem])

  const invoiceStore = useStore('invoice')
  const { getters: invoiceGetters, actions: invoiceActions } = invoiceStore
  const { items: invoices } = invoiceGetters
  const peopleStore = useStore('people')
  const { getters: peopleGetters, actions: peopleActions } = peopleStore
  const { defaultCompany, currentCompany } = peopleGetters
  const addressStore = useStore('address')
  const { actions: addressActions } = addressStore

  const { styles: cssStyles, globalStyles } = css()
  const { ppcColors, scale, styles: localStyles } = useOrderDetailsVisuals()
  const selectedDisplay = useMemo(() => {
    if (!isKds) {
      return null
    }

    const normalizedDisplayId = String(
      route.params?.displayId || route.params?.display?.id || '',
    )
      .replace(/\D+/g, '')
      .trim()

    if (!normalizedDisplayId) {
      return null
    }

    return {
      id: normalizedDisplayId,
      displayType: route.params?.displayType || route.params?.display?.displayType || '',
    }
  }, [isKds, route.params?.display?.displayType, route.params?.display?.id, route.params?.displayId, route.params?.displayType])
  const orderCompanyId = useMemo(
    () =>
      getEntityId(item?.provider) ||
      getEntityId(orderParam?.provider) ||
      getEntityId(currentCompany) ||
      getEntityId(defaultCompany),
    [item?.provider, orderParam?.provider, currentCompany, defaultCompany],
  )
  const orderCompanyIri = useMemo(
    () => (orderCompanyId ? `/people/${orderCompanyId}` : null),
    [orderCompanyId],
  )
  const deviceConfigStore = useStore('device_config')
  const device = deviceConfigStore.getters?.item
  const productInputType = device?.configs?.['product-input-type'] || 'manual'

  const isManualInput = productInputType === 'manual'
  const showBarcodeInput = item?.app === 'POS' && !isManualInput
  const platformCapabilities = getPlatformCapabilities(item || orderParam)
  const normalizedOrderApp = String(item?.app || orderParam?.app || '').trim().toUpperCase()
  const isPosOrder = normalizedOrderApp === 'POS'
  const isShopOrder = normalizedOrderApp === 'SHOP'
  const isPosOrShopOrder = isPosOrder || isShopOrder
  const localStatusNameKey = String(
    item?.status?.status ||
    orderParam?.status?.status ||
    '',
  ).trim().toLowerCase()
  const localRealStatusKey = String(
    item?.status?.realStatus ||
    orderParam?.status?.realStatus ||
    '',
  ).trim().toLowerCase()
  const isLocallyTerminalOrder =
    isTerminalOrderStatus(item?.status?.realStatus) ||
    isTerminalOrderStatus(orderParam?.status?.realStatus)
  const isEditablePosCartOrder =
    isPosOrder &&
    localRealStatusKey === 'open' &&
    (localStatusNameKey === '' || localStatusNameKey === 'open')
  const channelLabel = getOrderChannelLabel(item || orderParam) || global.t?.t('orders', 'label', 'order')
  const isPurchaseOrder = String(item?.orderType || orderParam?.orderType || '').toLowerCase() === 'purchase'
  const [orderActionLoading, setOrderActionLoading] = useState('')

  const orderProductsStore = useStore('order_products')
  const { items: storedOrderProducts } = orderProductsStore.getters
  const productsStore = useStore('products')
  const [resolvedProductsById, setResolvedProductsById] = useState({})
  const loadingResolvedProductsRef = useRef(new Set())

  const [confirmRemoveItemId, setConfirmRemoveItemId] = useState(null)
  const currentOrderProductsRef = useRef([])
  const [customerModalVisible, setCustomerModalVisible] = useState(false)
  const [customerCreateModalVisible, setCustomerCreateModalVisible] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState([])
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  const [customerLinkingId, setCustomerLinkingId] = useState('')
  const [addressModalVisible, setAddressModalVisible] = useState(false)
  const [addressModalMode, setAddressModalMode] = useState('select')
  const [addressOptions, setAddressOptions] = useState([])
  const [addressOptionsLoading, setAddressOptionsLoading] = useState(false)
  const [addressForm, setAddressForm] = useState(createEmptyAddressForm())
  const [addressSaveLoading, setAddressSaveLoading] = useState(false)
  const [addressSelectingId, setAddressSelectingId] = useState('')

  useFocusEffect(
    useCallback(() => {
      if (routeOrderIri) {
        invoiceActions.getItems({ 'order.order': routeOrderIri })
      }
    }, [invoiceActions, routeOrderIri]),
  )

  useFocusEffect(
    useCallback(() => {
      if (routeOrderId) {
        ordersActions.get(routeOrderId)
      }
    }, [ordersActions, routeOrderId]),
  )

  useFocusEffect(
    useCallback(() => {
      if (routeOrderIri) {
        orderProductsStore.actions.getItems({
          order: routeOrderIri,
          itemsPerPage: 500,
        })
      }
    }, [orderProductsStore.actions, routeOrderIri]),
  )

  const handleAddProduct = () => {
    if (!canEditItems) return
    navigation.navigate('AddProductScreen')
  }

  const refreshCurrentOrder = useCallback(async () => {
    if (routeOrderId && routeOrderIri) {
      await ordersActions.get(routeOrderId)
      await orderProductsStore.actions.getItems({
        order: routeOrderIri,
        itemsPerPage: 500,
      })
    }
  }, [orderProductsStore.actions, ordersActions, routeOrderId, routeOrderIri])

  const marketplaceSummary = useOrderMarketplaceSummary({
    order: item,
    initialOrder: orderParam,
    refreshOrder: refreshCurrentOrder,
    isKds,
    navigation,
    showError,
    showSuccess,
  })
  const hasMarketplaceIntegration = marketplaceSummary.hasMarketplaceIntegration

  const buildOrderUpdatePayload = useCallback(changes => {
    const baseOrder = item || orderParam
    const orderId = getEntityId(baseOrder)

    if (!orderId) {
      throw new Error(
        global.t?.t('orders', 'message', 'unableCompleteOperation') ||
          'Nao foi possivel identificar o pedido para atualizar.',
      )
    }

    const providerIri =
      toEntityIri(baseOrder?.provider, 'people') ||
      orderCompanyIri
    const statusIri = toEntityIri(baseOrder?.status, 'statuses')

    return {
      id: Number(orderId),
      app: baseOrder?.app || 'POS',
      orderType: baseOrder?.orderType || 'quote',
      ...(providerIri ? { provider: providerIri } : {}),
      ...(statusIri ? { status: statusIri } : {}),
      ...changes,
    }
  }, [item, orderParam, orderCompanyIri])

  const canEditItems = !isTerminalOrderStatus(localRealStatusKey)

  useEffect(() => {
    if (!canEditItems) {
      setConfirmRemoveItemId(null)
    }
  }, [canEditItems])

  useEffect(() => {
    currentOrderProductsRef.current = Array.isArray(item?.orderProducts)
      ? item.orderProducts
      : []
  }, [item?.orderProducts])

  const syncCurrentOrderProducts = useCallback(nextOrderProducts => {
    const normalizedOrderProducts = Array.isArray(nextOrderProducts) ? nextOrderProducts : []
    const baseOrder = item?.id ? item : orderParam

    currentOrderProductsRef.current = normalizedOrderProducts
    orderProductsStore.actions.setItems(normalizedOrderProducts)

    if (!baseOrder) {
      return normalizedOrderProducts
    }

    ordersActions.syncOrder(
      mergeOrderWithOrderProducts(baseOrder, normalizedOrderProducts),
    )

    return normalizedOrderProducts
  }, [item, orderParam, orderProductsStore.actions, ordersActions])

  const {
    flushAllChanges: flushPendingOrderProductChanges,
    getScheduledQuantity,
    isOrderProductCommitting,
    scheduleQuantityChange,
  } = useDebouncedOrderProductQuantitySync({
    delay: 1000,
    onOptimisticUpdate: (orderProduct, nextQuantity) => {
      const nextOrderProducts =
        nextQuantity <= 0
          ? removeOrderProductFromList(currentOrderProductsRef.current, orderProduct)
          : mergeOrderProductIntoList(
              currentOrderProductsRef.current,
              withOrderProductQuantity(orderProduct, nextQuantity),
            )

      syncCurrentOrderProducts(nextOrderProducts)
    },
    onCommit: async (orderProduct, targetQuantity) => {
      const orderProductId = String(
        orderProduct?.id || String(orderProduct?.['@id'] || '').replace(/\D/g, ''),
      )

      if (!orderProductId) return

      if (targetQuantity <= 0) {
        await orderProductsStore.actions.remove(orderProductId)
        return
      }

      const savedOrderProduct = await orderProductsStore.actions.save({
        '@id': orderProduct?.['@id'],
        id: Number(orderProductId),
        quantity: targetQuantity,
      })

      syncCurrentOrderProducts(
        mergeOrderProductIntoList(currentOrderProductsRef.current, savedOrderProduct),
      )
    },
    onError: async error => {
      await refreshCurrentOrder()
      showError(formatApiError(error))
    },
  })

  const updateCurrentOrder = useCallback(async changes => {
    await flushPendingOrderProductChanges()

    const savedOrder = await ordersActions.save(
      buildOrderUpdatePayload(changes),
    )

    if (savedOrder) {
      if (typeof ordersActions.syncOrder === 'function') {
        ordersActions.syncOrder(savedOrder)
      } else {
        ordersActions.setItem(savedOrder)
      }
    }

    await refreshCurrentOrder()

    return savedOrder
  }, [
    flushPendingOrderProductChanges,
    ordersActions,
    buildOrderUpdatePayload,
    refreshCurrentOrder,
  ])

  const handleAddPayment = useCallback(async () => {
    if (!item?.id || isLocallyTerminalOrder) return
    await flushPendingOrderProductChanges()
    navigation.navigate('Checkout', { order: ordersGetters.item || item })
  }, [flushPendingOrderProductChanges, item, navigation, isLocallyTerminalOrder, ordersGetters.item])

  const handleUpdateOpQuantity = useCallback((op, newQtyOrUpdater) => {
    const id = String(op?.id || String(op?.['@id'] || '').replace(/\D/g, ''))
    if (!id) return
    scheduleQuantityChange(op, newQtyOrUpdater)
  }, [scheduleQuantityChange])

  const handleIncreaseOpQuantity = useCallback(op => {
    setConfirmRemoveItemId(null)
    handleUpdateOpQuantity(op, currentQuantity => currentQuantity + 1)
  }, [handleUpdateOpQuantity])

  const handleDecreaseOpQuantity = useCallback(op => {
    const id = String(op?.id || String(op?.['@id'] || '').replace(/\D/g, ''))
    if (!id) return

    if (getScheduledQuantity(op) <= 1) {
      setConfirmRemoveItemId(id)
      return
    }

    setConfirmRemoveItemId(null)
    handleUpdateOpQuantity(op, currentQuantity => currentQuantity - 1)
  }, [getScheduledQuantity, handleUpdateOpQuantity])

  const handleRemoveOp = useCallback(op => {
    const id = String(op?.id || String(op?.['@id'] || '').replace(/\D/g, ''))
    if (!id) return
    setConfirmRemoveItemId(null)
    scheduleQuantityChange(op, 0)
  }, [scheduleQuantityChange])

  const runOrderAction = useCallback(async action => {
    if (!item?.id || orderActionLoading) {
      return
    }

    const currentLocalOrderRealStatus = String(
      item?.status?.realStatus ||
      orderParam?.status?.realStatus ||
      '',
    ).toLowerCase()

    if (isTerminalOrderStatus(currentLocalOrderRealStatus)) {
      return
    }

    const actionMap = {
      confirm: {
        path: `/orders/${item.id}/confirm`,
        success: global.t?.t('orders', 'message', 'orderConfirmed'),
      },
      ready: {
        path: `/orders/${item.id}/ready`,
        success: global.t?.t('orders', 'message', 'orderReady'),
      },
      cancel: {
        path: `/orders/${item.id}/cancel`,
        success: global.t?.t('orders', 'message', 'orderCanceled'),
      },
      delivered: {
        path: `/orders/${item.id}/delivered`,
        success: global.t?.t('orders', 'message', 'orderDelivered'),
      },
      finalize: {
        path: `/orders/${item.id}/delivered`,
        success: global.t?.t('orders', 'message', 'orderDelivered'),
      },
    }

    const actionConfig = actionMap[action]
    if (!actionConfig) {
      return
    }

    try {
      setOrderActionLoading(action)

      await api.fetch(actionConfig.path, {
        method: 'POST',
        body: {},
      })

      await refreshCurrentOrder()
      showSuccess(actionConfig.success)

      if (isKds && (action === 'cancel' || action === 'delivered' || action === 'finalize')) {
        navigation.goBack()
      }
    } catch (actionError) {
      showError(formatApiError(actionError))
    } finally {
      setOrderActionLoading('')
    }
  }, [
    item?.id,
    item?.status?.realStatus,
    orderActionLoading,
    orderParam?.status?.realStatus,
    refreshCurrentOrder,
    showError,
    showSuccess,
    isKds,
    navigation,
  ])
  const resolvedDisplayOrderProducts = useMemo(() => {
    const currentOrderId = Number(item?.id || orderParam?.id || 0)
    const currentOrderProducts = Array.isArray(item?.orderProducts) ? item.orderProducts : []
    const locallyFetchedOrderProducts = Array.isArray(storedOrderProducts)
      ? storedOrderProducts.filter(orderProduct => {
          const orderProductOrderId = getEntityId(orderProduct?.order)
          if (!currentOrderId || !orderProductOrderId) return true
          return orderProductOrderId === currentOrderId
        })
      : []

    if (currentOrderProducts.length) {
      return currentOrderProducts
    }

    if (locallyFetchedOrderProducts.length) {
      return locallyFetchedOrderProducts
    }

    const initialOrderProducts = Array.isArray(orderParam?.orderProducts) ? orderParam.orderProducts : []
    if (initialOrderProducts.length) {
      return initialOrderProducts
    }

    return Array.isArray(marketplaceSummary.fallbackOrderProducts)
      ? marketplaceSummary.fallbackOrderProducts
      : []
  }, [
    item?.id,
    item?.orderProducts,
    marketplaceSummary.fallbackOrderProducts,
    orderParam?.id,
    orderParam?.orderProducts,
    storedOrderProducts,
  ])
  const editableOrderProducts = useMemo(
    () => (Array.isArray(item?.orderProducts) ? item.orderProducts : []),
    [item?.orderProducts],
  )
  const resolvedProductCandidatesById = useMemo(() => {
    const candidates = {}

    ;[
      item?.orderProducts,
      orderParam?.orderProducts,
      storedOrderProducts,
      marketplaceSummary.fallbackOrderProducts,
    ].forEach(orderProductsList => {
      ;(Array.isArray(orderProductsList) ? orderProductsList : []).forEach(orderProduct => {
        const productId = getEntityId(orderProduct?.product)
        const candidateProduct = orderProduct?.product

        if (!productId || !candidateProduct) return

        const currentCandidate = candidates[productId]
        const currentHasUnit = currentCandidate ? !!resolveProductUnitLabel(currentCandidate) : false
        const nextHasUnit = !!resolveOrderItemUnitLabel(orderProduct)

        if (!currentCandidate || (nextHasUnit && !currentHasUnit)) {
          candidates[productId] = candidateProduct
        }
      })
    })

    return candidates
  }, [
    marketplaceSummary.fallbackOrderProducts,
    item?.orderProducts,
    orderParam?.orderProducts,
    storedOrderProducts,
  ])

  useEffect(() => {
    const productIdsMissingUnit = [...new Set(
      [...resolvedDisplayOrderProducts, ...editableOrderProducts]
        .map(orderProduct => {
          const productId = getEntityId(orderProduct?.product)
          const cachedProduct = productId
            ? (resolvedProductsById[productId] || resolvedProductCandidatesById[productId])
            : null
          const hasUnit =
            !!resolveOrderItemUnitLabel(orderProduct) ||
            !!resolveOrderItemUnitLabel(
              cachedProduct ? mergeOrderProductWithResolvedProduct(orderProduct, cachedProduct) : orderProduct,
            )

          if (!productId || hasUnit || loadingResolvedProductsRef.current.has(productId)) {
            return null
          }

          return productId
        })
        .filter(Boolean),
    )]

    if (!productIdsMissingUnit.length) return undefined

    productIdsMissingUnit.forEach(id => loadingResolvedProductsRef.current.add(id))

    let cancelled = false

    ;(async () => {
      const resolvedEntries = await Promise.all(
        productIdsMissingUnit.map(async productId => {
          try {
            const product = await productsStore.actions.get(productId)
            return [productId, product || null]
          } catch {
            return [productId, null]
          } finally {
            loadingResolvedProductsRef.current.delete(productId)
          }
        }),
      )

      if (cancelled) return

      setResolvedProductsById(prev => {
        let changed = false
        const next = { ...prev }

        resolvedEntries.forEach(([productId, product]) => {
          if (product && next[productId] !== product) {
            next[productId] = product
            changed = true
          }
        })

        return changed ? next : prev
      })
    })()

    return () => {
      cancelled = true
    }
  }, [editableOrderProducts, productsStore.actions, resolvedDisplayOrderProducts, resolvedProductCandidatesById, resolvedProductsById])

  const resolvedDisplayOrderProductsWithProductDetails = useMemo(
    () => resolvedDisplayOrderProducts.map(orderProduct => {
      const productId = getEntityId(orderProduct?.product)
      return mergeOrderProductWithResolvedProduct(
        orderProduct,
        productId ? (resolvedProductsById[productId] || resolvedProductCandidatesById[productId]) : null,
      )
    }),
    [resolvedDisplayOrderProducts, resolvedProductCandidatesById, resolvedProductsById],
  )

  const editableOrderProductsWithProductDetails = useMemo(
    () => editableOrderProducts.map(orderProduct => {
      const productId = getEntityId(orderProduct?.product)
      return mergeOrderProductWithResolvedProduct(
        orderProduct,
        productId ? (resolvedProductsById[productId] || resolvedProductCandidatesById[productId]) : null,
      )
    }),
    [editableOrderProducts, resolvedProductCandidatesById, resolvedProductsById],
  )
  const shouldShowOrderAddress = !isPurchaseOrder
  const effectiveDisplayedOperationalStatus = useMemo(
    () => ({
      status: localStatusNameKey,
      realStatus: localRealStatusKey,
    }),
    [localRealStatusKey, localStatusNameKey],
  )
  const effectiveLocalStatusNameKey = effectiveDisplayedOperationalStatus.status
  const effectiveLocalRealStatusKey = effectiveDisplayedOperationalStatus.realStatus
  const displayOrderStatusColor = resolvePreferredText(
    item?.status?.color,
    orderParam?.status?.color,
    '#0EA5E9',
  )
  const resolvedDisplayOrder = useMemo(() => {
    const baseOrder = item || orderParam
    if (!baseOrder) return null

    return {
      ...baseOrder,
      orderProducts: resolvedDisplayOrderProductsWithProductDetails,
      status: {
        ...(baseOrder?.status || {}),
        status: effectiveLocalStatusNameKey || baseOrder?.status?.status || '',
        realStatus: effectiveLocalRealStatusKey || baseOrder?.status?.realStatus || '',
        real_status: effectiveLocalRealStatusKey || baseOrder?.status?.real_status || '',
        color: displayOrderStatusColor,
      },
    }
  }, [
    displayOrderStatusColor,
    effectiveLocalRealStatusKey,
    effectiveLocalStatusNameKey,
    item,
    orderParam,
    resolvedDisplayOrderProductsWithProductDetails,
  ])
  const normalizedOrderRealStatus = String(
    effectiveLocalRealStatusKey || '',
  ).toLowerCase()
  const hasTerminalOrderState =
    isLocallyTerminalOrder ||
    isTerminalOrderStatus(normalizedOrderRealStatus)
  const isTerminalOrder = hasTerminalOrderState
  const activeLocalInvoices = useMemo(
    () => (
      Array.isArray(invoices)
        ? invoices.filter(invoice => {
            const invoiceStatus = String(
              invoice?.status?.realStatus ||
              invoice?.status?.real_status ||
              invoice?.status?.status ||
              '',
            ).trim().toLowerCase()

            return !['canceled', 'cancelled'].includes(invoiceStatus)
          })
        : []
    ),
    [invoices],
  )
  const localFinancialCompanyId = useMemo(
    () => (
      getEntityId(item?.provider) ||
      getEntityId(orderParam?.provider) ||
      getEntityId(defaultCompany)
    ),
    [defaultCompany, item?.provider, orderParam?.provider],
  )
  const localInvoiceCards = useMemo(
    () => activeLocalInvoices
      .slice()
      .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))
      .map(invoice => {
        const statusPresentation = resolveInvoiceStatusPresentation(invoice)
        const invoiceKind = resolveInvoiceKind(invoice, localFinancialCompanyId)
        const title = resolveInvoiceTitle(invoice)
        const invoiceId = String(invoice?.id || '').trim()
        const paymentTypeLabel = resolvePreferredText(
          invoice?.paymentType?.paymentType,
          invoice?.paymentType?.name,
        ) || (global.t?.t('orders', 'label', 'notInformed') || 'Não informado')

        return {
          id: invoiceId || `${title}-${invoice?.invoice_date || invoice?.dueDate || 'local'}`,
          title,
          subtitle: invoiceId && title !== `Invoice #${invoiceId}` ? `Invoice #${invoiceId}` : '',
          amount: Number(invoice?.price || 0),
          paymentTypeLabel,
          kindLabel: invoiceKind.label,
          counterpartyLabel: invoiceKind.counterpartyLabel,
          kindKey: invoiceKind.kind,
          statusLabel: statusPresentation.label,
          statusColor: statusPresentation.color,
          statusBackgroundColor: statusPresentation.backgroundColor,
        }
      }),
    [activeLocalInvoices, localFinancialCompanyId],
  )
  const localPaidAmount = useMemo(
    () => activeLocalInvoices.reduce((sum, invoice) => {
      const invoiceStatusName = String(invoice?.status?.status || '').trim().toLowerCase()
      const invoiceRealStatus = String(
        invoice?.status?.realStatus ||
        invoice?.status?.real_status ||
        '',
      ).trim().toLowerCase()
      const isInvoicePaid =
        invoiceRealStatus === 'closed' ||
        invoiceStatusName === 'closed' ||
        invoiceStatusName === 'paid'

      return isInvoicePaid ? sum + Number(invoice?.price || 0) : sum
    }, 0),
    [activeLocalInvoices],
  )
  const localOrderTotal = Number(item?.price || 0)
  const localPendingAmount = Math.max(localOrderTotal - localPaidAmount, 0)
  const canAddProductsToOrder = canEditItems
  const addProductsButtonLabel =
    global.t?.t('orders', 'button', 'addProducts') || 'Adicionar produtos'
  const canAddOrderPayment =
    !hasMarketplaceIntegration &&
    !!item?.id &&
    localPendingAmount > 0 &&
    !isTerminalOrder
  const showInlineAddPaymentAction =
    canAddOrderPayment &&
    !useUnifiedKdsLayout
  const internalOrderDisplayId = item?.id || orderParam?.id || '--'
  const orderDisplayId = internalOrderDisplayId
  const resolvedOrderDateValue = resolveOrderDateValue(item || orderParam)
  const orderDateLabel = formatOrderDateTime(resolvedOrderDateValue)
  const orderWaitingMinutes = resolvedOrderDateValue
    ? Math.max(0, Math.floor((Date.now() - new Date(resolvedOrderDateValue).getTime()) / 60000))
    : null
  const orderWaitingLabel =
    orderWaitingMinutes === null
      ? ''
      : `${orderWaitingMinutes} min`
  const orderOriginLabel = String(
    channelLabel ||
    item?.app ||
    orderParam?.app ||
    global.t?.t('orders', 'label', 'localOrigin'),
  )
  const localStatusRaw = String(
    effectiveLocalStatusNameKey ||
    effectiveLocalRealStatusKey ||
    '',
  ).trim()
  const orderStatusBadgeLabel = String(localStatusRaw || '-').toUpperCase()
  const orderStatusBadgeColor = displayOrderStatusColor || ppcColors.accentInfo
  const fallbackNoObservationText =
    `${global.t?.t('orders', 'message', 'noObservationsFor')} ${channelLabel || (global.t?.t('orders', 'label', 'order') || 'pedido')}.`
  const localOrderClient = item?.client || orderParam?.client || null
  const localOrderAddress = item?.addressDestination || orderParam?.addressDestination || null
  const localOrderAddressParts = useMemo(
    () => resolveAddressDisplayParts(localOrderAddress),
    [localOrderAddress],
  )
  const orderCustomerName = resolvePreferredText(
    localOrderClient?.alias,
    localOrderClient?.name,
  )
  const orderCustomerPhone = resolvePreferredText(
    formatPhoneDisplay(localOrderClient?.phone?.[0]),
    Array.isArray(localOrderClient?.phone)
      ? localOrderClient.phone.map(formatPhoneDisplay).find(Boolean)
      : formatPhoneDisplay(localOrderClient?.phone),
  )
  const localOrderCustomerDocument = resolvePreferredText(
    localOrderClient?.document?.[0]?.document,
    Array.isArray(localOrderClient?.document)
      ? localOrderClient.document.map(document => normalizeText(document?.document)).find(Boolean)
      : normalizeText(localOrderClient?.document),
  )
  const orderCustomerDocument = localOrderCustomerDocument
  const orderCustomerDocumentType = resolvePreferredText(
    localOrderClient?.document?.[0]?.documentType?.documentType,
    Array.isArray(localOrderClient?.document)
      ? localOrderClient.document.map(document => normalizeText(document?.documentType?.documentType)).find(Boolean)
      : normalizeText(localOrderClient?.documentType?.documentType),
  )
  const orderCustomerDocumentLabel = resolveDocumentLabel(
    orderCustomerDocumentType,
    orderCustomerDocument,
  )
  const orderAddressPrimary = resolvePreferredText(
    localOrderAddressParts.primary,
  )
  const orderAddressSecondary = resolvePreferredText(
    localOrderAddressParts.secondary,
  )
  const selectedOrderClientIri = useMemo(
    () => toEntityIri(localOrderClient, 'people'),
    [localOrderClient],
  )
  const selectedOrderAddressIri = useMemo(
    () => toEntityIri(localOrderAddress, 'addresses'),
    [localOrderAddress],
  )

  const closeCustomerModal = useCallback(() => {
    if (customerLinkingId) {
      return
    }

    setCustomerModalVisible(false)
    setCustomerSearch('')
    setCustomerSearchResults([])
  }, [customerLinkingId])

  const openCustomerModal = useCallback(() => {
    setCustomerModalVisible(true)
  }, [])

  const openCustomerCreateModal = useCallback(() => {
    setCustomerCreateModalVisible(true)
  }, [])

  const closeAddressModal = useCallback(() => {
    if (addressSaveLoading || addressSelectingId) {
      return
    }

    setAddressModalVisible(false)
    setAddressModalMode('select')
    setAddressOptions([])
    setAddressForm(createEmptyAddressForm())
  }, [addressSaveLoading, addressSelectingId])

  const loadAddressOptions = useCallback(async customer => {
    const customerIri = toEntityIri(customer, 'people')

    if (!customerIri) {
      setAddressOptions([])
      return []
    }

    try {
      setAddressOptionsLoading(true)
      const response = await addressActions.getItems({
        people: customerIri,
        itemsPerPage: 50,
      })
      const items = Array.isArray(response) ? response : []

      setAddressOptions(items)
      return items
    } catch (addressError) {
      setAddressOptions([])
      showError(formatApiError(addressError))
      return []
    } finally {
      setAddressOptionsLoading(false)
    }
  }, [addressActions, showError])

  const openAddressCreateMode = useCallback(() => {
    setAddressForm(createEmptyAddressForm())
    setAddressModalMode('create')
    setAddressModalVisible(true)
  }, [])

  const openAddressModal = useCallback(async () => {
    setAddressModalVisible(true)

    if (!selectedOrderClientIri) {
      setAddressOptions([])
      setAddressModalMode('create')
      return
    }

    setAddressModalMode('select')
    await loadAddressOptions(localOrderClient)
  }, [loadAddressOptions, localOrderClient, selectedOrderClientIri])

  const handleAddressFormFieldChange = useCallback((field, value) => {
    setAddressForm(previousForm => ({
      ...previousForm,
      [field]:
        field === 'cep'
          ? normalizePostalCodeInput(value)
          : field === 'number'
            ? String(value ?? '').replace(/\D+/g, '')
            : value,
    }))
  }, [])

  useEffect(() => {
    if (!customerModalVisible) {
      return undefined
    }

    const normalizedSearch = String(customerSearch || '').trim()

    if (!normalizedSearch || !orderCompanyIri) {
      setCustomerSearchResults([])
      setCustomerSearchLoading(false)
      return undefined
    }

    let isMounted = true
    const timeoutId = setTimeout(async () => {
      try {
        setCustomerSearchLoading(true)
        const response = await peopleActions.getItems({
          'link.company': orderCompanyIri,
          'link.linkType': 'client',
          search: normalizedSearch,
          itemsPerPage: 20,
        })

        if (!isMounted) {
          return
        }

        setCustomerSearchResults(Array.isArray(response) ? response : [])
      } catch {
        if (isMounted) {
          setCustomerSearchResults([])
        }
      } finally {
        if (isMounted) {
          setCustomerSearchLoading(false)
        }
      }
    }, 250)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [
    customerModalVisible,
    customerSearch,
    orderCompanyIri,
    peopleActions,
  ])

  const handleSelectCustomer = useCallback(async customer => {
    const nextCustomerIri = toEntityIri(customer, 'people')
    const nextCustomerId = String(getEntityId(customer) || '')

    if (!nextCustomerIri) {
      showError('Nao foi possivel identificar o cliente selecionado.')
      return
    }

    if (selectedOrderClientIri === nextCustomerIri) {
      closeCustomerModal()
      return
    }

    try {
      setCustomerLinkingId(nextCustomerId)
      await updateCurrentOrder({ client: nextCustomerIri })
      closeCustomerModal()
      showSuccess(
        selectedOrderClientIri
          ? 'Cliente do pedido atualizado com sucesso.'
          : 'Cliente vinculado ao pedido com sucesso.',
      )
    } catch (updateError) {
      showError(formatApiError(updateError))
    } finally {
      setCustomerLinkingId('')
    }
  }, [
    closeCustomerModal,
    selectedOrderClientIri,
    showError,
    showSuccess,
    updateCurrentOrder,
  ])

  const handleCustomerCreated = useCallback(async savedCustomer => {
    setCustomerCreateModalVisible(false)

    if (!savedCustomer) {
      return
    }

    await handleSelectCustomer(savedCustomer)
  }, [handleSelectCustomer])

  const handleSelectAddress = useCallback(async address => {
    const nextAddressIri = toEntityIri(address, 'addresses')
    const nextAddressId = String(getEntityId(address) || '')

    if (!nextAddressIri) {
      showError('Nao foi possivel identificar o endereco selecionado.')
      return
    }

    if (selectedOrderAddressIri === nextAddressIri) {
      closeAddressModal()
      return
    }

    try {
      setAddressSelectingId(nextAddressId)
      await updateCurrentOrder({ addressDestination: nextAddressIri })
      closeAddressModal()
      showSuccess('Endereco de entrega atualizado com sucesso.')
    } catch (updateError) {
      showError(formatApiError(updateError))
    } finally {
      setAddressSelectingId('')
    }
  }, [
    closeAddressModal,
    selectedOrderAddressIri,
    showError,
    showSuccess,
    updateCurrentOrder,
  ])

  const handleCreateAddress = useCallback(async () => {
    const street = normalizeText(addressForm.street)
    const district = normalizeText(addressForm.district)
    const city = normalizeText(addressForm.city)
    const state = normalizeText(addressForm.state)
    const country = normalizeText(addressForm.country)
    const number = String(addressForm.number ?? '').replace(/\D+/g, '').trim()
    const cep = normalizePostalCodeInput(addressForm.cep)
    const complement = normalizeText(addressForm.complement)
    const nickname = resolvePreferredText(addressForm.nickname, 'Entrega')

    if (!street || !district || !city || !state || !country || !number || !cep) {
      showError('Rua, numero, bairro, cidade, estado, pais e CEP sao obrigatorios.')
      return
    }

    try {
      setAddressSaveLoading(true)

      const payload = {
        street,
        district,
        city,
        state,
        country,
        number: Number(number),
        cep,
        nickname,
        complement,
        ...(selectedOrderClientIri ? { people: selectedOrderClientIri } : {}),
      }

      const savedAddress = await addressActions.save(payload)
      const savedAddressIri = toEntityIri(savedAddress, 'addresses')

      if (!savedAddressIri) {
        throw new Error('Endereco criado sem identificador valido.')
      }

      await updateCurrentOrder({ addressDestination: savedAddressIri })
      closeAddressModal()
      showSuccess('Endereco de entrega atualizado com sucesso.')
    } catch (saveError) {
      showError(formatApiError(saveError))
    } finally {
      setAddressSaveLoading(false)
    }
  }, [
    addressActions,
    addressForm.cep,
    addressForm.city,
    addressForm.complement,
    addressForm.country,
    addressForm.district,
    addressForm.nickname,
    addressForm.number,
    addressForm.state,
    addressForm.street,
    closeAddressModal,
    selectedOrderClientIri,
    showError,
    showSuccess,
    updateCurrentOrder,
  ])

  const localOrderObservationSource = resolvePreferredText(
    item?.comments,
    item?.remark,
    orderParam?.comments,
    orderParam?.remark,
    orderParam?.description,
  )
  const baseOrderObservationText = localOrderObservationSource || fallbackNoObservationText
  const showBaseOrderObservationCard = true
  const orderDiscountTotal = Number(item?.discount || orderParam?.discount || 0)
  const orderDisplayTotal = Number(localOrderTotal || 0)
  const localInvoicesEmptyText =
    global.t?.t('orders', 'message', 'noInvoicesLinkedToOrder') ||
    'Nenhuma invoice vinculada a este pedido.'
  const localInvoicesSectionTitle =
    global.t?.t('orders', 'label', 'payment') ||
    global.t?.t('orders', 'title', 'payments') ||
    'Pagamentos'
  const localInvoicesCountLabel = `${localInvoiceCards.length} ${
    localInvoiceCards.length === 1 ? 'invoice' : 'invoices'
  }`
  const isGenericLocalOrder = !hasMarketplaceIntegration
  const isOpenLocalWorkflowState = effectiveLocalRealStatusKey === 'open'
  const isPendingLocalWorkflowState = effectiveLocalRealStatusKey === 'pending'
  const isPosOrShopInitialWorkflowState =
    isPosOrShopOrder &&
    isOpenLocalWorkflowState &&
    ['open', 'paid', 'confirmed', ''].includes(effectiveLocalStatusNameKey || 'open')
  const isPosOrShopPreparingWorkflowState =
    isPosOrShopOrder &&
    isOpenLocalWorkflowState &&
    effectiveLocalStatusNameKey === 'preparing'
  const isPosOrShopReadyWorkflowState =
    isPosOrShopOrder &&
    isPendingLocalWorkflowState &&
    effectiveLocalStatusNameKey === 'ready'
  const isPosOrShopDeliveringWorkflowState =
    isPosOrShopOrder &&
    isPendingLocalWorkflowState &&
    effectiveLocalStatusNameKey === 'way'
  const canGenericConfirmOrder =
    isGenericLocalOrder &&
    !isTerminalOrder &&
    (
      isPosOrShopInitialWorkflowState ||
      (isPosOrder && isEditablePosCartOrder)
    )
  const canGenericCancelOrder =
    isGenericLocalOrder &&
    !isTerminalOrder &&
    platformCapabilities.canCancel
  const shouldShowKdsCancel = canGenericCancelOrder
  const canGenericReadyOrder =
    isGenericLocalOrder &&
    platformCapabilities.canReady &&
    !isTerminalOrder &&
    (
      isPosOrShopOrder
        ? isPosOrShopPreparingWorkflowState
        : true
    )
  const canGenericDeliveredOrder =
    isGenericLocalOrder &&
    platformCapabilities.canDeliver &&
    !isTerminalOrder &&
    (
      isPosOrShopOrder
        ? isPosOrShopDeliveringWorkflowState
        : true
    )

  const canFinalizeGenericOrder =
    isGenericLocalOrder &&
    !isTerminalOrder &&
    (
      isPosOrShopOrder
        ? isPosOrShopReadyWorkflowState
        : (
            !shouldShowKdsCancel &&
            !canGenericReadyOrder &&
            !canGenericDeliveredOrder
        )
    )

  const closeDetailsModal = useCallback(() => {
    setDetailsModalVisible(false)
  }, [])

  const handleOrderTools = useCallback(async () => {
    setDetailsModalVisible(true)
    await marketplaceSummary.ensureMarketplaceSummary()
  }, [marketplaceSummary])

  const handleOrderLogs = useCallback(() => {
    const currentOrderId = item?.id || orderParam?.id
    if (!currentOrderId) return

    navigation.navigate('EntityLogPage', {
      id: currentOrderId,
      store: 'orders',
    })
  }, [item?.id, navigation, orderParam?.id])

  const handleConfirmGenericOrder = useCallback(() => {
    if (!item?.id || isTerminalOrder || orderActionLoading === 'confirm') {
      return
    }

    void runOrderAction('confirm')
  }, [
    item?.id,
    isTerminalOrder,
    orderActionLoading,
    runOrderAction,
  ])

  const handleMarkOrderAsReady = useCallback(() => {
    if (!item?.id || isTerminalOrder || orderActionLoading === 'ready') {
      return
    }

    void runOrderAction('ready')
  }, [
    item?.id,
    isTerminalOrder,
    orderActionLoading,
    runOrderAction,
  ])

  const handleDeliverGenericOrder = useCallback(() => {
    if (!item?.id || isTerminalOrder || orderActionLoading === 'delivered') {
      return
    }

    void runOrderAction('delivered')
  }, [
    item?.id,
    isTerminalOrder,
    orderActionLoading,
    runOrderAction,
  ])

  const handleFinalizeGenericOrder = useCallback(() => {
    if (!item?.id || isTerminalOrder || orderActionLoading === 'finalize') {
      return
    }

    void runOrderAction('finalize')
  }, [
    item?.id,
    isTerminalOrder,
    orderActionLoading,
    runOrderAction,
  ])

  const confirmCancelOrder = useCallback((callback) => {
    if (
      typeof callback !== 'function' ||
      isTerminalOrder ||
      orderActionLoading
    ) {
      return
    }

    const title = global.t?.t('orders', 'title', 'confirmation') || 'Confirmação'
    const message = global.t?.t('orders', 'message', 'confirmCancelOrder') || 'Confirma o cancelamento deste pedido?'
    const cancelLabel = global.t?.t('orders', 'button', 'cancel') || 'Cancelar'
    const confirmLabel = global.t?.t('orders', 'button', 'confirm') || 'Confirmar'

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (window.confirm(message)) {
        callback()
      }
      return
    }

    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: callback },
    ])
  }, [
    isTerminalOrder,
    orderActionLoading,
  ])

  const handleCancelOrderPress = useCallback(() => {
    if (!canGenericCancelOrder) {
      showError(
        global.t?.t('orders', 'message', 'orderCannotBeCanceledAfterReady') ||
          'Este pedido nao pode mais ser cancelado depois que saiu do estado editavel.',
      )
      return
    }

    confirmCancelOrder(() => {
      void runOrderAction('cancel')
    })
  }, [
    confirmCancelOrder,
    canGenericCancelOrder,
    runOrderAction,
    showError,
  ])

  const primaryKdsAction = null

  const kdsOrderProductsStyles = useMemo(
    () => ({
      itemRow: localStyles.mobileProductItemRow,
      text: localStyles.mobileProductText,
      subText: localStyles.mobileProductSubText,
      qtyText: localStyles.mobileProductQtyText,
      statusMarker: localStyles.mobileProductStatusMarker,
      groupWrap: localStyles.orderProductGroupWrap,
      groupTitlePill: localStyles.orderProductGroupTitlePill,
      groupTitle: localStyles.orderProductGroupTitle,
      groupItem: localStyles.orderProductGroupItem,
      groupItemRow: localStyles.orderProductGroupItemRow,
      groupItemText: localStyles.orderProductGroupItemText,
      groupItemMetaText: localStyles.orderProductGroupItemMetaText,
      groupItemPriceText: localStyles.orderProductGroupItemPriceText,
    }),
    [
      localStyles.orderProductGroupItem,
      localStyles.orderProductGroupItemMetaText,
      localStyles.orderProductGroupItemPriceText,
      localStyles.orderProductGroupItemRow,
      localStyles.orderProductGroupItemText,
      localStyles.orderProductGroupTitle,
      localStyles.orderProductGroupTitlePill,
      localStyles.orderProductGroupWrap,
      localStyles.mobileProductItemRow,
      localStyles.mobileProductQtyText,
      localStyles.mobileProductStatusMarker,
      localStyles.mobileProductSubText,
      localStyles.mobileProductText,
    ],
  )

  const resolvedPrimaryKdsAction = !isTerminalOrder && (
    primaryKdsAction ||
    (
      canGenericConfirmOrder
        ? {
            label: global.t?.t('orders', 'label', 'startPreparation') || 'Iniciar preparo',
            icon: 'play-arrow',
            loadingKey: 'confirm',
            disabled: orderActionLoading === 'confirm',
            onPress: handleConfirmGenericOrder,
          }
        : canGenericReadyOrder
          ? {
              label: global.t?.t('orders', 'button', 'orderReady'),
              icon: 'check-circle',
              loadingKey: 'ready',
              disabled: orderActionLoading === 'ready',
              onPress: handleMarkOrderAsReady,
            }
          : canGenericDeliveredOrder
            ? {
                label: global.t?.t('orders', 'button', 'deliverOrder'),
                icon: 'local-shipping',
                loadingKey: 'delivered',
                disabled: orderActionLoading === 'delivered',
                onPress: handleDeliverGenericOrder,
              }
            : canFinalizeGenericOrder
              ? {
                  label: global.t?.t('orders', 'button', 'finalize') || 'Finalizar',
                  icon: 'task-alt',
                  loadingKey: 'finalize',
                  disabled: orderActionLoading === 'finalize',
                  onPress: handleFinalizeGenericOrder,
                }
              : null
    )
  )
  const shouldShowMobileCancelAction = shouldShowKdsCancel
  const shouldShowMobileBottomActions =
    shouldShowMobileCancelAction ||
    !!resolvedPrimaryKdsAction
  const shouldShowMobilePaymentBar =
    useUnifiedKdsLayout &&
    !hasTerminalOrderState &&
    !hasMarketplaceIntegration
  const mobileBottomCartOffset = shouldShowMobileBottomActions ? 74 : 0
  const mobileOrderBottomSpacing = shouldShowMobilePaymentBar
    ? (shouldShowMobileBottomActions ? 226 : 156)
    : 126

  const isResolvedPrimaryKdsActionLoading =
    !!resolvedPrimaryKdsAction &&
    orderActionLoading === resolvedPrimaryKdsAction.loadingKey

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `${global.t?.t('orders', 'title', 'order')} #${orderDisplayId}`,
      showBottomToolBar: !shouldHideBottomToolBar,
      headerTitle: () => (
        <View style={localStyles.topBarTitleWrap}>
          <Text style={localStyles.topBarTitleText}>{global.t?.t('orders', 'title', 'order')} #{orderDisplayId}</Text>
          {!!orderDateLabel && (
            <Text style={localStyles.topBarTitleSubText}>{orderDateLabel}</Text>
          )}
        </View>
      ),
      headerRight: () => (
        <View style={localStyles.topBarActions}>
          {isKds ? (
            !isTvDisplay ? (
              <PrintButton
                job={{type: 'order', orderId: item?.id || orderParam?.id}}
                store="orders"
                layout={{variant: 'icon'}}
                compact
                iconColor={ppcColors.accentInfo}
                compactButtonStyle={localStyles.topBarIconButton}
                compactSelectStyle={localStyles.topBarIconButton}
                printerSelection={{
                  enabled: true,
                  context: 'display',
                  display: selectedDisplay,
                  displayId: selectedDisplay?.id,
                }}
                disabled={!(item?.id || orderParam?.id)}
              />
            ) : null
          ) : (
            <PrintButton
              job={{type: 'order'}}
              store="orders"
              compact
              iconColor={ppcColors.accentInfo}
              compactButtonStyle={localStyles.topBarIconButton}
              compactSelectStyle={localStyles.topBarIconButton}
              printerSelection={{enabled: true}}
              disabled={!item?.id}
            />
          )}

          <TouchableOpacity
            onPress={handleOrderTools}
            style={localStyles.topBarIconButton}
          >
            <Icon name="view-list" size={20} color={ppcColors.accentInfo} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleOrderLogs}
            style={localStyles.topBarIconButton}
            disabled={!(item?.id || orderParam?.id)}
          >
            <Icon name="history" size={20} color={ppcColors.accentInfo} />
          </TouchableOpacity>
        </View>
      ),
    })
  }, [
    handleOrderLogs,
    handleOrderTools,
    item?.id,
    orderParam?.id,
    isKds,
    isTvDisplay,
    localStyles.topBarActions,
    localStyles.topBarIconButton,
    localStyles.topBarTitleSubText,
    localStyles.topBarTitleText,
    localStyles.topBarTitleWrap,
    navigation,
    orderDateLabel,
    orderDisplayId,
    ppcColors.accentInfo,
    selectedDisplay,
    shouldHideBottomToolBar,
  ])

  const renderLocalInvoiceCards = useCallback(
    variant => {
      const isDetailsVariant = variant === 'details'

      if (!localInvoiceCards.length) {
        return (
          <Text style={isDetailsVariant ? localStyles.detailsInfoText : localStyles.mobileInfoSubtitle}>
            {localInvoicesEmptyText}
          </Text>
        )
      }

      return (
        <View style={localStyles.orderInvoiceList}>
          {localInvoiceCards.map(invoiceCard => (
            <View
              key={invoiceCard.id}
              style={[
                localStyles.orderInvoiceCard,
                isDetailsVariant && localStyles.orderInvoiceCardDetails,
              ]}
            >
              <View style={localStyles.orderInvoiceCardHeader}>
                <View style={localStyles.orderInvoiceTitleWrap}>
                  <Text style={localStyles.orderInvoiceTitle}>{invoiceCard.title}</Text>
                  {!!invoiceCard.subtitle && (
                    <Text style={localStyles.orderInvoiceSubtitle}>{invoiceCard.subtitle}</Text>
                  )}
                </View>

                <View
                  style={[
                    localStyles.orderInvoiceStatusBadge,
                    {
                      borderColor: invoiceCard.statusColor,
                      backgroundColor: invoiceCard.statusBackgroundColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.orderInvoiceStatusText,
                      { color: invoiceCard.statusColor },
                    ]}
                  >
                    {invoiceCard.statusLabel}
                  </Text>
                </View>
              </View>

              <Text style={localStyles.orderInvoiceAmount}>
                {Formatter.formatMoney(invoiceCard.amount || 0)}
              </Text>
              <Text style={localStyles.orderInvoiceKind}>
                {(global.t?.t('orders', 'label', 'invoiceType') || 'Tipo')}: {invoiceCard.kindLabel}
              </Text>
              {!!invoiceCard.counterpartyLabel && (
                <Text style={localStyles.orderInvoiceMeta}>
                  {invoiceCard.kindKey === 'payable'
                    ? (global.t?.t('orders', 'label', 'receiver') || 'Recebedor')
                    : invoiceCard.kindKey === 'receivable'
                      ? (global.t?.t('orders', 'label', 'payer') || 'Pagador')
                      : (global.t?.t('orders', 'label', 'counterparty') || 'Contraparte')}: {invoiceCard.counterpartyLabel}
                </Text>
              )}
              <Text style={localStyles.orderInvoiceMeta}>
                {(global.t?.t('orders', 'label', 'paymentMethod') || 'Forma de pagamento')}: {invoiceCard.paymentTypeLabel}
              </Text>
            </View>
          ))}
        </View>
      )
    },
    [
      localInvoiceCards,
      localInvoicesEmptyText,
      localStyles.detailsInfoText,
      localStyles.mobileInfoSubtitle,
      localStyles.orderInvoiceAmount,
      localStyles.orderInvoiceCard,
      localStyles.orderInvoiceCardDetails,
      localStyles.orderInvoiceCardHeader,
      localStyles.orderInvoiceKind,
      localStyles.orderInvoiceList,
      localStyles.orderInvoiceMeta,
      localStyles.orderInvoiceStatusBadge,
      localStyles.orderInvoiceStatusText,
      localStyles.orderInvoiceSubtitle,
      localStyles.orderInvoiceTitle,
      localStyles.orderInvoiceTitleWrap,
    ],
  )

  const orderSummaryData = useMemo(() => {
    return {
      base: {
        orderId: item?.id || orderParam?.id || '--',
        cards: [
          {
            key: 'application',
            label: global.t?.t('orders', 'label', 'application'),
            value: item?.app || '-',
          },
          {
            key: 'local-status',
            label: global.t?.t('orders', 'label', 'localStatus'),
            value: effectiveLocalStatusNameKey || item?.status?.status || '-',
          },
          {
            key: 'local-real-status',
            label: global.t?.t('orders', 'label', 'localRealStatus') || 'Real status local',
            value: effectiveLocalRealStatusKey || item?.status?.realStatus || '-',
          },
          {
            key: 'payments',
            label: global.t?.t('orders', 'title', 'payments') || 'Pagamentos',
            value: localInvoiceCards.length,
          },
        ],
        lines: [
          {
            key: 'created-at',
            label: global.t?.t('orders', 'label', 'createdAt'),
            value: formatOrderDateTime(resolvedOrderDateValue),
          },
          {
            key: 'updated-at',
            label: global.t?.t('orders', 'label', 'updatedAt'),
            value: formatOrderDateTime(item?.alterDate || resolvedOrderDateValue),
          },
          {
            key: 'local-total',
            label: global.t?.t('orders', 'label', 'localTotal'),
            value: Formatter.formatMoney(localOrderTotal || 0),
          },
          !!orderCustomerName && {
            key: 'customer',
            label: global.t?.t('orders', 'label', 'customer'),
            value: orderCustomerName,
          },
          !!orderCustomerPhone && {
            key: 'customer-phone',
            label: global.t?.t('orders', 'label', 'phone'),
            value: orderCustomerPhone,
          },
          !!orderCustomerDocument && {
            key: 'customer-document',
            label: orderCustomerDocumentLabel,
            value: orderCustomerDocument,
          },
          shouldShowOrderAddress && !!localOrderAddressParts.primary && {
            key: 'address',
            label: global.t?.t('orders', 'label', 'delivery'),
            value: localOrderAddressParts.primary,
          },
        ].filter(Boolean),
        invoicesTitle: localInvoicesSectionTitle,
        invoiceCardsNode: renderLocalInvoiceCards('details'),
      },
      primaryAction:
        !hasMarketplaceIntegration && resolvedPrimaryKdsAction
          ? {
              disabled: orderActionLoading === resolvedPrimaryKdsAction.loadingKey,
              onPress: resolvedPrimaryKdsAction.onPress,
              content:
                orderActionLoading === resolvedPrimaryKdsAction.loadingKey ? (
                  <ActivityIndicator size="small" color="#F8FAFC" />
                ) : (
                  <>
                    <Icon
                      name={resolvedPrimaryKdsAction.icon}
                      size={18}
                      color="#F8FAFC"
                    />
                    <Text style={localStyles.detailsMarkPaidButtonText}>
                      {resolvedPrimaryKdsAction.label}
                    </Text>
                  </>
                ),
            }
          : null,
      marketplace: marketplaceSummary.summary,
    }
  }, [
    effectiveLocalRealStatusKey,
    effectiveLocalStatusNameKey,
    formatOrderDateTime,
    hasMarketplaceIntegration,
    item?.alterDate,
    item?.app,
    item?.id,
    item?.status?.realStatus,
    item?.status?.status,
    localInvoiceCards.length,
    localInvoicesSectionTitle,
    localOrderAddressParts,
    localOrderTotal,
    marketplaceSummary.summary,
    orderCustomerDocument,
    orderCustomerDocumentLabel,
    orderCustomerName,
    orderCustomerPhone,
    orderParam?.id,
    orderActionLoading,
    renderLocalInvoiceCards,
    resolvedOrderDateValue,
    resolvedPrimaryKdsAction,
    shouldShowOrderAddress,
  ])

  const renderKdsMobileContent = () => (
    <ScrollView
      contentContainerStyle={[
        localStyles.mobileOrderScrollContent,
        { paddingBottom: mobileOrderBottomSpacing },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={localStyles.mobileOrderLayout}>
      <View style={localStyles.mobileSummaryCard}>
        <View style={localStyles.mobileSummaryHeader}>
          <View style={localStyles.mobileSummaryOriginWrap}>
            <View style={localStyles.mobileSummaryOriginIcon}>
              <Icon
                name="store"
                size={16}
                color={ppcColors.accent}
              />
            </View>
            <View>
              <Text style={localStyles.mobileSummaryLabel}>{global.t?.t('orders', 'label', 'origin')}</Text>
              <Text style={localStyles.mobileSummaryValue}>{orderOriginLabel}</Text>
            </View>
          </View>

          <View
            style={[
              localStyles.mobileStatusBadge,
              { borderColor: orderStatusBadgeColor },
            ]}
          >
            <View
              style={[
                localStyles.mobileStatusDot,
                { backgroundColor: orderStatusBadgeColor },
              ]}
            />
            <Text style={localStyles.mobileStatusText}>{orderStatusBadgeLabel}</Text>
          </View>
        </View>

        {!isPurchaseOrder && (
        <View style={localStyles.mobileSummaryMetricsRow}>
          <View style={localStyles.mobileDiscountPill}>
            <Icon name="local-offer" size={14} color={ppcColors.accent} />
            <Text style={localStyles.mobileDiscountText}>
              {global.t?.t('orders', 'label', 'discount')}: {Formatter.formatMoney(orderDiscountTotal)}
            </Text>
          </View>

          {!!orderWaitingLabel && (
            <View style={localStyles.mobileWaitingPill}>
              <Icon name="schedule" size={13} color={ppcColors.dangerText} />
              <Text style={localStyles.mobileWaitingText}>{orderWaitingLabel}</Text>
            </View>
          )}
        </View>
        )}

        <View style={localStyles.mobileSummaryFooter}>
          <Text style={localStyles.mobileTotalLabel}>{isPurchaseOrder ? global.t?.t('orders', 'label', 'totalToPay') : global.t?.t('orders', 'label', 'totalToCharge')}</Text>
          <Text style={localStyles.mobileTotalValue}>
            {Formatter.formatMoney(orderDisplayTotal)}
          </Text>
        </View>

      </View>

      <View style={localStyles.mobileInfoCard}>
        <View style={localStyles.mobileInfoHeader}>
          <View style={localStyles.mobileInfoIconWrap}>
            <Icon name={isPurchaseOrder ? 'local-shipping' : 'person'} size={16} color={ppcColors.accentInfo} />
          </View>
          <View style={localStyles.mobileInfoTextWrap}>
            <Text style={localStyles.mobileInfoLabel}>{isPurchaseOrder ? global.t?.t('orders', 'label', 'supplier') : global.t?.t('orders', 'label', 'customer')}</Text>
            <Text style={localStyles.mobileInfoTitle}>
              {isPurchaseOrder
                ? (item?.client?.alias || item?.client?.name || orderParam?.client?.alias || orderParam?.client?.name || global.t?.t('orders', 'message', 'supplierNotInformed'))
                : (orderCustomerName || global.t?.t('orders', 'message', 'customerNotIdentified'))
              }
            </Text>
            {!isPurchaseOrder && !!orderCustomerPhone && (
              <Text style={localStyles.mobileInfoSubtitle}>{orderCustomerPhone}</Text>
            )}
            {!isPurchaseOrder && !!localOrderCustomerDocument && (
              <Text style={localStyles.mobileInfoSubtitle}>
                {orderCustomerDocumentLabel}: {localOrderCustomerDocument}
              </Text>
            )}
          </View>
        </View>

        {!isPurchaseOrder && (
          <View style={localStyles.inlineActionRow}>
            <TouchableOpacity
              onPress={openCustomerModal}
              disabled={!!customerLinkingId}
              style={[
                localStyles.inlineActionButton,
                localStyles.inlineActionButtonPrimary,
                !!customerLinkingId &&
                  localStyles.inlineActionButtonDisabled,
              ]}
            >
              <Icon name="search" size={15} color={ppcColors.accentInfo} />
              <Text style={localStyles.inlineActionButtonText}>
                {orderCustomerName ? 'Trocar cliente' : 'Vincular cliente'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {shouldShowOrderAddress && (
          <View style={localStyles.mobileAddressCard}>
            <Icon name="place" size={15} color={ppcColors.accentInfo} />
            <View style={localStyles.mobileAddressTextWrap}>
              <Text style={localStyles.mobileAddressPrimary}>
                {orderAddressPrimary || global.t?.t('orders', 'message', 'addressNotInformed')}
              </Text>
              {!!orderAddressSecondary && (
                <Text style={localStyles.mobileAddressSecondary}>{orderAddressSecondary}</Text>
              )}
            </View>
          </View>
        )}

        {!isPurchaseOrder && shouldShowOrderAddress && (
          <View style={localStyles.inlineActionRow}>
            <TouchableOpacity
              onPress={openAddressModal}
              disabled={addressSaveLoading || !!addressSelectingId}
              style={[
                localStyles.inlineActionButton,
                localStyles.inlineActionButtonPrimary,
                (addressSaveLoading || !!addressSelectingId) &&
                  localStyles.inlineActionButtonDisabled,
              ]}
            >
              <Icon
                name={selectedOrderClientIri ? 'place' : 'add-location'}
                size={15}
                color={ppcColors.accentInfo}
              />
              <Text style={localStyles.inlineActionButtonText}>
                {selectedOrderClientIri ? 'Escolher endereco' : 'Novo endereco'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!isPurchaseOrder && showBaseOrderObservationCard && (
          <View style={localStyles.mobileNoteCard}>
            <View style={localStyles.mobileNoteHeader}>
              <Icon name="info" size={14} color={ppcColors.accent} />
              <Text style={localStyles.mobileNoteLabel}>{global.t?.t('orders', 'label', 'customerObservation')}</Text>
            </View>
            <Text style={localStyles.mobileNoteText}>{baseOrderObservationText}</Text>
          </View>
        )}
      </View>

      <OrderExtraDataCard order={resolvedDisplayOrder || item} />

      <View style={localStyles.mobileInfoCard}>
        <View style={localStyles.orderInvoiceBlockHeader}>
          <Text style={localStyles.mobileInfoLabel}>{localInvoicesSectionTitle}</Text>
          {!!localInvoiceCards.length && (
            <Text style={localStyles.orderInvoiceCounter}>{localInvoicesCountLabel}</Text>
          )}
        </View>
        {renderLocalInvoiceCards('mobile')}
      </View>

      <View style={[cssStyles.itemsSection, localStyles.mobileProductsCard]}>
        <View style={inlineStyle_2116_14}>
          <Text style={[localStyles.mobileProductsTitle, { flex: 1 }]}>{global.t?.t('orders', 'title', 'orderItems')}</Text>
          {canAddProductsToOrder && (
            <TouchableOpacity
              onPress={handleAddProduct}
              style={inlineStyle_2121_14({
                ppcColors: ppcColors,
              })}
            >
              <Icon name="add-circle" size={14} color="#fff" />
              <Text style={inlineStyle_2128_20}>
                {addProductsButtonLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {isPurchaseOrder
          ? (resolvedDisplayOrderProductsWithProductDetails || []).map((op, idx) => {
              const prodName = op?.product?.product || op?.product?.name || `Produto #${idx + 1}`
              const prodDesc = op?.product?.description || ''
              const qty      = Number(op?.quantity || 0)
              const price    = Number(op?.unitPrice || op?.price || 0)
              const unitLabel = resolveOrderItemUnitLabel(op)
              const total    = qty * price
              const comment  = String(op?.comments || '').trim()
              return (
                <View key={op?.id || idx} style={localStyles.purchaseItemRow}>
                  <View style={localStyles.purchaseItemTop}>
                    <Text style={localStyles.purchaseItemName} numberOfLines={2}>{prodName}</Text>
                    <Text style={localStyles.purchaseItemQty}>{qty} {unitLabel}</Text>
                  </View>
                  {!!prodDesc && (
                    <Text style={localStyles.purchaseItemDesc} numberOfLines={2}>{prodDesc}</Text>
                  )}
                  {!!comment && (
                    <Text style={localStyles.purchaseItemComment}>{global.t?.t('orders', 'label', 'obs')}: {comment}</Text>
                  )}
                  <View style={localStyles.purchaseItemPriceRow}>
                    {price > 0 && (
                      <Text style={localStyles.purchaseItemUnit}>
                        {Formatter.formatMoney(price)} / {unitLabel}
                      </Text>
                    )}
                    {price > 0 && (
                      <Text style={localStyles.purchaseItemTotal}>{Formatter.formatMoney(total)}</Text>
                    )}
                  </View>
                </View>
              )
            })
          : (canEditItems
              ? (
                <React.Fragment>
                  {editableOrderProductsWithProductDetails.map(op => {
                    const opId = String(op?.id || '')
                    const name = op?.product?.product || op?.product?.name || 'Item'
                    const qty = Number(op?.quantity || 0)
                    const price = Number(op?.unitPrice || op?.price || 0)
                    const unitLabel = resolveOrderItemUnitLabel(op)
                    const isOpLoading = isOrderProductCommitting(opId)
                    const isConfirming = confirmRemoveItemId === opId
                    return (
                      <View key={opId || op['@id']} style={localStyles.editItemRow}>
                        <View style={inlineStyle_2181_30}>
                          <Text style={localStyles.editItemName} numberOfLines={2}>{name}</Text>
                          {price > 0 && (
                            <Text style={localStyles.editItemPrice}>{Formatter.formatMoney(price)} / {unitLabel}</Text>
                          )}
                        </View>
                        {isConfirming ? (
                          <View style={localStyles.editConfirmRow}>
                            <Text style={localStyles.editConfirmText}>Remover?</Text>
                            <TouchableOpacity
                              onPress={() => handleRemoveOp(op)}
                              style={localStyles.editConfirmYes}
                              disabled={isOpLoading}
                            >
                              {isOpLoading
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Icon name="check" size={15} color="#fff" />}
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setConfirmRemoveItemId(null)}
                              style={localStyles.editConfirmNo}
                              disabled={isOpLoading}
                            >
                              <Icon name="close" size={15} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={localStyles.editQtyRow}>
                            <TouchableOpacity
                              onPress={() => handleDecreaseOpQuantity(op)}
                              style={localStyles.editQtyBtn}
                            >
                              <Icon name={qty <= 1 ? 'delete' : 'remove'} size={18} color={qty <= 1 ? '#EF4444' : ppcColors.textPrimary} />
                            </TouchableOpacity>
                            <View style={localStyles.editQtyBox}>
                              <Text style={localStyles.editQtyText}>{qty}</Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => handleIncreaseOpQuantity(op)}
                              style={localStyles.editQtyBtn}
                            >
                              <Icon name="add" size={18} color={ppcColors.textPrimary} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </React.Fragment>
              )
              : (
                <OrderProducts
                  order={resolvedDisplayOrder || item}
                  scale={scale}
                  styles={kdsOrderProductsStyles}
                  indentStep={18}
                  showDetails
                />
              )
            )
        }
      </View>
      </View>
    </ScrollView>
  )

  const modalBottomInset = Math.max(insets?.bottom || 0, 8)

  return (
    <SafeAreaView
      style={[
        cssStyles.container,
        {
          flex: 1,
          paddingBottom: useUnifiedKdsLayout ? 0 : 120,
          backgroundColor: useUnifiedKdsLayout ? ppcColors.appBg : undefined,
        },
        useUnifiedKdsLayout && localStyles.kdsContainer,
      ]}
    >
      {showBarcodeInput && <BarcodeInput />}
      <StateStore store="orders" />
      <Modal
        transparent
        animationType="slide"
        visible={customerModalVisible}
        onRequestClose={closeCustomerModal}
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
        <View style={localStyles.modalSheetRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={localStyles.modalSheetBackdrop}
            onPress={closeCustomerModal}
          />
          <View style={localStyles.modalSheetWrap}>
            <View
              style={[
                localStyles.deliveryCodeModal,
                { paddingBottom: 14 + modalBottomInset },
              ]}
            >
              <View style={localStyles.deliveryCodeHeader}>
                <Text style={localStyles.deliveryCodeStepBadge}>
                  Clientes
                </Text>
                <TouchableOpacity
                  onPress={closeCustomerModal}
                  disabled={!!customerLinkingId}
                  style={localStyles.deliveryCodeCloseButton}
                >
                  <Icon name="close" size={22} color={ppcColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={localStyles.deliveryCodeModalTitle}>
                {orderCustomerName ? 'Trocar cliente do pedido' : 'Vincular cliente ao pedido'}
              </Text>

              <ScrollView
                style={localStyles.deliveryCodeScroll}
                contentContainerStyle={localStyles.deliveryCodeScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={localStyles.deliveryCodeDescription}>
                  Pesquise por nome, email, telefone, documento ou endereco. Se nao encontrar, use o cadastro rapido abaixo sem sair deste modal.
                </Text>

                <View style={localStyles.assignmentSearchBox}>
                  <Icon name="search" size={18} color={ppcColors.textSecondary} />
                  <TextInput
                    value={customerSearch}
                    onChangeText={setCustomerSearch}
                    editable={!customerLinkingId}
                    placeholder="Buscar cliente"
                    placeholderTextColor={ppcColors.textSecondary}
                    autoCapitalize="none"
                    style={localStyles.assignmentSearchInput}
                  />
                  {customerSearchLoading && (
                    <ActivityIndicator size="small" color={ppcColors.primary} />
                  )}
                </View>

                {customerSearch.trim().length === 0 ? (
                  <View style={localStyles.assignmentEmptyState}>
                    <Text style={localStyles.assignmentEmptyStateTitle}>
                      Digite para buscar
                    </Text>
                    <Text style={localStyles.assignmentEmptyStateText}>
                      A busca considera nome, email, telefone, documento e enderecos do cliente.
                    </Text>
                  </View>
                ) : customerSearchLoading ? (
                  <View style={localStyles.assignmentEmptyState}>
                    <ActivityIndicator size="small" color={ppcColors.primary} />
                    <Text style={localStyles.assignmentEmptyStateText}>
                      Buscando clientes...
                    </Text>
                  </View>
                ) : customerSearchResults.length > 0 ? (
                  customerSearchResults.map(customer => {
                    const customerId = String(getEntityId(customer) || '')
                    const customerIri = toEntityIri(customer, 'people')
                    const customerMeta = buildCustomerSearchMeta(customer)
                    const customerTitle = resolvePreferredText(
                      customer?.alias,
                      customer?.name,
                    ) || `Cliente #${customerId || '--'}`
                    const isCurrent = customerIri === selectedOrderClientIri
                    const isSaving = customerLinkingId === customerId

                    return (
                      <TouchableOpacity
                        key={customerIri || customerId || customerTitle}
                        onPress={() => handleSelectCustomer(customer)}
                        disabled={!!customerLinkingId}
                        style={[
                          localStyles.assignmentOptionCard,
                          isCurrent && localStyles.assignmentOptionCardSelected,
                        ]}
                      >
                        <View style={localStyles.assignmentOptionTextWrap}>
                          <Text style={localStyles.assignmentOptionTitle}>
                            {customerTitle}
                          </Text>
                          {!!customerMeta && (
                            <Text style={localStyles.assignmentOptionMeta}>
                              {customerMeta}
                            </Text>
                          )}
                        </View>

                        {isSaving ? (
                          <ActivityIndicator size="small" color={ppcColors.primary} />
                        ) : isCurrent ? (
                          <Text style={localStyles.assignmentOptionBadge}>Atual</Text>
                        ) : (
                          <Icon name="chevron-right" size={20} color={ppcColors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    )
                  })
                ) : (
                  <View style={localStyles.assignmentEmptyState}>
                    <Text style={localStyles.assignmentEmptyStateTitle}>
                      Nenhum cliente encontrado
                    </Text>
                    <Text style={localStyles.assignmentEmptyStateText}>
                      Use o cadastro rapido para criar e vincular um novo cliente.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={openCustomerCreateModal}
                  disabled={!!customerLinkingId}
                  style={localStyles.assignmentQuickActionCard}
                >
                  <View style={localStyles.assignmentQuickActionHeader}>
                    <Icon name="person-add" size={18} color={ppcColors.accentInfo} />
                    <Text style={localStyles.assignmentQuickActionTitle}>
                      Cadastro rapido de cliente
                    </Text>
                  </View>
                  <Text style={localStyles.assignmentQuickActionText}>
                    Abre o cadastro compartilhado de clientes do CRM e vincula o resultado neste pedido.
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={localStyles.deliveryCodeActions}>
                <TouchableOpacity
                  onPress={closeCustomerModal}
                  disabled={!!customerLinkingId}
                  style={[
                    localStyles.deliveryCodeButton,
                    localStyles.deliveryCodeButtonSecondary,
                  ]}
                >
                  <Text style={localStyles.deliveryCodeButtonSecondaryText}>
                    {global.t?.t('orders', 'button', 'close') || 'Fechar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <AddCompanyModal
        visible={customerCreateModalVisible}
        onClose={() => setCustomerCreateModalVisible(false)}
        context={{ context: 'client' }}
        onSuccess={savedCustomer => {
          void handleCustomerCreated(savedCustomer)
        }}
      />
      <Modal
        transparent
        animationType="slide"
        visible={addressModalVisible}
        onRequestClose={closeAddressModal}
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
        <View style={localStyles.modalSheetRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={localStyles.modalSheetBackdrop}
            onPress={closeAddressModal}
          />
          <View style={localStyles.modalSheetWrap}>
            <View
              style={[
                localStyles.deliveryCodeModal,
                { paddingBottom: 14 + modalBottomInset },
              ]}
            >
              <View style={localStyles.deliveryCodeHeader}>
                <Text style={localStyles.deliveryCodeStepBadge}>
                  Entrega
                </Text>
                <TouchableOpacity
                  onPress={closeAddressModal}
                  disabled={addressSaveLoading || !!addressSelectingId}
                  style={localStyles.deliveryCodeCloseButton}
                >
                  <Icon name="close" size={22} color={ppcColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={localStyles.deliveryCodeModalTitle}>
                Selecionar endereco de entrega
              </Text>

              <ScrollView
                style={localStyles.deliveryCodeScroll}
                contentContainerStyle={localStyles.deliveryCodeScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={localStyles.deliveryCodeDescription}>
                  {selectedOrderClientIri
                    ? 'Escolha um endereco ja cadastrado para este cliente ou use o cadastro rapido abaixo sem sair deste modal.'
                    : 'Sem cliente vinculado, use o cadastro rapido abaixo para definir o endereco deste pedido.'}
                </Text>

                {!!orderCustomerName && !!selectedOrderClientIri && (
                  <View style={localStyles.assignmentContextCard}>
                    <Icon name="person" size={16} color={ppcColors.accentInfo} />
                    <Text style={localStyles.assignmentContextText}>
                      Cliente selecionado: {orderCustomerName}
                    </Text>
                  </View>
                )}

                {addressOptionsLoading ? (
                  <View style={localStyles.assignmentEmptyState}>
                    <ActivityIndicator size="small" color={ppcColors.primary} />
                    <Text style={localStyles.assignmentEmptyStateText}>
                      Carregando enderecos...
                    </Text>
                  </View>
                ) : addressOptions.length > 0 ? (
                  addressOptions.map(address => {
                    const addressId = String(getEntityId(address) || '')
                    const addressIri = toEntityIri(address, 'addresses')
                    const summary = buildAddressOptionSummary(address)
                    const isCurrent = addressIri === selectedOrderAddressIri
                    const isSaving = addressSelectingId === addressId

                    return (
                      <TouchableOpacity
                        key={addressIri || addressId || summary.primary}
                        onPress={() => handleSelectAddress(address)}
                        disabled={!!addressSelectingId || addressSaveLoading}
                        style={[
                          localStyles.assignmentOptionCard,
                          isCurrent && localStyles.assignmentOptionCardSelected,
                        ]}
                      >
                        <View style={localStyles.assignmentOptionTextWrap}>
                          <Text style={localStyles.assignmentOptionTitle}>
                            {summary.primary || `Endereco #${addressId || '--'}`}
                          </Text>
                          {!!summary.secondary && (
                            <Text style={localStyles.assignmentOptionMeta}>
                              {summary.secondary}
                            </Text>
                          )}
                        </View>

                        {isSaving ? (
                          <ActivityIndicator size="small" color={ppcColors.primary} />
                        ) : isCurrent ? (
                          <Text style={localStyles.assignmentOptionBadge}>Atual</Text>
                        ) : (
                          <Icon name="chevron-right" size={20} color={ppcColors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    )
                  })
                ) : (
                  <View style={localStyles.assignmentEmptyState}>
                    <Text style={localStyles.assignmentEmptyStateTitle}>
                      Nenhum endereco encontrado
                    </Text>
                    <Text style={localStyles.assignmentEmptyStateText}>
                      Cadastre um endereco rapido para aplicar neste pedido.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={
                    addressModalMode === 'create'
                      ? () => setAddressModalMode('select')
                      : openAddressCreateMode
                  }
                  disabled={addressSaveLoading || !!addressSelectingId}
                  style={localStyles.assignmentQuickActionCard}
                >
                  <View style={localStyles.assignmentQuickActionHeader}>
                    <Icon name="add-location" size={18} color={ppcColors.accentInfo} />
                    <Text style={localStyles.assignmentQuickActionTitle}>
                      Cadastro rapido de endereco
                    </Text>
                  </View>
                  <Text style={localStyles.assignmentQuickActionText}>
                    {addressModalMode === 'create'
                      ? 'Ocultar o formulario rapido.'
                      : 'Crie um novo endereco sem sair do detalhe do pedido.'}
                  </Text>
                </TouchableOpacity>

                {addressModalMode === 'create' && (
                  <>
                    <TextInput
                      value={addressForm.nickname}
                      onChangeText={value => handleAddressFormFieldChange('nickname', value)}
                      editable={!addressSaveLoading}
                      placeholder="Referencia ou apelido"
                      placeholderTextColor={ppcColors.textSecondary}
                      style={localStyles.assignmentFormInput}
                    />
                    <View style={localStyles.assignmentFormRow}>
                      <TextInput
                        value={addressForm.cep}
                        onChangeText={value => handleAddressFormFieldChange('cep', value)}
                        editable={!addressSaveLoading}
                        placeholder="CEP"
                        placeholderTextColor={ppcColors.textSecondary}
                        keyboardType="number-pad"
                        style={[localStyles.assignmentFormInput, { flex: 1 }]}
                      />
                      <TextInput
                        value={addressForm.number}
                        onChangeText={value => handleAddressFormFieldChange('number', value)}
                        editable={!addressSaveLoading}
                        placeholder="Numero"
                        placeholderTextColor={ppcColors.textSecondary}
                        keyboardType="number-pad"
                        style={[localStyles.assignmentFormInput, { flex: 1 }]}
                      />
                    </View>
                    <TextInput
                      value={addressForm.street}
                      onChangeText={value => handleAddressFormFieldChange('street', value)}
                      editable={!addressSaveLoading}
                      placeholder="Rua"
                      placeholderTextColor={ppcColors.textSecondary}
                      style={localStyles.assignmentFormInput}
                    />
                    <TextInput
                      value={addressForm.complement}
                      onChangeText={value => handleAddressFormFieldChange('complement', value)}
                      editable={!addressSaveLoading}
                      placeholder="Complemento"
                      placeholderTextColor={ppcColors.textSecondary}
                      style={localStyles.assignmentFormInput}
                    />
                    <TextInput
                      value={addressForm.district}
                      onChangeText={value => handleAddressFormFieldChange('district', value)}
                      editable={!addressSaveLoading}
                      placeholder="Bairro"
                      placeholderTextColor={ppcColors.textSecondary}
                      style={localStyles.assignmentFormInput}
                    />
                    <TextInput
                      value={addressForm.city}
                      onChangeText={value => handleAddressFormFieldChange('city', value)}
                      editable={!addressSaveLoading}
                      placeholder="Cidade"
                      placeholderTextColor={ppcColors.textSecondary}
                      style={localStyles.assignmentFormInput}
                    />
                    <View style={localStyles.assignmentFormRow}>
                      <TextInput
                        value={addressForm.state}
                        onChangeText={value => handleAddressFormFieldChange('state', value)}
                        editable={!addressSaveLoading}
                        placeholder="Estado"
                        placeholderTextColor={ppcColors.textSecondary}
                        style={[localStyles.assignmentFormInput, { flex: 1 }]}
                      />
                      <TextInput
                        value={addressForm.country}
                        onChangeText={value => handleAddressFormFieldChange('country', value)}
                        editable={!addressSaveLoading}
                        placeholder="Pais"
                        placeholderTextColor={ppcColors.textSecondary}
                        style={[localStyles.assignmentFormInput, { flex: 1 }]}
                      />
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={localStyles.deliveryCodeActions}>
                <TouchableOpacity
                  onPress={closeAddressModal}
                  disabled={addressSaveLoading || !!addressSelectingId}
                  style={[
                    localStyles.deliveryCodeButton,
                    localStyles.deliveryCodeButtonSecondary,
                  ]}
                >
                  <Text style={localStyles.deliveryCodeButtonSecondaryText}>
                    {global.t?.t('orders', 'button', 'close') || 'Fechar'}
                  </Text>
                </TouchableOpacity>

                {addressModalMode === 'create' && (
                  <TouchableOpacity
                    onPress={handleCreateAddress}
                    disabled={addressSaveLoading}
                    style={[
                      localStyles.deliveryCodeButton,
                      localStyles.deliveryCodeButtonPrimary,
                      addressSaveLoading && localStyles.kdsActionButtonDisabled,
                    ]}
                  >
                    {addressSaveLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={localStyles.deliveryCodeButtonPrimaryText}>
                        Salvar endereco
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <OrderSummaryModal
        visible={detailsModalVisible}
        onClose={closeDetailsModal}
        summary={orderSummaryData}
      />
      <OrderMarketplaceOverlayHost marketplace={marketplaceSummary.summary} />
      {!isLoading && item && !error && (
        <View style={inlineStyle_2712_14}>
          {useUnifiedKdsLayout ? (
            renderKdsMobileContent()
          ) : (
            <>
              <OrderHeader key={item.id} order={resolvedDisplayOrder || item} />
              <View style={inlineStyle_2718_20}>
                {canAddProductsToOrder && (
                  <TouchableOpacity
                    onPress={handleAddProduct}
                    style={[globalStyles.button, { marginRight: 5 }]}
                  >
                    <Icon name="add-circle" size={24} color="#fff" />
                    <Text style={inlineStyle_2725_26}>
                      {addProductsButtonLabel}
                    </Text>
                  </TouchableOpacity>
                )}

                {showInlineAddPaymentAction && (
                  <TouchableOpacity
                    onPress={handleAddPayment}
                    style={[globalStyles.button, { marginRight: 5 }]}
                  >
                    <Icon name="payments" size={24} color="#fff" />
                    <Text style={inlineStyle_2737_26}>
                      {global.t?.t('orders', 'button', 'pay') || 'Pagar'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleOrderLogs}
                  disabled={!(item?.id || orderParam?.id)}
                  style={[globalStyles.button, { marginLeft: 5 }]}
                >
                  <Icon name="history" size={24} color="#fff" />
                  <Text style={inlineStyle_2748_24}>
                    {global.t?.t('orders', 'button', 'logs') || 'Logs'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleOrderTools}
                  style={[globalStyles.button, { marginLeft: 5 }]}
                >
                  <Icon name="settings" size={24} color="#fff" />
                  <Text style={inlineStyle_2748_24}>
                    {global.t?.t('orders', 'button', 'details')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {isKds || useUnifiedKdsLayout ? null : (
            <ScrollView contentContainerStyle={inlineStyle_2768_24}>
              <OrderExtraDataCard order={resolvedDisplayOrder || item} />
              <View
                style={[
                  cssStyles.itemsSection,
                  {
                    flex: 1,
                    flexDirection: 'column',
                    width: '100%',
                  },
                ]}
              >
                {canEditItems
                  ? (
                    <React.Fragment>
                      {editableOrderProductsWithProductDetails.map(op => {
                        const opId = String(op?.id || '')
                        const name = op?.product?.product || op?.product?.name || 'Item'
                        const qty = Number(op?.quantity || 0)
                        const price = Number(op?.unitPrice || op?.price || 0)
                        const unitLabel = resolveOrderItemUnitLabel(op)
                        const isOpLoading = isOrderProductCommitting(opId)
                        const isConfirming = confirmRemoveItemId === opId
                        return (
                          <View key={opId || op['@id']} style={localStyles.editItemRow}>
                            <View style={inlineStyle_2782_34}>
                              <Text style={localStyles.editItemName} numberOfLines={2}>{name}</Text>
                              {price > 0 && (
                                <Text style={localStyles.editItemPrice}>{Formatter.formatMoney(price)} / {unitLabel}</Text>
                              )}
                            </View>
                            {isConfirming ? (
                              <View style={localStyles.editConfirmRow}>
                                <Text style={localStyles.editConfirmText}>Remover?</Text>
                                <TouchableOpacity
                                  onPress={() => handleRemoveOp(op)}
                                  style={localStyles.editConfirmYes}
                                  disabled={isOpLoading}
                                >
                                  {isOpLoading
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Icon name="check" size={15} color="#fff" />}
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => setConfirmRemoveItemId(null)}
                                  style={localStyles.editConfirmNo}
                                  disabled={isOpLoading}
                                >
                                  <Icon name="close" size={15} color="#fff" />
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <View style={localStyles.editQtyRow}>
                                <TouchableOpacity
                                  onPress={() => handleDecreaseOpQuantity(op)}
                                  style={localStyles.editQtyBtn}
                                >
                                  <Icon name={qty <= 1 ? 'delete' : 'remove'} size={18} color={qty <= 1 ? '#EF4444' : ppcColors.textPrimary} />
                                </TouchableOpacity>
                                <View style={localStyles.editQtyBox}>
                                  <Text style={localStyles.editQtyText}>{qty}</Text>
                                </View>
                                <TouchableOpacity
                                  onPress={() => handleIncreaseOpQuantity(op)}
                                  style={localStyles.editQtyBtn}
                                >
                                  <Icon name="add" size={18} color={ppcColors.textPrimary} />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </React.Fragment>
                  )
                  : (
                    <OrderProducts
                      order={resolvedDisplayOrder || item}
                      scale={scale}
                      styles={localStyles}
                      indentStep={22}
                      showDetails
                    />
                  )
                }
              </View>
            </ScrollView>
          )}

          {shouldShowMobilePaymentBar && (
            <BottomCart
              bottomOffset={mobileBottomCartOffset}
              actionLabel={global.t?.t('orders', 'button', 'pay') || 'Pagar'}
              actionIcon="credit-card"
              actionDisabled={!canAddOrderPayment}
              collapsePayableWhenPaid={false}
              onActionPress={handleAddPayment}
            />
          )}

          {useUnifiedKdsLayout && shouldShowMobileBottomActions && (
            <View style={localStyles.mobileBottomActionsWrap}>
              {(() => {
                const cancelLoading = orderActionLoading === 'cancel'

                return shouldShowMobileCancelAction ? (
                  <TouchableOpacity
                    onPress={handleCancelOrderPress}
                    disabled={cancelLoading}
                    style={[
                      localStyles.mobileCancelActionButton,
                      cancelLoading && localStyles.mobileActionButtonDisabled,
                    ]}
                  >
                    {cancelLoading ? (
                      <ActivityIndicator size="small" color={ppcColors.dangerText} />
                    ) : (
                      <Icon name="close" size={22} color={ppcColors.dangerText} />
                    )}
                  </TouchableOpacity>
                ) : null
              })()}

              {resolvedPrimaryKdsAction && (
                <TouchableOpacity
                  onPress={resolvedPrimaryKdsAction.onPress}
                  disabled={resolvedPrimaryKdsAction.disabled}
                  style={[
                    localStyles.mobilePrimaryActionButton,
                    resolvedPrimaryKdsAction.disabled &&
                      localStyles.mobileActionButtonDisabled,
                  ]}
                >
                  {isResolvedPrimaryKdsActionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Icon
                        name={resolvedPrimaryKdsAction.icon || 'check-circle'}
                        size={19}
                        color="#FFFFFF"
                      />
                      <Text style={localStyles.mobilePrimaryActionText}>
                        {resolvedPrimaryKdsAction.label}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

export default OrderDetails
