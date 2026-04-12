import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
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
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@store'
import { api } from '@controleonline/ui-common/src/api'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService'
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore'
import css from '@controleonline/ui-orders/src/react/css/orders'
import Icon from 'react-native-vector-icons/MaterialIcons'
import BarcodeInput from '@controleonline/ui-orders/src/react/pages/checkout/BarcodeInput'
import OrderProducts from '@controleonline/ui-ppc/src/react/components/OrderProducts'
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader'
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton'
import { buildFood99OrderSummary } from '@controleonline/ui-orders/src/react/services/food99OrderSummary'
import { useDisplayPrint } from '@controleonline/ui-ppc/src/react/pages/displays/useDisplayPrint'
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme'
import { getPlatformCapabilities, getOrderChannelKey, getOrderChannelLabel } from '@assets/ppc/channels'

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

const normalizeText = value => {
  if (value === null || value === undefined) return ''

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean'
  ) {
    return String(value).trim()
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeText(item)
      if (normalized) return normalized
    }
    return ''
  }

  if (typeof value === 'object') {
    const street = String(
      value?.street_name ||
      value?.streetName ||
      value?.street ||
      value?.logradouro ||
      '',
    ).trim()
    const number = String(
      value?.street_number ||
      value?.streetNumber ||
      value?.number ||
      value?.house_number ||
      '',
    ).trim()
    const streetLine = [street, number].filter(Boolean).join(', ')

    const candidates = [
      value?.display,
      value?.formattedAddress,
      value?.formatted_address,
      value?.formatted,
      value?.address,
      value?.poi_address,
      value?.value,
      value?.description,
      streetLine,
      value?.district,
      value?.city,
      value?.name,
      value?.reference,
      value?.complement,
    ]

    for (const candidate of candidates) {
      const normalized = normalizeText(candidate)
      if (normalized) return normalized
    }
  }

  return ''
}

const toCamelCase = value =>
  String(value ?? '').replace(/_([a-z])/g, (_, char) => char.toUpperCase())

