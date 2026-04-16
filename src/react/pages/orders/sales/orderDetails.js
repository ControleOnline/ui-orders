import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { buildFood99OrderSummary } from '@controleonline/ui-orders/src/react/services/food99OrderSummary'
import { getOrderRouteId } from '@controleonline/ui-orders/src/react/utils/orderRoute'
import useDebouncedOrderProductQuantitySync from '@controleonline/ui-orders/src/react/hooks/useDebouncedOrderProductQuantitySync'
import { getPlatformCapabilities, getOrderChannelKey, getOrderChannelLabel } from '@assets/ppc/channels'
import {
  mergeOrderProductIntoList,
  mergeOrderWithOrderProducts,
  removeOrderProductFromList,
  withOrderProductQuantity,
} from '@controleonline/ui-orders/src/utils/orderState'
import OrderExtraDataCard from './components/OrderExtraDataCard'
import OrderSummaryModal from './components/OrderSummaryModal'
import useOrderDetailsVisuals from './useOrderDetailsVisuals'

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

const normalizeKey = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const formatFood99Eta = value => {
  if (value === null || value === undefined || value === '') return ''

  const normalized = String(value).trim()
  if (!normalized) return ''

  if (/^\d+$/.test(normalized)) {
    const timestamp = Number(normalized)
    const date = new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('pt-BR')
    }
  }

  return normalized
}

const formatFood99RiderEta = value => {
  if (value === null || value === undefined || value === '') return ''

  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes < 0) {
    return String(value).trim()
  }

  if (minutes === 0) return global.t?.t('orders', 'message', 'arrivingNow')
  if (minutes === 1) return global.t?.t('orders', 'message', 'arrivesInOneMinute')
  return `${global.t?.t('orders', 'message', 'arrivesIn')} ${minutes} min`
}

const normalizeErrno = value => String(value ?? '').trim()
const TERMINAL_ORDER_STATUSES = ['closed', 'canceled', 'cancelled']
const isTerminalOrderStatus = value =>
  TERMINAL_ORDER_STATUSES.includes(String(value ?? '').trim().toLowerCase())
const MARKETPLACE_OPERATIONAL_STATUS_RANK = {
  'open:open': 10,
  'open:preparing': 20,
  'pending:ready': 30,
  'pending:way': 40,
  'closed:closed': 50,
  'canceled:canceled': 60,
  'cancelled:cancelled': 60,
  'canceled:cancelled': 60,
  'cancelled:canceled': 60,
}

const toCamelCase = value =>
  String(value ?? '').replace(/_([a-z])/g, (_, char) => char.toUpperCase())

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

const getOperationalStatusRank = (realStatus, statusName) =>
  MARKETPLACE_OPERATIONAL_STATUS_RANK[
    `${String(realStatus || '').trim().toLowerCase()}:${String(statusName || '').trim().toLowerCase()}`
  ] ?? null

const resolveMarketplaceOperationalStatusFromRemoteState = remoteState => {
  const normalizedRemoteState = String(remoteState || '').trim().toLowerCase()

  if (!normalizedRemoteState) return null

  if (['new', 'open', 'placed', 'order_created', 'pending'].includes(normalizedRemoteState)) {
    return { realStatus: 'open', status: 'open' }
  }

  if (['accepted', 'confirmed', 'preparing', 'started'].includes(normalizedRemoteState)) {
    return { realStatus: 'open', status: 'preparing' }
  }

  if (['ready', 'delivery_drop_code_requested', 'delivery_drop_code_validating'].includes(normalizedRemoteState)) {
    return { realStatus: 'pending', status: 'ready' }
  }

  if ([
    'dispatching',
    'dispatched',
    'order_dispatched',
    'order_picked_up',
    'order_in_transit',
    'delivery_started',
    'delivery_collected',
    'delivery_arrived_at_destination',
    'courier_to_store',
    'picked_up',
    'delivering',
    'arriving',
  ].includes(normalizedRemoteState)) {
    return { realStatus: 'pending', status: 'way' }
  }

  if (['concluded', 'closed', 'delivered', 'finished', 'completed', 'complete'].includes(normalizedRemoteState)) {
    return { realStatus: 'closed', status: 'closed' }
  }

  if (['cancelled', 'canceled'].includes(normalizedRemoteState)) {
    return { realStatus: 'canceled', status: 'canceled' }
  }

  return null
}

const resolvePreferredOperationalStatus = ({
  currentStatus,
  currentRealStatus,
  remoteState,
}) => {
  const normalizedCurrentStatus = String(currentStatus || '').trim().toLowerCase()
  const normalizedCurrentRealStatus = String(currentRealStatus || '').trim().toLowerCase()
  const remoteOperationalStatus = resolveMarketplaceOperationalStatusFromRemoteState(remoteState)

  if (!remoteOperationalStatus) {
    return {
      status: normalizedCurrentStatus,
      realStatus: normalizedCurrentRealStatus,
    }
  }

  return {
    status: normalizedCurrentStatus || remoteOperationalStatus.status,
    realStatus: normalizedCurrentRealStatus || remoteOperationalStatus.realStatus,
  }
}

const readCapabilityValue = (capabilities, ...keys) => {
  if (!capabilities || typeof capabilities !== 'object') {
    return undefined
  }

  for (const key of keys) {
    const normalizedKey = String(key ?? '').trim()
    if (!normalizedKey) continue

    const candidates = [
      normalizedKey,
      toCamelCase(normalizedKey),
    ]

    for (const candidate of candidates) {
      if (Object.prototype.hasOwnProperty.call(capabilities, candidate)) {
        return capabilities[candidate]
      }
    }
  }

  return undefined
}

const hasMeaningfulValue = value => {
  if (value === null || value === undefined) return false
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'boolean') return true
  return normalizeText(value) !== ''
}

const resolvePreferredText = (...values) => {
  for (const value of values) {
    const normalized = normalizeText(value)
    if (normalized) return normalized
  }

  return ''
}

const weakPaymentLabels = new Set([
  'nao informado',
  'não informado',
  'nao informado pela 99',
  'não informado pela 99',
  'nao informado pelo ifood',
  'não informado pelo ifood',
  'canal nao mapeado',
  'canal não mapeado',
  'metodo nao mapeado',
  'método não mapeado',
  'pagamento nao mapeado',
  'pagamento não mapeado',
])

const isWeakPaymentLabel = value => weakPaymentLabels.has(normalizeText(value).toLowerCase())

const resolvePreferredMeaningfulText = (...values) => {
  for (const value of values) {
    const normalized = normalizeText(value)
    if (normalized && !isWeakPaymentLabel(normalized)) return normalized
  }

  return ''
}

const readBooleanFlag = value => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1

  const normalized = normalizeKey(value).replace(/\s+/g, '')
  if (!normalized) return null

  if (['1', 'true', 'yes', 'y', 'sim'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n', 'nao'].includes(normalized)) return false

  return null
}

const resolveDocumentLabel = (documentType, documentNumber) => {
  const normalizedType = normalizeText(documentType).toUpperCase()
  if (normalizedType) return normalizedType

  const digits = String(documentNumber ?? '').replace(/\D/g, '')
  if (digits.length === 14) return 'CNPJ'
  if (digits.length === 11) return 'CPF'

  return 'Documento'
}

const resolvePreferredMoney = (primary, fallback) => {
  const primaryPresent = hasMeaningfulValue(primary)
  const fallbackPresent = hasMeaningfulValue(fallback)

  if (!primaryPresent) {
    return fallbackPresent ? Number(fallback) : 0
  }

  const primaryNumber = Number(primary)
  const fallbackNumber = Number(fallback)

  if (
    Number.isFinite(primaryNumber) &&
    fallbackPresent &&
    Number.isFinite(fallbackNumber) &&
    primaryNumber === 0 &&
    fallbackNumber !== 0
  ) {
    return fallbackNumber
  }

  if (Number.isFinite(primaryNumber)) {
    return primaryNumber
  }

  return fallbackPresent && Number.isFinite(fallbackNumber) ? fallbackNumber : 0
}

const normalizeDigits = (value, maxLength) =>
  String(value ?? '')
    .replace(/\D+/g, '')
    .slice(0, maxLength)

const copyTextToClipboard = async text => {
  const normalizedText = String(text ?? '').trim()
  if (!normalizedText) return false

  if (
    typeof navigator !== 'undefined' &&
    navigator?.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    await navigator.clipboard.writeText(normalizedText)
    return true
  }

  return false
}

const buildFood99LocatorShareMessage = ({ locator, url, platformLabel = '99Food' }) => {
  const parts = [`${global.t?.t('orders', 'message', 'deliveryConfirmation')} ${platformLabel}`]

  if (locator) {
    parts.push(`${global.t?.t('orders', 'label', 'locator')}: ${locator}`)
  }

  if (url) {
    parts.push(`${global.t?.t('orders', 'label', 'officialLink')}: ${url}`)
  }

  return parts.join('\n')
}

const hasErrnoError = value => {
  const normalized = normalizeErrno(value)
  if (!normalized) return false
  return normalized !== '0'
}

const formatAgeMinutes = value => {
  if (value === null || value === undefined || value === '') return ''

  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes < 0) return ''
  if (minutes === 0) return global.t?.t('orders', 'message', 'now')
  if (minutes === 1) return global.t?.t('orders', 'message', 'oneMinuteAgo')
  return `${global.t?.t('orders', 'message', 'minutesAgo')} ${minutes} min`
}

const normalizeFood99CancelReasonId = value => {
  const normalizedText = resolvePreferredText(value)
  if (!normalizedText) return null

  const normalizedNumber = Number(normalizedText)
  if (Number.isFinite(normalizedNumber) && normalizedNumber > 0) {
    return String(Math.trunc(normalizedNumber))
  }

  return String(normalizedText).trim()
}

