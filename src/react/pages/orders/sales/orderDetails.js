import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
  ActivityIndicator,
  Modal,
  Text,
  TextInput,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native'

import { useFocusEffect } from '@react-navigation/native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@store'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService'
import {
  isDeviceRuntimeDebugInfoEnabled,
  isTruthyValue,
  parseConfigsObject,
  isPosSelfServiceMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap'
import {
  searchCompanyProducts,
  toEntityIri,
} from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders'

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
import {
  formatInvoiceTypeLabel,
  getInvoicePaymentTypeLabel,
} from '@controleonline/ui-common/src/react/utils/invoicePresentation'

import StateStore from '@controleonline/ui-layout/src/react/components/StateStore'
import css from '@controleonline/ui-orders/src/react/css/orders'
import Icon from 'react-native-vector-icons/MaterialIcons'
import BarcodeInput from '@controleonline/ui-orders/src/react/pages/checkout/BarcodeInput'
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader'
import BottomCart from '@controleonline/ui-orders/src/react/components/cart/BottomCart'
import AddCompanyModal from '@controleonline/ui-people/src/react/components/AddCompanyModal'
import OrderInvoices from './OrderInvoices'
import OrderItemsTab from './OrderItemsTab'
import {
  canReopenOrderProductCustomization,
  isOrderProductProductionCompleted,
} from '@controleonline/ui-orders/src/react/components/OrderProducts.utils'
import {
  buildCheckoutRouteParams,
  buildManagerPdvRouteParams,
  getOrderRouteId,
  isPdvRouteContext,
} from '@controleonline/ui-orders/src/react/utils/orderRoute'
import { resolveMarketplaceAppLabel } from '@controleonline/ui-orders/src/react/utils/orderIdentity'
import { env } from '@env'
import useDebouncedOrderProductQuantitySync from '@controleonline/ui-orders/src/react/hooks/useDebouncedOrderProductQuantitySync'
import usePosOrderMaterialization from '@controleonline/ui-orders/src/react/hooks/usePosOrderMaterialization'

import {
  mergeOrderProductIntoList,
  mergeOrderWithOrderProducts,
  removeOrderProductFromList,
  withOrderProductQuantity,
} from '@controleonline/ui-orders/src/utils/orderState'
import { extractVisibleOrderExtraEntries } from '@controleonline/ui-orders/src/react/utils/orderExtraData'

import OrderMarketplaceOverlayHost from './components/OrderMarketplaceOverlayHost'
import OrderSummaryModal from './components/OrderSummaryModal'
import OrderFinancialDetailsModal from './components/OrderFinancialDetailsModal'
import OrderStackedTopBar from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderStackedTopBar'
import OrderTopBarActions, {
  ORDER_TOP_BAR_ACTIONS,
} from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderTopBarActions'
import useOrderDetailsVisuals from './useOrderDetailsVisuals'
import useOrderMarketplaceSummary from './useOrderMarketplaceSummary'
import {resolveMarketplaceInvoicePresentation} from './orderMarketplaceFinancialPresentation'
import {
  shouldRenderOrderDetailsInlineTotal,
  shouldRenderOrderDetailsPaymentAction,
  shouldRenderOrderDetailsPaymentBar,
} from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetailsPaymentBar'

import {
  inlineStyle_2712_14,
  inlineStyle_2718_20,
  inlineStyle_2725_26,
  inlineStyle_2737_26,
  inlineStyle_2748_24,
} from './orderDetails.styles';

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
const DRAFT_SALE_ORDER_TYPE = 'cart'
const LEGACY_DRAFT_SALE_ORDER_TYPE = 'quote'
const POS_DELIVERY_ENABLED_CONFIG_KEY = 'pos-delivery-enabled'

const isTerminalOrderStatus = value =>
  TERMINAL_ORDER_STATUSES.includes(String(value ?? '').trim().toLowerCase())

const resolveEditableOrderType = value => {
  const normalizedOrderType = String(value || '').trim().toLowerCase()

  if (!normalizedOrderType || normalizedOrderType === LEGACY_DRAFT_SALE_ORDER_TYPE) {
    return DRAFT_SALE_ORDER_TYPE
  }

  return normalizedOrderType
}

const translateOrderStatus = value => {
  const normalizedStatus = normalizeText(value).toLowerCase()
  if (!normalizedStatus) return ''

  return global.t?.t('orders', 'status', normalizedStatus) || formatHumanLabel(value)
}

const resolveEmbeddedOrderProducts = sourceOrder => {
  const hasOwnOrderProducts =
    !!sourceOrder && Object.prototype.hasOwnProperty.call(sourceOrder, 'orderProducts')

  if (Array.isArray(sourceOrder?.orderProducts)) {
    return {
      hasOwnOrderProducts: true,
      orderProducts: sourceOrder.orderProducts,
    }
  }

  if (Array.isArray(sourceOrder?.orderProducts?.member)) {
    return {
      hasOwnOrderProducts: true,
      orderProducts: sourceOrder.orderProducts.member,
    }
  }

  if (Array.isArray(sourceOrder?.orderProducts?.['hydra:member'])) {
    return {
      hasOwnOrderProducts: true,
      orderProducts: sourceOrder.orderProducts['hydra:member'],
    }
  }

  return {
    hasOwnOrderProducts,
    orderProducts: [],
  }
}

const hasOrderProducts = orderProducts =>
  Array.isArray(orderProducts) && orderProducts.length > 0

const getEmbeddedOrderProductComponents = orderProduct => {
  if (Array.isArray(orderProduct?.orderProductComponents)) {
    return orderProduct.orderProductComponents
  }

  if (Array.isArray(orderProduct?.orderProductComponents?.member)) {
    return orderProduct.orderProductComponents.member
  }

  if (Array.isArray(orderProduct?.orderProductComponents?.['hydra:member'])) {
    return orderProduct.orderProductComponents['hydra:member']
  }

  if (Array.isArray(orderProduct?.order_product_components)) {
    return orderProduct.order_product_components
  }

  if (Array.isArray(orderProduct?.order_product_components?.member)) {
    return orderProduct.order_product_components.member
  }

  if (Array.isArray(orderProduct?.order_product_components?.['hydra:member'])) {
    return orderProduct.order_product_components['hydra:member']
  }

  return []
}

const hasGroupingMetadata = orderProducts =>
  Array.isArray(orderProducts) &&
  orderProducts.some(
    orderProduct =>
      !!(
        orderProduct?.orderProduct ||
        orderProduct?.parentProduct ||
        orderProduct?.productGroup
      ),
  )

const hasEmbeddedOrderProductComponents = orderProducts =>
  Array.isArray(orderProducts) &&
  orderProducts.some(orderProduct => getEmbeddedOrderProductComponents(orderProduct).length > 0)

const hasDetailedOrderProductsPayload = orderProducts =>
  hasGroupingMetadata(orderProducts) ||
  hasEmbeddedOrderProductComponents(orderProducts)

const filterOrderProductsByOrderId = (orderProducts, orderId) =>
  (Array.isArray(orderProducts) ? orderProducts : []).filter(orderProduct => {
    const orderProductOrderId = getEntityId(orderProduct?.order)
    if (!orderId || !orderProductOrderId) return true
    return orderProductOrderId === orderId
  })

const choosePreferredOrderProducts = ({
  primaryOrderProducts,
  fallbackOrderProducts,
}) => {
  if (hasOrderProducts(primaryOrderProducts)) {
    if (
      !hasDetailedOrderProductsPayload(primaryOrderProducts) &&
      hasDetailedOrderProductsPayload(fallbackOrderProducts)
    ) {
      return fallbackOrderProducts
    }

    return primaryOrderProducts
  }

  if (hasOrderProducts(fallbackOrderProducts)) {
    return fallbackOrderProducts
  }

  return []
}

const getOrderProductCollectionSignature = orderProducts =>
  (Array.isArray(orderProducts) ? orderProducts : [])
    .map(orderProduct =>
      [
        getEntityId(orderProduct),
        getEntityId(orderProduct?.product),
        getEntityId(orderProduct?.order),
        getEntityId(orderProduct?.orderProduct),
        getEntityId(orderProduct?.parentProduct),
        getEntityId(orderProduct?.productGroup),
        Number(orderProduct?.quantity || 0),
        getEmbeddedOrderProductComponents(orderProduct)
          .map(component => getEntityId(component))
          .filter(Boolean)
          .join(','),
      ].join(':'),
    )
    .join('|')

const areOrderProductCollectionsEquivalent = (leftOrderProducts, rightOrderProducts) =>
  getOrderProductCollectionSignature(leftOrderProducts) ===
  getOrderProductCollectionSignature(rightOrderProducts)

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

const resolveInvoicePartyLabel = (invoice, role) => {
  if (role === 'payer') {
    return resolvePreferredText(
      getPeopleLabel(invoice?.payer),
      invoice?.sourceWallet?.wallet,
    )
  }

  return resolvePreferredText(
    getPeopleLabel(invoice?.receiver),
    invoice?.destinationWallet?.wallet,
  )
}

const resolveInvoiceDisplayAmount = invoice => {
  const rawRealPrice = invoice?.realPrice ?? invoice?.real_price

  if (rawRealPrice !== undefined && rawRealPrice !== null && rawRealPrice !== '') {
    const normalizedRealPrice = Number(rawRealPrice)
    return Number.isFinite(normalizedRealPrice) ? normalizedRealPrice : 0
  }

  const normalizedInvoicePrice = Number(invoice?.price || 0)
  return Number.isFinite(normalizedInvoicePrice) ? normalizedInvoicePrice : 0
}

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

  if ((payerId || receiverId) && !companyIsPayer && !companyIsReceiver) {
    return {
      kind: 'marketplace_flow',
      label: 'Movimentação financeira',
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
  const useUnifiedKdsLayout = true
  const hasKdsOrigin =
    String(env.APP_TYPE || '').trim().toUpperCase() === 'PPC' ||
    !!route.params?.displayId ||
    !!route.params?.display?.id ||
    String(
      route.params?.displayType || route.params?.display?.displayType || '',
    ).trim() !== ''
  const isKds = Boolean(route.params?.kds && hasKdsOrigin)
  const isTvDisplay = String(route.params?.displayType || '').toLowerCase() === 'tv'
  const shouldShowMobilePaymentBar = shouldRenderOrderDetailsPaymentBar({
    useUnifiedKdsLayout,
    isKds,
    isTvDisplay,
  })
  const shouldShowInlineOrderTotal = shouldRenderOrderDetailsInlineTotal({
    useUnifiedKdsLayout,
    isKds,
    isTvDisplay,
  })
  const { showError, showSuccess } = useMessage()
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)
  const [financialDetailsVisible, setFinancialDetailsVisible] = useState(false)
  const insets = useSafeAreaInsets()

  const ordersStore = useStore('orders')
  const { getters: ordersGetters, actions: ordersActions } = ordersStore
  const { item: storedOrderItem, isLoading, error } = ordersGetters
  const item = useMemo(() => {
    if (!routeOrderId) return storedOrderItem
    return getOrderRouteId(storedOrderItem) === routeOrderId ? storedOrderItem : null
  }, [routeOrderId, storedOrderItem])
  const invoiceStore = useStore('invoice')
  const { actions: invoiceActions } = invoiceStore
  const orderInvoicesStore = useStore('order_invoices')
  const {
    actions: orderInvoicesActions,
    getters: orderInvoicesGetters,
  } = orderInvoicesStore
  const {
    items: storedOrderInvoiceItems,
    isLoading: orderInvoicesLoading,
  } = orderInvoicesGetters

  const peopleStore = useStore('people')
  const { getters: peopleGetters, actions: peopleActions } = peopleStore
  const { defaultCompany, currentCompany } = peopleGetters
  const addressStore = useStore('address')
  const { actions: addressActions } = addressStore

  const { styles: cssStyles, globalStyles } = css()
  const { ppcColors, styles: localStyles, width: viewportWidth } = useOrderDetailsVisuals()
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
  const deviceConfigs = parseConfigsObject(device?.configs)
  const productInputType = device?.configs?.['product-input-type'] || 'manual'
  const isPosSelfServiceOperationMode = isPosSelfServiceMode(deviceConfigs)
  const isDeviceDeliveryEnabled = isTruthyValue(
    deviceConfigs?.[POS_DELIVERY_ENABLED_CONFIG_KEY],
  )
  const isDeviceDebugEnabled = isDeviceRuntimeDebugInfoEnabled(deviceConfigs)
  const canShowDebugActions = !isPosSelfServiceOperationMode || isDeviceDebugEnabled

  const isManualInput = productInputType === 'manual'
  const showBarcodeInput = item?.app === 'POS' && !isManualInput
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
  const isPurchaseOrder = String(item?.orderType || orderParam?.orderType || '').toLowerCase() === 'purchase'
  const shouldShowOrderPartyDetails = isPurchaseOrder || isDeviceDeliveryEnabled

  const orderProductsStore = useStore('order_products')
  const { items: storedOrderProducts } = orderProductsStore.getters

  const [confirmRemoveItemId, setConfirmRemoveItemId] = useState(null)
  const currentOrderProductsRef = useRef([])
  const storedOrderProductsRef = useRef([])
  const ordersActionsRef = useRef(ordersActions)
  const orderProductsActionsRef = useRef(orderProductsStore.actions)
  const [customerModalVisible, setCustomerModalVisible] = useState(false)
  const [customerCreateModalVisible, setCustomerCreateModalVisible] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState([])
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  const [productSearchText, setProductSearchText] = useState('')
  const [productSearchResults, setProductSearchResults] = useState([])
  const [productSearchLoading, setProductSearchLoading] = useState(false)
  const [productSearchSelectionId, setProductSearchSelectionId] = useState('')
  const [customerLinkingId, setCustomerLinkingId] = useState('')
  const [addressModalVisible, setAddressModalVisible] = useState(false)
  const [addressModalMode, setAddressModalMode] = useState('select')
  const [addressOptions, setAddressOptions] = useState([])
  const [addressOptionsLoading, setAddressOptionsLoading] = useState(false)
  const [addressForm, setAddressForm] = useState(createEmptyAddressForm())
  const [addressSaveLoading, setAddressSaveLoading] = useState(false)
  const [addressSelectingId, setAddressSelectingId] = useState('')
  const [observationDraft, setObservationDraft] = useState('')
  const [observationEditing, setObservationEditing] = useState(false)
  const [observationSaving, setObservationSaving] = useState(false)
  const currentDisplayOrderId = Number(item?.id || orderParam?.id || routeOrderId || 0)
  const filteredStoredOrderProducts = useMemo(
    () => filterOrderProductsByOrderId(storedOrderProducts, currentDisplayOrderId),
    [currentDisplayOrderId, storedOrderProducts],
  )
  const normalizedProductSearch = useMemo(
    () => String(productSearchText || '').trim(),
    [productSearchText],
  )
  const {materializeOrderWithProducts} = usePosOrderMaterialization({
    interactionParams: route?.params,
    navigation,
  })

  useEffect(() => {
    ordersActionsRef.current = ordersActions
  }, [ordersActions])

  useEffect(() => {
    orderProductsActionsRef.current = orderProductsStore.actions
  }, [orderProductsStore.actions])

  useEffect(() => {
    orderInvoicesActions?.setItems?.([])
    orderInvoicesActions?.setError?.('')
  }, [routeOrderIri])

  const orderInvoices = useMemo(
    () =>
      (Array.isArray(storedOrderInvoiceItems) ? storedOrderInvoiceItems : [])
        .map(orderInvoice => {
          const rawInvoice = orderInvoice?.invoice
          const invoice =
            rawInvoice && typeof rawInvoice === 'object' ? rawInvoice : null
          const invoiceId = getEntityId(rawInvoice)

          if (!invoice && !invoiceId) {
            return null
          }

          return {
            ...(invoice || {}),
            id: invoice?.id || invoiceId,
            '@id': invoice?.['@id'] || (invoiceId ? `/invoices/${invoiceId}` : undefined),
            orderInvoiceId: orderInvoice?.id,
            realPrice:
              orderInvoice?.realPrice ??
              orderInvoice?.real_price ??
              invoice?.realPrice ??
              invoice?.real_price ??
              null,
          }
        })
        .filter(Boolean),
    [storedOrderInvoiceItems],
  )

  const loadOrderInvoices = useCallback(async ({silent = false} = {}) => {
    if (!routeOrderIri) {
      orderInvoicesActions?.setItems?.([])
      orderInvoicesActions?.setError?.('')
      return []
    }

    try {
      const response = await orderInvoicesActions.getItems({
        order: routeOrderIri,
        itemsPerPage: 100,
      })

      return Array.isArray(response) ? response : []
    } catch (invoiceError) {
      orderInvoicesActions?.setItems?.([])
      if (!silent) {
        showError(formatApiError(invoiceError))
      }
      return []
    }
  }, [orderInvoicesActions, routeOrderIri, showError])

  const commitResolvedOrderProducts = useCallback(sourceOrder => {
    const {hasOwnOrderProducts, orderProducts} = resolveEmbeddedOrderProducts(sourceOrder)
    const sourceOrderId = getEntityId(sourceOrder) || currentDisplayOrderId
    const preferredOrderProducts = choosePreferredOrderProducts({
      primaryOrderProducts: orderProducts,
      fallbackOrderProducts: filterOrderProductsByOrderId(
        storedOrderProductsRef.current,
        sourceOrderId,
      ),
    })

    if (!hasOwnOrderProducts) {
      return currentOrderProductsRef.current
    }

    currentOrderProductsRef.current = preferredOrderProducts

    if (
      !areOrderProductCollectionsEquivalent(
        storedOrderProductsRef.current,
        preferredOrderProducts,
      )
    ) {
      orderProductsActionsRef.current.setItems(preferredOrderProducts)
    }

    return preferredOrderProducts
  }, [
    currentDisplayOrderId,
  ])

  useEffect(() => {
    storedOrderProductsRef.current = filteredStoredOrderProducts

    if (!hasDetailedOrderProductsPayload(filteredStoredOrderProducts)) {
      return
    }

    currentOrderProductsRef.current = filteredStoredOrderProducts
  }, [filteredStoredOrderProducts])

  useFocusEffect(
    useCallback(() => {
      let active = true

      if (routeOrderId) {
        ordersActionsRef.current
          .get(routeOrderId)
          .then(fetchedOrder => {
            if (!active) {
              return
            }

            commitResolvedOrderProducts(fetchedOrder)
          })
          .catch(() => {})
      }

      void loadOrderInvoices({silent: true})

      return () => {
        active = false
      }
    }, [commitResolvedOrderProducts, loadOrderInvoices, routeOrderId]),
  )

  const handleAddProduct = () => {
    if (!canEditItems) return
    const shouldUseManagerPdv =
      String(env.APP_TYPE || '').toUpperCase() === 'MANAGER' ||
      route?.params?.interactionMode === 'pdv'

    navigation.navigate(
      'AddProductScreen',
      shouldUseManagerPdv ? buildManagerPdvRouteParams() : undefined,
    )
  }

  const refreshCurrentOrder = useCallback(async () => {
    if (routeOrderId) {
      const refreshedOrder = await ordersActionsRef.current.get(routeOrderId)
      commitResolvedOrderProducts(refreshedOrder)
    }
  }, [commitResolvedOrderProducts, routeOrderId])
  const refreshIntegrationFinancialData = useCallback(
    async () => loadOrderInvoices({silent: true}),
    [loadOrderInvoices],
  )

  const marketplaceSummary = useOrderMarketplaceSummary({
    order: item,
    initialOrder: orderParam,
    refreshOrder: refreshCurrentOrder,
    onFinancialGenerated: refreshIntegrationFinancialData,
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
      orderType: resolveEditableOrderType(baseOrder?.orderType),
      ...(providerIri ? { provider: providerIri } : {}),
      ...(statusIri ? { status: statusIri } : {}),
      ...changes,
    }
  }, [item, orderParam, orderCompanyIri])

  const canEditItems =
    !hasMarketplaceIntegration &&
    !isTerminalOrderStatus(localRealStatusKey)

  useEffect(() => {
    if (!canEditItems) {
      setConfirmRemoveItemId(null)
    }
  }, [canEditItems])

  useEffect(() => {
    if (Array.isArray(item?.orderProducts)) {
      commitResolvedOrderProducts(item)
      return
    }

    if (Array.isArray(orderParam?.orderProducts)) {
      commitResolvedOrderProducts(orderParam)
    }
  }, [
    commitResolvedOrderProducts,
    item,
    item?.orderProducts,
    orderParam?.orderProducts,
  ])

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
    const shouldKeepPdvMode = isPdvRouteContext(route?.params)
    navigation.navigate(
      'Checkout',
      buildCheckoutRouteParams(
        ordersGetters.item || item,
        shouldKeepPdvMode
          ? buildManagerPdvRouteParams({showBottomCart: false})
          : {},
      ),
    )
  }, [
    flushPendingOrderProductChanges,
    item,
    navigation,
    isLocallyTerminalOrder,
    ordersGetters.item,
    route?.params,
  ])

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

  const handleEditCustomizableOrderProduct = useCallback(orderProduct => {
    if (!canEditItems) {
      return
    }

    const rootOrderProduct = orderProduct || null
    const product = rootOrderProduct?.product
    const productId = getEntityId(product)

    if (!rootOrderProduct || !product || !productId) {
      showError('Nao foi possivel identificar o item customizavel deste pedido.')
      return
    }

    if (isOrderProductProductionCompleted(rootOrderProduct)) {
      return
    }

    navigation.navigate('CustomizeScreen', {
      productId,
      orderProductId: getEntityId(rootOrderProduct),
      returnDepth: 1,
      interactionMode: route?.params?.interactionMode,
    })
  }, [
    canEditItems,
    navigation,
    route?.params?.interactionMode,
    showError,
  ])

  const resolvedDisplayOrderProducts = useMemo(() => {
    const currentOrderProducts = resolveEmbeddedOrderProducts(item).orderProducts
    const initialOrderProducts = resolveEmbeddedOrderProducts(orderParam).orderProducts
    const marketplaceOrderProducts = Array.isArray(marketplaceSummary.fallbackOrderProducts)
      ? marketplaceSummary.fallbackOrderProducts
      : []

    return choosePreferredOrderProducts({
      primaryOrderProducts: currentOrderProducts,
      fallbackOrderProducts: choosePreferredOrderProducts({
        primaryOrderProducts: filteredStoredOrderProducts,
        fallbackOrderProducts: choosePreferredOrderProducts({
          primaryOrderProducts: initialOrderProducts,
          fallbackOrderProducts: marketplaceOrderProducts,
        }),
      }),
    })
  }, [
    item?.orderProducts,
    filteredStoredOrderProducts,
    marketplaceSummary.fallbackOrderProducts,
    orderParam?.orderProducts,
  ])
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

  const resolvedDisplayOrderProductsWithProductDetails = useMemo(
    () => resolvedDisplayOrderProducts.map(orderProduct => {
      const productId = getEntityId(orderProduct?.product)
      return mergeOrderProductWithResolvedProduct(
        orderProduct,
        productId ? resolvedProductCandidatesById[productId] : null,
      )
    }),
    [resolvedDisplayOrderProducts, resolvedProductCandidatesById],
  )
  const shouldShowOrderAddress =
    !isPurchaseOrder &&
    shouldShowOrderPartyDetails
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
  const translatedLocalStatusLabel = useMemo(
    () => translateOrderStatus(effectiveLocalStatusNameKey || item?.status?.status || ''),
    [effectiveLocalStatusNameKey, item?.status?.status],
  )
  const translatedLocalRealStatusLabel = useMemo(
    () => translateOrderStatus(
      effectiveLocalRealStatusKey || item?.status?.realStatus || '',
    ),
    [effectiveLocalRealStatusKey, item?.status?.realStatus],
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
  const orderIdentitySource = resolvedDisplayOrder || item || orderParam || null
  const orderAdditionalInfoEntries = useMemo(
    () => extractVisibleOrderExtraEntries(orderIdentitySource),
    [orderIdentitySource],
  )
  const normalizedOrderRealStatus = String(
    effectiveLocalRealStatusKey || '',
  ).toLowerCase()
  const hasTerminalOrderState =
    isLocallyTerminalOrder ||
    isTerminalOrderStatus(normalizedOrderRealStatus)
  const isTerminalOrder = hasTerminalOrderState
  const activeLocalInvoices = useMemo(
    () => (
      Array.isArray(orderInvoices)
        ? orderInvoices.filter(invoice => {
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
    [orderInvoices],
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
      .map(invoice => {
        const statusPresentation = resolveInvoiceStatusPresentation(invoice)
        const invoiceKind = resolveInvoiceKind(invoice, localFinancialCompanyId)
        const marketplacePresentation = resolveMarketplaceInvoicePresentation(invoice)
        const title = marketplacePresentation?.title || resolveInvoiceTitle(invoice)
        const invoiceId = String(invoice?.id || '').trim()
        const paymentTypeLabel =
          getInvoicePaymentTypeLabel(invoice) ||
          (global.t?.t('orders', 'label', 'notInformed') || 'Não informado')
        const invoiceAmount = resolveInvoiceDisplayAmount(invoice)
        const invoiceType = resolvePreferredText(invoice?.invoiceType, invoice?.invoice_type)

        return {
          id: invoiceId || `${title}-${invoice?.invoice_date || invoice?.dueDate || 'local'}`,
          invoiceId,
          invoice,
          invoiceLinkLabel: invoiceId ? `Invoice #${invoiceId}` : '',
          title,
          subtitle: invoiceId && title !== `Invoice #${invoiceId}` ? `Invoice #${invoiceId}` : '',
          amount: invoiceAmount,
          descriptionLabel:
            marketplacePresentation?.description ||
            resolvePreferredText(invoice?.description),
          paymentTypeLabel,
          kindLabel:
            marketplacePresentation?.kindLabel ||
            (invoiceType ? formatInvoiceTypeLabel(invoiceType) : invoiceKind.label),
          counterpartyLabel: invoiceKind.counterpartyLabel,
          kindKey:
            marketplacePresentation?.purposeKey ||
            invoiceType ||
            invoiceKind.kind,
          purposeKey: marketplacePresentation?.purposeKey || '',
          sectionKey: marketplacePresentation?.sectionKey || '',
          sectionLabel: marketplacePresentation?.sectionLabel || '',
          sortOrder: Number(marketplacePresentation?.sortOrder ?? 999),
          payerLabel: resolveInvoicePartyLabel(invoice, 'payer'),
          receiverLabel: resolveInvoicePartyLabel(invoice, 'receiver'),
          statusLabel: statusPresentation.label,
          statusColor: statusPresentation.color,
          statusBackgroundColor: statusPresentation.backgroundColor,
        }
      })
      .sort((left, right) => {
        const sortOrderDifference =
          Number(left?.sortOrder ?? 999) - Number(right?.sortOrder ?? 999)

        if (sortOrderDifference !== 0) {
          return sortOrderDifference
        }

        return Number(right?.invoiceId || 0) - Number(left?.invoiceId || 0)
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

      const receiverId = getEntityId(invoice?.receiver)
      const companyIsReceiver =
        !!localFinancialCompanyId &&
        !!receiverId &&
        receiverId === localFinancialCompanyId

      return isInvoicePaid && companyIsReceiver
        ? sum + resolveInvoiceDisplayAmount(invoice)
        : sum
    }, 0),
    [activeLocalInvoices, localFinancialCompanyId],
  )
  const groupedInvoiceSections = useMemo(() => {
    if (!localInvoiceCards.some(invoiceCard => !!invoiceCard?.sectionLabel)) {
      return [
        {
          key: 'default',
          label: '',
          cards: localInvoiceCards,
        },
      ]
    }

    const sectionsMap = localInvoiceCards.reduce((accumulator, invoiceCard) => {
      const sectionKey = invoiceCard?.sectionKey || 'other'
      if (!accumulator[sectionKey]) {
        accumulator[sectionKey] = {
          key: sectionKey,
          label: invoiceCard?.sectionLabel || '',
          cards: [],
        }
      }

      accumulator[sectionKey].cards.push(invoiceCard)
      return accumulator
    }, {})

    return Object.values(sectionsMap)
  }, [localInvoiceCards])
  const localOrderTotal = Number(item?.price || 0)
  const localPendingAmount = Math.max(localOrderTotal - localPaidAmount, 0)
  const canAddProductsToOrder = canEditItems
  const addProductsButtonLabel =
    global.t?.t('orders', 'button', 'addProducts') || 'Adicionar produtos'

  useEffect(() => {
    if (!canAddProductsToOrder) {
      setProductSearchText('')
      setProductSearchResults([])
      setProductSearchLoading(false)
      setProductSearchSelectionId('')
      return undefined
    }

    if (!normalizedProductSearch || normalizedProductSearch.length < 2 || !orderCompanyId) {
      setProductSearchResults([])
      setProductSearchLoading(false)
      return undefined
    }

    let isMounted = true
    const timeoutId = setTimeout(async () => {
      try {
        setProductSearchLoading(true)
        const results = await searchCompanyProducts({
          companyId: orderCompanyId,
          query: normalizedProductSearch,
          itemsPerPage: 8,
        })

        if (isMounted) {
          setProductSearchResults(Array.isArray(results) ? results : [])
        }
      } catch {
        if (isMounted) {
          setProductSearchResults([])
        }
      } finally {
        if (isMounted) {
          setProductSearchLoading(false)
        }
      }
    }, 180)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [canAddProductsToOrder, normalizedProductSearch, orderCompanyId])

  const handleQuickAddProductFromSearch = useCallback(
    async product => {
      if (!canAddProductsToOrder) {
        return
      }

      const nextProductId = getEntityId(product)
      if (!nextProductId) {
        showError('Nao foi possivel identificar o produto selecionado.')
        return
      }

      try {
        setProductSearchSelectionId(String(product?.id || product?.['@id'] || nextProductId))
        await flushPendingOrderProductChanges()

        const updatedOrder = await materializeOrderWithProducts({
          products: [{product: nextProductId, quantity: 1}],
        })

        if (updatedOrder) {
          if (typeof ordersActions.syncOrder === 'function') {
            ordersActions.syncOrder(updatedOrder)
          } else {
            ordersActions.setItem(updatedOrder)
          }

          commitResolvedOrderProducts(updatedOrder)
        }

        await refreshCurrentOrder()

        setProductSearchText('')
        setProductSearchResults([])
        showSuccess('Produto adicionado ao pedido.')
      } catch (error) {
        showError(formatApiError(error))
      } finally {
        setProductSearchSelectionId('')
      }
    },
    [
      canAddProductsToOrder,
      commitResolvedOrderProducts,
      flushPendingOrderProductChanges,
      materializeOrderWithProducts,
      ordersActions,
      refreshCurrentOrder,
      showError,
      showSuccess,
    ],
  )
  const canAddOrderPayment =
    !hasMarketplaceIntegration &&
    !!item?.id &&
    localPendingAmount > 0 &&
    !isTerminalOrder
  const showInlineAddPaymentAction =
    canAddOrderPayment &&
    !useUnifiedKdsLayout
  const resolvedOrderDateValue = resolveOrderDateValue(item || orderParam)
  const orderWaitingMinutes = resolvedOrderDateValue
    ? Math.max(0, Math.floor((Date.now() - new Date(resolvedOrderDateValue).getTime()) / 60000))
    : null
  const orderWaitingLabel =
    orderWaitingMinutes === null
      ? ''
      : `${orderWaitingMinutes} min`
  const localOrderClient = item?.client || orderParam?.client || null
  const localOrderAddress = item?.addressDestination || orderParam?.addressDestination || null
  const localOrderObservationSource = resolvePreferredText(
    item?.comments,
    item?.remark,
    orderParam?.comments,
    orderParam?.remark,
    orderParam?.description,
  )
  const baseOrderObservationText = localOrderObservationSource
  const showBaseOrderObservationCard =
    shouldShowOrderPartyDetails &&
    (!!baseOrderObservationText || canEditItems)
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
    if (!canEditItems) {
      return
    }

    setCustomerModalVisible(true)
  }, [canEditItems])

  const showTopBarCustomerAction =
    !isPosSelfServiceOperationMode &&
    !isPurchaseOrder &&
    shouldShowOrderPartyDetails &&
    canEditItems
  const orderHeaderActionProps = useMemo(
    () =>
      ({
        showWaitingTime: isKds,
        ...(showTopBarCustomerAction
          ? {
              onCustomerPress: openCustomerModal,
              customerActionLabel: orderCustomerName ? 'Trocar' : 'Vincular',
              customerActionDisabled: !!customerLinkingId,
            }
          : {}),
      }),
    [
      canEditItems,
      customerLinkingId,
      isKds,
      openCustomerModal,
      orderCustomerName,
      shouldShowOrderPartyDetails,
      showTopBarCustomerAction,
    ],
  )

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
    if (!canEditItems) {
      return
    }

    setAddressForm(createEmptyAddressForm())
    setAddressModalMode('create')
    setAddressModalVisible(true)
  }, [canEditItems])

  const openAddressModal = useCallback(async () => {
    if (!canEditItems) {
      return
    }

    setAddressModalVisible(true)

    if (!selectedOrderClientIri) {
      setAddressOptions([])
      setAddressModalMode('create')
      return
    }

    setAddressModalMode('select')
    await loadAddressOptions(localOrderClient)
  }, [canEditItems, loadAddressOptions, localOrderClient, selectedOrderClientIri])

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
    setObservationDraft(localOrderObservationSource || '')
  }, [localOrderObservationSource])

  const handleStartObservationEdit = useCallback(() => {
    if (!canEditItems) {
      return
    }

    setObservationDraft(localOrderObservationSource || '')
    setObservationEditing(true)
  }, [canEditItems, localOrderObservationSource])

  const handleCancelObservationEdit = useCallback(() => {
    if (observationSaving) {
      return
    }

    setObservationDraft(localOrderObservationSource || '')
    setObservationEditing(false)
  }, [localOrderObservationSource, observationSaving])

  const handleSaveObservation = useCallback(async () => {
    if (!canEditItems || observationSaving) {
      return
    }

    try {
      setObservationSaving(true)

      await updateCurrentOrder({
        comments: normalizeText(observationDraft) || null,
      })

      setObservationEditing(false)
      showSuccess(
        normalizeText(observationDraft)
          ? 'Observacao do pedido atualizada com sucesso.'
          : 'Observacao do pedido removida com sucesso.',
      )
    } catch (observationError) {
      showError(formatApiError(observationError))
    } finally {
      setObservationSaving(false)
    }
  }, [
    canEditItems,
    observationDraft,
    observationSaving,
    showError,
    showSuccess,
    updateCurrentOrder,
  ])

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

  const localInvoicesEmptyText =
    global.t?.t('orders', 'message', 'noInvoicesLinkedToOrder') ||
    'Nenhuma invoice vinculada a este pedido.'
  const localInvoicesSectionTitle =
    global.t?.t('orders', 'label', 'payment') ||
    global.t?.t('orders', 'title', 'payments') ||
    'Pagamentos'
  const shouldShowPreparationTime = !isTerminalOrder && !!orderWaitingLabel
  const summaryInformationEntries = useMemo(() => {
    const entries = orderAdditionalInfoEntries.map(entry => ({
      key: entry.id,
      label: formatHumanLabel(entry.label || entry.name || entry.context) || 'Campo',
      value: entry.value,
    }))

    if (!shouldShowPreparationTime && orderWaitingLabel) {
      entries.unshift({
        key: 'preparation-time',
        label: global.t?.t('orders', 'label', 'preparationTime') || 'Tempo de preparo',
        value: orderWaitingLabel,
      })
    }

    return entries
  }, [
    orderAdditionalInfoEntries,
    orderWaitingLabel,
    shouldShowPreparationTime,
  ])
  const orderAppLabel = useMemo(() => {
    const resolvedApp = resolveMarketplaceAppLabel(item || orderParam)
    if (resolvedApp) {
      return resolvedApp
    }

    return String(env.APP_TYPE || '').trim().toUpperCase()
  }, [item, orderParam])
  const compactOrderSummary = useMemo(
    () => ({
      accessibilityLabel: [
        `${global.t?.t('orders', 'label', 'localTotal') || 'Total'}: ${Formatter.formatMoney(localOrderTotal || 0)}`,
      ].join('. '),
      totalValue: Formatter.formatMoney(localOrderTotal || 0),
    }),
    [localOrderTotal],
  )
  const closeDetailsModal = useCallback(() => {
    setDetailsModalVisible(false)
  }, [])
  const closeFinancialDetailsModal = useCallback(() => {
    setFinancialDetailsVisible(false)
  }, [])

  const handleOpenFinancialDetails = useCallback(async () => {
    setFinancialDetailsVisible(true)
    if (!localInvoiceCards.length) {
      await loadOrderInvoices({silent: true})
    }
  }, [loadOrderInvoices, localInvoiceCards.length])

  const handleOpenInvoiceDetails = useCallback(invoiceCard => {
    const invoiceId = Number(invoiceCard?.invoiceId || 0)
    if (!invoiceId) {
      return
    }

    const storeInvoice =
      invoiceCard?.invoice && typeof invoiceCard.invoice === 'object'
        ? invoiceCard.invoice
        : {
            id: invoiceId,
            '@id': `/invoices/${invoiceId}`,
          }

    invoiceActions?.setItem?.(storeInvoice)
    closeFinancialDetailsModal()

    const openInvoiceDetails = () => {
      navigation.navigate('InvoiceDetailsPage', {
        id: invoiceId,
      })
    }

    const scheduleOpenInvoiceDetails = globalThis?.requestAnimationFrame

    if (typeof scheduleOpenInvoiceDetails === 'function') {
      scheduleOpenInvoiceDetails(openInvoiceDetails)
      return
    }

    setTimeout(openInvoiceDetails, 0)
  }, [closeFinancialDetailsModal, invoiceActions, navigation])

  const handleOrderTools = useCallback(async () => {
    if (!canShowDebugActions) {
      return
    }

    setDetailsModalVisible(true)
    await marketplaceSummary.ensureMarketplaceSummary()
  }, [canShowDebugActions, marketplaceSummary])

  const handleOrderLogs = useCallback(() => {
    if (!canShowDebugActions) {
      return
    }

    const currentOrderId = item?.id || orderParam?.id
    if (!currentOrderId) return

    navigation.navigate('EntityLogPage', {
      id: currentOrderId,
      store: 'orders',
    })
  }, [canShowDebugActions, item?.id, navigation, orderParam?.id])

  const renderOrderProductActions = useCallback(({
    card,
    orderProduct,
    entryType,
  }) => {
    if (!canEditItems || !orderProduct) {
      return null
    }

    // Grouped children must be edited through the parent customization flow so
    // the group constraints remain consistent.
    if (entryType === 'group') {
      return null
    }

    const rootOrderProduct = card?.rootItem || orderProduct
    if (isOrderProductProductionCompleted(rootOrderProduct)) {
      return null
    }

    const orderProductId = String(
      orderProduct?.id ||
      String(orderProduct?.['@id'] || '').replace(/\D/g, ''),
    )
    const quantity = Number(orderProduct?.quantity || 0)
    const isOpLoading = orderProductId ? isOrderProductCommitting(orderProductId) : false
    const isConfirming = orderProductId && confirmRemoveItemId === orderProductId
    const canEditCustomization =
      entryType === 'root' &&
      canReopenOrderProductCustomization(rootOrderProduct)

    if (!canEditCustomization && !orderProductId) {
      return null
    }

    return (
      <View style={localStyles.orderProductActionStack}>
        {canEditCustomization && (
          <TouchableOpacity
            onPress={() => handleEditCustomizableOrderProduct(rootOrderProduct)}
            style={localStyles.orderProductCustomizeButton}
            disabled={isOpLoading}
          >
            <Icon name="tune" size={16} color={ppcColors.textPrimary} />
          </TouchableOpacity>
        )}

        {orderProductId ? (
          isConfirming ? (
            <View style={localStyles.editConfirmRow}>
              <Text style={localStyles.editConfirmText}>Remover?</Text>
              <TouchableOpacity
                onPress={() => handleRemoveOp(orderProduct)}
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
                onPress={() => handleDecreaseOpQuantity(orderProduct)}
                style={localStyles.editQtyBtn}
              >
                <Icon
                  name={quantity <= 1 ? 'delete' : 'remove'}
                  size={18}
                  color={quantity <= 1 ? '#EF4444' : ppcColors.textPrimary}
                />
              </TouchableOpacity>
              <View style={localStyles.editQtyBox}>
                <Text style={localStyles.editQtyText}>{quantity}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleIncreaseOpQuantity(orderProduct)}
                style={localStyles.editQtyBtn}
              >
                <Icon name="add" size={18} color={ppcColors.textPrimary} />
              </TouchableOpacity>
            </View>
          )
        ) : null}
      </View>
    )
  }, [
    canEditItems,
    confirmRemoveItemId,
    handleDecreaseOpQuantity,
    handleEditCustomizableOrderProduct,
    handleIncreaseOpQuantity,
    handleRemoveOp,
    isOrderProductCommitting,
    localStyles.editConfirmNo,
    localStyles.editConfirmRow,
    localStyles.editConfirmText,
    localStyles.editConfirmYes,
    localStyles.editQtyBox,
    localStyles.editQtyBtn,
    localStyles.editQtyRow,
    localStyles.editQtyText,
    localStyles.orderProductActionStack,
    localStyles.orderProductCustomizeButton,
    ppcColors.textPrimary,
  ])

  const isCompactMobileViewport = viewportWidth < 360
  const shouldStackHeaderActions = useUnifiedKdsLayout && viewportWidth <= 600
  const mobileBottomCartOffset = 0
  const mobileOrderBottomSpacing = shouldShowMobilePaymentBar
    ? (isCompactMobileViewport ? 148 : 132)
    : 24
  const topBarButtons = useMemo(() => {
    const buttons = [ORDER_TOP_BAR_ACTIONS.PRINT]

    if (canShowDebugActions) {
      buttons.push(ORDER_TOP_BAR_ACTIONS.TOOLS, ORDER_TOP_BAR_ACTIONS.LOGS)
    }

    return buttons
  }, [canShowDebugActions])
  const topBarOrderId = item?.id || orderParam?.id || routeOrderId
  const topBarPrintJob = {type: 'order', orderId: topBarOrderId}
  const topBarPrinterSelection = isKds
    ? {
        enabled: true,
        context: 'display',
        display: selectedDisplay,
        displayId: selectedDisplay?.id,
      }
    : {enabled: true}

  const renderTopBarActions = useCallback(
    containerStyle => (
      <OrderTopBarActions
        buttons={topBarButtons}
        containerStyle={containerStyle}
        iconButtonStyle={localStyles.topBarIconButton}
        iconButtonDisabledStyle={localStyles.topBarIconButtonDisabled}
        iconColor={ppcColors.accentInfo}
        printJob={topBarPrintJob}
        printDisabled={!topBarOrderId}
        printerSelection={topBarPrinterSelection}
        isTvDisplay={isTvDisplay}
        onPressTools={handleOrderTools}
        onPressLogs={handleOrderLogs}
        logsDisabled={!topBarOrderId}
      />
    ),
    [
      handleOrderLogs,
      handleOrderTools,
      isKds,
      isTvDisplay,
      item?.id,
      localStyles.topBarIconButtonDisabled,
      localStyles.topBarIconButton,
      orderParam?.id,
      ppcColors.accentInfo,
      selectedDisplay,
      topBarButtons,
      topBarOrderId,
      topBarPrintJob,
      topBarPrinterSelection,
    ],
  )

  const renderCompactInlineTopBar = useCallback(() => (
      <OrderStackedTopBar
      order={orderIdentitySource}
      isKds
      orderHeaderProps={orderHeaderActionProps}
      onBackPress={() => navigation.goBack()}
      buttons={topBarButtons}
      printJob={topBarPrintJob}
      printDisabled={!topBarOrderId}
      printerSelection={topBarPrinterSelection}
      isTvDisplay={isTvDisplay}
      onPressTools={handleOrderTools}
      onPressLogs={handleOrderLogs}
      logsDisabled={!topBarOrderId}
    />
  ), [
    handleOrderLogs,
    handleOrderTools,
    isTvDisplay,
    navigation,
    orderHeaderActionProps,
    orderIdentitySource,
    topBarButtons,
    topBarOrderId,
    topBarPrintJob,
    topBarPrinterSelection,
  ])

  useLayoutEffect(() => {
    navigation.setOptions({
      title: useUnifiedKdsLayout ? '' : global.t?.t('orders', 'title', 'order'),
      headerShown: !shouldStackHeaderActions,
      headerStyle: shouldStackHeaderActions ? undefined : undefined,
      headerBackVisible: !shouldStackHeaderActions,
      headerLeft: shouldStackHeaderActions ? undefined : undefined,
      headerTitleAlign: shouldStackHeaderActions ? undefined : undefined,
      headerTitle: shouldStackHeaderActions
        ? undefined
        : useUnifiedKdsLayout
        ? () => (
          <View
            style={
              localStyles.topBarTitleWrap
            }
          >
            <OrderHeader
              order={orderIdentitySource}
              isKds
              {...orderHeaderActionProps}
            />
          </View>
        )
        : () => (
          <View style={localStyles.topBarTitleWrap}>
            <View style={localStyles.topBarTitleContent}>
              <Text style={localStyles.topBarTitleText}>
                {global.t?.t('orders', 'title', 'order')}
              </Text>
            </View>
          </View>
        ),
      headerRight: shouldStackHeaderActions
        ? () => null
        : () => renderTopBarActions(localStyles.topBarActions),
    })
  }, [
    canShowDebugActions,
    handleOrderLogs,
    handleOrderTools,
    item?.id,
    orderParam?.id,
    isKds,
    isTvDisplay,
    localStyles.topBarTitleContent,
    localStyles.topBarActions,
    localStyles.topBarIconButton,
    localStyles.topBarTitleText,
    localStyles.topBarTitleWrap,
    marketplaceSummary.summary,
    navigation,
    orderHeaderActionProps,
    orderIdentitySource,
    ppcColors.accentInfo,
    renderTopBarActions,
    selectedDisplay,
    shouldStackHeaderActions,
    useUnifiedKdsLayout,
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
        <View style={localStyles.detailsTabStack}>
          {groupedInvoiceSections.map(section => (
            <View
              key={section.key}
              style={section.label ? localStyles.detailsSection : null}>
              {!!section.label && (
                <Text style={localStyles.detailsSectionTitle}>{section.label}</Text>
              )}
              <View style={localStyles.orderInvoiceList}>
                {section.cards.map(invoiceCard => {
                  const canOpenInvoiceDetails = Number(invoiceCard?.invoiceId || 0) > 0
                  const InvoiceCardContainer = canOpenInvoiceDetails ? TouchableOpacity : View
                  const invoiceInfoCards = [
                    {
                      key: 'type',
                      label: global.t?.t('orders', 'label', 'invoiceType') || 'Tipo',
                      value: invoiceCard.kindLabel,
                    },
                    {
                      key: 'paymentType',
                      label:
                        global.t?.t('orders', 'label', 'paymentMethod') ||
                        'Forma de pagamento',
                      value: invoiceCard.paymentTypeLabel,
                    },
                    {
                      key: 'description',
                      label: global.t?.t('orders', 'label', 'description') || 'Descrição',
                      value: invoiceCard.descriptionLabel,
                      wide: true,
                    },
                    {
                      key: 'payer',
                      label: global.t?.t('orders', 'label', 'payer') || 'Pagador',
                      value: invoiceCard.payerLabel,
                    },
                    {
                      key: 'receiver',
                      label: global.t?.t('orders', 'label', 'receiver') || 'Recebedor',
                      value: invoiceCard.receiverLabel,
                    },
                  ].filter(detail => detail.value)

                  return (
                    <InvoiceCardContainer
                      key={invoiceCard.id}
                      {...(canOpenInvoiceDetails
                        ? {
                            activeOpacity: 0.88,
                            onPress: () => handleOpenInvoiceDetails(invoiceCard),
                            accessibilityRole: 'button',
                          }
                        : {})}
                      style={[
                        localStyles.orderInvoiceCard,
                        canOpenInvoiceDetails && localStyles.orderInvoiceCardInteractive,
                        isDetailsVariant && localStyles.orderInvoiceCardDetails,
                      ]}
                    >
                      <View style={localStyles.orderInvoiceCardHeader}>
                        <View style={localStyles.orderInvoiceTitleWrap}>
                          <Text style={localStyles.orderInvoiceTitle}>{invoiceCard.title}</Text>
                          {!!invoiceCard.subtitle && (
                            <Text style={localStyles.orderInvoiceSubtitle}>
                              {invoiceCard.subtitle}
                            </Text>
                          )}
                        </View>

                        <View style={localStyles.orderInvoiceCardHeaderActions}>
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
                                {color: invoiceCard.statusColor},
                              ]}
                            >
                              {invoiceCard.statusLabel}
                            </Text>
                          </View>

                          {canOpenInvoiceDetails ? (
                            <Icon
                              name="chevron-right"
                              size={20}
                              color={ppcColors.textSecondary}
                            />
                          ) : null}
                        </View>
                      </View>

                      <Text style={localStyles.orderInvoiceAmount}>
                        {Formatter.formatMoney(invoiceCard.amount || 0)}
                      </Text>
                      <View style={localStyles.orderInvoiceInfoGrid}>
                        {invoiceInfoCards.map(detail => (
                          <View
                            key={`${invoiceCard.id}-${detail.key}`}
                            style={[
                              localStyles.orderInvoiceInfoCard,
                              detail.wide && localStyles.orderInvoiceInfoCardWide,
                            ]}>
                            <Text style={localStyles.orderInvoiceInfoLabel}>
                              {detail.label}
                            </Text>
                            <Text style={localStyles.orderInvoiceInfoValue}>
                              {detail.value}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </InvoiceCardContainer>
                  )
                })}
              </View>
            </View>
          ))}
        </View>
      )
    },
    [
      handleOpenInvoiceDetails,
      groupedInvoiceSections,
      localInvoiceCards,
      localInvoicesEmptyText,
      localStyles.detailsSection,
      localStyles.detailsSectionTitle,
      localStyles.detailsTabStack,
      localStyles.detailsInfoText,
      localStyles.mobileInfoSubtitle,
      localStyles.orderInvoiceAmount,
      localStyles.orderInvoiceCard,
      localStyles.orderInvoiceCardInteractive,
      localStyles.orderInvoiceCardDetails,
      localStyles.orderInvoiceCardHeader,
      localStyles.orderInvoiceCardHeaderActions,
      localStyles.orderInvoiceInfoCard,
      localStyles.orderInvoiceInfoCardWide,
      localStyles.orderInvoiceInfoGrid,
      localStyles.orderInvoiceInfoLabel,
      localStyles.orderInvoiceInfoValue,
      localStyles.orderInvoiceList,
      localStyles.orderInvoiceStatusBadge,
      localStyles.orderInvoiceStatusText,
      localStyles.orderInvoiceSubtitle,
      localStyles.orderInvoiceTitle,
      localStyles.orderInvoiceTitleWrap,
      ppcColors.textSecondary,
    ],
  )
  const renderInvoiceListOnly = useCallback(
    variant => (
      <OrderInvoices
        isLoadingInvoices={orderInvoicesLoading}
        localInvoiceCards={localInvoiceCards}
        localInvoicesEmptyText={localInvoicesEmptyText}
        localInvoicesSectionTitle={localInvoicesSectionTitle}
        renderLocalInvoiceCards={renderLocalInvoiceCards}
        showFinancialSections={false}
        showInvoicesSectionTitle={false}
        variant={variant}
      />
    ),
    [
      orderInvoicesLoading,
      localInvoiceCards,
      localInvoicesEmptyText,
      localInvoicesSectionTitle,
      renderLocalInvoiceCards,
    ],
  )
  const renderItemsTab = useCallback(
    variant => {
      return (
        <OrderItemsTab
          addProductsButtonLabel={addProductsButtonLabel}
          canAddProductsToOrder={canAddProductsToOrder}
          onAddProduct={handleAddProduct}
          onQuickAddProduct={handleQuickAddProductFromSearch}
          order={resolvedDisplayOrder || item}
          orderProducts={resolvedDisplayOrderProductsWithProductDetails}
          productSearchLoading={productSearchLoading}
          productSearchResults={productSearchResults}
          productSearchSelectionId={productSearchSelectionId}
          productSearchText={productSearchText}
          renderOrderProductActions={canEditItems ? renderOrderProductActions : null}
          routeOrderId={routeOrderId}
          setProductSearchText={setProductSearchText}
          variant={variant}
        />
      )
    },
    [
      addProductsButtonLabel,
      canAddProductsToOrder,
      canEditItems,
      handleQuickAddProductFromSearch,
      handleAddProduct,
      item,
      productSearchLoading,
      productSearchResults,
      productSearchSelectionId,
      productSearchText,
      renderOrderProductActions,
      resolvedDisplayOrder,
      resolvedDisplayOrderProductsWithProductDetails,
      routeOrderId,
      setProductSearchText,
    ],
  )

  const orderSummaryData = useMemo(() => {
    const baseCards = hasMarketplaceIntegration
      ? []
      : [
          {
            key: 'application',
            label: global.t?.t('orders', 'label', 'application'),
            value: orderAppLabel || '-',
          },
          {
            key: 'local-status',
            label: global.t?.t('orders', 'label', 'localStatus'),
            value: translatedLocalStatusLabel || '-',
          },
          {
            key: 'local-real-status',
            label:
              global.t?.t('orders', 'label', 'localRealStatus') ||
              'Real status local',
            value: translatedLocalRealStatusLabel || '-',
          },
          {
            key: 'payments',
            label: global.t?.t('orders', 'title', 'payments') || 'Pagamentos',
            value: localInvoiceCards.length,
          },
        ];

    const baseLines = hasMarketplaceIntegration
      ? []
      : [
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
            key: 'local-order-id',
            label:
              global.t?.t('orders', 'label', 'localOrderNumber') ||
              'Pedido interno',
            value: item?.id || orderParam?.id || '-',
          },
          {
            key: 'local-total',
            label: global.t?.t('orders', 'label', 'localTotal'),
            value: Formatter.formatMoney(localOrderTotal || 0),
          },
          shouldShowOrderPartyDetails && !!orderCustomerName && {
            key: 'customer',
            label: global.t?.t('orders', 'label', 'customer'),
            value: orderCustomerName,
          },
          shouldShowOrderPartyDetails && !!orderCustomerPhone && {
            key: 'customer-phone',
            label: global.t?.t('orders', 'label', 'phone'),
            value: orderCustomerPhone,
          },
          shouldShowOrderPartyDetails && !!orderCustomerDocument && {
            key: 'customer-document',
            label: orderCustomerDocumentLabel,
            value: orderCustomerDocument,
          },
          shouldShowOrderAddress && !!localOrderAddressParts.primary && {
            key: 'address',
            label: global.t?.t('orders', 'label', 'delivery'),
            value: localOrderAddressParts.primary,
          },
          ...summaryInformationEntries,
        ].filter(Boolean);

    return {
      title: global.t?.t('orders', 'title', 'orderSummary'),
      base: {
        order: orderIdentitySource,
        cards: baseCards,
        lines: baseLines,
      },
      tabs: [],
      primaryAction: null,
      marketplace: marketplaceSummary.summary,
    }
  }, [
    hasMarketplaceIntegration,
    formatOrderDateTime,
    item?.alterDate,
    localInvoiceCards.length,
    localOrderAddressParts,
    localOrderTotal,
    marketplaceSummary.summary,
    orderAppLabel,
    orderCustomerDocument,
    orderCustomerDocumentLabel,
    orderCustomerName,
    orderCustomerPhone,
    orderIdentitySource,
    resolvedOrderDateValue,
    shouldShowOrderAddress,
    shouldShowOrderPartyDetails,
    summaryInformationEntries,
    translatedLocalRealStatusLabel,
    translatedLocalStatusLabel,
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
      {!isPosSelfServiceOperationMode && shouldShowOrderPartyDetails && (
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

          {!isPurchaseOrder && canEditItems && (
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

          {!isPurchaseOrder && shouldShowOrderAddress && canEditItems && (
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
              {observationEditing ? (
                <>
                  <TextInput
                    value={observationDraft}
                    onChangeText={setObservationDraft}
                    editable={!observationSaving}
                    multiline
                    numberOfLines={3}
                    placeholder={global.t?.t('orders', 'label', 'customerObservation')}
                    placeholderTextColor={ppcColors.textSecondary}
                    style={[
                      localStyles.assignmentFormInput,
                      {minHeight: 96, textAlignVertical: 'top', marginBottom: 8},
                    ]}
                  />

                  <View style={localStyles.inlineActionRow}>
                    <TouchableOpacity
                      onPress={handleCancelObservationEdit}
                      disabled={observationSaving}
                      style={[
                        localStyles.inlineActionButton,
                        observationSaving && localStyles.inlineActionButtonDisabled,
                      ]}
                    >
                      <Icon name="close" size={15} color={ppcColors.textSecondary} />
                      <Text style={[localStyles.inlineActionButtonText, {color: ppcColors.textSecondary}]}>
                        {global.t?.t('orders', 'button', 'close') || 'Cancelar'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleSaveObservation}
                      disabled={observationSaving}
                      style={[
                        localStyles.inlineActionButton,
                        localStyles.inlineActionButtonPrimary,
                        observationSaving && localStyles.inlineActionButtonDisabled,
                      ]}
                    >
                      {observationSaving ? (
                        <ActivityIndicator size="small" color={ppcColors.accentInfo} />
                      ) : (
                        <>
                          <Icon name="check" size={15} color={ppcColors.accentInfo} />
                          <Text style={localStyles.inlineActionButtonText}>
                            {global.t?.t('orders', 'button', 'save') || 'Salvar'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : !!baseOrderObservationText ? (
                <>
                  <Text style={localStyles.mobileNoteText}>{baseOrderObservationText}</Text>
                  {canEditItems && (
                    <View style={[localStyles.inlineActionRow, {marginTop: 8}]}>
                      <TouchableOpacity
                        onPress={handleStartObservationEdit}
                        style={[
                          localStyles.inlineActionButton,
                          localStyles.inlineActionButtonPrimary,
                        ]}
                      >
                        <Icon name="edit" size={15} color={ppcColors.accentInfo} />
                        <Text style={localStyles.inlineActionButtonText}>
                          {global.t?.t('orders', 'button', 'edit') || 'Editar'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : canEditItems ? (
                <View style={localStyles.inlineActionRow}>
                  <TouchableOpacity
                    onPress={handleStartObservationEdit}
                    style={[
                      localStyles.inlineActionButton,
                      localStyles.inlineActionButtonPrimary,
                    ]}
                  >
                    <Icon name="add-comment" size={15} color={ppcColors.accentInfo} />
                    <Text style={localStyles.inlineActionButtonText}>
                      {global.t?.t('orders', 'button', 'addObservation') || 'Adicionar observacao'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}
        </View>
      )}

      {shouldShowInlineOrderTotal && (
        <View style={localStyles.mobileCompactSummaryCard}>
          <View style={localStyles.mobileCompactSummaryGrid}>
            <View
              accessible
              accessibilityLabel={compactOrderSummary.accessibilityLabel}
              style={localStyles.mobileCompactSummaryItem}
            >
              <View
                style={[
                  localStyles.mobileCompactSummaryTopRow,
                  {justifyContent: 'flex-end'},
                ]}
              >
                <View style={localStyles.mobileCompactSummaryMetric}>
                  <Icon name="payments" size={15} color={ppcColors.accentInfo} />
                  <Text
                    style={[
                      localStyles.mobileCompactSummaryValue,
                      localStyles.mobileCompactSummaryValueStrong,
                    ]}
                    numberOfLines={1}
                  >
                    {compactOrderSummary.totalValue}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      <View style={localStyles.mobileInfoCard}>
        {renderItemsTab('main')}
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
      {shouldStackHeaderActions && renderCompactInlineTopBar()}
      {showBarcodeInput && <BarcodeInput />}
      <StateStore store="orders" />
      {!isPosSelfServiceOperationMode &&
        !isPurchaseOrder &&
        shouldShowOrderPartyDetails && (
        <>
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
        </>
      )}
      <OrderSummaryModal
        visible={detailsModalVisible}
        onClose={closeDetailsModal}
        summary={orderSummaryData}
      />
      <OrderFinancialDetailsModal
        visible={financialDetailsVisible}
        onClose={closeFinancialDetailsModal}
        order={orderIdentitySource}
        isKds
        orderHeaderProps={orderHeaderActionProps}
        content={renderInvoiceListOnly('details')}
      />
      <OrderMarketplaceOverlayHost marketplace={marketplaceSummary.summary} />
      {!isLoading && item && !error && (
        <View style={inlineStyle_2712_14}>
          {useUnifiedKdsLayout ? (
            renderKdsMobileContent()
          ) : (
            <>
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

                {canShowDebugActions && (
                  <>
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
                  </>
                )}
              </View>
            </>
          )}

          {shouldShowMobilePaymentBar && (
            <BottomCart
              bottomOffset={mobileBottomCartOffset}
              actionLabel={global.t?.t('orders', 'button', 'pay') || 'Pagar'}
              actionIcon="credit-card"
              actionDisabled={!canAddOrderPayment}
              collapsePayableWhenPaid={false}
              paymentPendingAmount={hasMarketplaceIntegration ? 0 : localPendingAmount}
              paymentPendingLabel={global.t?.t('orders', 'label', 'pending') || 'Pendente'}
              paymentPaidLabel={global.t?.t('orders', 'label', 'paid') || 'Paga'}
              paidDetailsLabel={global.t?.t('orders', 'button', 'details') || 'Detalhes'}
              paidOrderAmount={localOrderTotal}
              paidOrderLabel={
                hasMarketplaceIntegration
                  ? 'Valor do pedido'
                  : global.t?.t('orders', 'label', 'localTotal') || 'Total do pedido'
              }
              paidReceivedAmount={localPaidAmount}
              paidReceivedLabel={
                hasMarketplaceIntegration
                  ? 'Valor do pagamento'
                  : global.t?.t('orders', 'label', 'paid') || 'Recebido'
              }
              onActionPress={handleAddPayment}
              onPaidDetailsPress={handleOpenFinancialDetails}
              showPaidBreakdown
              showActionButton={shouldRenderOrderDetailsPaymentAction({canAddOrderPayment})}
              showPayableBadge={false}
              variant="payment-status"
            />
          )}

        </View>
      )}
    </SafeAreaView>
  );
}

export default OrderDetails