const formatHumanLabel = value => {
  const normalized = normalizeText(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return ''

  return normalized.replace(/\b\w/g, char => char.toUpperCase())
}

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

const formatPhoneDisplay = phoneEntry => {
  if (!phoneEntry) return ''

  if (typeof phoneEntry === 'string' || typeof phoneEntry === 'number') {
    return normalizeText(phoneEntry)
  }

  const ddi = normalizeText(phoneEntry?.ddi)
  const ddd = normalizeText(phoneEntry?.ddd)
  const phone = normalizeText(phoneEntry?.phone)

  if (!phone) return ''

  return [ddi ? `+${ddi}` : '', ddd ? `(${ddd})` : '', phone]
    .filter(Boolean)
    .join(' ')
    .trim()
}

const resolveLocalOrderAddress = address => {
  const streetName = normalizeText(address?.street?.street)
  const streetNumber = normalizeText(address?.number)
  const nickname = normalizeText(address?.nickname)
  const complement = normalizeText(address?.complement)
  const district = normalizeText(address?.street?.district?.district)
  const city = normalizeText(address?.street?.district?.city?.city)
  const state = normalizeText(
    address?.street?.district?.city?.state?.uf ||
    address?.street?.district?.city?.state?.state
  )
  const postalCode = normalizeText(address?.street?.cep?.cep)

  return {
    primary: resolvePreferredText(
      [streetName, streetNumber].filter(Boolean).join(', '),
      streetName,
      nickname,
    ),
    secondary: [district, [city, state].filter(Boolean).join(' / ')].filter(Boolean).join(' • '),
    streetLine: [streetName, streetNumber].filter(Boolean).join(', '),
    district,
    cityStateLine: [city, state].filter(Boolean).join(' / '),
    postalCode,
    complement,
    nickname,
  }
}

const getOperationalStatusRank = (realStatus, statusName) =>
  MARKETPLACE_OPERATIONAL_STATUS_RANK[
    `${String(realStatus || '').trim().toLowerCase()}:${String(statusName || '').trim().toLowerCase()}`
  ] ?? null

const getOperationalStatusColor = (realStatus, statusName, fallbackColor = '#0EA5E9') => {
  const key = `${String(realStatus || '').trim().toLowerCase()}:${String(statusName || '').trim().toLowerCase()}`

  switch (key) {
    case 'open:preparing':
      return '#F59E0B'
    case 'pending:ready':
      return '#10B981'
    case 'pending:way':
      return '#0EA5E9'
    case 'closed:closed':
      return '#22C55E'
    case 'canceled:canceled':
    case 'cancelled:cancelled':
    case 'canceled:cancelled':
    case 'cancelled:canceled':
      return '#EF4444'
    default:
      return fallbackColor
  }
}

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

const OrderDetails = ({ route, navigation }) => {
  const orderParam = route.params.order
  const isKds = !!route.params?.kds
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
  const { item, isLoading, error } = ordersGetters

  const invoiceStore = useStore('invoice')
  const { getters: invoiceGetters, actions: invoiceActions } = invoiceStore
  const { items: invoices } = invoiceGetters
  const peopleStore = useStore('people')
  const { getters: peopleGetters } = peopleStore
  const { defaultCompany } = peopleGetters

  const { styles: cssStyles, globalStyles } = css()
  const { ppcColors } = useDisplayTheme()
  const selectedDisplay = useMemo(() => {
    if (!isKds) {
      return null
    }

    const routeDisplay = route.params?.display
    const normalizedDisplayId = String(
      routeDisplay?.id || route.params?.displayId || '',
    )
      .replace(/\D+/g, '')
      .trim()

    if (!normalizedDisplayId) {
      return null
    }

    return {
      id: normalizedDisplayId,
      displayType: routeDisplay?.displayType || route.params?.displayType || '',
    }
  }, [isKds, route.params?.display, route.params?.displayId, route.params?.displayType])
  const {
    canPrint: canPrintKdsOrder,
    printToAttachedPrinter: printKdsOrderToDisplay,
  } = useDisplayPrint({display: selectedDisplay})
  const { width, height: windowHeight } = useWindowDimensions()

  const scale = useMemo(() => {
    if (width >= 2200) return 1.15
    if (width >= 1700) return 1.05
    if (width >= 1300) return 0.97
    return 0.92
  }, [width])

  const localStyles = useMemo(() => createStyles(scale, ppcColors, windowHeight), [scale, ppcColors, windowHeight])
  const handleKdsPrintOrder = useCallback(() => {
    const orderId = item?.id || orderParam?.id
    if (!canPrintKdsOrder || !orderId) {
      return
    }

    printKdsOrderToDisplay({orderId})
  }, [canPrintKdsOrder, item?.id, orderParam?.id, printKdsOrderToDisplay])

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
  const isPosOrder = String(item?.app || orderParam?.app || '').trim().toUpperCase() === 'POS'
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
  const isPreparingPosOrder =
    isPosOrder &&
    localRealStatusKey === 'open' &&
    localStatusNameKey === 'preparing'
  const isReadyPosOrder =
    isPosOrder &&
    localRealStatusKey === 'pending' &&
    localStatusNameKey === 'ready'
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
  const { items: productSearchResults, isLoading: productSearchLoading } = productsStore.getters

  const [editMode, setEditMode] = useState(false)
  const [opLoadingId, setOpLoadingId] = useState(null)
  const [confirmRemoveItemId, setConfirmRemoveItemId] = useState(null)
  const [addProductQuery, setAddProductQuery] = useState('')
  const [addingProductId, setAddingProductId] = useState(null)

  useFocusEffect(
    useCallback(() => {
      if (orderParam && orderParam['@id']) {
        invoiceActions.getItems({ 'order.order': orderParam['@id'] })
      }
    }, [invoiceActions, orderParam]),
  )

  useFocusEffect(
    useCallback(() => {
      if (orderParam && orderParam['@id']) {
        ordersActions.get(orderParam['@id'])
      }
    }, [orderParam]),
  )

  useFocusEffect(
    useCallback(() => {
      if (orderParam && orderParam['@id']) {
        orderProductsStore.actions.getItems({
          order: orderParam['@id'],
          itemsPerPage: 500,
        })
      }
    }, [orderParam, orderProductsStore.actions]),
  )

  const handleAddProduct = () => {
    if (isLocallyTerminalOrder || !canEditItems) return
    navigation.navigate('AddProductScreen')
  }

  const handleAddPayment = useCallback(() => {
    if (!item?.id || isLocallyTerminalOrder) return
    navigation.navigate('Checkout', { order: item })
  }, [item, navigation, isLocallyTerminalOrder])

  const refreshCurrentOrder = useCallback(async () => {
    if (orderParam && orderParam['@id']) {
      await ordersActions.get(orderParam['@id'])
      await orderProductsStore.actions.getItems({
        order: orderParam['@id'],
        itemsPerPage: 500,
      })
    }
  }, [orderParam, orderProductsStore.actions, ordersActions])

  const canEditItems =
    !isFood99Order &&
    !isIfoodOrder &&
    !isLocallyTerminalOrder &&
    (!isPosOrder || isEditablePosCartOrder)

  useEffect(() => {
    if (!canEditItems) {
      setEditMode(false)
      setConfirmRemoveItemId(null)
    }
  }, [canEditItems])

  const searchProducts = useCallback((query) => {
    if (!query.trim()) {
      productsStore.actions.setItems([])
      return
    }
    const companyId = String(
      item?.provider?.id ||
      String(item?.provider?.['@id'] || '').replace(/\D/g, '') ||
      defaultCompany?.id || ''
    )
    productsStore.actions.getItems({
      ...(companyId ? { 'productCompany.company': '/people/' + companyId } : {}),
      product: query.trim(),
      itemsPerPage: 8,
    })
  }, [item?.provider, defaultCompany?.id, productsStore.actions])

  const handleAddProductInline = useCallback(async (product) => {
    if (!canEditItems || !item?.id || addingProductId) return
    const pid = String(product?.id || String(product?.['@id'] || '').replace(/\D/g, ''))
    if (!pid) return
    setAddingProductId(pid)
    try {
      await ordersActions.addProducts(item.id, [{ product: pid, quantity: 1 }])
      await refreshCurrentOrder()
      setAddProductQuery('')
      productsStore.actions.setItems([])
    } catch (e) {
      showError(formatApiError(e))
    } finally {
      setAddingProductId(null)
    }
  }, [canEditItems, item?.id, addingProductId, ordersActions, refreshCurrentOrder, showError, productsStore.actions])

  const handleUpdateOpQuantity = useCallback(async (op, newQty) => {
    if (opLoadingId) return
    const id = String(op?.id || String(op?.['@id'] || '').replace(/\D/g, ''))
    if (!id) return
    setOpLoadingId(id)
    try {
      await orderProductsStore.actions.save({ '@id': op['@id'], id: Number(id), quantity: newQty })
      await refreshCurrentOrder()
    } catch (e) {
      showError(formatApiError(e))
    } finally {
      setOpLoadingId(null)
    }
  }, [opLoadingId, orderProductsStore.actions, refreshCurrentOrder, showError])

  const handleRemoveOp = useCallback(async (op) => {
    if (opLoadingId) return
    const id = String(op?.id || String(op?.['@id'] || '').replace(/\D/g, ''))
    if (!id) return
    setOpLoadingId(id)
    setConfirmRemoveItemId(null)
    try {
      await orderProductsStore.actions.remove(id)
      await refreshCurrentOrder()
    } catch (e) {
      showError(formatApiError(e))
    } finally {
      setOpLoadingId(null)
    }
  }, [opLoadingId, orderProductsStore.actions, refreshCurrentOrder, showError])

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
    const locallyFetchedOrderProducts = Array.isArray(storedOrderProducts)
      ? storedOrderProducts.filter(orderProduct => {
          const orderProductOrderId = getEntityId(orderProduct?.order)
          if (!currentOrderId || !orderProductOrderId) return true
          return orderProductOrderId === currentOrderId
        })
      : []

    if (locallyFetchedOrderProducts.length) {
      return locallyFetchedOrderProducts
    }

    const currentOrderProducts = Array.isArray(item?.orderProducts) ? item.orderProducts : []
    if (currentOrderProducts.length) {
      return currentOrderProducts
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
  const displayOrderStatusColor = getOperationalStatusColor(
    effectiveLocalRealStatusKey,
    effectiveLocalStatusNameKey,
    food99State?.order?.status?.color || item?.status?.color || orderParam?.status?.color || '#0EA5E9',
  )
  const resolvedDisplayOrder = useMemo(() => {
    const baseOrder = item || orderParam
    if (!baseOrder) return null

    return {
      ...baseOrder,
      orderProducts: resolvedDisplayOrderProducts,
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
    resolvedDisplayOrderProducts,
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
  const isIfoodMerchantDelivery = isIfoodOrder && (
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
    food99Delivery?.pickup_code || food99Identifiers?.pickup_code || '',
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
  const canAddProductsToOrder = isManualInput && canEditItems
  const canAddOrderPayment =
    !isFood99Order &&
    !isIfoodOrder &&
    !!item?.id &&
    localPendingAmount > 0 &&
    !isTerminalFood99Order
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
  const orderDisplayId = item?.id || orderParam?.id || '--'
  const resolvedOrderDateValue = resolveOrderDateValue(item || orderParam)
  const orderDateLabel = formatOrderDateTime(resolvedOrderDateValue)
  const orderWaitingMinutes = resolvedOrderDateValue
    ? Math.max(0, Math.floor((Date.now() - new Date(resolvedOrderDateValue).getTime()) / 60000))
    : null
  const orderWaitingLabel =
    orderWaitingMinutes === null
      ? ''
      : `${orderWaitingMinutes} min`
  const orderOriginLabel = (() => {
    if (isFood99Order) {
      const suffix = food99Identifiers?.order_index
        ? ` #${food99Identifiers.order_index}`
        : ''
      return `99Food${suffix}`
    }

    if (isIfoodOrder) {
      const externalRefRaw = resolvePreferredText(
        food99Identifiers?.order_index,
        food99Integration?.ifood_code,
        food99Integration?.ifood_id,
      )
      const externalRef = externalRefRaw.length > 16
        ? `${externalRefRaw.slice(0, 14)}...`
        : externalRefRaw

      return externalRef ? `iFood #${externalRef}` : 'iFood'
    }

    return String(item?.app || global.t?.t('orders', 'label', 'localOrigin'))
  })()
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
    () => resolveLocalOrderAddress(localOrderAddress),
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
  const orderCustomerDocument = resolvePreferredText(
    localOrderClient?.document?.[0]?.document,
    Array.isArray(localOrderClient?.document)
      ? localOrderClient.document.map(document => normalizeText(document?.document)).find(Boolean)
      : normalizeText(localOrderClient?.document),
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
  const orderObservationText = resolvePreferredText(
    food99RemarkText,
    item?.comments,
    item?.remark,
    orderParam?.comments,
    orderParam?.remark,
    orderParam?.description,
  ) || fallbackNoObservationText
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
  const canGenericConfirmOrder =
    !isFood99Order &&
    !isIfoodOrder &&
    !isTerminalFood99Order &&
    isPosOrder &&
    isEditablePosCartOrder
  const canGenericCancelOrder =
    !isFood99Order &&
    !isIfoodOrder &&
    !isPosOrder &&
    !isTerminalFood99Order &&
    platformCapabilities.canCancel
  const shouldShowKdsCancel =
    isFood99Order || isIfoodOrder
      ? false
      : canGenericCancelOrder
  const canGenericReadyOrder =
    !isFood99Order &&
    !isIfoodOrder &&
    platformCapabilities.canReady &&
    !isTerminalFood99Order &&
    (!isPosOrder || isPreparingPosOrder)
  const canGenericDeliveredOrder =
    !isFood99Order &&
    !isIfoodOrder &&
    platformCapabilities.canDeliver &&
    !isTerminalFood99Order &&
    (!isPosOrder || isReadyPosOrder)

  // Finalizar: aparece quando não há mais ações disponíveis e o pedido ainda não foi encerrado
  const canFinalizeFood99Order = false

  const canFinalizeGenericOrder =
    !isFood99Order &&
    !isIfoodOrder &&
    !isPosOrder &&
    !isTerminalFood99Order &&
    !shouldShowKdsCancel &&
    !canGenericReadyOrder &&
    !canGenericDeliveredOrder

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
    }),
    [
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
            canPrintKdsOrder && !isTvDisplay ? (
              <TouchableOpacity
                onPress={handleKdsPrintOrder}
                style={localStyles.topBarIconButton}
                disabled={!item?.id}
              >
                <Icon name="print" size={20} color={ppcColors.accentInfo} />
              </TouchableOpacity>
            ) : null
          ) : (
            <PrintButton
              printType="order"
              store="orders"
              compact
              iconColor={ppcColors.accentInfo}
              compactButtonStyle={localStyles.topBarIconButton}
              compactSelectStyle={localStyles.topBarIconButton}
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
    handleKdsPrintOrder,
    canPrintKdsOrder,
    item?.id,
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

  const renderKdsMobileContent = () => (
    <ScrollView
      contentContainerStyle={localStyles.mobileOrderScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={localStyles.mobileOrderLayout}>
      <View style={localStyles.mobileSummaryCard}>
        <View style={localStyles.mobileSummaryHeader}>
          <View style={localStyles.mobileSummaryOriginWrap}>
            <View style={localStyles.mobileSummaryOriginIcon}>
              <Icon
                name={isFood99Order ? 'two-wheeler' : 'store'}
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

        {(isFood99Order || isIfoodOrder) && (!!food99Delivery?.delivery_label || !!formattedFood99Eta) && (
          <View style={localStyles.mobileSummaryMetaList}>
            {!!food99Delivery?.delivery_label && (
              <Text style={localStyles.mobileSummaryMetaText}>
                {global.t?.t('orders', 'label', 'delivery')}: {food99Delivery.delivery_label}
              </Text>
            )}
            {!!formattedFood99Eta && (
              <Text style={localStyles.mobileSummaryMetaText}>
                {global.t?.t('orders', 'label', 'estimatedEta')}: {formattedFood99Eta}
              </Text>
            )}
          </View>
        )}
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
          </View>
        </View>

        {!isPurchaseOrder && (
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

        {!isPurchaseOrder && showOrderObservationCard && (
          <View style={localStyles.mobileNoteCard}>
            <View style={localStyles.mobileNoteHeader}>
              <Icon name="info" size={14} color={ppcColors.accent} />
              <Text style={localStyles.mobileNoteLabel}>{global.t?.t('orders', 'label', 'customerObservation')}</Text>
            </View>
            <Text style={localStyles.mobileNoteText}>{orderObservationText}</Text>
            {shouldShowFood99ItemRemarks && (
              <Text style={localStyles.mobileNoteText}>
                {global.t?.t('orders', 'label', 'itemsObservation') || 'Observações dos itens'}: {food99ItemRemarksText}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={localStyles.mobileInfoCard}>
        <View style={localStyles.orderInvoiceBlockHeader}>
          <Text style={localStyles.mobileInfoLabel}>{localInvoicesSectionTitle}</Text>
          {!!localInvoiceCards.length && (
            <Text style={localStyles.orderInvoiceCounter}>{localInvoicesCountLabel}</Text>
          )}
        </View>
        {renderLocalInvoiceCards('mobile')}
      </View>

      {(isFood99CourierToStore ||
        isFood99Delivering ||
        shouldHideReadyFood99Action ||
        hasFood99SyncIssue) && (
        <View style={localStyles.mobileWarningCard}>
          {isFood99CourierToStore ? (
            <Text style={localStyles.mobileWarningText}>
              {global.t?.t('orders', 'message', 'courierAssignedAndComingToStore')}
            </Text>
          ) : null}
          {isFood99Delivering && !isFood99CourierToStore ? (
            <Text style={localStyles.mobileWarningText}>{global.t?.t('orders', 'message', 'orderInDelivery')}</Text>
          ) : null}
          {shouldHideReadyFood99Action ? (
            <Text style={localStyles.mobileWarningText}>
              {global.t?.t('orders', 'message', 'orderReadyWaitingPlatform99Update')}
            </Text>
          ) : null}
          {hasFood99SyncIssue ? (
            <Text style={localStyles.mobileWarningText}>
              {global.t?.t('orders', 'message', 'integrationDivergenceUseDetailsToSync')}
            </Text>
          ) : null}
        </View>
      )}

      <View style={[cssStyles.itemsSection, localStyles.mobileProductsCard]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Text style={[localStyles.mobileProductsTitle, { flex: 1 }]}>{global.t?.t('orders', 'title', 'orderItems')}</Text>
          {canEditItems && (
            <TouchableOpacity
              onPress={() => { setEditMode(m => !m); setConfirmRemoveItemId(null) }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8,
                backgroundColor: editMode ? '#F59E0B' : ppcColors.primary,
              }}
            >
              <Icon name={editMode ? 'check' : 'edit'} size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                {editMode ? 'Concluir' : 'Editar'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {isPurchaseOrder
          ? (resolvedDisplayOrderProducts || []).map((op, idx) => {
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
          : (canEditItems && editMode
              ? (
                <React.Fragment>
                  {(item?.orderProducts || []).map(op => {
                    const opId = String(op?.id || '')
                    const name = op?.product?.product || op?.product?.name || 'Item'
                    const qty = Number(op?.quantity || 0)
                    const price = Number(op?.unitPrice || op?.price || 0)
                    const unitLabel = resolveOrderItemUnitLabel(op)
                    const isOpLoading = opLoadingId === opId
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
                              disabled={!!opLoadingId}
                            >
                              {isOpLoading
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Icon name="check" size={15} color="#fff" />}
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setConfirmRemoveItemId(null)}
                              style={localStyles.editConfirmNo}
                              disabled={!!opLoadingId}
                            >
                              <Icon name="close" size={15} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={localStyles.editQtyRow}>
                            <TouchableOpacity
                              onPress={() => {
                                if (qty <= 1) setConfirmRemoveItemId(opId)
                                else handleUpdateOpQuantity(op, qty - 1)
                              }}
                              disabled={!!opLoadingId}
                              style={localStyles.editQtyBtn}
                            >
                              <Icon name={qty <= 1 ? 'delete' : 'remove'} size={18} color={qty <= 1 ? '#EF4444' : ppcColors.textPrimary} />
                            </TouchableOpacity>
                            <View style={localStyles.editQtyBox}>
                              {isOpLoading
                                ? <ActivityIndicator size="small" color={ppcColors.primary} />
                                : <Text style={localStyles.editQtyText}>{qty}</Text>}
                            </View>
                            <TouchableOpacity
                              onPress={() => handleUpdateOpQuantity(op, qty + 1)}
                              disabled={!!opLoadingId}
                              style={localStyles.editQtyBtn}
                            >
                              <Icon name="add" size={18} color={ppcColors.textPrimary} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )
                  })}
                  <View style={localStyles.editAddWrap}>
                    <View style={[localStyles.editAddSearch, { borderColor: ppcColors.border, backgroundColor: ppcColors.cardBg }]}>
                      <Icon name="search" size={16} color={ppcColors.textSecondary} />
                      <TextInput
                        value={addProductQuery}
                        onChangeText={v => { setAddProductQuery(v); searchProducts(v) }}
                        placeholder="Buscar produto para adicionar..."
                        placeholderTextColor={ppcColors.textSecondary}
                        style={{ flex: 1, color: ppcColors.textPrimary, fontSize: 14, paddingVertical: 0 }}
                      />
                      {productSearchLoading && <ActivityIndicator size="small" color={ppcColors.primary} />}
                    </View>
                    {addProductQuery.trim().length > 0 && (productSearchResults || []).map(p => {
                      const pid = String(p?.id || '')
                      const pname = p?.product || p?.name || 'Produto'
                      const pprice = Number(p?.price || 0)
                      const isAdding = addingProductId === pid
                      return (
                        <TouchableOpacity
                          key={pid || p['@id']}
                          onPress={() => handleAddProductInline(p)}
                          disabled={!!addingProductId}
                          style={[localStyles.editAddResult, { borderColor: ppcColors.borderSoft }]}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[localStyles.editAddResultName, { color: ppcColors.textPrimary }]} numberOfLines={1}>{pname}</Text>
                            {pprice > 0 && <Text style={[localStyles.editAddResultPrice, { color: ppcColors.textSecondary }]}>{Formatter.formatMoney(pprice)}</Text>}
                          </View>
                          {isAdding
                            ? <ActivityIndicator size="small" color={ppcColors.primary} />
                            : <Icon name="add-circle" size={22} color={ppcColors.primary} />}
                        </TouchableOpacity>
                      )
                    })}
                  </View>
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
          paddingBottom: isKds ? 0 : 120,
          backgroundColor: isKds ? ppcColors.appBg : undefined,
        },
        isKds && localStyles.kdsContainer,
      ]}
    >
      {showBarcodeInput && <BarcodeInput />}

      <StateStore store="orders" />

      <Modal
        transparent
        animationType="slide"
        visible={detailsModalVisible}
        onRequestClose={closeDetailsModal}
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
        <View style={localStyles.modalSheetRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={localStyles.modalSheetBackdrop}
            onPress={closeDetailsModal}
          />
          <View style={localStyles.modalSheetWrap}>
            <View
              style={[
                localStyles.detailsModal,
                { paddingBottom: 14 + modalBottomInset },
              ]}
            >
            <View style={localStyles.detailsModalHeader}>
              <View>
                <Text style={localStyles.detailsModalEyebrow}>{global.t?.t('orders', 'title', 'orderSummary')}</Text>
                <Text style={localStyles.detailsModalTitle}>
                  {global.t?.t('orders', 'title', 'order')} #{item?.id || orderParam?.id || '--'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeDetailsModal}
                style={localStyles.detailsModalCloseButton}
              >
                <Icon name="close" size={22} color={ppcColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {!isFood99Order && !isIfoodOrder && resolvedPrimaryKdsAction && (
              <TouchableOpacity
                onPress={resolvedPrimaryKdsAction.onPress}
                disabled={orderActionLoading === resolvedPrimaryKdsAction.loadingKey}
                style={[
                  localStyles.detailsMarkPaidButton,
                  orderActionLoading === resolvedPrimaryKdsAction.loadingKey &&
                    localStyles.kdsActionButtonDisabled,
                ]}
              >
                {orderActionLoading === resolvedPrimaryKdsAction.loadingKey ? (
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
                )}
              </TouchableOpacity>
            )}

            <ScrollView
              style={localStyles.detailsModalScroll}
              contentContainerStyle={[
                localStyles.detailsModalScrollContent,
                { paddingBottom: 20 + modalBottomInset },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <View style={localStyles.detailsGrid}>
                <View style={localStyles.detailsCard}>
                  <Text style={localStyles.detailsCardLabel}>{global.t?.t('orders', 'label', 'application')}</Text>
                  <Text style={localStyles.detailsCardValue}>{item?.app || '-'}</Text>
                </View>
                <View style={localStyles.detailsCard}>
                  <Text style={localStyles.detailsCardLabel}>{global.t?.t('orders', 'label', 'localStatus')}</Text>
                  <Text style={localStyles.detailsCardValue}>
                    {effectiveLocalStatusNameKey || item?.status?.status || '-'}
                  </Text>
                </View>
                <View style={localStyles.detailsCard}>
                  <Text style={localStyles.detailsCardLabel}>
                    {global.t?.t('orders', 'label', 'localRealStatus') || 'Real status local'}
                  </Text>
                  <Text style={localStyles.detailsCardValue}>
                    {effectiveLocalRealStatusKey || item?.status?.realStatus || '-'}
                  </Text>
                </View>
                <View style={localStyles.detailsCard}>
                  <Text style={localStyles.detailsCardLabel}>
                    {global.t?.t('orders', 'title', 'payments') || 'Pagamentos'}
                  </Text>
                  <Text style={localStyles.detailsCardValue}>
                    {localInvoiceCards.length}
                  </Text>
                </View>
              </View>

              <View style={localStyles.detailsSection}>
                <Text style={localStyles.detailsSectionTitle}>{global.t?.t('orders', 'title', 'orderData')}</Text>
                <Text style={localStyles.detailsInfoText}>
                  {global.t?.t('orders', 'label', 'createdAt')}: {formatOrderDateTime(resolvedOrderDateValue)}
                </Text>
                <Text style={localStyles.detailsInfoText}>
                  {global.t?.t('orders', 'label', 'updatedAt')}: {formatOrderDateTime(item?.alterDate || resolvedOrderDateValue)}
                </Text>
                <Text style={localStyles.detailsInfoText}>
                  {global.t?.t('orders', 'label', 'localTotal')}: {Formatter.formatMoney(localOrderTotal || 0)}
                </Text>
              </View>

              <View style={localStyles.detailsSection}>
                <Text style={localStyles.detailsSectionTitle}>{localInvoicesSectionTitle}</Text>
                {renderLocalInvoiceCards('details')}
              </View>

              {(isFood99Order || isIfoodOrder) && food99StateLoading && !food99State ? (
                <View style={localStyles.detailsLoadingState}>
                  <ActivityIndicator size="small" color="#38BDF8" />
                  <Text style={localStyles.detailsLoadingText}>
                    {global.t?.t('orders', 'message', 'loadingIntegrationData')} {isIfoodOrder ? 'iFood' : '99Food'}...
                  </Text>
                </View>
              ) : null}

              {(isFood99Order || isIfoodOrder) && hasFood99VisualData ? (
                <>
                  <View style={localStyles.detailsSection}>
                    <Text style={localStyles.detailsSectionTitle}>
                      {isIfoodOrder ? global.t?.t('orders', 'title', 'ifoodOperation') : global.t?.t('orders', 'title', 'food99Operation')}
                    </Text>
                    {isUsingFallbackMarketplaceSummary ? (
                      <Text style={localStyles.food99InfoHint}>
                        {global.t?.t('orders', 'message', 'marketplaceSummaryFromSnapshot') || 'Dados de integração exibidos a partir do snapshot salvo no pedido até o state mais recente ser carregado.'}
                      </Text>
                    ) : null}
                    {!!food99Identifiers?.order_index && (
                      <Text style={localStyles.detailsInfoText}>
                        {isIfoodOrder ? global.t?.t('orders', 'label', 'ifoodNumber') : global.t?.t('orders', 'label', 'food99Number')}: #{food99Identifiers.order_index}
                      </Text>
                    )}
                    <Text style={localStyles.detailsInfoText}>
                      {global.t?.t('orders', 'label', 'delivery')}: {food99Delivery?.delivery_label || '-'}
                    </Text>
                    {!!formattedFood99Eta && (
                      <Text style={localStyles.detailsInfoText}>
                        {global.t?.t('orders', 'label', 'estimatedEta')}: {formattedFood99Eta}
                      </Text>
                    )}
                    {!!food99SelectedPaymentLabel && (
                      <Text style={localStyles.detailsInfoTextStrong}>
                        {global.t?.t('orders', 'label', 'selectedPaymentMethod')}: {food99SelectedPaymentLabel}
                      </Text>
                    )}
                    {!!food99PaymentMethodValue && (
                      <Text style={localStyles.detailsInfoText}>
                        {global.t?.t('orders', 'label', 'paymentMethod')}: {food99PaymentMethodValue}
                      </Text>
                    )}
                    {!!food99PaymentChannelValue && (
                      <Text style={localStyles.detailsInfoText}>
                        {global.t?.t('orders', 'label', 'paymentChannel')}: {food99PaymentChannelValue}
                      </Text>
                    )}
                    {hasFood99CancellationInfo && (
                      <>
                        {!!food99CancellationSourceLabel && (
                          <Text style={localStyles.detailsInfoText}>
                            {global.t?.t('orders', 'label', 'cancellationOrigin')}: {food99CancellationSourceLabel}
                          </Text>
                        )}
                        {!!food99Integration?.cancel_code && (
                          <Text style={localStyles.detailsInfoText}>
                            {global.t?.t('orders', 'label', 'cancellationCode')}: {food99Integration.cancel_code}
                          </Text>
                        )}
                        {!!food99Integration?.cancel_reason && (
                          <Text style={localStyles.detailsInfoText}>
                            {global.t?.t('orders', 'label', 'cancellationReason')}: {food99Integration.cancel_reason}
                          </Text>
                        )}
                      </>
                    )}
                  </View>

                  {(food99RiderName || food99RiderPhone || food99RiderToStoreEta) && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>
                        {isIfoodOrder ? global.t?.t('orders', 'title', 'ifoodCourier') : global.t?.t('orders', 'title', 'food99Courier')}
                      </Text>
                      {!!food99RiderName && (
                        <Text style={localStyles.detailsInfoText}>{global.t?.t('orders', 'label', 'name')}: {food99RiderName}</Text>
                      )}
                      {!!food99RiderPhone && (
                        <Text style={localStyles.detailsInfoText}>{global.t?.t('orders', 'label', 'phone')}: {food99RiderPhone}</Text>
                      )}
                      {!!food99RiderToStoreEta && (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'etaToStore')}: {food99RiderToStoreEta}
                        </Text>
                      )}
                    </View>
                  )}

                  {food99Financial && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>
                        {isIfoodOrder ? global.t?.t('orders', 'title', 'ifoodFinance') : global.t?.t('orders', 'title', 'food99Finance')}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        {global.t?.t('orders', 'label', 'items')}: {Formatter.formatMoney(food99Financial.items_total || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        {global.t?.t('orders', 'label', 'delivery')}: {Formatter.formatMoney(food99Financial.delivery_fee || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        {global.t?.t('orders', 'label', 'serviceFee')}: {Formatter.formatMoney(food99Financial.service_fee || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        {global.t?.t('orders', 'label', 'minimumOrderFee')}: {Formatter.formatMoney(food99Financial.small_order_fee || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        {global.t?.t('orders', 'label', 'topUpFee')}: {Formatter.formatMoney(food99Financial.meal_top_up_fee || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        {global.t?.t('orders', 'label', 'totalDiscounts')}: {Formatter.formatMoney(food99Financial.discount_total || 0)}
                      </Text>
                      {isIfoodOrder && food99Financial.ifood_subsidy > 0 && (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'ifoodSubsidy')}: {Formatter.formatMoney(food99Financial.ifood_subsidy)}
                        </Text>
                      )}
                      {isIfoodOrder && food99Financial.merchant_subsidy > 0 && (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'storeSubsidy')}: {Formatter.formatMoney(food99Financial.merchant_subsidy)}
                        </Text>
                      )}
                      {isIfoodOrder && !!food99Financial.payment_brand && (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'brand')}: {food99Financial.payment_brand}
                        </Text>
                      )}
                      {isIfoodOrder && food99Financial.change_for > 0 && (
                        <Text style={localStyles.detailsInfoTextStrong}>
                          {global.t?.t('orders', 'label', 'changeFor')}: {Formatter.formatMoney(food99Financial.change_for)}
                        </Text>
                      )}
                      <Text style={localStyles.detailsInfoText}>
                        {global.t?.t('orders', 'label', 'itemDiscount')}: {Formatter.formatMoney(food99Financial.items_discount_total || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        {global.t?.t('orders', 'label', 'deliveryDiscount')}: {Formatter.formatMoney(food99Financial.delivery_discount_total || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        {global.t?.t('orders', 'label', 'couponDiscount')}: {Formatter.formatMoney(food99Financial.coupon_discount_total || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        {global.t?.t('orders', 'label', 'storeCouponDiscount')}: {Formatter.formatMoney(food99Financial.store_discount_total || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        {global.t?.t('orders', 'label', 'platformCouponDiscount')}: {Formatter.formatMoney(food99Financial.platform_discount_total || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        {global.t?.t('orders', 'label', 'originalDeliveryFee')}: {Formatter.formatMoney(food99Financial.store_charged_delivery_price || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoTextStrong}>
                        {global.t?.t('orders', 'label', 'customerTotal')}: {Formatter.formatMoney(food99Financial.customer_total || 0)}
                      </Text>
                      {shouldShowCollectOnDelivery && (
                        <Text style={localStyles.detailsInfoTextStrong}>
                          {global.t?.t('orders', 'label', 'collectFromCustomer')}: {Formatter.formatMoney(food99CashCollectionAmount || 0)}
                        </Text>
                      )}
                    </View>
                  )}

                  {food99Payment && (
                    <View style={localStyles.detailsGrid}>
                      <View style={localStyles.detailsCard}>
                        <Text style={localStyles.detailsCardLabel}>{global.t?.t('orders', 'label', 'paid')}</Text>
                        <Text style={localStyles.detailsCardValue}>
                          {Formatter.formatMoney(food99Payment.amount_paid || 0)}
                        </Text>
                      </View>
                      <View style={localStyles.detailsCard}>
                        <Text style={localStyles.detailsCardLabel}>{global.t?.t('orders', 'label', 'pending')}</Text>
                        <Text style={localStyles.detailsCardValue}>
                          {Formatter.formatMoney(food99Payment.amount_pending || 0)}
                        </Text>
                      </View>
                      {shouldShowCollectOnDelivery && (
                        <View style={localStyles.detailsCard}>
                          <Text style={localStyles.detailsCardLabel}>{global.t?.t('orders', 'label', 'collectCustomer')}</Text>
                          <Text style={localStyles.detailsCardValue}>
                            {Formatter.formatMoney(food99CashCollectionAmount || 0)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {food99Payment && shouldShowDeliveryPaymentSection && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>{global.t?.t('orders', 'title', 'paymentOnDelivery')}</Text>
                      {shouldShowCollectOnDelivery && (
                        <Text style={localStyles.detailsInfoTextStrong}>
                          {collectOnDeliveryLabel}: {Formatter.formatMoney(food99CashCollectionAmount || 0)}
                        </Text>
                      )}
                      {food99ChangeFor > 0 ? (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'changeFor')}: {Formatter.formatMoney(food99ChangeFor)}
                        </Text>
                      ) : isCashPaymentSelection ? (
                        <Text style={localStyles.detailsInfoText}>{global.t?.t('orders', 'message', 'changeNotRequested')}</Text>
                      ) : null}
                      {food99NeedsChange ? (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'changeToReturn')}: {Formatter.formatMoney(food99ChangeAmount)}
                        </Text>
                      ) : null}
                      {food99ShopPaidMoney > 0 ? (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'courierTransferToMerchant')}: {Formatter.formatMoney(food99ShopPaidMoney)}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {isScheduledOrder && (
                    <View style={localStyles.scheduledDeliveryBanner}>
                      <Text style={localStyles.scheduledDeliveryLabel}>⏰ {global.t?.t('orders', 'title', 'scheduledDelivery')}</Text>
                      {!!scheduledWindowLabel && (
                        <Text style={localStyles.scheduledDeliveryDate}>{global.t?.t('orders', 'label', 'window')}: {scheduledWindowLabel}</Text>
                      )}
                      {!!scheduledDeliveryDateTimeRaw && (
                        <Text style={localStyles.scheduledDeliveryDate}>
                          {global.t?.t('orders', 'label', 'delivery')}: {formatScheduledDate(scheduledDeliveryDateTimeRaw)}
                        </Text>
                      )}
                      {!!scheduledPreparationStartRaw && (
                        <Text style={localStyles.scheduledDeliveryDate}>
                          {global.t?.t('orders', 'label', 'startPreparation')}: {formatScheduledDate(scheduledPreparationStartRaw)}
                        </Text>
                      )}
                    </View>
                  )}

                  {ifoodTaxDocumentRequested && (
                    <View style={localStyles.taxDocumentBanner}>
                      <Text style={localStyles.taxDocumentLabel}>{ifoodTaxDocumentTitle}</Text>
                      <Text style={localStyles.taxDocumentText}>
                        {global.t?.t('orders', 'message', 'customerRequestedTaxDocument') || 'Cliente solicitou documento fiscal neste pedido.'}
                      </Text>
                      {!!orderCustomerDocument && (
                        <Text style={localStyles.taxDocumentText}>
                          {orderCustomerDocumentLabel}: {orderCustomerDocument}
                        </Text>
                      )}
                    </View>
                  )}

                  {(orderCustomerName || orderCustomerPhone || orderCustomerDocument) && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>{global.t?.t('orders', 'title', 'customer')}</Text>
                      {!!orderCustomerName && (
                        <Text style={localStyles.detailsInfoText}>{orderCustomerName}</Text>
                      )}
                      {!!orderCustomerPhone && (
                        <Text style={localStyles.detailsInfoText}>{orderCustomerPhone}</Text>
                      )}
                      {!!orderCustomerDocument && (
                        <Text style={localStyles.detailsInfoText}>{orderCustomerDocumentLabel}: {orderCustomerDocument}</Text>
                      )}
                    </View>
                  )}

                  {(localOrderAddressParts.primary ||
                    localOrderAddressParts.streetLine ||
                    localOrderAddressParts.district ||
                    localOrderAddressParts.cityStateLine ||
                    localOrderAddressParts.postalCode ||
                    localOrderAddressParts.nickname ||
                    localOrderAddressParts.complement) && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>{global.t?.t('orders', 'title', 'customerAddress')}</Text>
                      {!!localOrderAddressParts.primary && (
                        <Text style={localStyles.detailsInfoText}>{localOrderAddressParts.primary}</Text>
                      )}
                      {!!localOrderAddressParts.streetLine && (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'streetNumber')}: {localOrderAddressParts.streetLine}
                        </Text>
                      )}
                      {!!localOrderAddressParts.district && (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'district')}: {localOrderAddressParts.district}
                        </Text>
                      )}
                      {!!localOrderAddressParts.cityStateLine && (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'cityState')}: {localOrderAddressParts.cityStateLine}
                        </Text>
                      )}
                      {!!localOrderAddressParts.postalCode && (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'zipCode')}: {localOrderAddressParts.postalCode}
                        </Text>
                      )}
                      {!!localOrderAddressParts.nickname && (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'reference')}: {localOrderAddressParts.nickname}
                        </Text>
                      )}
                      {!!localOrderAddressParts.complement && (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'complement')}: {localOrderAddressParts.complement}
                        </Text>
                      )}
                    </View>
                  )}

                  {(food99PickupCode ||
                    food99HandoverCode ||
                    food99Delivery?.locator ||
                    food99Delivery?.virtual_phone_number) && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>{global.t?.t('orders', 'title', 'codesAndSupport')}</Text>
                      {!!food99PickupCode && (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'pickupCode')}: {food99PickupCode}
                        </Text>
                      )}
                      {!!food99HandoverCode && (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'handoverCode')}: {food99HandoverCode}
                        </Text>
                      )}
                      {!!food99Delivery?.locator && (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'locator')}: {food99Delivery.locator}
                        </Text>
                      )}
                      {!!food99Delivery?.virtual_phone_number && (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'virtualPhone')}: {food99Delivery.virtual_phone_number}
                        </Text>
                      )}
                    </View>
                  )}

                  {showOrderObservationCard && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>{global.t?.t('orders', 'title', 'observations')}</Text>
                      <Text style={localStyles.detailsInfoText}>{orderObservationText}</Text>
                      {shouldShowFood99ItemRemarks && (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'itemsObservation') || 'Observações dos itens'}: {food99ItemRemarksText}
                        </Text>
                      )}
                      {food99Notes?.need_cutlery !== null &&
                      food99Notes?.need_cutlery !== undefined ? (
                        <Text style={localStyles.detailsInfoText}>
                          {global.t?.t('orders', 'label', 'needCutlery')}: {food99Notes.need_cutlery ? global.t?.t('orders', 'label', 'yes') : global.t?.t('orders', 'label', 'no')}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </>
              ) : null}
            </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

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
          {isKds ? (
            renderKdsMobileContent() || (
            <>
              <OrderHeader order={resolvedDisplayOrder || item} showCustomer />

              {isFood99Order && (
                <View style={localStyles.food99InfoCard}>
                  <View style={localStyles.food99InfoHeader}>
                    <Text style={localStyles.food99InfoTitle}>
                      {isIfoodOrder ? global.t?.t('orders', 'title', 'ifoodOperation') : global.t?.t('orders', 'title', 'food99Operation')}
                    </Text>
                    <View style={localStyles.food99InfoHeaderRight}>
                      {food99StateLoading ? (
                        <ActivityIndicator size="small" color="#38BDF8" />
                      ) : (
                        <Text style={localStyles.food99InfoBadge}>
                          {food99Delivery?.delivery_label || global.t?.t('orders', 'label', 'undefinedDelivery')}
                        </Text>
                      )}
                      <TouchableOpacity
                        onPress={() => runFood99OrderAction('reconcile')}
                        disabled={!!food99ActionLoading}
                        style={[
                          localStyles.food99RefreshButton,
                          !!food99ActionLoading && localStyles.food99RefreshButtonDisabled,
                        ]}
                      >
                        {food99ActionLoading === 'reconcile' ? (
                          <ActivityIndicator size="small" color="#7DD3FC" />
                        ) : (
                          <Icon name="refresh" size={18} color="#7DD3FC" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {isFood99CourierToStore ? (
                    <Text style={localStyles.food99InfoHint}>
                      {global.t?.t('orders', 'message', 'courierAssignedBy99AndComingToStore')}
                    </Text>
                  ) : null}

                  {isFood99Delivering && !isFood99CourierToStore ? (
                    <Text style={localStyles.food99InfoHint}>
                      {requiresFood99DeliveryLocator
                        ? `${global.t?.t('orders', 'message', 'orderInDeliveryUseDeliveredToValidate')} ${isIfoodOrder ? 'iFood' : '99Food'}.`
                        : `${global.t?.t('orders', 'message', 'orderInDeliveryCompleteWhenStoreFinishes')} ${isIfoodOrder ? 'iFood' : '99Food'}.`}
                    </Text>
                  ) : null}

                  {food99Delivery?.is_store_delivery && !food99Delivery?.locator ? (
                    <Text style={localStyles.food99InfoWarning}>
                      {isIfoodOrder
                        ? global.t?.t('orders', 'message', 'ifoodDidNotSendLocatorInPayload')
                        : global.t?.t('orders', 'message', 'food99DidNotSendLocatorInPayload')}
                    </Text>
                  ) : null}

                  {!!remoteStateAgeLabel && (
                    <Text style={localStyles.food99InfoText}>
                      {global.t?.t('orders', 'label', 'remoteUpdate')}: {remoteStateAgeLabel}
                    </Text>
                  )}

                  {!!formattedFood99Eta && (
                    <Text style={localStyles.food99InfoText}>
                      {global.t?.t('orders', 'label', 'estimatedEta')}: {formattedFood99Eta}
                    </Text>
                  )}

                  {(food99RiderName || food99RiderPhone || food99RiderToStoreEta) && (
                    <View style={localStyles.food99SummaryBlock}>
                      <Text style={localStyles.food99SummaryTitle}>
                        {isIfoodOrder ? global.t?.t('orders', 'title', 'ifoodCourier') : global.t?.t('orders', 'title', 'food99Courier')}
                      </Text>
                      {!!food99RiderName && (
                        <Text style={localStyles.food99InfoText}>{food99RiderName}</Text>
                      )}
                      {!!food99RiderPhone && (
                        <Text style={localStyles.food99InfoText}>{food99RiderPhone}</Text>
                      )}
                      {!!food99RiderToStoreEta && (
                        <Text style={localStyles.food99InfoText}>{food99RiderToStoreEta}</Text>
                      )}
                    </View>
                  )}

                  {!!food99Identifiers?.order_index && (
                    <Text style={localStyles.food99InfoText}>
                      {isIfoodOrder ? global.t?.t('orders', 'label', 'ifoodNumber') : global.t?.t('orders', 'label', 'food99Number')}: #{food99Identifiers.order_index}
                    </Text>
                  )}

                  {!!food99HandoverCode && (
                    <Text style={localStyles.food99InfoText}>
                      {global.t?.t('orders', 'label', 'handoverCode')}: {food99HandoverCode}
                    </Text>
                  )}

                  {!!food99PickupCode && (
                    <Text style={localStyles.food99InfoText}>
                      {global.t?.t('orders', 'label', 'pickupCode')}: {food99PickupCode}
                    </Text>
                  )}

                  {!!food99Delivery?.locator && (
                    <Text style={localStyles.food99InfoText}>
                      {global.t?.t('orders', 'label', 'locator')}: {food99Delivery.locator}
                    </Text>
                  )}

                  {!!food99Delivery?.virtual_phone_number && (
                    <Text style={localStyles.food99InfoText}>
                      {global.t?.t('orders', 'label', 'virtualPhone')}: {food99Delivery.virtual_phone_number}
                    </Text>
                  )}

                  {!!food99SelectedPaymentLabel && (
                    <Text style={localStyles.food99InfoTextStrong}>
                      {global.t?.t('orders', 'label', 'selectedPaymentMethod')}: {food99SelectedPaymentLabel}
                    </Text>
                  )}
                  {!!food99PaymentMethodValue && (
                    <Text style={localStyles.food99InfoText}>
                      {global.t?.t('orders', 'label', 'paymentMethod')}: {food99PaymentMethodValue}
                    </Text>
                  )}
                  {!!food99PaymentChannelValue && (
                    <Text style={localStyles.food99InfoText}>
                      {global.t?.t('orders', 'label', 'paymentChannel')}: {food99PaymentChannelValue}
                    </Text>
                  )}
                  {shouldShowCollectOnDelivery && (
                    <Text style={localStyles.food99InfoTextStrong}>
                      {global.t?.t('orders', 'label', 'collectFromCustomer')}: {Formatter.formatMoney(food99CashCollectionAmount || 0)}
                    </Text>
                  )}
                  {food99ChangeFor > 0 ? (
                    <Text style={localStyles.food99InfoText}>
                      {global.t?.t('orders', 'label', 'changeFor')}: {Formatter.formatMoney(food99ChangeFor)}
                    </Text>
                  ) : isCashPaymentSelection ? (
                    <Text style={localStyles.food99InfoText}>{global.t?.t('orders', 'message', 'changeNotRequested')}</Text>
                  ) : null}
                  {food99NeedsChange ? (
                    <Text style={localStyles.food99InfoText}>
                      {global.t?.t('orders', 'label', 'changeToReturn')}: {Formatter.formatMoney(food99ChangeAmount)}
                    </Text>
                  ) : null}
                  {food99ShopPaidMoney > 0 ? (
                    <Text style={localStyles.food99InfoText}>
                      {global.t?.t('orders', 'label', 'courierTransferToMerchant')}: {Formatter.formatMoney(food99ShopPaidMoney)}
                    </Text>
                  ) : null}
                  <View style={localStyles.food99SummaryBlock}>
                    <Text style={localStyles.food99SummaryTitle}>{localInvoicesSectionTitle}</Text>
                    {renderLocalInvoiceCards('details')}
                  </View>
                  {hasFood99CancellationInfo && (
                    <View style={localStyles.food99SummaryBlock}>
                      <Text style={localStyles.food99SummaryTitle}>{global.t?.t('orders', 'title', 'cancellation')}</Text>
                      {!!food99CancellationSourceLabel && (
                        <Text style={localStyles.food99InfoText}>
                          {global.t?.t('orders', 'label', 'origin')}: {food99CancellationSourceLabel}
                        </Text>
                      )}
                      {!!food99Integration?.cancel_code && (
                        <Text style={localStyles.food99InfoText}>
                          {global.t?.t('orders', 'label', 'code')}: {food99Integration.cancel_code}
                        </Text>
                      )}
                      {!!food99Integration?.cancel_reason && (
                        <Text style={localStyles.food99InfoText}>
                          {global.t?.t('orders', 'label', 'leadSource')}: {food99Integration.cancel_reason}
                        </Text>
                      )}
                    </View>
                  )}

                  {food99Financial && (
                    <View style={localStyles.food99SummaryBlock}>
                      <Text style={localStyles.food99SummaryTitle}>
                        {isIfoodOrder ? global.t?.t('orders', 'title', 'ifoodFinancialSummary') : global.t?.t('orders', 'title', 'food99FinancialSummary')}
                      </Text>
                      <Text style={localStyles.food99InfoText}>
                        {global.t?.t('orders', 'label', 'items')}: {Formatter.formatMoney(food99Financial.items_total || 0)}
                      </Text>
                      <Text style={localStyles.food99InfoText}>
                        {global.t?.t('orders', 'label', 'delivery')}: {Formatter.formatMoney(food99Financial.delivery_fee || 0)}
                      </Text>
                      {!!Number(food99Financial.service_fee || 0) && (
                        <Text style={localStyles.food99InfoText}>
                          {global.t?.t('orders', 'label', 'serviceFee')}: {Formatter.formatMoney(food99Financial.service_fee || 0)}
                        </Text>
                      )}
                      {!!Number(food99Financial.small_order_fee || 0) && (
                        <Text style={localStyles.food99InfoText}>
                          {global.t?.t('orders', 'label', 'minimumOrderFee')}: {Formatter.formatMoney(food99Financial.small_order_fee || 0)}
                        </Text>
                      )}
                      {!!Number(food99Financial.meal_top_up_fee || 0) && (
                        <Text style={localStyles.food99InfoText}>
                          {global.t?.t('orders', 'label', 'topUpFee')}: {Formatter.formatMoney(food99Financial.meal_top_up_fee || 0)}
                        </Text>
                      )}
                      {!!Number(food99Financial.discount_total || 0) && (
                        <>
                          <Text style={localStyles.food99InfoText}>
                            {global.t?.t('orders', 'label', 'totalDiscounts')}: {Formatter.formatMoney(food99Financial.discount_total || 0)}
                          </Text>
                          <Text style={localStyles.food99InfoText}>
                            {global.t?.t('orders', 'label', 'itemDiscount')}: {Formatter.formatMoney(food99Financial.items_discount_total || 0)}
                          </Text>
                          <Text style={localStyles.food99InfoText}>
                            {global.t?.t('orders', 'label', 'deliveryDiscount')}: {Formatter.formatMoney(food99Financial.delivery_discount_total || 0)}
                          </Text>
                          <Text style={localStyles.food99InfoText}>
                            {global.t?.t('orders', 'label', 'couponDiscount')}: {Formatter.formatMoney(food99Financial.coupon_discount_total || 0)}
                          </Text>
                        </>
                      )}
                      {!!Number(food99Financial.store_discount_total || 0) && (
                        <Text style={localStyles.food99InfoText}>
                          {global.t?.t('orders', 'label', 'storeSubsidizedDiscount')}: {Formatter.formatMoney(food99Financial.store_discount_total || 0)}
                        </Text>
                      )}
                      {!!Number(food99Financial.platform_discount_total || 0) && (
                        <Text style={localStyles.food99InfoText}>
                          {global.t?.t('orders', 'label', 'platformSubsidizedDiscount')}: {Formatter.formatMoney(food99Financial.platform_discount_total || 0)}
                        </Text>
                      )}
                      <Text style={localStyles.food99InfoTextStrong}>
                        {global.t?.t('orders', 'label', 'customerTotal')}: {Formatter.formatMoney(food99Financial.customer_total || 0)}
                      </Text>
                      {shouldShowCollectOnDelivery && (
                        <Text style={localStyles.food99InfoTextStrong}>
                          {collectOnDeliveryLabel}: {Formatter.formatMoney(food99CashCollectionAmount || 0)}
                        </Text>
                      )}
                    </View>
                  )}

                  {(localOrderAddressParts.primary ||
                    localOrderAddressParts.streetLine ||
                    localOrderAddressParts.district ||
                    localOrderAddressParts.cityStateLine ||
                    localOrderAddressParts.postalCode ||
                    localOrderAddressParts.nickname ||
                    localOrderAddressParts.complement) && (
                    <View style={localStyles.food99SummaryBlock}>
                      <Text style={localStyles.food99SummaryTitle}>{global.t?.t('orders', 'title', 'customerAddress')}</Text>
                      {!!localOrderAddressParts.primary && (
                        <Text style={localStyles.food99InfoText}>{localOrderAddressParts.primary}</Text>
                      )}
                      {!!localOrderAddressParts.streetLine && (
                        <Text style={localStyles.food99InfoText}>
                          Rua/numero: {localOrderAddressParts.streetLine}
                        </Text>
                      )}
                      {!!localOrderAddressParts.district && (
                        <Text style={localStyles.food99InfoText}>
                          Bairro: {localOrderAddressParts.district}
                        </Text>
                      )}
                      {!!localOrderAddressParts.cityStateLine && (
                        <Text style={localStyles.food99InfoText}>
                          Cidade/UF: {localOrderAddressParts.cityStateLine}
                        </Text>
                      )}
                      {!!localOrderAddressParts.postalCode && (
                        <Text style={localStyles.food99InfoText}>
                          CEP: {localOrderAddressParts.postalCode}
                        </Text>
                      )}
                      {!!localOrderAddressParts.nickname && (
                        <Text style={localStyles.food99InfoText}>
                          Referencia: {localOrderAddressParts.nickname}
                        </Text>
                      )}
                      {!!localOrderAddressParts.complement && (
                        <Text style={localStyles.food99InfoText}>
                          Complemento: {localOrderAddressParts.complement}
                        </Text>
                      )}
                    </View>
                  )}

                  {isScheduledOrder && (
                    <View style={localStyles.scheduledDeliveryBanner}>
                      <Text style={localStyles.scheduledDeliveryLabel}>⏰ {global.t?.t('orders', 'title', 'scheduledDelivery')}</Text>
                      {!!scheduledWindowLabel && (
                        <Text style={localStyles.scheduledDeliveryDate}>{global.t?.t('orders', 'label', 'window')}: {scheduledWindowLabel}</Text>
                      )}
                      {!!scheduledDeliveryDateTimeRaw && (
                        <Text style={localStyles.scheduledDeliveryDate}>
                          {global.t?.t('orders', 'label', 'delivery')}: {formatScheduledDate(scheduledDeliveryDateTimeRaw)}
                        </Text>
                      )}
                      {!!scheduledPreparationStartRaw && (
                        <Text style={localStyles.scheduledDeliveryDate}>
                          {global.t?.t('orders', 'label', 'startPreparation')}: {formatScheduledDate(scheduledPreparationStartRaw)}
                        </Text>
                      )}
                    </View>
                  )}

                  {ifoodTaxDocumentRequested && (
                    <View style={localStyles.taxDocumentBanner}>
                      <Text style={localStyles.taxDocumentLabel}>{ifoodTaxDocumentTitle}</Text>
                      <Text style={localStyles.taxDocumentText}>
                        {global.t?.t('orders', 'message', 'customerRequestedTaxDocument') || 'Cliente solicitou documento fiscal neste pedido.'}
                      </Text>
                      {!!orderCustomerDocument && (
                        <Text style={localStyles.taxDocumentText}>
                          {orderCustomerDocumentLabel}: {orderCustomerDocument}
                        </Text>
                      )}
                    </View>
                  )}

                  {(orderCustomerName || orderCustomerPhone || orderCustomerDocument) && (
                    <View style={localStyles.food99SummaryBlock}>
                      <Text style={localStyles.food99SummaryTitle}>{global.t?.t('orders', 'title', 'customer')}</Text>
                      {!!orderCustomerName && (
                        <Text style={localStyles.food99InfoText}>{orderCustomerName}</Text>
                      )}
                      {!!orderCustomerPhone && (
                        <Text style={localStyles.food99InfoText}>{orderCustomerPhone}</Text>
                      )}
                      {!!orderCustomerDocument && (
                        <Text style={localStyles.food99InfoText}>{orderCustomerDocumentLabel}: {orderCustomerDocument}</Text>
                      )}
                    </View>
                  )}

                  {showOrderObservationCard && (
                    <View style={localStyles.food99SummaryBlock}>
                      <Text style={localStyles.food99SummaryTitle}>{global.t?.t('orders', 'title', 'observations')}</Text>
                      <Text style={localStyles.food99InfoText}>{orderObservationText}</Text>
                      {shouldShowFood99ItemRemarks && (
                        <Text style={localStyles.food99InfoText}>
                          {global.t?.t('orders', 'label', 'itemsObservation') || 'Observações dos itens'}: {food99ItemRemarksText}
                        </Text>
                      )}
                      {food99Notes?.need_cutlery !== null &&
                        food99Notes?.need_cutlery !== undefined && (
                          <Text style={localStyles.food99InfoText}>
                            {global.t?.t('orders', 'label', 'needCutlery')}: {food99Notes?.need_cutlery ? global.t?.t('orders', 'label', 'yes') : global.t?.t('orders', 'label', 'no')}
                          </Text>
                        )}
                    </View>
                  )}

                  {food99Delivery?.is_platform_delivery ? (
                    <Text style={localStyles.food99InfoHint}>
                      {global.t?.t('orders', 'message', 'platformHandlesDeliveryAfterReady')}
                    </Text>
                  ) : null}


                  {!!lastActionAgeLabel && (
                    <Text style={localStyles.food99InfoText}>
                      {global.t?.t('orders', 'label', 'lastAction')}: {lastActionAgeLabel}
                    </Text>
                  )}

                  {!!lastReconcileAgeLabel && (
                    <Text style={localStyles.food99InfoText}>
                      {global.t?.t('orders', 'label', 'lastReconciliation')}: {lastReconcileAgeLabel}
                    </Text>
                  )}

                  {shouldHideReadyFood99Action ? (
                    <Text style={localStyles.food99InfoHint}>
                      {global.t?.t('orders', 'message', 'orderReadyWaitingPlatform')} {isIfoodOrder ? 'iFood' : '99Food'}.
                    </Text>
                  ) : null}

                  {hasFood99SyncIssue ? (
                    <Text style={localStyles.food99InfoWarning}>
                      {global.t?.t('orders', 'message', 'integrationDivergenceTapRefresh')}
                    </Text>
                  ) : null}

                </View>
              )}

              {isFood99Order || isIfoodOrder ? (
                shouldShowMarketplaceKdsActionRow ? (
                  <View style={localStyles.kdsActionRow}>
                    {canConfirmIfoodOrder && (
                      <TouchableOpacity
                        onPress={() => runOrderAction('confirm')}
                        disabled={!!food99ActionLoading}
                        style={[
                          localStyles.kdsActionButton,
                          localStyles.kdsActionPrimary,
                          food99ActionLoading && localStyles.kdsActionButtonDisabled,
                        ]}
                      >
                        {food99ActionLoading === 'confirm' ? (
                          <ActivityIndicator size="small" color="#F8FAFC" />
                        ) : (
                          <Text style={localStyles.kdsActionText}>{global.t?.t('orders', 'button', 'confirm')}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    {canCancelFood99Order && (
                      <TouchableOpacity
                        onPress={handleCancelOrderPress}
                        disabled={!!food99ActionLoading || !!food99CancelReasonsLoading}
                        style={[
                          localStyles.kdsActionButton,
                          localStyles.kdsActionDanger,
                          (food99ActionLoading || food99CancelReasonsLoading) &&
                            localStyles.kdsActionButtonDisabled,
                        ]}
                      >
                        {food99ActionLoading === 'cancel' || food99CancelReasonsLoading ? (
                          <ActivityIndicator size="small" color="#F8FAFC" />
                        ) : (
                          <Text style={localStyles.kdsActionText}>{global.t?.t('orders', 'button', 'cancel')}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    {canReadyFood99Order && (
                      <TouchableOpacity
                        onPress={() => runFood99OrderAction('ready')}
                        disabled={!!food99ActionLoading}
                        style={[
                          localStyles.kdsActionButton,
                          localStyles.kdsActionPrimary,
                          food99ActionLoading && localStyles.kdsActionButtonDisabled,
                        ]}
                      >
                        {food99ActionLoading === 'ready' ? (
                          <ActivityIndicator size="small" color="#F8FAFC" />
                        ) : (
                          <Text style={localStyles.kdsActionText}>{marketplaceReadyActionLabel}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    {shouldShowFood99DeliveryAction && (
                      <TouchableOpacity
                        onPress={handleFood99DeliveredPress}
                        disabled={!!food99ActionLoading}
                        style={[
                          localStyles.kdsActionButton,
                          localStyles.kdsActionSuccess,
                          food99ActionLoading &&
                            localStyles.kdsActionButtonDisabled,
                        ]}
                      >
                        {food99ActionLoading === 'delivered' ? (
                          <ActivityIndicator size="small" color="#F8FAFC" />
                        ) : (
                          <Text style={localStyles.kdsActionText}>{global.t?.t('orders', 'button', 'deliverOrder')}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    {canFinalizeFood99Order && (
                      <TouchableOpacity
                        onPress={() => runOrderAction('finalize')}
                        disabled={!!orderActionLoading || !!food99ActionLoading}
                        style={[
                          localStyles.kdsActionButton,
                          localStyles.kdsActionSuccess,
                          (!!orderActionLoading || !!food99ActionLoading) && localStyles.kdsActionButtonDisabled,
                        ]}
                      >
                        {orderActionLoading === 'finalize' ? (
                          <ActivityIndicator size="small" color="#F8FAFC" />
                        ) : (
                          <Text style={localStyles.kdsActionText}>{global.t?.t('orders', 'button', 'finalize') || 'Finalizar'}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null
              ) : (
                shouldShowGenericKdsActionRow ? (
                  <View style={localStyles.kdsActionRow}>
                    {canGenericConfirmOrder && (
                      <TouchableOpacity
                        onPress={handleConfirmGenericOrder}
                        disabled={orderActionLoading === 'confirm'}
                        style={[
                          localStyles.kdsActionButton,
                          localStyles.kdsActionPrimary,
                          orderActionLoading === 'confirm' && localStyles.kdsActionButtonDisabled,
                        ]}
                      >
                        {orderActionLoading === 'confirm' ? (
                          <ActivityIndicator size="small" color="#F8FAFC" />
                        ) : (
                          <Text style={localStyles.kdsActionText}>
                            {global.t?.t('orders', 'label', 'startPreparation') || 'Iniciar preparo'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                    {shouldShowKdsCancel && (
                      <TouchableOpacity
                        onPress={handleCancelOrderPress}
                        disabled={orderActionLoading === 'cancel'}
                        style={[
                          localStyles.kdsActionButton,
                          localStyles.kdsActionDanger,
                          orderActionLoading === 'cancel' && localStyles.kdsActionButtonDisabled,
                        ]}
                      >
                        {orderActionLoading === 'cancel' ? (
                          <ActivityIndicator size="small" color="#F8FAFC" />
                        ) : (
                          <Text style={localStyles.kdsActionText}>{global.t?.t('orders', 'button', 'cancel')}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    {canGenericReadyOrder && (
                      <TouchableOpacity
                        onPress={handleMarkOrderAsReady}
                        disabled={orderActionLoading === 'ready'}
                        style={[
                          localStyles.kdsActionButton,
                          localStyles.kdsActionPrimary,
                          orderActionLoading === 'ready' && localStyles.kdsActionButtonDisabled,
                        ]}
                      >
                        {orderActionLoading === 'ready' ? (
                          <ActivityIndicator size="small" color="#F8FAFC" />
                        ) : (
                          <Text style={localStyles.kdsActionText}>{global.t?.t('orders', 'button', 'orderReady')}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    {canGenericDeliveredOrder && (
                      <TouchableOpacity
                        onPress={handleDeliverGenericOrder}
                        disabled={orderActionLoading === 'delivered'}
                        style={[
                          localStyles.kdsActionButton,
                          localStyles.kdsActionSuccess,
                          orderActionLoading === 'delivered' && localStyles.kdsActionButtonDisabled,
                        ]}
                      >
                        {orderActionLoading === 'delivered' ? (
                          <ActivityIndicator size="small" color="#F8FAFC" />
                        ) : (
                          <Text style={localStyles.kdsActionText}>{global.t?.t('orders', 'button', 'deliverOrder')}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    {canFinalizeGenericOrder && (
                      <TouchableOpacity
                        onPress={handleFinalizeGenericOrder}
                        disabled={orderActionLoading === 'finalize'}
                        style={[
                          localStyles.kdsActionButton,
                          localStyles.kdsActionSuccess,
                          orderActionLoading === 'finalize' && localStyles.kdsActionButtonDisabled,
                        ]}
                      >
                        {orderActionLoading === 'finalize' ? (
                          <ActivityIndicator size="small" color="#F8FAFC" />
                        ) : (
                          <Text style={localStyles.kdsActionText}>{global.t?.t('orders', 'button', 'finalize') || 'Finalizar'}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null
              )}

              <View style={localStyles.kdsActionRow}>
                {showBarcodeInput && canAddProductsToOrder && (
                  <TouchableOpacity
                    onPress={handleAddProduct}
                    style={[localStyles.kdsActionButton, localStyles.kdsActionPrimary]}
                  >
                    <Icon name="add-circle" size={18} color="#fff" />
                    <Text style={[localStyles.kdsActionText, { marginLeft: 6 }]}>{global.t?.t('orders', 'button', 'addItem')}</Text>
                  </TouchableOpacity>
                )}

                {canAddOrderPayment && (
                  <TouchableOpacity
                    onPress={handleAddPayment}
                    style={[localStyles.kdsActionButton, localStyles.kdsActionPrimary]}
                  >
                    <Icon name="payments" size={18} color="#fff" />
                    <Text style={[localStyles.kdsActionText, { marginLeft: 6 }]}>
                      {global.t?.t('orders', 'button', 'pay') || 'Pagar'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleOrderTools}
                  style={[localStyles.kdsActionButton, localStyles.kdsActionPrimary]}
                >
                  <Icon name="settings" size={18} color="#fff" />
                  <Text style={[localStyles.kdsActionText, { marginLeft: 6 }]}>{global.t?.t('orders', 'button', 'details')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )) : (
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
                      {global.t?.t('orders', 'button', 'addItem')}
                    </Text>
                  </TouchableOpacity>
                )}

                {canEditItems && (
                  <TouchableOpacity
                    onPress={() => { setEditMode(m => !m); setConfirmRemoveItemId(null) }}
                    style={[globalStyles.button, { marginRight: 5, backgroundColor: editMode ? '#F59E0B' : undefined }]}
                  >
                    <Icon name={editMode ? 'check' : 'edit'} size={24} color="#fff" />
                    <Text style={{ color: '#fff', marginLeft: 8 }}>
                      {editMode ? 'Concluir edição' : 'Editar itens'}
                    </Text>
                  </TouchableOpacity>
                )}

                {canAddOrderPayment && (
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

          {isKds ? null : (
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
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
                {canEditItems && editMode
                  ? (
                    <React.Fragment>
                      {(item?.orderProducts || []).map(op => {
                        const opId = String(op?.id || '')
                        const name = op?.product?.product || op?.product?.name || 'Item'
                        const qty = Number(op?.quantity || 0)
                        const price = Number(op?.unitPrice || op?.price || 0)
                        const unitLabel = resolveOrderItemUnitLabel(op)
                        const isOpLoading = opLoadingId === opId
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
                                  disabled={!!opLoadingId}
                                >
                                  {isOpLoading
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Icon name="check" size={15} color="#fff" />}
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => setConfirmRemoveItemId(null)}
                                  style={localStyles.editConfirmNo}
                                  disabled={!!opLoadingId}
                                >
                                  <Icon name="close" size={15} color="#fff" />
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <View style={localStyles.editQtyRow}>
                                <TouchableOpacity
                                  onPress={() => {
                                    if (qty <= 1) setConfirmRemoveItemId(opId)
                                    else handleUpdateOpQuantity(op, qty - 1)
                                  }}
                                  disabled={!!opLoadingId}
                                  style={localStyles.editQtyBtn}
                                >
                                  <Icon name={qty <= 1 ? 'delete' : 'remove'} size={18} color={qty <= 1 ? '#EF4444' : ppcColors.textPrimary} />
                                </TouchableOpacity>
                                <View style={localStyles.editQtyBox}>
                                  {isOpLoading
                                    ? <ActivityIndicator size="small" color={ppcColors.primary} />
                                    : <Text style={localStyles.editQtyText}>{qty}</Text>}
                                </View>
                                <TouchableOpacity
                                  onPress={() => handleUpdateOpQuantity(op, qty + 1)}
                                  disabled={!!opLoadingId}
                                  style={localStyles.editQtyBtn}
                                >
                                  <Icon name="add" size={18} color={ppcColors.textPrimary} />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        )
                      })}
                      <View style={localStyles.editAddWrap}>
                        <View style={[localStyles.editAddSearch, { borderColor: ppcColors.border, backgroundColor: ppcColors.cardBg }]}>
                          <Icon name="search" size={16} color={ppcColors.textSecondary} />
                          <TextInput
                            value={addProductQuery}
                            onChangeText={v => { setAddProductQuery(v); searchProducts(v) }}
                            placeholder="Buscar produto para adicionar..."
                            placeholderTextColor={ppcColors.textSecondary}
                            style={{ flex: 1, color: ppcColors.textPrimary, fontSize: 14, paddingVertical: 0 }}
                          />
                          {productSearchLoading && <ActivityIndicator size="small" color={ppcColors.primary} />}
                        </View>
                        {addProductQuery.trim().length > 0 && (productSearchResults || []).map(p => {
                          const pid = String(p?.id || '')
                          const pname = p?.product || p?.name || 'Produto'
                          const pprice = Number(p?.price || 0)
                          const isAdding = addingProductId === pid
                          return (
                            <TouchableOpacity
                              key={pid || p['@id']}
                              onPress={() => handleAddProductInline(p)}
                              disabled={!!addingProductId}
                              style={[localStyles.editAddResult, { borderColor: ppcColors.borderSoft }]}
                              activeOpacity={0.7}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[localStyles.editAddResultName, { color: ppcColors.textPrimary }]} numberOfLines={1}>{pname}</Text>
                                {pprice > 0 && <Text style={[localStyles.editAddResultPrice, { color: ppcColors.textSecondary }]}>{Formatter.formatMoney(pprice)}</Text>}
                              </View>
                              {isAdding
                                ? <ActivityIndicator size="small" color={ppcColors.primary} />
                                : <Icon name="add-circle" size={22} color={ppcColors.primary} />}
                            </TouchableOpacity>
                          )
                        })}
                      </View>
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

          {isKds && shouldShowMobileBottomActions && (
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

const createStyles = (scale, palette, windowHeight = 800) =>
  StyleSheet.create({
    topBarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginRight: 6,
    },
    topBarIconButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      backgroundColor: palette.cardBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarIconButtonDisabled: {
      opacity: 0.5,
    },
    topBarTitleWrap: {
      alignItems: 'flex-start',
      justifyContent: 'center',
      minWidth: 180,
      marginTop: 1,
    },
    topBarTitleText: {
      color: palette.textPrimary,
      fontSize: 23 * scale,
      fontWeight: '900',
      lineHeight: 24 * scale,
    },
    topBarTitleSubText: {
      marginTop: 1,
      color: palette.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      lineHeight: 14,
    },
    mobileOrderScrollContent: {
      paddingBottom: 126,
    },
    mobileOrderLayout: {
      gap: 10,
    },
    mobileSummaryCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      backgroundColor: palette.cardBg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 2,
    },
    mobileSummaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      gap: 10,
    },
    mobileSummaryOriginWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 8,
    },
    mobileSummaryOriginIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      backgroundColor: palette.cardBgSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mobileSummaryLabel: {
      color: palette.textSecondary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    mobileSummaryValue: {
      color: palette.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    mobileStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: palette.cardBgSoft,
    },
    mobileStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      marginRight: 6,
    },
    mobileStatusText: {
      color: palette.textPrimary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    mobileSummaryMetricsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    mobileDiscountPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      backgroundColor: palette.cardBgSoft,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    mobileDiscountText: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    mobileWaitingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.danger,
      backgroundColor: palette.dangerBg,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    mobileWaitingText: {
      color: palette.dangerText,
      fontSize: 12,
      fontWeight: '800',
    },
    mobileSummaryFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: palette.border,
      paddingTop: 8,
      marginTop: 2,
      marginBottom: 6,
    },
    mobileTotalLabel: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    mobileTotalValue: {
      color: palette.accentInfo,
      fontSize: 34 * scale,
      fontWeight: '900',
      lineHeight: 36 * scale,
    },
    mobileSummaryMetaList: {
      marginTop: 2,
      gap: 3,
    },
    mobileSummaryMetaText: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    remoteStateBadge: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    remoteStateBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    mobileInfoCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      backgroundColor: palette.cardBg,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 10,
    },
    mobileInfoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    mobileInfoIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      backgroundColor: palette.cardBgSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mobileInfoTextWrap: {
      flex: 1,
    },
    mobileInfoLabel: {
      color: palette.textSecondary,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
      marginBottom: 1,
    },
    mobileInfoTitle: {
      color: palette.textPrimary,
      fontSize: 21 * scale,
      fontWeight: '900',
    },
    mobileInfoSubtitle: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 18,
      marginTop: 2,
    },
    orderInvoiceBlockHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    orderInvoiceCounter: {
      color: palette.textSecondary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    orderInvoiceList: {
      gap: 8,
    },
    orderInvoiceCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBgSoft,
      paddingHorizontal: 11,
      paddingVertical: 10,
      gap: 6,
    },
    orderInvoiceCardDetails: {
      backgroundColor: palette.cardBg,
    },
    orderInvoiceCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    orderInvoiceTitleWrap: {
      flex: 1,
      gap: 2,
    },
    orderInvoiceTitle: {
      color: palette.textPrimary,
      fontSize: 14 * scale,
      fontWeight: '800',
      lineHeight: 18 * scale,
    },
    orderInvoiceSubtitle: {
      color: palette.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      lineHeight: 16,
    },
    orderInvoiceStatusBadge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    },
    orderInvoiceStatusText: {
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    orderInvoiceAmount: {
      color: palette.textPrimary,
      fontSize: 24 * scale,
      fontWeight: '900',
      lineHeight: 26 * scale,
    },
    orderInvoiceKind: {
      color: palette.textPrimary,
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 17,
    },
    orderInvoiceMeta: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 17,
    },
    mobileAddressCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBgSoft,
      paddingHorizontal: 10,
      paddingVertical: 9,
      flexDirection: 'row',
      gap: 8,
    },
    mobileAddressTextWrap: {
      flex: 1,
    },
    mobileAddressPrimary: {
      color: palette.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 19,
    },
    mobileAddressSecondary: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 18,
      marginTop: 2,
    },
    mobileNoteCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.accent,
      backgroundColor: palette.cardBgSoft,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    mobileNoteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    mobileNoteLabel: {
      color: palette.accent,
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    mobileNoteText: {
      color: palette.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    },
    mobilePaymentGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    mobilePaymentMetricCard: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      backgroundColor: palette.cardBg,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    mobilePaymentMetricLabel: {
      color: palette.textSecondary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 4,
      letterSpacing: 0.6,
    },
    mobilePaymentMetricValue: {
      color: palette.textPrimary,
      fontSize: 30 * scale,
      fontWeight: '900',
      lineHeight: 32 * scale,
    },
    mobilePaymentPendingValue: {
      color: '#D97706',
    },
    mobilePaymentMetricHint: {
      color: palette.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 4,
    },
    mobileWarningCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.danger,
      backgroundColor: palette.dangerBg,
      paddingHorizontal: 11,
      paddingVertical: 9,
      gap: 4,
    },
    mobileWarningText: {
      color: palette.dangerText,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 17,
    },
    mobileProductsCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      backgroundColor: palette.cardBg,
      paddingHorizontal: 10,
      paddingVertical: 10,
      marginTop: 4,
      marginBottom: 6,
    },
    mobileProductsTitle: {
      color: palette.textSecondary,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    purchaseItemRow: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: palette.cardBgSoft,
      marginBottom: 6,
      borderLeftWidth: 3,
      borderLeftColor: '#D97706',
    },
    purchaseItemTop: {
      flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
    },
    purchaseItemName: {
      flex: 1, fontSize: 14 * scale, fontWeight: '700', color: palette.textPrimary,
    },
    purchaseItemQty: {
      fontSize: 14 * scale, fontWeight: '800', color: '#D97706',
    },
    purchaseItemDesc: {
      fontSize: 12 * scale, color: palette.textSecondary, marginTop: 2,
    },
    purchaseItemComment: {
      fontSize: 12 * scale, color: palette.textSecondary, fontStyle: 'italic', marginTop: 4,
    },
    purchaseItemPriceRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6,
    },
    purchaseItemUnit: {
      fontSize: 12 * scale, color: palette.textSecondary,
    },
    purchaseItemTotal: {
      fontSize: 14 * scale, fontWeight: '800', color: '#D97706',
    },

    /* edição inline de itens */
    editItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderSoft,
      gap: 8,
    },
    editItemName: {
      fontSize: 14 * scale,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    editItemPrice: {
      fontSize: 12 * scale,
      color: palette.textSecondary,
      marginTop: 2,
    },
    editQtyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    editQtyBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.cardBgSoft,
    },
    editQtyBox: {
      minWidth: 38,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.cardBg,
      borderWidth: 1,
      borderColor: palette.borderSoft,
    },
    editQtyText: {
      fontSize: 15 * scale,
      fontWeight: '900',
      color: palette.textPrimary,
    },
    editConfirmRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    editConfirmText: {
      fontSize: 12 * scale,
      color: '#EF4444',
      fontWeight: '700',
    },
    editConfirmYes: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    editConfirmNo: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: palette.textSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editAddWrap: {
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: palette.borderSoft,
      paddingTop: 8,
    },
    editAddSearch: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    editAddResult: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      gap: 8,
    },
    editAddResultName: {
      fontSize: 14 * scale,
      fontWeight: '700',
    },
    editAddResultPrice: {
      fontSize: 12 * scale,
      marginTop: 1,
    },

    mobileProductItemRow: {
      marginTop: 4,
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderLeftWidth: 4,
      borderRadius: 10,
      backgroundColor: palette.cardBgSoft,
    },
    mobileProductText: {
      color: palette.textPrimary,
      fontSize: 16 * scale,
      fontWeight: '800',
    },
    mobileProductSubText: {
      color: palette.textSecondary,
      fontSize: 13 * scale,
      fontWeight: '700',
    },
    mobileProductQtyText: {
      color: palette.accentInfo,
      fontWeight: '900',
    },
    mobileProductStatusMarker: {
      fontWeight: '900',
    },
    mobileBottomActionsWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: palette.panelBg,
      paddingTop: 8,
      paddingBottom: 10,
      paddingHorizontal: 12,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 10,
    },
    mobileCancelActionButton: {
      width: 48,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.danger,
      backgroundColor: palette.dangerBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mobilePrimaryActionButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.primary,
      backgroundColor: palette.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 8,
      elevation: 6,
    },
    mobilePrimaryActionText: {
      color: '#FFFFFF',
      fontSize: 17 * scale,
      fontWeight: '900',
      letterSpacing: 0.2,
    },
    mobileActionButtonDisabled: {
      opacity: 0.55,
    },
    itemRow: {
      marginTop: 6 * scale,
      paddingVertical: 6 * scale,
      paddingLeft: 9 * scale,
      borderLeftWidth: 5,
      borderRadius: 10,
      backgroundColor: '#101927',
    },
    text: {
      color: '#F8FAFC',
      fontSize: 17 * scale,
      fontWeight: '800',
    },
    subText: {
      color: '#CBD5E1',
      fontSize: 14 * scale,
      fontWeight: '600',
    },
    qtyText: {
      color: '#FACC15',
      fontWeight: '900',
    },
    statusMarker: {
      fontWeight: '900',
    },
    kdsContainer: {
      backgroundColor: palette.appBg,
    },
    food99InfoCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#163047',
      backgroundColor: '#0A1420',
      padding: 12,
      marginBottom: 10,
    },
    food99InfoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    food99InfoHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    food99InfoTitle: {
      color: '#E2E8F0',
      fontSize: 15,
      fontWeight: '800',
    },
    food99InfoBadge: {
      color: '#7DD3FC',
      fontSize: 12,
      fontWeight: '700',
    },
    food99InfoText: {
      color: '#CBD5E1',
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 4,
    },
    food99InfoTextStrong: {
      color: '#F8FAFC',
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 4,
    },
    food99InfoHint: {
      color: '#FCD34D',
      fontSize: 12,
      fontWeight: '700',
      marginTop: 6,
    },
    food99RefreshButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: '#1D4ED8',
      backgroundColor: '#0F172A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    food99RefreshButtonDisabled: {
      opacity: 0.55,
    },
    food99SummaryRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
      marginBottom: 2,
    },
    food99SummaryPill: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#1E3A5F',
      backgroundColor: '#0B1220',
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    food99SummaryLabel: {
      color: '#93C5FD',
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 3,
    },
    food99SummaryValue: {
      color: '#F8FAFC',
      fontSize: 14,
      fontWeight: '800',
    },
    food99SummaryBlock: {
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#1E293B',
      backgroundColor: '#0B1220',
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    food99SummaryTitle: {
      color: '#93C5FD',
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    scheduledDeliveryBanner: {
      marginTop: 8,
      marginBottom: 4,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#F59E0B',
      backgroundColor: '#451A03',
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    scheduledDeliveryLabel: {
      color: '#FCD34D',
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    scheduledDeliveryDate: {
      color: '#FDE68A',
      fontSize: 13,
      fontWeight: '700',
      marginTop: 3,
    },
    taxDocumentBanner: {
      marginTop: 8,
      marginBottom: 4,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#0891B2',
      backgroundColor: '#082F49',
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    taxDocumentLabel: {
      color: '#67E8F9',
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    taxDocumentText: {
      color: '#CFFAFE',
      fontSize: 13,
      fontWeight: '700',
      marginTop: 3,
      textAlign: 'center',
    },
    cancelReasonModal: {
      width: '100%',
      maxHeight: windowHeight * 0.88,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.modalBg,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 14,
    },
    cancelReasonBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      backgroundColor: palette.cardBgSoft,
      color: palette.accentInfo,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    cancelReasonTitle: {
      color: palette.textPrimary,
      fontSize: 22,
      fontWeight: '900',
      marginBottom: 6,
    },
    cancelReasonDescription: {
      color: palette.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 14,
    },
    cancelReasonLoadingState: {
      minHeight: 120,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    cancelReasonLoadingText: {
      color: palette.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    cancelReasonList: {
      maxHeight: 300,
    },
    cancelReasonListContent: {
      gap: 10,
      paddingBottom: 4,
    },
    cancelReasonOption: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBgSoft,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    cancelReasonOptionSelected: {
      borderColor: palette.accentInfo,
      backgroundColor: palette.cardBg,
    },
    cancelReasonOptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    cancelReasonOptionCode: {
      color: palette.accentInfo,
      fontSize: 11,
      fontWeight: '800',
    },
    cancelReasonOptionBadge: {
      color: palette.accent,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    cancelReasonOptionText: {
      color: palette.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    },
    cancelReasonInputBlock: {
      marginTop: 12,
      marginBottom: 2,
    },
    cancelReasonInputLabel: {
      color: palette.accentInfo,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    cancelReasonInput: {
      minHeight: 82,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBgSoft,
      color: palette.textPrimary,
      fontSize: 16,
      fontWeight: '700',
      paddingHorizontal: 12,
      paddingVertical: 10,
      textAlignVertical: 'top',
    },
    cancelReasonButtonDanger: {
      borderColor: palette.danger,
      backgroundColor: palette.danger,
    },
    detailsModal: {
      width: '100%',
      maxHeight: windowHeight * 0.84,
      minHeight: 320,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.modalBg,
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 14,
    },
    detailsModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 14,
    },
    detailsModalEyebrow: {
      color: palette.accentInfo,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    detailsModalTitle: {
      color: palette.textPrimary,
      fontSize: 26,
      fontWeight: '900',
    },
    detailsModalCloseButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBgSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailsModalScroll: {
      flex: 1,
    },
    detailsModalScrollContent: {
      paddingBottom: 20,
      gap: 12,
    },
    detailsMarkPaidButton: {
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.accentInfo,
      backgroundColor: palette.accentInfo,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    detailsMarkPaidButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
    detailsGrid: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    detailsCard: {
      flexGrow: 1,
      minWidth: 180,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBgSoft,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    detailsCardLabel: {
      color: palette.accentInfo,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    detailsCardValue: {
      color: palette.textPrimary,
      fontSize: 17,
      fontWeight: '800',
    },
    detailsSection: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBgSoft,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    detailsSectionTitle: {
      color: palette.accentInfo,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    detailsInfoText: {
      color: palette.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 19,
      marginBottom: 4,
    },
    detailsInfoTextStrong: {
      color: palette.textPrimary,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 19,
      marginBottom: 4,
    },
    detailsLoadingState: {
      minHeight: 120,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBgSoft,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    detailsLoadingText: {
      color: palette.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    kdsActionRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    kdsActionButton: {
      flex: 1,
      borderRadius: 10,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      borderWidth: 1,
    },
    kdsActionPrimary: {
      backgroundColor: '#0B84C6',
      borderColor: '#0B84C6',
    },
    kdsActionDanger: {
      backgroundColor: '#2A1114',
      borderColor: '#7F1D1D',
    },
    kdsActionSuccess: {
      backgroundColor: '#102617',
      borderColor: '#166534',
    },
    kdsActionNeutral: {
      backgroundColor: '#1E293B',
      borderColor: '#334155',
    },
    kdsActionText: {
      color: '#F8FAFC',
      fontSize: 14,
      fontWeight: '700',
    },
    kdsActionButtonDisabled: {
      opacity: 0.6,
    },
    food99InfoWarning: {
      color: palette.dangerText,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 6,
    },
    modalSheetRoot: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: palette.overlay,
      paddingTop: 24,
    },
    modalSheetBackdrop: {
      flex: 1,
    },
    modalSheetWrap: {
      width: '100%',
      maxHeight: windowHeight,
      justifyContent: 'flex-end',
    },
    deliveryCodeModal: {
      width: '100%',
      maxHeight: windowHeight * 0.92,
      minHeight: 360,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.modalBg,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
    },
    deliveryCodeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 10,
    },
    deliveryCodeModalTitle: {
      color: palette.textPrimary,
      fontSize: 24,
      fontWeight: '900',
      marginBottom: 10,
    },
    deliveryCodeCloseButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBgSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deliveryCodeScroll: {
      flex: 1,
    },
    deliveryCodeScrollContent: {
      paddingBottom: 8,
    },
    deliveryCodeStepBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      backgroundColor: palette.cardBgSoft,
      color: palette.accentInfo,
      fontSize: 11,
      fontWeight: '800',
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginBottom: 0,
      overflow: 'hidden',
      textTransform: 'uppercase',
    },
    deliveryCodeTitle: {
      color: palette.textPrimary,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 8,
    },
    deliveryCodeDescription: {
      color: palette.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 14,
    },
    deliveryCodeInput: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBgSoft,
      color: palette.textPrimary,
      minHeight: 52,
      paddingHorizontal: 16,
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: 6,
      textAlign: 'center',
      marginBottom: 10,
    },
    deliveryCodeHelper: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 14,
    },
    deliveryCodeActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: palette.borderSoft,
    },
    deliveryCodeMetaCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBgSoft,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
    },
    deliveryCodeMetaRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    deliveryCodeMetaCardCompact: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBgSoft,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    deliveryCodeMetaLabel: {
      color: palette.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    deliveryCodeMetaValue: {
      color: palette.textPrimary,
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: 2,
    },
    deliveryCodeMetaValueCompact: {
      color: palette.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: 1.5,
    },
    deliveryLocatorHero: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBgSoft,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 12,
    },
    deliveryLocatorHeroValue: {
      color: palette.textPrimary,
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: 4,
      marginBottom: 8,
    },
    deliveryLocatorHeroHelper: {
      color: palette.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 10,
    },
    deliveryLinkCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBgSoft,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
    },
    deliveryLinkUrl: {
      color: palette.accentInfo,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 10,
    },
    deliveryLinkActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    deliveryLinkActionButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardBg,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    deliveryLinkActionText: {
      color: palette.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    deliveryLinkPrimaryButton: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.accentInfo,
      backgroundColor: palette.cardBg,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    deliveryLinkPrimaryButtonText: {
      color: palette.accentInfo,
      fontSize: 12,
      fontWeight: '700',
    },
    deliveryCodeButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    deliveryCodeButtonSecondary: {
      borderColor: palette.border,
      backgroundColor: palette.cardBgSoft,
    },
    deliveryCodeButtonPrimary: {
      borderColor: palette.primary,
      backgroundColor: palette.primary,
    },
    deliveryCodeButtonSecondaryText: {
      color: palette.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    deliveryCodeButtonPrimaryText: {
      color: '#F8FAFC',
      fontSize: 14,
      fontWeight: '800',
    },
  })
export default OrderDetails