const formatFood99CodeLabel = (label, code) => {
  const normalizedLabel = resolvePreferredText(label)
  const normalizedCode = resolvePreferredText(code)

  if (normalizedLabel && normalizedCode) {
    return `${normalizedLabel} (${normalizedCode})`
  }

  return normalizedLabel || normalizedCode
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
  const [food99ActionLoading, setFood99ActionLoading] = useState('')
  const [food99State, setFood99State] = useState(null)
  const [food99StateLoading, setFood99StateLoading] = useState(false)
  const [food99CancelReasonsLoading, setFood99CancelReasonsLoading] = useState(false)
  const [food99CancelReasons, setFood99CancelReasons] = useState([])
  const [cancelReasonModalVisible, setCancelReasonModalVisible] = useState(false)
  const [selectedFood99CancelReasonId, setSelectedFood99CancelReasonId] = useState(null)
  const [food99CancelReasonText, setFood99CancelReasonText] = useState('')
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)
  const [deliveryCodeModalVisible, setDeliveryCodeModalVisible] = useState(false)
  const [deliveryFlowStep, setDeliveryFlowStep] = useState('locator')
  const [deliveryLocator, setDeliveryLocator] = useState('')
  const [deliveryCustomerCode, setDeliveryCustomerCode] = useState('')
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

  // @todo implementar. jÃ¡ vem do banco.
  const selectionType = device?.configs?.['selection-type'] || 'single' // ou multiple

  const isManualInput = productInputType === 'manual'
  const showBarcodeInput = item?.app === 'POS' && !isManualInput
  const platformCapabilities = getPlatformCapabilities(item || orderParam)
  const channelKey = getOrderChannelKey(item || orderParam)
  const isFood99Order = channelKey === '99food'
  const isIfoodOrder = channelKey === 'ifood'
  const normalizedOrderApp = String(item?.app || orderParam?.app || '').trim().toUpperCase()
  const isPosOrder = normalizedOrderApp === 'POS'
  const isShopOrder = normalizedOrderApp === 'SHOP'
  const isPosOrShopOrder = isPosOrder || isShopOrder
  const localStatusNameKey = String(
    item?.status?.status ||
    orderParam?.status?.status ||
    food99State?.order?.status?.status ||
    '',
  ).trim().toLowerCase()
  const localRealStatusKey = String(
    item?.status?.realStatus ||
    orderParam?.status?.realStatus ||
    food99State?.order?.status?.real_status ||
    food99State?.order?.status?.realStatus ||
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
  const integrationChannelLabel = isFood99Order
    ? '99Food'
    : isIfoodOrder
      ? 'iFood'
      : String(channelLabel || 'Marketplace')
  const isPurchaseOrder = String(item?.orderType || orderParam?.orderType || '').toLowerCase() === 'purchase'
  const cancelReasonChannelLabel = isIfoodOrder ? 'iFood' : '99Food'
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

  const loadFood99OrderState = useCallback(async ({ silent = false } = {}) => {
    if (!item?.id || (!isFood99Order && !isIfoodOrder)) {
      setFood99State(null)
      return
    }

    const statePath = isFood99Order
      ? `/marketplace/integrations/99food/orders/${item.id}/state`
      : `/marketplace/integrations/ifood/orders/${item.id}/state`

    try {
      setFood99StateLoading(true)
      const response = await api.fetch(statePath)
      setFood99State(response || null)
    } catch (stateError) {
      setFood99State(null)
      if (!silent) {
        showError(formatApiError(stateError))
      }
    } finally {
      setFood99StateLoading(false)
    }
  }, [item?.id, isFood99Order, isIfoodOrder, showError])

  useFocusEffect(
    useCallback(() => {
      if (item?.id && (isFood99Order || isIfoodOrder)) {
        loadFood99OrderState({ silent: true })
      }
    }, [item?.id, isFood99Order, isIfoodOrder, loadFood99OrderState]),
  )

  const resetFood99CancelReasonFlow = useCallback(() => {
    setCancelReasonModalVisible(false)
    setSelectedFood99CancelReasonId(null)
    setFood99CancelReasonText('')
    setFood99CancelReasons([])
  }, [])

  const runOrderAction = useCallback(
    async (action, options = {}) => {
      if (!item?.id || orderActionLoading || food99ActionLoading) {
        return
      }

      const currentLocalOrderRealStatus = String(
        item?.status?.realStatus ||
        orderParam?.status?.realStatus ||
        food99State?.order?.status?.real_status ||
        food99State?.order?.status?.realStatus ||
        '',
      ).toLowerCase()
      if (isTerminalOrderStatus(currentLocalOrderRealStatus)) {
        return
      }

      const actionMap = isFood99Order
        ? {
            ready: {
              path: `/marketplace/integrations/99food/orders/${item.id}/ready`,
              success: global.t?.t('orders', 'message', 'orderReady'),
            },
            cancel: {
              path: `/marketplace/integrations/99food/orders/${item.id}/cancel`,
              success: global.t?.t('orders', 'message', 'orderCanceled'),
            },
            delivered: {
              path: `/marketplace/integrations/99food/orders/${item.id}/delivered`,
              success: global.t?.t('orders', 'message', 'orderDelivered'),
            },
          }
        : isIfoodOrder
          ? {
              confirm: {
                path: `/marketplace/integrations/ifood/orders/${item.id}/confirm`,
                success: global.t?.t('orders', 'message', 'orderConfirmed'),
              },
              ready: {
                path: `/marketplace/integrations/ifood/orders/${item.id}/ready`,
                success: global.t?.t('orders', 'message', 'orderReady'),
              },
              cancel: {
                path: `/marketplace/integrations/ifood/orders/${item.id}/cancel`,
                success: global.t?.t('orders', 'message', 'orderCanceled'),
              },
              delivered: {
                path: `/marketplace/integrations/ifood/orders/${item.id}/delivered`,
                success: global.t?.t('orders', 'message', 'orderDelivered'),
              },
            }
          : {
              confirm: {
                path: `/orders/${item.id}/confirm`,
                success: global.t?.t('orders', 'message', 'orderConfirmed'),
              },
              ready: { path: `/orders/${item.id}/ready`, success: global.t?.t('orders', 'message', 'orderReady') },
              cancel: { path: `/orders/${item.id}/cancel`, success: global.t?.t('orders', 'message', 'orderCanceled') },
              delivered: { path: `/orders/${item.id}/delivered`, success: global.t?.t('orders', 'message', 'orderDelivered') },
              finalize: { path: `/orders/${item.id}/delivered`, success: global.t?.t('orders', 'message', 'orderDelivered') },
            }

      const actionConfig = actionMap[action]
      if (!actionConfig) return

      const isActionFood99 = isFood99Order
      const isMarketplaceAction = isFood99Order || isIfoodOrder
      const reconcilePath  = `/marketplace/integrations/99food/orders/${item.id}/reconcile`

      try {
        setOrderActionLoading(action)
        setFood99ActionLoading(action)

        const response = await api.fetch(actionConfig.path, {
          method: 'POST',
          body: {
            ...(actionConfig?.body || {}),
            ...(options?.body || {}),
            ...(options?.deliveryCode ? { delivery_code: options.deliveryCode } : {}),
            ...(options?.locator ? { locator: options.locator } : {}),
          },
        })

        const actionResult = response?.result || response
        if (normalizeErrno(actionResult?.errno) !== '0') {
          throw actionResult || response
        }

        if (response?.state && isMarketplaceAction) {
          setFood99State(response.state)
        }

        if (isActionFood99 && action === 'ready') {
          try {
            const reconcileResponse = await api.fetch(reconcilePath, {
              method: 'POST',
              body: {},
            })
            if (
              normalizeErrno(reconcileResponse?.result?.errno) === '0' &&
              reconcileResponse?.state
            ) {
              setFood99State(reconcileResponse.state)
            }
          } catch {
            // continua o fluxo mesmo sem reconciliar
          }
        }

        await refreshCurrentOrder()

        if (isActionFood99 || isIfoodOrder) {
          await loadFood99OrderState({ silent: true })
        }

        if (action === 'delivered') {
          setDeliveryCodeModalVisible(false)
          setDeliveryFlowStep('locator')
          setDeliveryCustomerCode('')
        }

        if (action === 'cancel') {
          resetFood99CancelReasonFlow()
        }

        showSuccess(actionConfig.success)

        if (isKds && (action === 'cancel' || action === 'delivered' || action === 'finalize')) {
          navigation.goBack()
        }
      } catch (actionError) {
        showError(formatApiError(actionError))
      } finally {
        setOrderActionLoading('')
        setFood99ActionLoading('')
      }
    },
    [
      item,
      orderActionLoading,
      food99ActionLoading,
      food99State,
      isFood99Order,
      isIfoodOrder,
      setDeliveryCodeModalVisible,
      refreshCurrentOrder,
      showSuccess,
      showError,
      isKds,
      navigation,
      loadFood99OrderState,
      resetFood99CancelReasonFlow,
    ],
  )

  // alias para manter compatibilidade com o restante do componente
  const runFood99OrderAction = runOrderAction

  const orderForFood99Summary = useMemo(() => {
    if (!item && !orderParam) return null

    const currentOrder = item || {}
    const initialOrder = orderParam || {}
    const currentExtraData = Array.isArray(currentOrder?.extraData)
      ? currentOrder.extraData
      : []
    const initialExtraData = Array.isArray(initialOrder?.extraData)
      ? initialOrder.extraData
      : []

    return {
      ...initialOrder,
      ...currentOrder,
      app: resolvePreferredText(currentOrder?.app, initialOrder?.app),
      otherInformations: resolvePreferredText(
        currentOrder?.otherInformations,
        currentOrder?.other_information,
        currentOrder?.otherInformation,
        initialOrder?.otherInformations,
        initialOrder?.other_information,
        initialOrder?.otherInformation,
      ),
      extraData: currentExtraData.length ? currentExtraData : initialExtraData,
      comments: resolvePreferredText(currentOrder?.comments, initialOrder?.comments),
      remark: resolvePreferredText(currentOrder?.remark, initialOrder?.remark),
      description: resolvePreferredText(currentOrder?.description, initialOrder?.description),
    }
  }, [item, orderParam])

  const fallbackFood99Summary = useMemo(
    () => buildFood99OrderSummary(orderForFood99Summary),
    [orderForFood99Summary],
  )
  const ifoodDisplayOrder = useMemo(() => {
    if (!isIfoodOrder || !fallbackFood99Summary?.items?.length) {
      return null
    }

    return {
      ...(item || orderParam || {}),
      orderProducts: fallbackFood99Summary.items.map((entry, idx) => ({
        id: `ifood-item-${idx}-${normalizeText(entry?.name || 'item')}`,
        name: normalizeText(entry?.name),
        quantity: Number(entry?.quantity || 0),
        value: Number(entry?.unitPrice || 0),
        price: Number(entry?.unitPrice || 0),
        comments: normalizeText(entry?.observation),
        observation: normalizeText(entry?.observation),
        remark: normalizeText(entry?.observation),
        note: normalizeText(entry?.observation),
        description: normalizeText(entry?.description),
        product: {
          name: normalizeText(entry?.name),
          product: normalizeText(entry?.name) || `Item #${idx + 1}`,
          description: normalizeText(entry?.description),
          type: normalizeText(entry?.type || 'product'),
        },
        orderProducts: [],
      })),
    }
  }, [fallbackFood99Summary?.items, isIfoodOrder, item, orderParam])
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

    const fallbackOrderProducts = Array.isArray(ifoodDisplayOrder?.orderProducts)
      ? ifoodDisplayOrder.orderProducts
      : []

    return fallbackOrderProducts
  }, [ifoodDisplayOrder?.orderProducts, item?.id, item?.orderProducts, orderParam?.id, orderParam?.orderProducts, storedOrderProducts])
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
      ifoodDisplayOrder?.orderProducts,
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
  }, [ifoodDisplayOrder?.orderProducts, item?.orderProducts, orderParam?.orderProducts, storedOrderProducts])

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
  const fallbackFood99Financial = useMemo(() => {
    const financial = fallbackFood99Summary?.financial
    if (!financial) return null

    return {
      currency: 'BRL',
      items_total: financial.itemsTotal ?? 0,
      delivery_fee: financial.deliveryFee ?? 0,
      service_fee: financial.serviceFee ?? 0,
      small_order_fee: financial.smallOrderFee ?? 0,
      meal_top_up_fee: financial.mealTopUpFee ?? 0,
      tip_total: financial.tipTotal ?? 0,
      subtotal_before_discounts: financial.subtotalBeforeDiscounts ?? 0,
      discount_total: financial.discountTotal ?? 0,
      store_discount_total: financial.storeDiscountTotal ?? 0,
      platform_discount_total: financial.platformDiscountTotal ?? 0,
      promotions_total: financial.promotionsTotal ?? 0,
      items_discount_total: financial.itemsDiscountTotal ?? 0,
      delivery_discount_total: financial.deliveryDiscountTotal ?? 0,
      coupon_discount_total: financial.couponDiscountTotal ?? 0,
      customer_total: financial.customerTotal ?? 0,
      customer_need_paying_money: financial.customerNeedPayingMoney ?? 0,
      store_receivable_total: financial.storeReceivableTotal ?? 0,
      real_pay_total: financial.realPayTotal ?? 0,
      refund_total: financial.refundTotal ?? 0,
      shop_paid_money: financial.shopPaidMoney ?? 0,
      store_charged_delivery_price: financial.storeChargedDeliveryPrice ?? 0,
    }
  }, [fallbackFood99Summary])
  const fallbackFood99Payment = useMemo(() => {
    const payment = fallbackFood99Summary?.payment
    if (!payment) return null

    return {
      pay_type: payment.payType || '',
      pay_type_label: payment.payTypeLabel || '',
      pay_method: payment.payMethod || '',
      pay_method_label: payment.payMethodLabel || '',
      pay_channel: payment.payChannel || '',
      pay_channel_label: payment.payChannelLabel || '',
      selected_payment_label: payment.selectedPaymentLabel || '',
      amount_paid: payment.amountPaid ?? 0,
      amount_pending: payment.amountPending ?? 0,
      customer_need_paying_money: payment.customerNeedPayingMoney ?? 0,
      collect_on_delivery_amount: payment.collectOnDeliveryAmount ?? 0,
      shop_paid_money: payment.shopPaidMoney ?? 0,
      change_for: payment.changeFor ?? 0,
      change_amount: payment.changeAmount ?? 0,
      needs_change: !!payment.needsChange,
      should_confirm_payment: !payment.isPaidOnline,
      is_fully_paid: !!payment.isFullyPaid,
      is_paid_online: !!payment.isPaidOnline,
    }
  }, [fallbackFood99Summary])
  const fallbackFood99Customer = useMemo(() => {
    const customer = fallbackFood99Summary?.customer
    if (!customer) return null

    return {
      name: customer.name || '',
      phone: customer.phone || '',
      document_number: customer.documentNumber || customer.document_number || '',
      document_type: customer.documentType || customer.document_type || '',
      tax_document_requested:
        customer.taxDocumentRequested ??
        customer.tax_document_requested ??
        null,
    }
  }, [fallbackFood99Summary])
  const fallbackFood99Address = useMemo(() => {
    const address = fallbackFood99Summary?.address
    if (!address) return null

    return {
      display: address.display || '',
      street_name: address.streetName || '',
      street_number: address.streetNumber || '',
      district: address.district || '',
      city: address.city || '',
      state: address.state || '',
      postal_code: address.postalCode || '',
      reference: address.reference || '',
      complement: address.complement || '',
      poi_address: address.poiAddress || '',
    }
  }, [fallbackFood99Summary])
  const fallbackFood99Notes = fallbackFood99Summary?.notes || null
  const fallbackFood99Identifiers = useMemo(() => {
    const identifiers = fallbackFood99Summary?.identifiers
    if (!identifiers) return null

    return {
      order_index: identifiers.orderIndex || '',
      pickup_code: identifiers.pickupCode || '',
      handover_code: identifiers.handoverCode || '',
      handover_page_url: identifiers.handoverPageUrl || '',
      handoverPageUrl: identifiers.handoverPageUrl || '',
    }
  }, [fallbackFood99Summary])
  const fallbackFood99Delivery = useMemo(() => {
    const delivery = fallbackFood99Summary?.delivery
    if (!delivery) return null

    return {
      delivery_label: delivery.deliveryLabel || '',
      remote_delivery_status: delivery.remoteDeliveryStatus || '',
      expected_arrived_eta: delivery.expectedArrivedEta || '',
      pickup_code: delivery.pickupCode || '',
      delivered_by: delivery.deliveredBy || '',
      delivery_mode: delivery.deliveryMode || '',
      handover_code: delivery.handoverCode || '',
      locator: delivery.localizer || '',
      handover_page_url: delivery.handoverPageUrl || '',
      handover_confirmation_url: delivery.handoverConfirmationUrl || '',
      virtual_phone_number: delivery.virtualPhoneNumber || '',
      rider_name: delivery.riderName || '',
      rider_phone: delivery.riderPhone || '',
      rider_to_store_eta: delivery.riderToStoreEta || '',
      is_store_delivery: delivery.isStoreDelivery ?? false,
      is_platform_delivery: delivery.isPlatformDelivery ?? false,
      allows_manual_delivery_completion:
        delivery.allowsManualDeliveryCompletion ?? false,
    }
  }, [fallbackFood99Summary])
  const food99Delivery = useMemo(() => {
    const stateDelivery = food99State?.delivery || null
    if (!stateDelivery) return fallbackFood99Delivery
    if (!fallbackFood99Delivery) return stateDelivery

    return {
      ...fallbackFood99Delivery,
      ...stateDelivery,
    }
  }, [food99State?.delivery, fallbackFood99Delivery])
  const fallbackFood99Fulfillment = useMemo(() => {
    const fulfillment = fallbackFood99Summary?.fulfillment
    if (!fulfillment) return null

    return {
      order_type: fulfillment.orderType || fulfillment.order_type || '',
      order_type_label: fulfillment.orderTypeLabel || fulfillment.order_type_label || '',
      fulfillment_label: fulfillment.fulfillmentLabel || fulfillment.fulfillment_label || '',
      is_delivery: fulfillment.isDelivery ?? fulfillment.is_delivery ?? false,
      is_takeout: fulfillment.isTakeout ?? fulfillment.is_takeout ?? false,
      is_dine_in: fulfillment.isDineIn ?? fulfillment.is_dine_in ?? false,
    }
  }, [fallbackFood99Summary])
  const food99Fulfillment = useMemo(() => {
    const stateFulfillment = food99State?.fulfillment || null
    if (!stateFulfillment) return fallbackFood99Fulfillment
    if (!fallbackFood99Fulfillment) return stateFulfillment

    return {
      ...fallbackFood99Fulfillment,
      ...stateFulfillment,
    }
  }, [food99State?.fulfillment, fallbackFood99Fulfillment])
  const fallbackFood99Takeout = useMemo(() => {
    const takeout = fallbackFood99Summary?.takeout
    if (!takeout) return null

    return {
      is_takeout: takeout.isTakeout ?? takeout.is_takeout ?? false,
      mode: takeout.mode || '',
      mode_label: takeout.modeLabel || takeout.mode_label || '',
      takeout_date_time: takeout.takeoutDateTime || takeout.takeout_date_time || '',
      pickup_code: takeout.pickupCode || takeout.pickup_code || '',
      pickup_area_code: takeout.pickupAreaCode || takeout.pickup_area_code || '',
      pickup_area_type: takeout.pickupAreaType || takeout.pickup_area_type || '',
      pickup_area_type_label: takeout.pickupAreaTypeLabel || takeout.pickup_area_type_label || '',
    }
  }, [fallbackFood99Summary])
  const food99Takeout = useMemo(() => {
    const stateTakeout = food99State?.takeout || null
    if (!stateTakeout) return fallbackFood99Takeout
    if (!fallbackFood99Takeout) return stateTakeout

    return {
      ...fallbackFood99Takeout,
      ...stateTakeout,
    }
  }, [food99State?.takeout, fallbackFood99Takeout])
  const fallbackFood99DineIn = useMemo(() => {
    const dineIn = fallbackFood99Summary?.dineIn || fallbackFood99Summary?.dine_in
    if (!dineIn) return null

    return {
      is_dine_in: dineIn.isDineIn ?? dineIn.is_dine_in ?? false,
      delivery_date_time: dineIn.deliveryDateTime || dineIn.delivery_date_time || '',
    }
  }, [fallbackFood99Summary])
  const food99DineIn = useMemo(() => {
    const stateDineIn = food99State?.dine_in || food99State?.dineIn || null
    if (!stateDineIn) return fallbackFood99DineIn
    if (!fallbackFood99DineIn) return stateDineIn

    return {
      ...fallbackFood99DineIn,
      ...stateDineIn,
    }
  }, [food99State?.dine_in, food99State?.dineIn, fallbackFood99DineIn])
  const food99Integration = food99State?.integration || null
  const food99Observability = food99State?.observability || null
  const food99Financial = useMemo(() => {
    const stateFinancial = food99State?.financial || null
    if (!stateFinancial) return fallbackFood99Financial
    if (!fallbackFood99Financial) return stateFinancial

    return {
      ...fallbackFood99Financial,
      ...stateFinancial,
      currency: resolvePreferredText(stateFinancial.currency, fallbackFood99Financial.currency) || 'BRL',
      items_total: resolvePreferredMoney(stateFinancial.items_total, fallbackFood99Financial.items_total),
      delivery_fee: resolvePreferredMoney(stateFinancial.delivery_fee, fallbackFood99Financial.delivery_fee),
      service_fee: resolvePreferredMoney(stateFinancial.service_fee, fallbackFood99Financial.service_fee),
      small_order_fee: resolvePreferredMoney(stateFinancial.small_order_fee, fallbackFood99Financial.small_order_fee),
      meal_top_up_fee: resolvePreferredMoney(stateFinancial.meal_top_up_fee, fallbackFood99Financial.meal_top_up_fee),
      tip_total: resolvePreferredMoney(stateFinancial.tip_total, fallbackFood99Financial.tip_total),
      subtotal_before_discounts: resolvePreferredMoney(
        stateFinancial.subtotal_before_discounts,
        fallbackFood99Financial.subtotal_before_discounts,
      ),
      discount_total: resolvePreferredMoney(stateFinancial.discount_total, fallbackFood99Financial.discount_total),
      store_discount_total: resolvePreferredMoney(
        stateFinancial.store_discount_total,
        fallbackFood99Financial.store_discount_total,
      ),
      platform_discount_total: resolvePreferredMoney(
        stateFinancial.platform_discount_total,
        fallbackFood99Financial.platform_discount_total,
      ),
      promotions_total: resolvePreferredMoney(stateFinancial.promotions_total, fallbackFood99Financial.promotions_total),
      items_discount_total: resolvePreferredMoney(
        stateFinancial.items_discount_total,
        fallbackFood99Financial.items_discount_total,
      ),
      delivery_discount_total: resolvePreferredMoney(
        stateFinancial.delivery_discount_total,
        fallbackFood99Financial.delivery_discount_total,
      ),
      coupon_discount_total: resolvePreferredMoney(
        stateFinancial.coupon_discount_total,
        fallbackFood99Financial.coupon_discount_total,
      ),
      customer_total: resolvePreferredMoney(stateFinancial.customer_total, fallbackFood99Financial.customer_total),
      customer_need_paying_money: resolvePreferredMoney(
        stateFinancial.customer_need_paying_money,
        fallbackFood99Financial.customer_need_paying_money,
      ),
      store_receivable_total: resolvePreferredMoney(
        stateFinancial.store_receivable_total,
        fallbackFood99Financial.store_receivable_total,
      ),
      real_pay_total: resolvePreferredMoney(
        stateFinancial.real_pay_total,
        fallbackFood99Financial.real_pay_total,
      ),
      refund_total: resolvePreferredMoney(
        stateFinancial.refund_total,
        fallbackFood99Financial.refund_total,
      ),
      store_charged_delivery_price: resolvePreferredMoney(
        stateFinancial.store_charged_delivery_price,
        fallbackFood99Financial.store_charged_delivery_price,
      ),
      shop_paid_money: resolvePreferredMoney(
        stateFinancial.shop_paid_money,
        fallbackFood99Financial.shop_paid_money,
      ),
    }
  }, [food99State?.financial, fallbackFood99Financial])
  const food99Payment = useMemo(() => {
    const statePayment = food99State?.payment || null
    if (!statePayment) return fallbackFood99Payment
    if (!fallbackFood99Payment) return statePayment

    return {
      ...fallbackFood99Payment,
      ...statePayment,
      pay_type: resolvePreferredText(statePayment.pay_type, fallbackFood99Payment.pay_type),
      pay_type_label: resolvePreferredMeaningfulText(
        statePayment.pay_type_label,
        fallbackFood99Payment.pay_type_label,
      ),
      pay_method: resolvePreferredText(statePayment.pay_method, fallbackFood99Payment.pay_method),
      pay_method_label: resolvePreferredMeaningfulText(
        statePayment.pay_method_label,
        fallbackFood99Payment.pay_method_label,
      ),
      pay_channel: resolvePreferredText(statePayment.pay_channel, fallbackFood99Payment.pay_channel),
      pay_channel_label: resolvePreferredMeaningfulText(
        statePayment.pay_channel_label,
        fallbackFood99Payment.pay_channel_label,
      ),
      selected_payment_label: resolvePreferredMeaningfulText(
        statePayment.selected_payment_label,
        fallbackFood99Payment.selected_payment_label,
      ),
      amount_paid: resolvePreferredMoney(statePayment.amount_paid, fallbackFood99Payment.amount_paid),
      amount_pending: resolvePreferredMoney(
        statePayment.amount_pending,
        fallbackFood99Payment.amount_pending,
      ),
      customer_need_paying_money: resolvePreferredMoney(
        statePayment.customer_need_paying_money,
        fallbackFood99Payment.customer_need_paying_money,
      ),
      collect_on_delivery_amount: resolvePreferredMoney(
        statePayment.collect_on_delivery_amount,
        fallbackFood99Payment.collect_on_delivery_amount,
      ),
      shop_paid_money: resolvePreferredMoney(
        statePayment.shop_paid_money,
        fallbackFood99Payment.shop_paid_money,
      ),
      change_for: resolvePreferredMoney(
        statePayment.change_for,
        fallbackFood99Payment.change_for,
      ),
      change_amount: resolvePreferredMoney(
        statePayment.change_amount,
        fallbackFood99Payment.change_amount,
      ),
      needs_change:
        typeof statePayment.needs_change === 'boolean'
          ? statePayment.needs_change
          : !!fallbackFood99Payment.needs_change,
      should_confirm_payment:
        typeof statePayment.should_confirm_payment === 'boolean'
          ? statePayment.should_confirm_payment
          : !!fallbackFood99Payment.should_confirm_payment,
      is_fully_paid:
        typeof statePayment.is_fully_paid === 'boolean'
          ? statePayment.is_fully_paid
          : !!fallbackFood99Payment.is_fully_paid,
      is_paid_online:
        typeof statePayment.is_paid_online === 'boolean'
          ? statePayment.is_paid_online
          : !!fallbackFood99Payment.is_paid_online,
    }
  }, [food99State?.payment, fallbackFood99Payment])
  const food99Customer = useMemo(() => {
    const stateCustomer = food99State?.customer || null
    const stateTaxDocumentRequested = readBooleanFlag(
      stateCustomer?.tax_document_requested ?? stateCustomer?.taxDocumentRequested,
    )
    const fallbackTaxDocumentRequested = readBooleanFlag(
      fallbackFood99Customer?.tax_document_requested ?? fallbackFood99Customer?.taxDocumentRequested,
    )

    if (!stateCustomer && !fallbackFood99Customer) return null
    if (!stateCustomer) {
      return {
        ...fallbackFood99Customer,
        document_number: resolvePreferredText(
          fallbackFood99Customer?.document_number,
          fallbackFood99Customer?.documentNumber,
        ),
        document_type: resolvePreferredText(
          fallbackFood99Customer?.document_type,
          fallbackFood99Customer?.documentType,
        ),
        tax_document_requested: fallbackTaxDocumentRequested,
      }
    }
    if (!fallbackFood99Customer) {
      return {
        ...stateCustomer,
        document_number: resolvePreferredText(
          stateCustomer.document_number,
          stateCustomer.documentNumber,
        ),
        document_type: resolvePreferredText(
          stateCustomer.document_type,
          stateCustomer.documentType,
        ),
        tax_document_requested: stateTaxDocumentRequested,
      }
    }

    return {
      ...fallbackFood99Customer,
      ...stateCustomer,
      name: resolvePreferredText(stateCustomer.name, fallbackFood99Customer.name),
      phone: resolvePreferredText(stateCustomer.phone, fallbackFood99Customer.phone),
      document_number: resolvePreferredText(
        stateCustomer.document_number,
        stateCustomer.documentNumber,
        fallbackFood99Customer.document_number,
      ),
      document_type: resolvePreferredText(
        stateCustomer.document_type,
        stateCustomer.documentType,
        fallbackFood99Customer.document_type,
      ),
      tax_document_requested:
        stateTaxDocumentRequested !== null
          ? stateTaxDocumentRequested
          : fallbackTaxDocumentRequested,
    }
  }, [food99State?.customer, fallbackFood99Customer])
  const food99Address = useMemo(() => {
    const stateAddress = food99State?.address || null
    if (!stateAddress) return fallbackFood99Address
    if (!fallbackFood99Address) return stateAddress

    return {
      ...fallbackFood99Address,
      ...stateAddress,
      display: resolvePreferredText(stateAddress.display, fallbackFood99Address.display),
      street_name: resolvePreferredText(
        stateAddress.street_name,
        stateAddress.streetName,
        fallbackFood99Address.street_name,
      ),
      street_number: resolvePreferredText(
        stateAddress.street_number,
        stateAddress.streetNumber,
        fallbackFood99Address.street_number,
      ),
      district: resolvePreferredText(stateAddress.district, fallbackFood99Address.district),
      city: resolvePreferredText(stateAddress.city, fallbackFood99Address.city),
      state: resolvePreferredText(stateAddress.state, fallbackFood99Address.state),
      postal_code: resolvePreferredText(
        stateAddress.postal_code,
        stateAddress.postalCode,
        fallbackFood99Address.postal_code,
      ),
      reference: resolvePreferredText(stateAddress.reference, fallbackFood99Address.reference),
      complement: resolvePreferredText(stateAddress.complement, fallbackFood99Address.complement),
      poi_address: resolvePreferredText(
        stateAddress.poi_address,
        stateAddress.poiAddress,
        fallbackFood99Address.poi_address,
      ),
    }
  }, [food99State?.address, fallbackFood99Address])
  const food99Notes = useMemo(() => {
    const stateNotes = food99State?.notes || null
    const remark = String(stateNotes?.remark || fallbackFood99Notes?.remark || '').trim()
    const itemRemarks = resolvePreferredText(
      stateNotes?.item_remarks,
      stateNotes?.itemRemarks,
      fallbackFood99Notes?.item_remarks,
      fallbackFood99Notes?.itemRemarks,
    )
    const needCutlery =
      stateNotes?.need_cutlery ??
      fallbackFood99Notes?.need_cutlery ??
      fallbackFood99Notes?.needCutlery ??
      null

    if (!remark && !itemRemarks && (needCutlery === null || needCutlery === undefined)) {
      return null
    }

    return {
      remark,
      item_remarks: itemRemarks,
      need_cutlery: needCutlery,
    }
  }, [food99State?.notes, fallbackFood99Notes])
  const food99Identifiers = useMemo(() => {
    const stateIdentifiers = food99State?.identifiers || null
    if (!stateIdentifiers) return fallbackFood99Identifiers
    if (!fallbackFood99Identifiers) return stateIdentifiers

    return {
      ...fallbackFood99Identifiers,
      ...stateIdentifiers,
      order_index: resolvePreferredText(
        stateIdentifiers.order_index,
        fallbackFood99Identifiers.order_index,
      ),
      pickup_code: resolvePreferredText(
        stateIdentifiers.pickup_code,
        fallbackFood99Identifiers.pickup_code,
      ),
      handover_code: resolvePreferredText(
        stateIdentifiers.handover_code,
        fallbackFood99Identifiers.handover_code,
      ),
    }
  }, [food99State?.identifiers, fallbackFood99Identifiers])
  const food99Capabilities = food99State?.capabilities || {}
  const marketplaceCapabilities = useMemo(() => {
    const canCancel = readCapabilityValue(food99Capabilities, 'can_cancel', 'canCancel')
    const canReady = readCapabilityValue(food99Capabilities, 'can_ready', 'canReady')
    const canDelivered = readCapabilityValue(food99Capabilities, 'can_delivered', 'canDelivered')
    const requiresDeliveryLocator = readCapabilityValue(
      food99Capabilities,
      'requires_delivery_locator',
      'requiresDeliveryLocator',
    )
    const requiresDeliveryCode = readCapabilityValue(
      food99Capabilities,
      'requires_delivery_code',
      'requiresDeliveryCode',
    )
    const canOpenHandoverFlow = readCapabilityValue(
      food99Capabilities,
      'can_open_handover_flow',
      'canOpenHandoverFlow',
    )
    const isTerminal = readCapabilityValue(food99Capabilities, 'is_terminal', 'isTerminal')
    const isDelivering = readCapabilityValue(food99Capabilities, 'is_delivering', 'isDelivering')
    const deliveryLocatorLength = Number(
      readCapabilityValue(
        food99Capabilities,
        'delivery_locator_length',
        'deliveryLocatorLength',
      ) || 8,
    )
    const deliveryCodeLength = Number(
      readCapabilityValue(
        food99Capabilities,
        'delivery_code_length',
        'deliveryCodeLength',
      ) || 4,
    )

    return {
      canCancel: typeof canCancel === 'boolean' ? canCancel : !!platformCapabilities.canCancel,
      canReady: typeof canReady === 'boolean' ? canReady : !!platformCapabilities.canReady,
      canDelivered:
        typeof canDelivered === 'boolean' ? canDelivered : !!platformCapabilities.canDeliver,
      requiresDeliveryLocator: typeof requiresDeliveryLocator === 'boolean'
        ? requiresDeliveryLocator
        : false,
      requiresDeliveryCode: typeof requiresDeliveryCode === 'boolean'
        ? requiresDeliveryCode
        : false,
      canOpenHandoverFlow: typeof canOpenHandoverFlow === 'boolean'
        ? canOpenHandoverFlow
        : false,
      isTerminal: typeof isTerminal === 'boolean' ? isTerminal : false,
      isDelivering: typeof isDelivering === 'boolean' ? isDelivering : false,
      deliveryLocatorLength:
        Number.isFinite(deliveryLocatorLength) && deliveryLocatorLength > 0
          ? deliveryLocatorLength
          : 8,
      deliveryCodeLength:
        Number.isFinite(deliveryCodeLength) && deliveryCodeLength > 0
          ? deliveryCodeLength
          : 4,
    }
  }, [food99Capabilities, platformCapabilities])

  const food99Scheduling = food99State?.scheduling || null
  const isScheduledOrder = readBooleanFlag(food99Scheduling?.is_scheduled) === true
  const scheduledStartRaw = food99Scheduling?.scheduled_start || null
  const scheduledEndRaw = food99Scheduling?.scheduled_end || null
  const scheduledDeliveryDateTimeRaw = food99Scheduling?.delivery_date_time || null
  const scheduledPreparationStartRaw = food99Scheduling?.preparation_start || null

  const formatScheduledDate = raw => {
    if (!raw) return null
    try {
      const d = new Date(raw)
      const pad = n => String(n).padStart(2, '0')
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch {
      return raw
    }
  }

  const scheduledWindowLabel = useMemo(() => {
    if (!scheduledStartRaw) return null
    try {
      const start = new Date(scheduledStartRaw)
      const pad = n => String(n).padStart(2, '0')
      const datePart = `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()}`
      const timePart = `${pad(start.getHours())}:${pad(start.getMinutes())}`
      if (scheduledEndRaw) {
        const end = new Date(scheduledEndRaw)
        const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`
        return `${datePart} das ${timePart} ate ${endTime}`
      }
      return `${datePart} as ${timePart}`
    } catch {
      return scheduledStartRaw
    }
  }, [scheduledStartRaw, scheduledEndRaw])

  const scheduledDateLabel = scheduledWindowLabel
  const marketplaceOrderType = String(
    resolvePreferredText(
      food99Fulfillment?.order_type,
      food99Fulfillment?.orderType,
      food99Integration?.order_type,
      food99Integration?.orderType,
    ) || '',
  ).toUpperCase()
  const isIfoodTakeoutOrder = isIfoodOrder && marketplaceOrderType === 'TAKEOUT'
  const isIfoodDineInOrder = isIfoodOrder && ['DINE_IN', 'INDOOR'].includes(marketplaceOrderType)
  const isIfoodPickupLikeOrder = isIfoodTakeoutOrder || isIfoodDineInOrder
  const isIfoodDeliveryOrder = isIfoodOrder && !isIfoodPickupLikeOrder
  const marketplaceFulfillmentLabel = resolvePreferredText(
    food99Fulfillment?.fulfillment_label,
    food99Fulfillment?.fulfillmentLabel,
    food99Fulfillment?.order_type_label,
    food99Fulfillment?.orderTypeLabel,
    food99Delivery?.delivery_label,
  )
  const marketplaceContextLabel = isIfoodPickupLikeOrder
    ? (global.t?.t('orders', 'label', 'orderType') || 'Tipo do pedido')
    : (global.t?.t('orders', 'label', 'delivery') || 'Entrega')
  const takeoutModeLabel = resolvePreferredText(
    food99Takeout?.mode_label,
    food99Takeout?.modeLabel,
    food99Takeout?.mode,
  )
  const takeoutDateTimeRaw = resolvePreferredText(
    food99Takeout?.takeout_date_time,
    food99Takeout?.takeoutDateTime,
  )
  const dineInDateTimeRaw = resolvePreferredText(
    food99DineIn?.delivery_date_time,
    food99DineIn?.deliveryDateTime,
  )
  const formattedTakeoutDateTime = formatScheduledDate(takeoutDateTimeRaw)
  const formattedDineInDateTime = formatScheduledDate(dineInDateTimeRaw)
  const marketplacePickupCode = resolvePreferredText(
    food99Takeout?.pickup_code,
    food99Takeout?.pickupCode,
    food99Delivery?.pickup_code,
    food99Identifiers?.pickup_code,
  )
  const marketplacePickupAreaCode = resolvePreferredText(
    food99Takeout?.pickup_area_code,
    food99Takeout?.pickupAreaCode,
  )
  const marketplacePickupAreaTypeLabel = resolvePreferredText(
    food99Takeout?.pickup_area_type_label,
    food99Takeout?.pickupAreaTypeLabel,
    food99Takeout?.pickup_area_type,
    food99Takeout?.pickupAreaType,
  )
  const shouldShowOrderAddress = !isPurchaseOrder && (!isIfoodOrder || isIfoodDeliveryOrder)
  const remoteOrderStateKey = String(food99Integration?.remote_order_state || '').toLowerCase()
  const normalizedFood99LastEventType = String(food99Integration?.last_event_type || '').toLowerCase()
  const normalizedIfoodLatestEventType = String(
    fallbackFood99Summary?.integration?.latestEventType ||
      food99Integration?.last_event_type ||
      '',
  ).toLowerCase()
  const effectiveIfoodLifecycleKey = isIfoodOrder
    ? (remoteOrderStateKey || normalizedIfoodLatestEventType)
    : remoteOrderStateKey
  const effectiveDisplayedOperationalStatus = useMemo(
    () => (
      (isFood99Order || isIfoodOrder)
        ? resolvePreferredOperationalStatus({
            currentStatus: localStatusNameKey,
            currentRealStatus: localRealStatusKey,
            remoteState: effectiveIfoodLifecycleKey,
          })
        : {
            status: localStatusNameKey,
            realStatus: localRealStatusKey,
          }
    ),
    [
      effectiveIfoodLifecycleKey,
      isFood99Order,
      isIfoodOrder,
      localRealStatusKey,
      localStatusNameKey,
    ],
  )
  const effectiveLocalStatusNameKey = effectiveDisplayedOperationalStatus.status
  const effectiveLocalRealStatusKey = effectiveDisplayedOperationalStatus.realStatus
  const displayOrderStatusColor = resolvePreferredText(
    food99State?.order?.status?.color,
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
  const normalizedFood99LastAction = String(food99Integration?.last_action || '').toLowerCase()
  const isIfoodReadyLifecycle =
    isIfoodOrder &&
    (
      ['new', 'open', 'placed', 'confirmed', 'ready', 'delivery_drop_code_requested', 'delivery_drop_code_validating'].includes(effectiveIfoodLifecycleKey)
    )
  const isIfoodDispatchLifecycle =
    isIfoodOrder &&
    (
      ['dispatching', 'delivering', 'courier_to_store', 'picked_up', 'arriving'].includes(effectiveIfoodLifecycleKey)
    ) &&
    !isIfoodReadyLifecycle
  const normalizedOrderRealStatus = String(
    effectiveLocalRealStatusKey || '',
  ).toLowerCase()
  const hasTerminalOrderState =
    isLocallyTerminalOrder ||
    marketplaceCapabilities.isTerminal ||
    isTerminalOrderStatus(normalizedOrderRealStatus)
  const isTerminalFood99Order = hasTerminalOrderState
  const isIfoodMerchantDelivery = isIfoodOrder && !isIfoodPickupLikeOrder && (
    normalizeText(food99Delivery?.delivered_by).toUpperCase() === 'MERCHANT' ||
    food99Delivery?.is_store_delivery === true ||
    normalizeText(food99Delivery?.delivery_label).toLowerCase().includes('loja')
  )
  const isIfoodRiderAssigned = isIfoodOrder && !!(
    normalizeText(food99Delivery?.rider_name || '').trim() ||
    normalizeText(food99Delivery?.rider_phone || '').trim() ||
    Number(food99Delivery?.rider_to_store_eta || 0) > 0
  )
  // entrega da propria loja nao tem entregador — o rider nao e exigido para liberar a acao
  const isIfoodDeliveryActionState = isIfoodDispatchLifecycle && (isIfoodMerchantDelivery || isIfoodRiderAssigned)
  const canCancelFood99Order = !isTerminalFood99Order && marketplaceCapabilities.canCancel
  const canManualCompleteFood99Order =
    !isTerminalFood99Order &&
    (
      isIfoodOrder
        ? marketplaceCapabilities.canDelivered && isIfoodMerchantDelivery && isIfoodDeliveryActionState
        : marketplaceCapabilities.canDelivered && !!food99Delivery?.allows_manual_delivery_completion
    )
  const canOpenFood99HandoverFlow =
    !isTerminalFood99Order &&
    (
      marketplaceCapabilities.canOpenHandoverFlow ||
      !!food99Delivery?.handover_confirmation_url ||
      !!food99Delivery?.handover_page_url ||
      !!food99Identifiers?.handoverPageUrl ||
      !!food99Identifiers?.handover_page_url ||
      (isIfoodOrder && isIfoodMerchantDelivery && isIfoodDeliveryActionState)
    )
  const isIfoodHandoverFlow =
    isIfoodOrder && isIfoodMerchantDelivery && isIfoodDeliveryActionState
  const requiresFood99DeliveryLocator =
    isFood99Order &&
    (
      marketplaceCapabilities.requiresDeliveryLocator ||
      !!food99Delivery?.is_store_delivery
    )
  const food99LocatorLength = marketplaceCapabilities.deliveryLocatorLength
  const food99DeliveryCodeLength = marketplaceCapabilities.deliveryCodeLength
  const shouldShowFood99DeliveryAction =
    isIfoodOrder
      ? canManualCompleteFood99Order && (canOpenFood99HandoverFlow || isIfoodHandoverFlow)
      : canManualCompleteFood99Order
  const formattedFood99Eta = formatFood99Eta(food99Delivery?.expected_arrived_eta)
  const food99Locator = String(food99Delivery?.locator || '').trim()
  const food99PickupCode = String(
    marketplacePickupCode || '',
  ).trim()
  const food99HandoverCode = String(
    food99Delivery?.handover_code || food99Identifiers?.handover_code || '',
  ).trim()
  const food99RiderName = String(food99Delivery?.rider_name || '').trim()
  const food99RiderPhone = String(food99Delivery?.rider_phone || '').trim()
  const food99RiderToStoreEta = formatFood99RiderEta(food99Delivery?.rider_to_store_eta)
  const food99HandoverLink = String(
    food99Delivery?.handover_confirmation_url ||
      food99Delivery?.handover_page_url ||
      food99Identifiers?.handoverPageUrl ||
      food99Identifiers?.handover_page_url ||
      (isIfoodOrder ? 'https://confirmacao-entrega-propria.ifood.com.br/' : ''),
  ).trim()
  const activeFood99Locator = String(deliveryLocator || food99Locator).trim()
  const isFood99Ready = remoteOrderStateKey === 'ready'
  const isFood99CourierToStore = remoteOrderStateKey === 'courier_to_store'
  const shouldHideReadyFood99Action = !!food99Delivery?.is_platform_delivery && isFood99Ready
  const canConfirmIfoodOrder = false
  const marketplaceLifecycleKey = isIfoodOrder
    ? effectiveIfoodLifecycleKey
    : remoteOrderStateKey
  const isMarketplacePreparingState =
    (
      effectiveLocalRealStatusKey === 'open' &&
      effectiveLocalStatusNameKey === 'preparing'
    ) ||
    (
      effectiveLocalRealStatusKey !== 'pending' &&
      ['accepted', 'confirmed', 'preparing'].includes(marketplaceLifecycleKey)
    )
  const marketplaceReadyActionLabel = global.t?.t('orders', 'button', 'orderReady')
  const isIfoodReadyOrBeyondLocalState =
    isIfoodOrder &&
    (
      effectiveLocalStatusNameKey === 'ready' ||
      effectiveLocalStatusNameKey === 'way' ||
      effectiveLocalRealStatusKey === 'pending'
    )
  const canReadyMarketplaceByLocalFallback =
    !isTerminalFood99Order &&
    effectiveLocalRealStatusKey === 'open' &&
    effectiveLocalStatusNameKey === 'preparing'
  const canReadyFood99Order =
    !isTerminalFood99Order &&
    isMarketplacePreparingState &&
    (
      isIfoodOrder
        ? (marketplaceCapabilities.canReady || canReadyMarketplaceByLocalFallback) &&
          !isIfoodReadyOrBeyondLocalState
        : (marketplaceCapabilities.canReady || canReadyMarketplaceByLocalFallback) && !shouldHideReadyFood99Action
    )
  const applicableFood99CancelReasons = Array.isArray(food99CancelReasons)
    ? food99CancelReasons.filter(reason => reason?.applicable !== false)
    : []
  const selectedFood99CancelReason = applicableFood99CancelReasons.find(
    reason =>
      normalizeFood99CancelReasonId(reason?.reason_id) ===
      normalizeFood99CancelReasonId(selectedFood99CancelReasonId),
  )
  const requiresFood99CancelReasonText = !!selectedFood99CancelReason?.requires_description
  const isFood99Delivering =
    isIfoodOrder
      ? isIfoodDispatchLifecycle && isIfoodRiderAssigned
      : typeof marketplaceCapabilities.isDelivering === 'boolean'
        ? marketplaceCapabilities.isDelivering
        : ['courier_to_store', 'picked_up', 'delivering', 'arriving', 'dispatching'].includes(remoteOrderStateKey)
  const hasFood99VisualData = !!(food99State || fallbackFood99Summary)
  const isUsingFallbackMarketplaceSummary =
    (isFood99Order || isIfoodOrder) &&
    !food99State &&
    !!fallbackFood99Summary
  const food99PaymentMethodValue = isIfoodOrder
    ? resolvePreferredMeaningfulText(
        food99Payment?.pay_method_label,
        food99Payment?.pay_method,
      )
    : formatFood99CodeLabel(
        food99Payment?.pay_method_label,
        food99Payment?.pay_method,
      )
  const food99PaymentChannelValue = isIfoodOrder
    ? resolvePreferredMeaningfulText(
        food99Payment?.pay_channel_label,
        food99Payment?.pay_channel,
      )
    : formatFood99CodeLabel(
        food99Payment?.pay_channel_label,
        food99Payment?.pay_channel,
      )
  const fallbackOrderObservation = resolvePreferredText(
    item?.comments,
    orderParam?.comments,
    item?.remark,
    orderParam?.remark,
    item?.description,
    orderParam?.description,
  )
  const food99ItemRemarksText = resolvePreferredText(
    food99Notes?.item_remarks,
    food99Notes?.itemRemarks,
  )
  const food99RemarkText = resolvePreferredText(
    food99Notes?.remark,
    fallbackOrderObservation,
  )
  const food99AddressPrimaryLine = resolvePreferredText(
    food99Address?.display,
    food99Address?.poi_address,
  )
  const food99SelectedPaymentLabel = resolvePreferredMeaningfulText(
    food99Payment?.selected_payment_label,
    food99Payment?.pay_method_label,
    food99Payment?.pay_channel_label,
  )
  const food99PaymentBrandValue = isIfoodOrder
    ? resolvePreferredMeaningfulText(
        food99Financial?.payment_brand,
        food99Payment?.payment_brand,
        food99Payment?.paymentBrand,
      )
    : ''
  const food99AddressStreetLine = [food99Address?.street_name, food99Address?.street_number]
    .map(normalizeText)
    .filter(Boolean)
    .join(', ')
  const food99AddressCityStateLine = [food99Address?.city, food99Address?.state]
    .map(normalizeText)
    .filter(Boolean)
    .join(' / ')
  const food99CollectOnDeliveryFallback = resolvePreferredMoney(
    food99Payment?.collect_on_delivery_amount,
    food99Payment?.amount_pending,
  )
  const food99CashCollectionAmount = resolvePreferredMoney(
    food99Payment?.customer_need_paying_money ?? food99Financial?.customer_need_paying_money,
    food99CollectOnDeliveryFallback,
  )
  const food99ShopPaidMoney = resolvePreferredMoney(
    food99Payment?.shop_paid_money,
    food99Financial?.shop_paid_money,
  )
  const food99ChangeFor = resolvePreferredMoney(food99Payment?.change_for)
  const food99ChangeAmount = resolvePreferredMoney(food99Payment?.change_amount)
  const food99NeedsChange =
    typeof food99Payment?.needs_change === 'boolean'
      ? food99Payment.needs_change
      : food99ChangeAmount > 0.009
  const food99PaymentChannelLabelLower = normalizeText(
    food99Payment?.pay_channel_label || food99SelectedPaymentLabel,
  ).toLowerCase()
  const isCashPaymentSelection =
    String(food99Payment?.pay_channel || '').trim() === '153' ||
    food99PaymentChannelLabelLower.includes('dinheiro')
  const shouldShowCollectOnDelivery =
    !food99Payment?.is_paid_online && food99CashCollectionAmount > 0.009
  const collectOnDeliveryLabel = isCashPaymentSelection
    ? global.t?.t('orders', 'label', 'collectCashOnDelivery')
    : global.t?.t('orders', 'label', 'collectOnDelivery')
  const shouldShowDeliveryPaymentSection =
    shouldShowCollectOnDelivery ||
    isCashPaymentSelection ||
    food99NeedsChange ||
    food99ChangeFor > 0 ||
    food99ShopPaidMoney > 0
  const hasFood99CancellationInfo =
    ['cancel_requested', 'partial_cancel', 'canceled'].includes(remoteOrderStateKey) ||
    !!food99Integration?.cancel_code ||
    !!food99Integration?.cancel_reason
  const food99CancellationSourceLabel =
    normalizedFood99LastAction === 'cancel' &&
    !hasErrnoError(food99Integration?.last_action_errno)
      ? global.t?.t('orders', 'label', 'store')
      : /(ordercancelapply|ordercancelrequest|cancelapply|cancelrequest)/.test(
            normalizedFood99LastEventType,
          )
        ? global.t?.t('orders', 'label', 'customer')
          : hasFood99CancellationInfo
          ? `${global.t?.t('orders', 'label', 'customer')} / ${integrationChannelLabel}`
          : ''
  const remoteStateAgeLabel = formatAgeMinutes(food99Observability?.remote_state_age_minutes)
  const lastActionAgeLabel = formatAgeMinutes(food99Observability?.last_action_age_minutes)
  const lastReconcileAgeLabel = formatAgeMinutes(food99Observability?.last_reconcile_age_minutes)
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
    !isFood99Order &&
    !isIfoodOrder &&
    !!item?.id &&
    localPendingAmount > 0 &&
    !isTerminalFood99Order
  const showInlineAddPaymentAction =
    canAddOrderPayment &&
    !useUnifiedKdsLayout
  const food99AmountPending = resolvePreferredMoney(
    food99Payment?.amount_pending,
    food99CashCollectionAmount,
  )
  const hasFood99PendingSignals =
    hasMeaningfulValue(food99Payment?.amount_pending) ||
    hasMeaningfulValue(food99Payment?.customer_need_paying_money) ||
    hasMeaningfulValue(food99Financial?.customer_need_paying_money) ||
    hasMeaningfulValue(food99Payment?.collect_on_delivery_amount)
  const isFood99FinanciallyPaid =
    isFood99Order &&
    (
      food99Payment?.is_fully_paid === true ||
      food99Payment?.is_paid_online === true ||
      (hasFood99PendingSignals && food99AmountPending <= 0.009)
    )
  const isFinanciallyPaid =
    isFood99FinanciallyPaid ||
    localPendingAmount <= 0.009
  const isOrderPaidForCompletion = isFood99Order
    ? isFood99FinanciallyPaid
    : isFinanciallyPaid
  const hasFood99SyncIssue =
    food99Observability?.is_healthy === false ||
    hasErrnoError(food99Integration?.last_action_errno) ||
    hasErrnoError(food99Integration?.confirm_errno) ||
    hasErrnoError(food99Integration?.reconcile_errno)
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
  const localStatusLower = localStatusRaw.toLowerCase()
  const isLocallyCanceledOrder =
    localStatusLower.includes('canceled')
  const pendingAmountForBadge = Number(
    isFood99Order
      ? resolvePreferredMoney(food99Payment?.amount_pending, localPendingAmount || 0)
      : (localPendingAmount || 0),
  )
  const isPendingForBadge = Number.isFinite(pendingAmountForBadge) && pendingAmountForBadge > 0.009
  const orderStatusBadgeLabel = String(localStatusRaw || '-').toUpperCase()
  const orderStatusBadgeColor = displayOrderStatusColor || ppcColors.accentInfo
  const fallbackNoObservationText = isFood99Order
    ? global.t?.t('orders', 'message', 'noObservations99Food')
    : isIfoodOrder
      ? global.t?.t('orders', 'message', 'noObservationsIfood')
      : `${global.t?.t('orders', 'message', 'noObservationsFor')} ${integrationChannelLabel}.`
  const showOrderObservationCard = isIfoodOrder
    ? !!(food99Notes?.remark || food99ItemRemarksText)
    : true
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
  const orderCustomerDocument = resolvePreferredText(
    localOrderCustomerDocument,
    food99Customer?.document_number,
  )
  const orderCustomerDocumentType = resolvePreferredText(
    localOrderClient?.document?.[0]?.documentType?.documentType,
    Array.isArray(localOrderClient?.document)
      ? localOrderClient.document.map(document => normalizeText(document?.documentType?.documentType)).find(Boolean)
      : normalizeText(localOrderClient?.documentType?.documentType),
    food99Customer?.document_type,
  )
  const orderCustomerDocumentLabel = resolveDocumentLabel(
    orderCustomerDocumentType,
    orderCustomerDocument,
  )
  const ifoodTaxDocumentRequested = isIfoodOrder && (() => {
    const explicitFlag = readBooleanFlag(
      food99Customer?.tax_document_requested ?? food99Customer?.taxDocumentRequested,
    )
    if (explicitFlag !== null) return explicitFlag

    return !!resolvePreferredText(food99Customer?.document_number)
  })()
  const ifoodTaxDocumentTitle =
    global.t?.t('orders', 'title', 'taxDocumentRequested') ||
    'Documento para nota fiscal'
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
  const orderObservationText = resolvePreferredText(
    food99RemarkText,
    localOrderObservationSource,
  ) || fallbackNoObservationText
  const baseOrderObservationText = localOrderObservationSource || fallbackNoObservationText
  const showBaseOrderObservationCard = isIfoodOrder
    ? !!localOrderObservationSource
    : true
  const shouldShowFood99ItemRemarks =
    !!food99ItemRemarksText &&
    normalizeKey(food99ItemRemarksText) !== normalizeKey(orderObservationText)
  const orderDiscountTotal = Number(food99Financial?.discount_total || 0)
  const orderDisplayTotal = Number(
    food99Financial?.customer_total ||
      food99CashCollectionAmount ||
      localOrderTotal ||
      0,
  )
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
  const isGenericLocalOrder = !isFood99Order && !isIfoodOrder
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
    !isTerminalFood99Order &&
    (
      isPosOrShopInitialWorkflowState ||
      (isPosOrder && isEditablePosCartOrder)
    )
  const canGenericCancelOrder =
    isGenericLocalOrder &&
    !isTerminalFood99Order &&
    platformCapabilities.canCancel
  const shouldShowKdsCancel =
    isFood99Order || isIfoodOrder
      ? false
      : canGenericCancelOrder
  const canGenericReadyOrder =
    isGenericLocalOrder &&
    platformCapabilities.canReady &&
    !isTerminalFood99Order &&
    (
      isPosOrShopOrder
        ? isPosOrShopPreparingWorkflowState
        : true
    )
  const canGenericDeliveredOrder =
    isGenericLocalOrder &&
    platformCapabilities.canDeliver &&
    !isTerminalFood99Order &&
    (
      isPosOrShopOrder
        ? isPosOrShopDeliveringWorkflowState
        : true
    )

  // Finalizar: aparece quando não há mais ações disponíveis e o pedido ainda não foi encerrado
  const canFinalizeFood99Order = false

  const canFinalizeGenericOrder =
    isGenericLocalOrder &&
    !isTerminalFood99Order &&
    (
      isPosOrShopOrder
        ? isPosOrShopReadyWorkflowState
        : (
            !shouldShowKdsCancel &&
            !canGenericReadyOrder &&
            !canGenericDeliveredOrder
          )
    )

  const closeFood99DeliveryFlow = useCallback(() => {
    if (food99ActionLoading) {
      return
    }

    setDeliveryCodeModalVisible(false)
    setDeliveryFlowStep('locator')
    setDeliveryCustomerCode('')
  }, [food99ActionLoading])

  const closeDetailsModal = useCallback(() => {
    setDetailsModalVisible(false)
  }, [])

  const handleOrderTools = useCallback(async () => {
    setDetailsModalVisible(true)

    if (item?.id && (isFood99Order || isIfoodOrder) && !food99State && !food99StateLoading) {
      await loadFood99OrderState({ silent: true })
    }
  }, [item?.id, isFood99Order, isIfoodOrder, food99State, food99StateLoading, loadFood99OrderState])

  const handleConfirmGenericOrder = useCallback(() => {
    if (!item?.id || isTerminalFood99Order || orderActionLoading === 'confirm') {
      return
    }

    void runOrderAction('confirm')
  }, [
    item?.id,
    isTerminalFood99Order,
    orderActionLoading,
    runOrderAction,
  ])

  const handleMarkOrderAsReady = useCallback(() => {
    if (!item?.id || isTerminalFood99Order || orderActionLoading === 'ready') {
      return
    }

    void runOrderAction('ready')
  }, [
    item?.id,
    isTerminalFood99Order,
    orderActionLoading,
    runOrderAction,
  ])

  const handleDeliverGenericOrder = useCallback(() => {
    if (!item?.id || isTerminalFood99Order || orderActionLoading === 'delivered') {
      return
    }

    void runOrderAction('delivered')
  }, [
    item?.id,
    isTerminalFood99Order,
    orderActionLoading,
    runOrderAction,
  ])

  const handleFinalizeGenericOrder = useCallback(() => {
    if (!item?.id || isTerminalFood99Order || orderActionLoading === 'finalize') {
      return
    }

    void runOrderAction('finalize')
  }, [
    item?.id,
    isTerminalFood99Order,
    orderActionLoading,
    runOrderAction,
  ])

  const openFood99DeliveryFlow = useCallback(() => {
    setDeliveryLocator(normalizeDigits(food99Delivery?.locator, food99LocatorLength))
    setDeliveryCustomerCode('')
    setDeliveryFlowStep('locator')
    setDeliveryCodeModalVisible(true)
  }, [food99Delivery?.locator, food99LocatorLength])

  const closeFood99CancelReasonFlow = useCallback(() => {
    if (food99ActionLoading || food99CancelReasonsLoading) {
      return
    }

    resetFood99CancelReasonFlow()
  }, [food99ActionLoading, food99CancelReasonsLoading, resetFood99CancelReasonFlow])

  const handleFood99CancelPress = useCallback(async () => {
    if (!item?.id || isTerminalFood99Order || food99ActionLoading || food99CancelReasonsLoading) {
      return
    }

    if (!marketplaceCapabilities.canCancel) {
      return
    }

    const cancelReasonsPath = isFood99Order
      ? `/marketplace/integrations/99food/orders/${item.id}/cancel-reasons`
      : `/marketplace/integrations/ifood/orders/${item.id}/cancel-reasons`

    try {
      setFood99CancelReasonsLoading(true)
      const response = await api.fetch(cancelReasonsPath)
      const result = response?.result || response

      if (normalizeErrno(result?.errno) !== '0') {
        throw result || response
      }

      const reasons = Array.isArray(result?.data?.reasons)
        ? result.data.reasons
        : Array.isArray(result?.reasons)
          ? result.reasons
          : []

      if (!reasons.length) {
        showError(
          global.t?.t('orders', 'message', 'noOfficialCancelReasonAvailable') ||
            `A plataforma ${cancelReasonChannelLabel} nao retornou motivos oficiais de cancelamento para este pedido.`,
        )
        return
      }

      setFood99CancelReasons(reasons)
      setCancelReasonModalVisible(true)
      setSelectedFood99CancelReasonId(null)
      setFood99CancelReasonText('')
    } catch (cancelReasonError) {
      showError(formatApiError(cancelReasonError))
    } finally {
      setFood99CancelReasonsLoading(false)
    }
  }, [
    item?.id,
    isTerminalFood99Order,
    food99ActionLoading,
    food99CancelReasonsLoading,
    isFood99Order,
    marketplaceCapabilities.canCancel,
    cancelReasonChannelLabel,
    showError,
  ])

  const handleFood99CopyLocator = useCallback(async () => {
    if (!activeFood99Locator) {
      showError(global.t?.t('orders', 'message', 'noLocatorAvailable'))
      return
    }

    try {
      const copied = await copyTextToClipboard(activeFood99Locator)

      if (!copied) {
        showError(global.t?.t('orders', 'message', 'copyNotSupportedUseCode'))
        return
      }

      showSuccess(global.t?.t('orders', 'message', 'locatorCopied'))
    } catch (copyError) {
      showError(formatApiError(copyError))
    }
  }, [activeFood99Locator, showError, showSuccess])

  const handleFood99OpenHandoverLink = useCallback(async () => {
    if (!food99HandoverLink) {
      showError(isIfoodOrder
        ? global.t?.t('orders', 'message', 'ifoodDidNotSendConfirmationLink')
        : global.t?.t('orders', 'message', 'food99DidNotSendConfirmationLink'))
      return
    }

    try {
      const supported = await Linking.canOpenURL(food99HandoverLink)
      if (!supported) {
        throw new Error(global.t?.t('orders', 'message', 'unableOpenConfirmationLink'))
      }

      await Linking.openURL(food99HandoverLink)
    } catch (linkError) {
      showError(formatApiError(linkError))
    }
  }, [food99HandoverLink, isIfoodOrder, showError])

  const handleFood99CopyHandoverLink = useCallback(async () => {
    if (!food99HandoverLink) {
      showError(isIfoodOrder
        ? global.t?.t('orders', 'message', 'ifoodDidNotSendConfirmationLink')
        : global.t?.t('orders', 'message', 'food99DidNotSendConfirmationLink'))
      return
    }

    try {
      const copied = await copyTextToClipboard(food99HandoverLink)

      if (!copied) {
        showError(global.t?.t('orders', 'message', 'copyNotSupportedOpenInBrowser'))
        return
      }

      showSuccess(global.t?.t('orders', 'message', 'confirmationLinkCopied'))
    } catch (copyError) {
      showError(formatApiError(copyError))
    }
  }, [food99HandoverLink, isIfoodOrder, showError, showSuccess])

  const handleFood99ShareHandoverWhatsapp = useCallback(async () => {
    if (!food99HandoverLink) {
      showError(isIfoodOrder
        ? global.t?.t('orders', 'message', 'ifoodDidNotSendConfirmationLink')
        : global.t?.t('orders', 'message', 'food99DidNotSendConfirmationLink'))
      return
    }

    const message = buildFood99LocatorShareMessage({
      locator: activeFood99Locator,
      url: food99HandoverLink,
      platformLabel: isIfoodOrder ? 'iFood' : '99Food',
    })
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`

    try {
      const supported = await Linking.canOpenURL(whatsappUrl)
      if (!supported) {
        throw new Error(global.t?.t('orders', 'message', 'whatsAppUnavailable'))
      }

      await Linking.openURL(whatsappUrl)
    } catch (shareError) {
      showError(formatApiError(shareError))
    }
  }, [food99HandoverLink, activeFood99Locator, isIfoodOrder, showError])

  const handleFood99LocatorVerify = useCallback(async () => {
    if (!item?.id || !isFood99Order || food99ActionLoading) {
      return
    }

    const normalizedLocator = normalizeDigits(deliveryLocator, food99LocatorLength)
    if (normalizedLocator.length !== food99LocatorLength) {
      showError(`${global.t?.t('orders', 'message', 'enterLocatorWith')} ${food99LocatorLength} ${global.t?.t('orders', 'label', 'digits')}.`)
      return
    }

    try {
      setFood99ActionLoading('locator_verify')

      const response = await api.fetch(
        `/marketplace/integrations/99food/orders/${item.id}/delivery-locator/verify`,
        {
          method: 'POST',
          body: {
            locator: normalizedLocator,
          },
        },
      )

      if (normalizeErrno(response?.result?.errno) !== '0') {
        throw response?.result || response
      }

      if (response?.state) {
        setFood99State(response.state)
      }

      const flow = response?.flow || {}
      const nextStep = String(flow?.step || '').toLowerCase()
      setDeliveryLocator(flow?.locator || normalizedLocator)

      await refreshCurrentOrder()
      await loadFood99OrderState({ silent: true })

      if (nextStep === 'completed') {
        setDeliveryCodeModalVisible(false)
        setDeliveryFlowStep('locator')
        showSuccess(global.t?.t('orders', 'message', 'deliveryConfirmed99Food'))

        if (isKds) {
          navigation.goBack()
        }
        return
      }

      if (nextStep === 'delivery_code') {
        setDeliveryFlowStep('delivery_code')
        showSuccess(global.t?.t('orders', 'message', 'locatorValidatedNowConfirmCustomerCode'))
        return
      }

      throw response?.result || { message: global.t?.t('orders', 'message', 'unexpectedLocatorFlow99Food') }
    } catch (actionError) {
      showError(formatApiError(actionError))
    } finally {
      setFood99ActionLoading('')
    }
  }, [
    item?.id,
    isFood99Order,
    food99ActionLoading,
    deliveryLocator,
    food99LocatorLength,
    showError,
    refreshCurrentOrder,
    loadFood99OrderState,
    showSuccess,
    isKds,
    navigation,
  ])

  const handleFood99DeliveryCodeConfirm = useCallback(async () => {
    const normalizedLocator = normalizeDigits(deliveryLocator, food99LocatorLength)

    if (normalizedLocator.length !== food99LocatorLength) {
      showError(`${global.t?.t('orders', 'message', 'enterLocatorWith')} ${food99LocatorLength} ${global.t?.t('orders', 'label', 'digits')}.`)
      setDeliveryFlowStep('locator')
      return
    }

    if (isIfoodOrder) {
      await runFood99OrderAction('delivered', {
        locator: normalizedLocator,
      })
      return
    }

    const normalizedDeliveryCode = normalizeDigits(
      deliveryCustomerCode,
      food99DeliveryCodeLength,
    )

    if (normalizedDeliveryCode.length !== food99DeliveryCodeLength) {
      showError(`${global.t?.t('orders', 'message', 'enterCustomerCodeWith')} ${food99DeliveryCodeLength} ${global.t?.t('orders', 'label', 'digits')}.`)
      return
    }

    await runFood99OrderAction('delivered', {
      locator: normalizedLocator,
      deliveryCode: normalizedDeliveryCode,
    })
  }, [
    deliveryLocator,
    food99LocatorLength,
    deliveryCustomerCode,
    food99DeliveryCodeLength,
    isIfoodOrder,
    showError,
    runFood99OrderAction,
  ])

  const handleFood99DeliveredPress = useCallback(() => {
    if (requiresFood99DeliveryLocator || isIfoodHandoverFlow) {
      openFood99DeliveryFlow()
      return
    }

    runFood99OrderAction('delivered')
  }, [
    requiresFood99DeliveryLocator,
    isIfoodHandoverFlow,
    openFood99DeliveryFlow,
    runFood99OrderAction,
  ])

  const handleFood99CancelConfirm = useCallback(async () => {
    const reasonId = normalizeFood99CancelReasonId(selectedFood99CancelReasonId)
    if (!reasonId) {
      showError(global.t?.t('orders', 'message', 'selectCancelReasonToContinue'))
      return
    }

    const reasonText = String(food99CancelReasonText || '').trim()
    if (requiresFood99CancelReasonText && !reasonText) {
      showError(global.t?.t('orders', 'message', 'describeCancelReasonToContinue'))
      return
    }

    await runFood99OrderAction('cancel', {
      body: {
        reason_id: reasonId,
        ...(reasonText ? { reason: reasonText } : {}),
      },
    })
  }, [
    selectedFood99CancelReasonId,
    food99CancelReasonText,
    requiresFood99CancelReasonText,
    showError,
    runFood99OrderAction,
  ])

  const confirmCancelOrder = useCallback((callback) => {
    if (
      typeof callback !== 'function' ||
      isTerminalFood99Order ||
      orderActionLoading ||
      food99ActionLoading ||
      food99CancelReasonsLoading
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
    isTerminalFood99Order,
    orderActionLoading,
    food99ActionLoading,
    food99CancelReasonsLoading,
  ])

  const handleCancelOrderPress = useCallback(() => {
    if (isFood99Order || isIfoodOrder) {
      void handleFood99CancelPress()
      return
    }

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
    isFood99Order,
    isIfoodOrder,
    confirmCancelOrder,
    canGenericCancelOrder,
    handleFood99CancelPress,
    runOrderAction,
    showError,
  ])

  const primaryKdsAction = useMemo(() => {
    const hasActions = isFood99Order || isIfoodOrder || platformCapabilities.canReady || platformCapabilities.canDeliver
    if (!hasActions) return null

    if (canConfirmIfoodOrder) {
      return {
        label: global.t?.t('orders', 'button', 'confirm'),
        icon: 'done-all',
        loadingKey: 'confirm',
        disabled: !!(food99ActionLoading || orderActionLoading),
        onPress: () => runOrderAction('confirm'),
      }
    }

    if (canReadyFood99Order) {
      return {
        label: marketplaceReadyActionLabel,
        icon: 'check-circle',
        loadingKey: 'ready',
        disabled: !!(food99ActionLoading || orderActionLoading),
        onPress: () => runOrderAction('ready'),
      }
    }

    if (shouldShowFood99DeliveryAction) {
      return {
        label: global.t?.t('orders', 'button', 'deliverOrder'),
        icon: 'local-shipping',
        loadingKey: 'delivered',
        disabled: !!(food99ActionLoading || orderActionLoading),
        onPress: handleFood99DeliveredPress,
      }
    }

    return null
  }, [
    canConfirmIfoodOrder,
    canReadyFood99Order,
    food99ActionLoading,
    marketplaceReadyActionLabel,
    orderActionLoading,
    handleFood99DeliveredPress,
    isFood99Order,
    platformCapabilities,
    runOrderAction,
    shouldShowFood99DeliveryAction,
  ])

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

  const resolvedPrimaryKdsAction = !isTerminalFood99Order && (
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
  const shouldShowMarketplaceKdsActionRow =
    canConfirmIfoodOrder ||
    canCancelFood99Order ||
    canReadyFood99Order ||
    shouldShowFood99DeliveryAction ||
    canFinalizeFood99Order
  const shouldShowGenericKdsActionRow =
    canGenericConfirmOrder ||
    shouldShowKdsCancel ||
    canGenericReadyOrder ||
    canGenericDeliveredOrder ||
    canFinalizeGenericOrder
  const shouldShowMobileCancelAction =
    isFood99Order || isIfoodOrder
      ? canCancelFood99Order
      : canGenericCancelOrder
  const shouldShowMobileBottomActions =
    shouldShowMobileCancelAction ||
    !!resolvedPrimaryKdsAction
  const shouldShowMobilePaymentBar =
    useUnifiedKdsLayout &&
    !hasTerminalOrderState
  const mobileBottomCartOffset = shouldShowMobileBottomActions ? 74 : 0
  const mobileOrderBottomSpacing = shouldShowMobilePaymentBar
    ? (shouldShowMobileBottomActions ? 226 : 156)
    : 126

  const isResolvedPrimaryKdsActionLoading = !!resolvedPrimaryKdsAction &&
    (
      isFood99Order || isIfoodOrder
        ? food99ActionLoading === resolvedPrimaryKdsAction.loadingKey
        : orderActionLoading === resolvedPrimaryKdsAction.loadingKey
    )

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
        </View>
      ),
    })
  }, [
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
    const operationLines = []
    const courierLines = []
    const financialLines = []
    const paymentCards = []
    const deliveryPaymentLines = []
    const schedulingLines = []
    const taxDocumentLines = []
    const customerLines = []
    const addressLines = []
    const codesLines = []
    const observationLines = []

    if (!!food99Identifiers?.order_index) {
      operationLines.push({
        key: 'order-index',
        label: isIfoodOrder
          ? global.t?.t('orders', 'label', 'ifoodNumber')
          : global.t?.t('orders', 'label', 'food99Number'),
        value: `#${food99Identifiers.order_index}`,
      })
    }

    operationLines.push({
      key: 'fulfillment',
      label: marketplaceContextLabel,
      value: marketplaceFulfillmentLabel || '-',
    })

    if (!isIfoodPickupLikeOrder && !!formattedFood99Eta) {
      operationLines.push({
        key: 'eta',
        label: global.t?.t('orders', 'label', 'estimatedEta'),
        value: formattedFood99Eta,
      })
    }

    if (isIfoodTakeoutOrder && !!takeoutModeLabel) {
      operationLines.push({
        key: 'takeout-mode',
        label: global.t?.t('orders', 'label', 'mode') || 'Modo',
        value: takeoutModeLabel,
      })
    }

    if (isIfoodTakeoutOrder && !!formattedTakeoutDateTime) {
      operationLines.push({
        key: 'takeout-time',
        label: global.t?.t('orders', 'label', 'takeoutTime') || 'Horario da retirada',
        value: formattedTakeoutDateTime,
      })
    }

    if (isIfoodDineInOrder && !!formattedDineInDateTime) {
      operationLines.push({
        key: 'service-time',
        label: global.t?.t('orders', 'label', 'serviceTime') || 'Horario previsto',
        value: formattedDineInDateTime,
      })
    }

    if (!!marketplacePickupCode) {
      operationLines.push({
        key: 'pickup-code',
        label: global.t?.t('orders', 'label', 'pickupCode') || 'Codigo de retirada',
        value: marketplacePickupCode,
      })
    }

    if (!!marketplacePickupAreaCode) {
      operationLines.push({
        key: 'pickup-area',
        label: marketplacePickupAreaTypeLabel || (global.t?.t('orders', 'label', 'pickupArea') || 'Area de retirada'),
        value: marketplacePickupAreaCode,
      })
    }

    if (!!food99SelectedPaymentLabel) {
      operationLines.push({
        key: 'selected-payment',
        label: global.t?.t('orders', 'label', 'selectedPaymentMethod'),
        value: food99SelectedPaymentLabel,
        strong: true,
      })
    }

    if (!!food99PaymentMethodValue) {
      operationLines.push({
        key: 'payment-method',
        label: global.t?.t('orders', 'label', 'paymentMethod'),
        value: food99PaymentMethodValue,
      })
    }

    if (!!food99PaymentChannelValue) {
      operationLines.push({
        key: 'payment-channel',
        label: global.t?.t('orders', 'label', 'paymentChannel'),
        value: food99PaymentChannelValue,
      })
    }

    if (!!food99CancellationSourceLabel) {
      operationLines.push({
        key: 'cancellation-origin',
        label: global.t?.t('orders', 'label', 'cancellationOrigin'),
        value: food99CancellationSourceLabel,
      })
    }

    if (!!food99Integration?.cancel_code) {
      operationLines.push({
        key: 'cancellation-code',
        label: global.t?.t('orders', 'label', 'cancellationCode'),
        value: food99Integration.cancel_code,
      })
    }

    if (!!food99Integration?.cancel_reason) {
      operationLines.push({
        key: 'cancellation-reason',
        label: global.t?.t('orders', 'label', 'cancellationReason'),
        value: food99Integration.cancel_reason,
      })
    }

    if (!!remoteStateAgeLabel) {
      operationLines.push({
        key: 'remote-update',
        label: global.t?.t('orders', 'label', 'remoteUpdate'),
        value: remoteStateAgeLabel,
      })
    }

    if (!!lastActionAgeLabel) {
      operationLines.push({
        key: 'last-action',
        label: global.t?.t('orders', 'label', 'lastAction'),
        value: lastActionAgeLabel,
      })
    }

    if (!!lastReconcileAgeLabel) {
      operationLines.push({
        key: 'last-reconciliation',
        label: global.t?.t('orders', 'label', 'lastReconciliation'),
        value: lastReconcileAgeLabel,
      })
    }

    if (food99Delivery?.is_platform_delivery) {
      operationLines.push({
        key: 'platform-delivery',
        label: '',
        value: global.t?.t('orders', 'message', 'platformHandlesDeliveryAfterReady'),
      })
    }

    if (shouldHideReadyFood99Action) {
      operationLines.push({
        key: 'ready-waiting-platform',
        label: '',
        value: `${global.t?.t('orders', 'message', 'orderReadyWaitingPlatform')} ${isIfoodOrder ? 'iFood' : '99Food'}.`,
      })
    }

    if (hasFood99SyncIssue) {
      operationLines.push({
        key: 'integration-divergence',
        label: '',
        value: global.t?.t('orders', 'message', 'integrationDivergenceTapRefresh'),
      })
    }

    if (!!food99RiderName) {
      courierLines.push({
        key: 'courier-name',
        label: global.t?.t('orders', 'label', 'name'),
        value: food99RiderName,
      })
    }

    if (!!food99RiderPhone) {
      courierLines.push({
        key: 'courier-phone',
        label: global.t?.t('orders', 'label', 'phone'),
        value: food99RiderPhone,
      })
    }

    if (!!food99RiderToStoreEta) {
      courierLines.push({
        key: 'courier-eta-store',
        label: global.t?.t('orders', 'label', 'etaToStore'),
        value: food99RiderToStoreEta,
      })
    }

    if (food99Financial) {
      financialLines.push(
        {
          key: 'items-total',
          label: global.t?.t('orders', 'label', 'items'),
          value: food99Financial.items_total || 0,
          money: true,
        },
        {
          key: 'delivery-fee',
          label: global.t?.t('orders', 'label', 'delivery'),
          value: food99Financial.delivery_fee || 0,
          money: true,
        },
      )

      if (Number(food99Financial.service_fee || 0)) {
        financialLines.push({
          key: 'service-fee',
          label: global.t?.t('orders', 'label', 'serviceFee'),
          value: food99Financial.service_fee || 0,
          money: true,
        })
      }

      if (Number(food99Financial.small_order_fee || 0)) {
        financialLines.push({
          key: 'small-order-fee',
          label: global.t?.t('orders', 'label', 'minimumOrderFee'),
          value: food99Financial.small_order_fee || 0,
          money: true,
        })
      }

      if (Number(food99Financial.meal_top_up_fee || 0)) {
        financialLines.push({
          key: 'meal-top-up-fee',
          label: global.t?.t('orders', 'label', 'topUpFee'),
          value: food99Financial.meal_top_up_fee || 0,
          money: true,
        })
      }

      if (Number(food99Financial.discount_total || 0)) {
        financialLines.push(
          {
            key: 'discount-total',
            label: global.t?.t('orders', 'label', 'totalDiscounts'),
            value: food99Financial.discount_total || 0,
            money: true,
          },
          {
            key: 'items-discount-total',
            label: global.t?.t('orders', 'label', 'itemDiscount'),
            value: food99Financial.items_discount_total || 0,
            money: true,
          },
          {
            key: 'delivery-discount-total',
            label: global.t?.t('orders', 'label', 'deliveryDiscount'),
            value: food99Financial.delivery_discount_total || 0,
            money: true,
          },
          {
            key: 'coupon-discount-total',
            label: global.t?.t('orders', 'label', 'couponDiscount'),
            value: food99Financial.coupon_discount_total || 0,
            money: true,
          },
        )
      }

      if (Number(food99Financial.store_discount_total || 0)) {
        financialLines.push({
          key: 'store-discount-total',
          label: global.t?.t('orders', 'label', isIfoodOrder ? 'storeSubsidy' : 'storeSubsidizedDiscount'),
          value: isIfoodOrder
            ? food99Financial.merchant_subsidy || food99Financial.store_discount_total || 0
            : food99Financial.store_discount_total || 0,
          money: true,
        })
      }

      if (Number(food99Financial.platform_discount_total || 0)) {
        financialLines.push({
          key: 'platform-discount-total',
          label: global.t?.t('orders', 'label', isIfoodOrder ? 'ifoodSubsidy' : 'platformSubsidizedDiscount'),
          value: isIfoodOrder
            ? food99Financial.ifood_subsidy || food99Financial.platform_discount_total || 0
            : food99Financial.platform_discount_total || 0,
          money: true,
        })
      }

      if (isIfoodOrder && !!food99Financial.payment_brand) {
        financialLines.push({
          key: 'payment-brand',
          label: global.t?.t('orders', 'label', 'brand'),
          value: food99Financial.payment_brand,
        })
      }

      if (isIfoodOrder && Number(food99Financial.change_for || 0) > 0) {
        financialLines.push({
          key: 'ifood-change-for',
          label: global.t?.t('orders', 'label', 'changeFor'),
          value: food99Financial.change_for || 0,
          money: true,
        })
      }

      if (Number(food99Financial.store_charged_delivery_price || 0)) {
        financialLines.push({
          key: 'original-delivery-fee',
          label: global.t?.t('orders', 'label', 'originalDeliveryFee'),
          value: food99Financial.store_charged_delivery_price || 0,
          money: true,
        })
      }

      financialLines.push({
        key: 'customer-total',
        label: global.t?.t('orders', 'label', 'customerTotal'),
        value: food99Financial.customer_total || 0,
        money: true,
        strong: true,
      })

      if (shouldShowCollectOnDelivery) {
        financialLines.push({
          key: 'collect-from-customer',
          label: global.t?.t('orders', 'label', 'collectFromCustomer'),
          value: food99CashCollectionAmount || 0,
          money: true,
          strong: true,
        })
      }
    }

    if (food99Payment) {
      paymentCards.push(
        {
          key: 'amount-paid',
          label: global.t?.t('orders', 'label', 'paid'),
          value: food99Payment.amount_paid || 0,
        },
        {
          key: 'amount-pending',
          label: global.t?.t('orders', 'label', 'pending'),
          value: food99Payment.amount_pending || 0,
        },
      )

      if (shouldShowCollectOnDelivery) {
        paymentCards.push({
          key: 'collect-customer',
          label: global.t?.t('orders', 'label', 'collectCustomer'),
          value: food99CashCollectionAmount || 0,
        })
      }
    }

    if (food99Payment && shouldShowDeliveryPaymentSection) {
      if (shouldShowCollectOnDelivery) {
        deliveryPaymentLines.push({
          key: 'delivery-collect',
          label: collectOnDeliveryLabel,
          value: food99CashCollectionAmount || 0,
          strong: true,
        })
      }

      if (food99ChangeFor > 0) {
        deliveryPaymentLines.push({
          key: 'delivery-change-for',
          label: global.t?.t('orders', 'label', 'changeFor'),
          value: food99ChangeFor,
        })
      }

      if (food99NeedsChange) {
        deliveryPaymentLines.push({
          key: 'delivery-change-amount',
          label: global.t?.t('orders', 'label', 'changeToReturn'),
          value: food99ChangeAmount,
        })
      }

      if (food99ShopPaidMoney > 0) {
        deliveryPaymentLines.push({
          key: 'delivery-shop-paid',
          label: global.t?.t('orders', 'label', 'courierTransferToMerchant'),
          value: food99ShopPaidMoney,
        })
      }
    }

    if (isScheduledOrder) {
      if (!!scheduledWindowLabel) {
        schedulingLines.push({
          key: 'schedule-window',
          label: global.t?.t('orders', 'label', 'window'),
          value: scheduledWindowLabel,
        })
      }

      if (!!scheduledDeliveryDateTimeRaw) {
        schedulingLines.push({
          key: 'schedule-delivery',
          label: global.t?.t('orders', 'label', 'delivery'),
          value: formatScheduledDate(scheduledDeliveryDateTimeRaw),
        })
      }

      if (!!scheduledPreparationStartRaw) {
        schedulingLines.push({
          key: 'schedule-preparation',
          label: global.t?.t('orders', 'label', 'startPreparation'),
          value: formatScheduledDate(scheduledPreparationStartRaw),
        })
      }
    }

    if (ifoodTaxDocumentRequested) {
      taxDocumentLines.push({
        key: 'tax-document-requested',
        label: '',
        value: global.t?.t('orders', 'message', 'customerRequestedTaxDocument') || 'Cliente solicitou documento fiscal neste pedido.',
      })

      if (!!orderCustomerDocument) {
        taxDocumentLines.push({
          key: 'tax-document-value',
          label: orderCustomerDocumentLabel,
          value: orderCustomerDocument,
        })
      }
    }

    if (!!orderCustomerName) {
      customerLines.push({ key: 'customer-name', label: '', value: orderCustomerName })
    }

    if (!!orderCustomerPhone) {
      customerLines.push({
        key: 'customer-phone',
        label: global.t?.t('orders', 'label', 'phone'),
        value: orderCustomerPhone,
      })
    }

    if (!!orderCustomerDocument) {
      customerLines.push({
        key: 'customer-document',
        label: orderCustomerDocumentLabel,
        value: orderCustomerDocument,
      })
    }

    if (shouldShowOrderAddress && !!localOrderAddressParts.primary) {
      addressLines.push({ key: 'address-primary', label: '', value: localOrderAddressParts.primary })
    }

    if (shouldShowOrderAddress && !!localOrderAddressParts.streetLine) {
      addressLines.push({
        key: 'address-street-line',
        label: global.t?.t('orders', 'label', 'streetNumber'),
        value: localOrderAddressParts.streetLine,
      })
    }

    if (shouldShowOrderAddress && !!localOrderAddressParts.district) {
      addressLines.push({
        key: 'address-district',
        label: global.t?.t('orders', 'label', 'district'),
        value: localOrderAddressParts.district,
      })
    }

    if (shouldShowOrderAddress && !!localOrderAddressParts.cityStateLine) {
      addressLines.push({
        key: 'address-city-state',
        label: global.t?.t('orders', 'label', 'cityState'),
        value: localOrderAddressParts.cityStateLine,
      })
    }

    if (shouldShowOrderAddress && !!localOrderAddressParts.postalCode) {
      addressLines.push({
        key: 'address-postal-code',
        label: global.t?.t('orders', 'label', 'zipCode'),
        value: localOrderAddressParts.postalCode,
      })
    }

    if (shouldShowOrderAddress && !!localOrderAddressParts.nickname) {
      addressLines.push({
        key: 'address-reference',
        label: global.t?.t('orders', 'label', 'reference'),
        value: localOrderAddressParts.nickname,
      })
    }

    if (shouldShowOrderAddress && !!localOrderAddressParts.complement) {
      addressLines.push({
        key: 'address-complement',
        label: global.t?.t('orders', 'label', 'complement'),
        value: localOrderAddressParts.complement,
      })
    }

    if (!!food99PickupCode) {
      codesLines.push({
        key: 'code-pickup',
        label: global.t?.t('orders', 'label', 'pickupCode'),
        value: food99PickupCode,
      })
    }

    if (!!food99HandoverCode) {
      codesLines.push({
        key: 'code-handover',
        label: global.t?.t('orders', 'label', 'handoverCode'),
        value: food99HandoverCode,
      })
    }

    if (!!food99Delivery?.locator) {
      codesLines.push({
        key: 'code-locator',
        label: global.t?.t('orders', 'label', 'locator'),
        value: food99Delivery.locator,
      })
    }

    if (!!food99Delivery?.virtual_phone_number) {
      codesLines.push({
        key: 'code-virtual-phone',
        label: global.t?.t('orders', 'label', 'virtualPhone'),
        value: food99Delivery.virtual_phone_number,
      })
    }

    if (showOrderObservationCard) {
      observationLines.push({
        key: 'observation-main',
        label: '',
        value: orderObservationText,
      })

      if (shouldShowFood99ItemRemarks) {
        observationLines.push({
          key: 'observation-items',
          label: global.t?.t('orders', 'label', 'itemsObservation') || 'Observações dos itens',
          value: food99ItemRemarksText,
        })
      }

      if (food99Notes?.need_cutlery !== null && food99Notes?.need_cutlery !== undefined) {
        observationLines.push({
          key: 'observation-cutlery',
          label: global.t?.t('orders', 'label', 'needCutlery'),
          value: food99Notes.need_cutlery
            ? global.t?.t('orders', 'label', 'yes')
            : global.t?.t('orders', 'label', 'no'),
        })
      }
    }

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
        ],
        invoicesTitle: localInvoicesSectionTitle,
        invoiceCardsNode: renderLocalInvoiceCards('details'),
      },
      primaryAction:
        !isFood99Order && !isIfoodOrder && resolvedPrimaryKdsAction
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
      marketplace: {
        enabled: isFood99Order || isIfoodOrder,
        isFood99: isFood99Order,
        isIfood: isIfoodOrder,
        platformLabel: isIfoodOrder ? 'iFood' : '99Food',
        isLoading: food99StateLoading,
        hasVisualData: hasFood99VisualData,
        usingFallback: isUsingFallbackMarketplaceSummary,
        operationTitle: isIfoodOrder
          ? global.t?.t('orders', 'title', 'ifoodOperation')
          : global.t?.t('orders', 'title', 'food99Operation'),
        courierTitle: isIfoodOrder
          ? global.t?.t('orders', 'title', 'ifoodCourier')
          : global.t?.t('orders', 'title', 'food99Courier'),
        financeTitle: isIfoodOrder
          ? global.t?.t('orders', 'title', 'ifoodFinance')
          : global.t?.t('orders', 'title', 'food99Finance'),
        taxDocumentTitle: ifoodTaxDocumentTitle,
        operationLines,
        courierLines,
        financial: financialLines,
        paymentCards,
        deliveryPaymentLines,
        schedulingLines,
        taxDocumentLines,
        customerLines,
        addressLines,
        codesLines,
        observationLines,
      },
    }
  }, [
    effectiveLocalRealStatusKey,
    effectiveLocalStatusNameKey,
    food99ActionLoading,
    food99CancellationSourceLabel,
    food99ChangeAmount,
    food99ChangeFor,
    food99Customer,
    food99Delivery,
    food99Financial,
    food99HandoverCode,
    food99Identifiers,
    food99Integration,
    food99ItemRemarksText,
    food99NeedsChange,
    food99Notes,
    food99Payment,
    food99PaymentChannelValue,
    food99PaymentMethodValue,
    food99PickupCode,
    food99RiderName,
    food99RiderPhone,
    food99RiderToStoreEta,
    food99SelectedPaymentLabel,
    food99ShopPaidMoney,
    food99StateLoading,
    formatOrderDateTime,
    formattedDineInDateTime,
    formattedFood99Eta,
    formattedTakeoutDateTime,
    hasFood99SyncIssue,
    hasFood99VisualData,
    ifoodTaxDocumentRequested,
    ifoodTaxDocumentTitle,
    isFood99Order,
    isIfoodDineInOrder,
    isIfoodOrder,
    isIfoodPickupLikeOrder,
    isIfoodTakeoutOrder,
    isScheduledOrder,
    isUsingFallbackMarketplaceSummary,
    item?.alterDate,
    item?.app,
    item?.id,
    item?.status?.realStatus,
    item?.status?.status,
    lastActionAgeLabel,
    lastReconcileAgeLabel,
    localInvoiceCards.length,
    localInvoicesSectionTitle,
    localOrderAddressParts,
    localOrderTotal,
    marketplaceContextLabel,
    marketplaceFulfillmentLabel,
    marketplacePickupAreaCode,
    marketplacePickupAreaTypeLabel,
    marketplacePickupCode,
    orderCustomerDocument,
    orderCustomerDocumentLabel,
    orderCustomerName,
    orderCustomerPhone,
    orderObservationText,
    orderParam?.id,
    orderActionLoading,
    remoteStateAgeLabel,
    renderLocalInvoiceCards,
    resolvedOrderDateValue,
    resolvedPrimaryKdsAction,
    scheduledDeliveryDateTimeRaw,
    scheduledPreparationStartRaw,
    scheduledWindowLabel,
    shouldHideReadyFood99Action,
    shouldShowCollectOnDelivery,
    shouldShowDeliveryPaymentSection,
    shouldShowFood99ItemRemarks,
    shouldShowOrderAddress,
    showOrderObservationCard,
    takeoutModeLabel,
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Text style={[localStyles.mobileProductsTitle, { flex: 1 }]}>{global.t?.t('orders', 'title', 'orderItems')}</Text>
          {canAddProductsToOrder && (
            <TouchableOpacity
              onPress={handleAddProduct}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8,
                backgroundColor: ppcColors.primary,
              }}
            >
              <Icon name="add-circle" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
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
                        <View style={{ flex: 1 }}>
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
                    )
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

      <Modal
        transparent
        animationType="fade"
        visible={cancelReasonModalVisible}
        onRequestClose={() => {
          if (!food99ActionLoading && !food99CancelReasonsLoading) {
            closeFood99CancelReasonFlow()
          }
        }}
      >
        <View style={localStyles.modalSheetRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={localStyles.modalSheetBackdrop}
            onPress={() => {
              if (!food99ActionLoading && !food99CancelReasonsLoading) {
                closeFood99CancelReasonFlow()
              }
            }}
          />
          <View style={localStyles.modalSheetWrap}>
            <View style={localStyles.cancelReasonModal}>
            <Text style={localStyles.cancelReasonBadge}>{global.t?.t('orders', 'title', 'cancellation')} {cancelReasonChannelLabel}</Text>
            <Text style={localStyles.cancelReasonTitle}>{global.t?.t('orders', 'title', 'chooseOfficialReason')}</Text>
            <Text style={localStyles.cancelReasonDescription}>
              {global.t?.t('orders', 'message', 'selectOfficialReasonFor')} {cancelReasonChannelLabel}.
            </Text>

            {food99CancelReasonsLoading ? (
              <View style={localStyles.cancelReasonLoadingState}>
                <ActivityIndicator size="small" color="#38BDF8" />
                <Text style={localStyles.cancelReasonLoadingText}>
                  {global.t?.t('orders', 'message', 'loadingOfficialReasons')}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={localStyles.cancelReasonList}
                contentContainerStyle={localStyles.cancelReasonListContent}
                showsVerticalScrollIndicator={false}
              >
                {applicableFood99CancelReasons.map(reason => {
                  const reasonId = normalizeFood99CancelReasonId(reason?.reason_id)
                  const isSelected =
                    reasonId !== null &&
                    reasonId === normalizeFood99CancelReasonId(selectedFood99CancelReasonId)

                  return (
                    <TouchableOpacity
                      key={`food99-cancel-reason-${reasonId || 'unknown'}`}
                      onPress={() => setSelectedFood99CancelReasonId(reasonId)}
                      style={[
                        localStyles.cancelReasonOption,
                        isSelected && localStyles.cancelReasonOptionSelected,
                      ]}
                    >
                      <View style={localStyles.cancelReasonOptionHeader}>
                        <Text style={localStyles.cancelReasonOptionCode}>
                          #{reason?.reason_id || '--'}
                        </Text>
                        {reason?.requires_description ? (
                          <Text style={localStyles.cancelReasonOptionBadge}>
                            {global.t?.t('orders', 'label', 'requiresDescription')}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={localStyles.cancelReasonOptionText}>
                        {reason?.description || global.t?.t('orders', 'message', 'reasonWithoutDescription')}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            )}

            {requiresFood99CancelReasonText && (
              <View style={localStyles.cancelReasonInputBlock}>
                <Text style={localStyles.cancelReasonInputLabel}>{global.t?.t('orders', 'label', 'reasonDescription')}</Text>
                <TextInput
                  value={food99CancelReasonText}
                  onChangeText={setFood99CancelReasonText}
                  editable={!food99ActionLoading}
                  multiline
                  numberOfLines={3}
                  placeholder={global.t?.t('orders', 'placeholder', 'explainCancellationReason')}
                  placeholderTextColor={ppcColors.textSecondary}
                  style={localStyles.cancelReasonInput}
                />
              </View>
            )}

            <View style={localStyles.deliveryCodeActions}>
              <TouchableOpacity
                onPress={closeFood99CancelReasonFlow}
                disabled={!!food99ActionLoading || !!food99CancelReasonsLoading}
                style={[
                  localStyles.deliveryCodeButton,
                  localStyles.deliveryCodeButtonSecondary,
                ]}
              >
                <Text style={localStyles.deliveryCodeButtonSecondaryText}>{global.t?.t('orders', 'button', 'close')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleFood99CancelConfirm}
                disabled={
                  !!food99ActionLoading ||
                  !!food99CancelReasonsLoading ||
                  !selectedFood99CancelReasonId
                }
                style={[
                  localStyles.deliveryCodeButton,
                  localStyles.cancelReasonButtonDanger,
                  (!!food99ActionLoading ||
                    !!food99CancelReasonsLoading ||
                    !selectedFood99CancelReasonId) &&
                    localStyles.kdsActionButtonDisabled,
                ]}
              >
                {food99ActionLoading === 'cancel' ? (
                  <ActivityIndicator size="small" color="#F8FAFC" />
                ) : (
                  <Text style={localStyles.deliveryCodeButtonPrimaryText}>
                    {global.t?.t('orders', 'button', 'cancelOrder')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="slide"
        visible={deliveryCodeModalVisible}
        onRequestClose={() => {
          if (!food99ActionLoading) {
            closeFood99DeliveryFlow()
          }
        }}
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
        <View style={localStyles.modalSheetRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={localStyles.modalSheetBackdrop}
            onPress={() => {
              if (!food99ActionLoading) {
                closeFood99DeliveryFlow()
              }
            }}
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
                  {isIfoodHandoverFlow
                    ? global.t?.t('orders', 'title', 'ifoodFlow')
                    : (deliveryFlowStep === 'locator'
                      ? global.t?.t('orders', 'title', 'stepOneOfTwo')
                      : global.t?.t('orders', 'title', 'stepTwoOfTwo'))}
                </Text>
                <TouchableOpacity
                  onPress={closeFood99DeliveryFlow}
                  disabled={!!food99ActionLoading}
                  style={localStyles.deliveryCodeCloseButton}
                >
                  <Icon name="close" size={22} color={ppcColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={localStyles.deliveryCodeModalTitle}>
                {isIfoodHandoverFlow ? global.t?.t('orders', 'title', 'ifoodOwnDelivery') : global.t?.t('orders', 'title', 'complete99FoodDelivery')}
              </Text>

              <ScrollView
                style={localStyles.deliveryCodeScroll}
                contentContainerStyle={localStyles.deliveryCodeScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={localStyles.deliveryCodeDescription}>
                  {isIfoodHandoverFlow
                    ? global.t?.t('orders', 'message', 'useLocatorAndOfficialIfoodLink')
                    : (deliveryFlowStep === 'locator'
                    ? global.t?.t('orders', 'message', 'confirmOfficial99FoodLocatorAndShareLink')
                    : global.t?.t('orders', 'message', 'enterCustomerConfirmationCodeToFinishDelivery'))}
                </Text>

                <View style={localStyles.deliveryLocatorHero}>
                  <Text style={localStyles.deliveryCodeMetaLabel}>
                    {isIfoodHandoverFlow ? global.t?.t('orders', 'label', 'ifoodLocator') : global.t?.t('orders', 'label', 'food99Locator')}
                  </Text>
                  <Text style={localStyles.deliveryLocatorHeroValue}>
                    {activeFood99Locator || global.t?.t('orders', 'label', 'notInformed')}
                  </Text>
                  <Text style={localStyles.deliveryLocatorHeroHelper}>
                    {isIfoodHandoverFlow
                      ? (food99Locator
                        ? global.t?.t('orders', 'message', 'shareThisLocatorWithCourierIfood')
                        : global.t?.t('orders', 'message', 'noLocatorInPayloadUseSupportIdIfood'))
                      : (food99Locator
                        ? global.t?.t('orders', 'message', 'shareThisLocatorWithCourier99')
                        : global.t?.t('orders', 'message', 'if99DoesNotSendLocatorUseReceiptNumber'))}
                  </Text>

                  {!!activeFood99Locator && (
                    <TouchableOpacity
                      onPress={handleFood99CopyLocator}
                      disabled={!!food99ActionLoading}
                      style={localStyles.deliveryLinkPrimaryButton}
                    >
                      <Text style={localStyles.deliveryLinkPrimaryButtonText}>
                        {global.t?.t('orders', 'button', 'copyLocator')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {!!food99HandoverLink && (
                  <View style={localStyles.deliveryLinkCard}>
                    <Text style={localStyles.deliveryCodeMetaLabel}>{global.t?.t('orders', 'label', 'confirmationLink')}</Text>
                    <Text style={localStyles.deliveryLinkUrl} selectable>
                      {food99HandoverLink}
                    </Text>
                    <View style={localStyles.deliveryLinkActions}>
                      <TouchableOpacity
                        onPress={handleFood99OpenHandoverLink}
                        disabled={!!food99ActionLoading}
                        style={localStyles.deliveryLinkActionButton}
                      >
                        <Text style={localStyles.deliveryLinkActionText}>{global.t?.t('orders', 'button', 'openLink')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleFood99CopyHandoverLink}
                        disabled={!!food99ActionLoading}
                        style={localStyles.deliveryLinkActionButton}
                      >
                        <Text style={localStyles.deliveryLinkActionText}>{global.t?.t('orders', 'button', 'copyLink')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleFood99ShareHandoverWhatsapp}
                        disabled={!!food99ActionLoading}
                        style={localStyles.deliveryLinkActionButton}
                      >
                        <Text style={localStyles.deliveryLinkActionText}>
                          {global.t?.t('orders', 'button', 'sendViaWhatsApp')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {isIfoodOrder ? null : (
                  <>
                    {(!!food99PickupCode || !!food99HandoverCode) && (
                      <View style={localStyles.deliveryCodeMetaRow}>
                        {!!food99PickupCode && (
                          <View style={localStyles.deliveryCodeMetaCardCompact}>
                            <Text style={localStyles.deliveryCodeMetaLabel}>{global.t?.t('orders', 'label', 'pickupCode')}</Text>
                            <Text style={localStyles.deliveryCodeMetaValueCompact}>{food99PickupCode}</Text>
                          </View>
                        )}

                        {!!food99HandoverCode && food99HandoverCode !== food99PickupCode && (
                          <View style={localStyles.deliveryCodeMetaCardCompact}>
                            <Text style={localStyles.deliveryCodeMetaLabel}>{global.t?.t('orders', 'label', 'handoverCode')}</Text>
                            <Text style={localStyles.deliveryCodeMetaValueCompact}>{food99HandoverCode}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    <Text style={localStyles.deliveryCodeTitle}>
                      {deliveryFlowStep === 'locator'
                        ? global.t?.t('orders', 'title', 'validateLocator')
                        : global.t?.t('orders', 'title', 'confirmCustomerCode')}
                    </Text>

                    <TextInput
                      value={deliveryFlowStep === 'locator'
                        ? deliveryLocator
                        : deliveryCustomerCode}
                      onChangeText={value => {
                        const normalizedValue = normalizeDigits(
                          value,
                          deliveryFlowStep === 'locator'
                            ? food99LocatorLength
                            : food99DeliveryCodeLength,
                        )

                        if (deliveryFlowStep === 'locator') {
                          setDeliveryLocator(normalizedValue)
                        } else {
                          setDeliveryCustomerCode(normalizedValue)
                        }
                      }}
                      placeholder={deliveryFlowStep === 'locator' ? '00000000' : '0000'}
                      placeholderTextColor={ppcColors.textSecondary}
                      keyboardType="number-pad"
                      maxLength={
                        deliveryFlowStep === 'locator'
                          ? food99LocatorLength
                          : food99DeliveryCodeLength
                      }
                      editable={!food99ActionLoading}
                      style={localStyles.deliveryCodeInput}
                    />

                    <Text style={localStyles.deliveryCodeHelper}>
                      {deliveryFlowStep === 'locator'
                        ? `${global.t?.t('orders', 'message', 'official99FoodLocatorHas')} ${food99LocatorLength} ${global.t?.t('orders', 'label', 'digits')}.`
                        : `${global.t?.t('orders', 'message', 'customerCodeHas')} ${food99DeliveryCodeLength} ${global.t?.t('orders', 'label', 'digits')}.`}
                    </Text>
                  </>
                )}
              </ScrollView>

              {isIfoodOrder ? null : (
                <View style={localStyles.deliveryCodeActions}>
                  <TouchableOpacity
                    onPress={() => {
                      if (deliveryFlowStep === 'delivery_code') {
                        setDeliveryFlowStep('locator')
                        setDeliveryCustomerCode('')
                        return
                      }

                      closeFood99DeliveryFlow()
                    }}
                    style={[
                      localStyles.deliveryCodeButton,
                      localStyles.deliveryCodeButtonSecondary,
                    ]}
                  >
                    <Text style={localStyles.deliveryCodeButtonSecondaryText}>
                      {deliveryFlowStep === 'delivery_code' ? global.t?.t('orders', 'button', 'back') : global.t?.t('orders', 'button', 'cancel')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={deliveryFlowStep === 'locator'
                      ? handleFood99LocatorVerify
                      : handleFood99DeliveryCodeConfirm}
                    disabled={!!food99ActionLoading}
                    style={[
                      localStyles.deliveryCodeButton,
                      localStyles.deliveryCodeButtonPrimary,
                      !!food99ActionLoading && localStyles.kdsActionButtonDisabled,
                    ]}
                  >
                    {food99ActionLoading === 'locator_verify' || food99ActionLoading === 'delivered' ? (
                      <ActivityIndicator size="small" color="#F8FAFC" />
                    ) : (
                      <Text style={localStyles.deliveryCodeButtonPrimaryText}>
                        {deliveryFlowStep === 'locator'
                          ? global.t?.t('orders', 'button', 'verifyAndContinue')
                          : global.t?.t('orders', 'button', 'completeDelivery')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {!isLoading && item && !error && (
        <View style={{ flex: 1 }}>
          {useUnifiedKdsLayout ? (
            renderKdsMobileContent()
          ) : (
            <>
              <OrderHeader key={item.id} order={resolvedDisplayOrder || item} />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {canAddProductsToOrder && (
                  <TouchableOpacity
                    onPress={handleAddProduct}
                    style={[globalStyles.button, { marginRight: 5 }]}
                  >
                    <Icon name="add-circle" size={24} color="#fff" />
                    <Text style={{ color: '#fff', marginLeft: 8 }}>
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
                    <Text style={{ color: '#fff', marginLeft: 8 }}>
                      {global.t?.t('orders', 'button', 'pay') || 'Pagar'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleOrderTools}
                  style={[globalStyles.button, { marginLeft: 5 }]}
                >
                  <Icon name="settings" size={24} color="#fff" />
                  <Text style={{ color: '#fff', marginLeft: 8 }}>
                    {global.t?.t('orders', 'button', 'details')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {isKds || useUnifiedKdsLayout ? null : (
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
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
                            <View style={{ flex: 1 }}>
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
                        )
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
                const cancelLoading =
                  orderActionLoading === 'cancel' ||
                  food99ActionLoading === 'cancel' ||
                  food99CancelReasonsLoading

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
  )
}

export default OrderDetails

