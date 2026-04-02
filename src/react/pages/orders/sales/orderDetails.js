import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Modal,
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
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme'
import { getPlatformCapabilities, getOrderChannelKey, getOrderChannelLabel } from '@assets/ppc/channels'

const formatApiError = error => {
  if (!error) return 'Nao foi possivel concluir a operacao.'
  if (typeof error === 'string') return error
  if (Array.isArray(error?.message)) {
    return error.message
      .map(item => item?.message || item?.title || String(item))
      .filter(Boolean)
      .join('\n')
  }

  return error?.message || error?.description || error?.errmsg || 'Nao foi possivel concluir a operacao.'
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

  if (minutes === 0) return 'Chegando agora'
  if (minutes === 1) return 'Chega em 1 min'
  return `Chega em ${minutes} min`
}

const normalizeErrno = value => String(value ?? '').trim()
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
  'nao informado pela 99',
  'nao informado pelo ifood',
  'canal nao mapeado',
  'metodo nao mapeado',
  'pagamento nao mapeado',
])

const isWeakPaymentLabel = value => weakPaymentLabels.has(normalizeText(value).toLowerCase())

const resolvePreferredMeaningfulText = (...values) => {
  for (const value of values) {
    const normalized = normalizeText(value)
    if (normalized && !isWeakPaymentLabel(normalized)) return normalized
  }

  return ''
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
  const parts = [`Confirmacao de entrega ${platformLabel}`]

  if (locator) {
    parts.push(`Localizador: ${locator}`)
  }

  if (url) {
    parts.push(`Link oficial: ${url}`)
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
  if (minutes === 0) return 'agora'
  if (minutes === 1) return 'ha 1 min'
  return `ha ${minutes} min`
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
  const [markPaidLoading, setMarkPaidLoading] = useState(false)
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
  const { width } = useWindowDimensions()

  const scale = useMemo(() => {
    if (width >= 2200) return 1.15
    if (width >= 1700) return 1.05
    if (width >= 1300) return 0.97
    return 0.92
  }, [width])

  const localStyles = useMemo(() => createStyles(scale, ppcColors), [scale, ppcColors])

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
  const channelLabel = getOrderChannelLabel(item || orderParam) || 'pedido'
  const integrationChannelLabel = isFood99Order
    ? '99Food'
    : isIfoodOrder
      ? 'iFood'
      : String(channelLabel || 'Marketplace')
  const isPurchaseOrder = String(item?.orderType || orderParam?.orderType || '').toLowerCase() === 'purchase'
  const cancelReasonChannelLabel = isIfoodOrder ? 'iFood' : '99Food'
  const [orderCapabilities, setOrderCapabilities] = useState(null)
  const [orderActionLoading, setOrderActionLoading] = useState('')

  useFocusEffect(
    useCallback(() => {
      if (
        invoices &&
        invoices.length === 0 &&
        orderParam &&
        orderParam['@id'] &&
        !isLoading
      ) {
        invoiceActions.getItems({ 'order.order': orderParam['@id'] })
      }
    }, [invoices, orderParam, isLoading]),
  )

  useFocusEffect(
    useCallback(() => {
      if (orderParam && orderParam['@id']) {
        ordersActions.get(orderParam['@id'])
      }
    }, [orderParam]),
  )

  const handleAddProduct = () => {
    navigation.navigate('AddProductScreen')
  }

  const refreshCurrentOrder = useCallback(async () => {
    if (orderParam && orderParam['@id']) {
      await ordersActions.get(orderParam['@id'])
    }
  }, [orderParam, ordersActions])

  const loadOrderCapabilities = useCallback(async () => {
    if (!item?.id) return

    try {
      const response = await api.fetch(`/orders/${item.id}/capabilities`)
      setOrderCapabilities(response || null)
    } catch {
      // silencioso: capabilities sÃ£o complementares ao estado Food99
    }
  }, [item?.id])

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
      if (item?.id) {
        loadOrderCapabilities()
      }
    }, [item?.id, loadOrderCapabilities]),
  )

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

      const currentRemoteOrderStateKey = String(
        food99State?.integration?.remote_order_state || '',
      ).toLowerCase()
      const currentIfoodLastEventType = String(
        food99State?.integration?.last_event_type || '',
      ).toLowerCase()
      const currentIfoodLifecycleKey = currentIfoodLastEventType || currentRemoteOrderStateKey
      const currentIfoodReadyLifecycle =
        isIfoodOrder &&
        (
          ['new', 'open', 'placed', 'confirmed', 'ready', 'delivery_drop_code_requested', 'delivery_drop_code_validating'].includes(currentIfoodLifecycleKey)
        )
      const currentIfoodMerchantDelivery =
        isIfoodOrder &&
        (
          normalizeText(food99State?.delivery?.delivered_by || '').toUpperCase() === 'MERCHANT' ||
          food99State?.delivery?.is_store_delivery === true ||
          normalizeText(food99State?.delivery?.delivery_label || '').toLowerCase().includes('loja')
        )
      const currentIfoodRiderAssigned =
        isIfoodOrder &&
        !!(
          normalizeText(food99State?.delivery?.rider_name || '').trim() ||
          normalizeText(food99State?.delivery?.rider_phone || '').trim() ||
          Number(food99State?.delivery?.rider_to_store_eta || 0) > 0
        )
      const currentIfoodDeliveryActionState =
        isIfoodOrder &&
        ['dispatching', 'delivering', 'courier_to_store', 'picked_up', 'arriving'].includes(currentIfoodLifecycleKey) &&
        !currentIfoodReadyLifecycle &&
        currentIfoodRiderAssigned

      const caps = orderCapabilities || {}
      if (
        (action === 'ready' && caps.can_ready === false && !(isIfoodOrder && currentIfoodReadyLifecycle)) ||
        (action === 'cancel' && caps.can_cancel === false) ||
        (
          action === 'delivered' &&
          caps.can_delivered === false &&
          !(isIfoodOrder && currentIfoodMerchantDelivery && currentIfoodDeliveryActionState)
        ) ||
        (action === 'confirm' && caps.can_confirm === false)
      ) {
        return
      }

      const actionMap = isIfoodOrder
        ? {
            confirm: {
              path: `/marketplace/integrations/ifood/orders/${item.id}/confirm`,
              success: 'Pedido confirmado.',
            },
            ready: {
              path: `/marketplace/integrations/ifood/orders/${item.id}/ready`,
              success: 'Pedido marcado como pronto.',
            },
            cancel: {
              path: `/marketplace/integrations/ifood/orders/${item.id}/cancel`,
              success: 'Pedido cancelado.',
            },
            delivered: {
              path: `/marketplace/integrations/ifood/orders/${item.id}/delivered`,
              success: 'Pedido finalizado.',
            },
          }
        : {
            ready: { path: `/orders/${item.id}/ready`, success: 'Pedido marcado como pronto.' },
            cancel: { path: `/orders/${item.id}/cancel`, success: 'Pedido cancelado.' },
            delivered: { path: `/orders/${item.id}/delivered`, success: 'Pedido finalizado.' },
          }

      const actionConfig = actionMap[action]
      if (!actionConfig) return

      const isActionFood99 = isFood99Order
      const reconcilePath  = `/marketplace/integrations/99food/orders/${item.id}/reconcile`

      try {
        setOrderActionLoading(action)
        setFood99ActionLoading(action)

        const response = await api.fetch(actionConfig.path, {
          method: 'POST',
          body: {
            ...(options?.body || {}),
            ...(options?.deliveryCode ? { delivery_code: options.deliveryCode } : {}),
            ...(options?.locator ? { locator: options.locator } : {}),
          },
        })

        const actionResult = response?.result || response
        if (normalizeErrno(actionResult?.errno) !== '0') {
          throw actionResult || response
        }

        if (response?.capabilities) {
          setOrderCapabilities(response.capabilities)
        } else if (response?.state?.capabilities) {
          setOrderCapabilities(response.state.capabilities)
        }

        if (response?.state && (isActionFood99 || isIfoodOrder)) {
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
        } else {
          await loadOrderCapabilities()
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

        if (isKds && (action === 'cancel' || action === 'delivered')) {
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
      orderParam,
      orderActionLoading,
      food99ActionLoading,
      orderCapabilities,
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
      loadOrderCapabilities,
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
    if (!stateCustomer) return fallbackFood99Customer
    if (!fallbackFood99Customer) return stateCustomer

    return {
      ...fallbackFood99Customer,
      ...stateCustomer,
      name: resolvePreferredText(stateCustomer.name, fallbackFood99Customer.name),
      phone: resolvePreferredText(stateCustomer.phone, fallbackFood99Customer.phone),
      document_number: resolvePreferredText(stateCustomer.document_number, fallbackFood99Customer.document_number),
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
  // capabilities efetivas: Food99 tem prioridade (dados em tempo real), generic como fallback
  const effectiveCaps = Object.keys(food99Capabilities).length > 0 ? food99Capabilities : (orderCapabilities || {})

  const food99Scheduling = food99State?.scheduling || null
  const isScheduledOrder = food99Scheduling?.is_scheduled === true
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
  const remoteOrderStateLabel = food99Integration?.remote_order_state_label || food99Integration?.remote_order_state || ''
  const remoteOrderStateKey = String(food99Integration?.remote_order_state || '').toLowerCase()
  const normalizedFood99LastEventType = String(food99Integration?.last_event_type || '').toLowerCase()
  const normalizedIfoodLatestEventType = String(
    fallbackFood99Summary?.integration?.latestEventType ||
      food99Integration?.last_event_type ||
      '',
  ).toLowerCase()
  const effectiveIfoodLifecycleKey = isIfoodOrder
    ? (normalizedIfoodLatestEventType || remoteOrderStateKey)
    : remoteOrderStateKey
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
    food99State?.order?.status?.real_status || item?.status?.realStatus || '',
  ).toLowerCase()
  const isTerminalFood99Order =
    typeof effectiveCaps?.is_terminal === 'boolean'
      ? effectiveCaps.is_terminal
      : ['closed', 'canceled'].includes(normalizedOrderRealStatus)
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
  const isIfoodDeliveryActionState = isIfoodDispatchLifecycle && isIfoodRiderAssigned
  const canCancelFood99Order =
    isIfoodOrder
      ? !isTerminalFood99Order && !isIfoodDispatchLifecycle
      : typeof effectiveCaps?.can_cancel === 'boolean'
        ? effectiveCaps.can_cancel
        : platformCapabilities.canCancel && !isTerminalFood99Order
  const canManualCompleteFood99Order =
    isIfoodOrder
      ? isIfoodMerchantDelivery && isIfoodDeliveryActionState
      : typeof effectiveCaps?.can_delivered === 'boolean'
        ? effectiveCaps.can_delivered
        : platformCapabilities.canDeliver && !!food99Delivery?.allows_manual_delivery_completion
  const canOpenFood99HandoverFlow =
    typeof effectiveCaps?.can_open_handover_flow === 'boolean'
      ? effectiveCaps.can_open_handover_flow
      : isIfoodOrder && isIfoodMerchantDelivery && isIfoodDeliveryActionState
  const isIfoodHandoverFlow =
    isIfoodOrder && isIfoodMerchantDelivery && isIfoodDeliveryActionState
  const requiresFood99DeliveryLocator =
    isFood99Order &&
    (typeof effectiveCaps?.requires_delivery_locator === 'boolean'
      ? effectiveCaps.requires_delivery_locator
      : !!food99Delivery?.is_store_delivery)
  const food99LocatorLength =
    Number(effectiveCaps?.delivery_locator_length) > 0
      ? Number(effectiveCaps.delivery_locator_length)
      : 8
  const food99DeliveryCodeLength =
    Number(effectiveCaps?.delivery_code_length) > 0
      ? Number(effectiveCaps.delivery_code_length)
      : 4
  const shouldShowFood99DeliveryAction =
    isIfoodOrder
      ? canManualCompleteFood99Order
      : canManualCompleteFood99Order || canOpenFood99HandoverFlow || isIfoodHandoverFlow
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
  const canReadyFood99Order =
    isIfoodOrder
      ? !isTerminalFood99Order && isIfoodReadyLifecycle
      : typeof effectiveCaps?.can_ready === 'boolean'
        ? effectiveCaps.can_ready
        : platformCapabilities.canReady && !isTerminalFood99Order && !shouldHideReadyFood99Action
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
      : typeof food99Capabilities?.is_delivering === 'boolean'
        ? food99Capabilities.is_delivering
        : ['courier_to_store', 'picked_up', 'delivering', 'arriving', 'dispatching'].includes(remoteOrderStateKey)
  const hasFood99VisualData = !!(food99State || fallbackFood99Summary)
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
    ? 'Receber em dinheiro na entrega'
    : 'Receber na entrega'
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
      ? 'Loja'
      : /(ordercancelapply|ordercancelrequest|cancelapply|cancelrequest)/.test(
            normalizedFood99LastEventType,
          )
        ? 'Cliente'
          : hasFood99CancellationInfo
          ? `Cliente / ${integrationChannelLabel}`
          : ''
  const remoteStateAgeLabel = formatAgeMinutes(food99Observability?.remote_state_age_minutes)
  const lastActionAgeLabel = formatAgeMinutes(food99Observability?.last_action_age_minutes)
  const lastReconcileAgeLabel = formatAgeMinutes(food99Observability?.last_reconcile_age_minutes)
  const localPaidAmount = Array.isArray(invoices)
    ? invoices.reduce((sum, invoice) => sum + Number(invoice?.price || 0), 0)
    : 0
  const localOrderTotal = Number(item?.price || 0)
  const localPendingAmount = Math.max(localOrderTotal - localPaidAmount, 0)
  const food99AmountPending = resolvePreferredMoney(
    food99Payment?.amount_pending,
    food99CashCollectionAmount,
  )
  const hasFood99PendingSignals =
    hasMeaningfulValue(food99Payment?.amount_pending) ||
    hasMeaningfulValue(food99Payment?.customer_need_paying_money) ||
    hasMeaningfulValue(food99Financial?.customer_need_paying_money) ||
    hasMeaningfulValue(food99Payment?.collect_on_delivery_amount)
  const paidStatusId = String(defaultCompany?.configs?.['pos-paid-status'] || '').trim()
  const localStatusLabel = String(item?.status?.status || '').trim().toLowerCase()
  const localStatusId = String(item?.status?.['@id'] || item?.status?.id || '').trim()
  const isStatusMarkedPaid =
    localStatusLabel === 'paid' ||
    (paidStatusId &&
      (localStatusId === paidStatusId ||
        localStatusId.endsWith(`/${paidStatusId}`)))
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
    : isStatusMarkedPaid || isFinanciallyPaid
  const canMarkOrderAsPaid =
    !!item?.id && !!paidStatusId && !isStatusMarkedPaid
  const canMarkOrderAsPaidStandalone =
    canMarkOrderAsPaid && !isFood99Order && !isIfoodOrder
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
      const externalRef = externalRefRaw.length > 28
        ? `${externalRefRaw.slice(0, 14)}...${externalRefRaw.slice(-8)}`
        : externalRefRaw

      return externalRef ? `iFood #${externalRef}` : 'iFood'
    }

    return String(item?.app || 'Origem local')
  })()
  const localStatusRaw = String(item?.status?.status || item?.status?.realStatus || '').trim()
  const localStatusLower = localStatusRaw.toLowerCase()
  const isLocallyCanceledOrder =
    localStatusLower.includes('canceled')
  const pendingAmountForBadge = Number(
    isFood99Order
      ? (food99Payment?.amount_pending || localPendingAmount || 0)
      : (localPendingAmount || 0),
  )
  const isPendingForBadge = Number.isFinite(pendingAmountForBadge) && pendingAmountForBadge > 0.009
  const shouldUseMarketplaceFinancialBadge = (isFood99Order || isIfoodOrder) && !isLocallyCanceledOrder
  const orderStatusBadgeLabel = shouldUseMarketplaceFinancialBadge
    ? isPendingForBadge
      ? 'PENDENTE'
      : 'PAID'
    : String(localStatusRaw || '-').toUpperCase()
  const orderStatusBadgeColor = shouldUseMarketplaceFinancialBadge
    ? isPendingForBadge
      ? '#D97706'
      : '#16A34A'
    : item?.status?.color || ppcColors.accentInfo
  const fallbackNoObservationText = isFood99Order
    ? 'Sem observacoes informadas pela 99Food.'
    : isIfoodOrder
      ? 'Sem observacoes informadas pelo iFood.'
      : `Sem observacoes informadas para este ${integrationChannelLabel}.`
  const showOrderObservationCard = !isIfoodOrder
  const orderCustomerName = resolvePreferredText(
    food99Customer?.name,
    item?.client?.name,
    item?.person?.name,
    item?.customer?.name,
    item?.customerName,
  )
  const orderCustomerPhone = resolvePreferredText(
    food99Customer?.phone,
    item?.client?.phone?.[0]?.phone,
    item?.client?.phone,
  )
  const fallbackOrderAddressPrimary = resolvePreferredText(
    item?.addressDestination,
    item?.addressDestination?.display,
    item?.addressDestination?.street,
    item?.addressDestination?.address,
    item?.deliveryContact,
    item?.deliveryContact?.address,
    item?.retrieveContact,
    item?.retrieveContact?.address,
    orderParam?.addressDestination,
    orderParam?.addressDestination?.display,
    orderParam?.addressDestination?.street,
    orderParam?.addressDestination?.address,
    orderParam?.deliveryContact,
    orderParam?.deliveryContact?.address,
    orderParam?.retrieveContact,
    orderParam?.retrieveContact?.address,
  )
  const fallbackOrderAddressSecondary = resolvePreferredText(
    item?.addressDestination?.district,
    item?.addressDestination?.city,
    orderParam?.addressDestination?.district,
    orderParam?.addressDestination?.city,
  )
  const orderAddressPrimary = resolvePreferredText(
    food99AddressPrimaryLine,
    food99AddressStreetLine,
    fallbackOrderAddressPrimary,
  )
  const orderAddressSecondary = resolvePreferredText(
    food99Address?.district,
    food99AddressCityStateLine,
    fallbackOrderAddressSecondary,
  )
  const orderObservationText = resolvePreferredText(
    food99RemarkText,
    item?.comments,
    item?.remark,
    orderParam?.comments,
    orderParam?.remark,
    orderParam?.description,
  ) || fallbackNoObservationText
  const orderDiscountTotal = Number(food99Financial?.discount_total || 0)
  const orderDisplayTotal = Number(
    food99Financial?.customer_total ||
      food99CashCollectionAmount ||
      localOrderTotal ||
      0,
  )
  const food99PaymentMethodKey = normalizeKey(food99PaymentMethodValue)
  const ifoodPaymentMethodWithBrand = isIfoodOrder
    && food99PaymentBrandValue
    && (food99PaymentMethodKey.includes('cartao de credito') || food99PaymentMethodKey.includes('cartao de debito'))
      ? `${food99PaymentMethodValue} (${normalizeText(food99PaymentBrandValue).toUpperCase()})`
      : food99PaymentMethodValue
  const orderPaymentMethodText = resolvePreferredText(
    ifoodPaymentMethodWithBrand,
    food99SelectedPaymentLabel,
    food99PaymentChannelValue,
  ) || (
    isIfoodOrder
      ? (localPendingAmount > 0.009 ? 'Pagamento na entrega' : 'Pagamento online')
      : 'Nao informado'
  )
  const shouldShowKdsCancel =
    typeof effectiveCaps?.can_cancel === 'boolean'
      ? effectiveCaps.can_cancel
      : platformCapabilities.canCancel && !isTerminalFood99Order
  const canGenericReadyOrder =
    !isFood99Order &&
    (typeof effectiveCaps?.can_ready === 'boolean'
      ? effectiveCaps.can_ready
      : platformCapabilities.canReady) &&
    !isTerminalFood99Order
  const canGenericDeliveredOrder =
    !isFood99Order &&
    !isIfoodOrder &&
    (typeof effectiveCaps?.can_delivered === 'boolean'
      ? effectiveCaps.can_delivered
      : platformCapabilities.canDeliver) &&
    !isTerminalFood99Order

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

  const handleMarkOrderAsPaid = useCallback(async () => {
    if (!item?.id || !paidStatusId || markPaidLoading) {
      return
    }

    try {
      setMarkPaidLoading(true)
      const updatedOrder = await ordersActions.save({
        id: item.id,
        status: `/statuses/${paidStatusId}`,
      })

      if (updatedOrder) {
        ordersActions.setItem(updatedOrder)
      }

      await refreshCurrentOrder()
      showSuccess('Pedido marcado como pago.')
    } catch (saveError) {
      showError(formatApiError(saveError))
    } finally {
      setMarkPaidLoading(false)
    }
  }, [
    item?.id,
    paidStatusId,
    markPaidLoading,
    ordersActions,
    refreshCurrentOrder,
    showSuccess,
    showError,
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
    if (!item?.id || food99ActionLoading || food99CancelReasonsLoading) {
      return
    }

    if (!platformCapabilities.canCancel) {
      return
    }

    try {
      setFood99CancelReasonsLoading(true)
      const response = await api.fetch(
        `/orders/${item.id}/cancel-reasons`,
      )

      if (response?.state) {
        setFood99State(response.state)
      }

      const reasons = Array.isArray(response?.result?.data?.reasons)
        ? response.result.data.reasons.filter(Boolean)
        : []

      // plataformas sem reasons: cancela direto sem abrir modal
      if (reasons.length === 0) {
        if (!platformCapabilities.requiresCancelReasons) {
          await runOrderAction('cancel')
          return
        }
        showError('Nenhum motivo de cancelamento disponivel para este pedido.')
        return
      }

      const applicableReasons = reasons.filter(reason => reason?.applicable !== false)
      const defaultReason =
        applicableReasons.find(reason => normalizeFood99CancelReasonId(reason?.reason_id) === '1080') ||
        applicableReasons[0] ||
        reasons[0]

      setFood99CancelReasons(reasons)
      setSelectedFood99CancelReasonId(
        normalizeFood99CancelReasonId(defaultReason?.reason_id),
      )
      setFood99CancelReasonText('')
      setCancelReasonModalVisible(true)
    } catch (stateError) {
      showError(formatApiError(stateError))
    } finally {
      setFood99CancelReasonsLoading(false)
    }
  }, [
    item?.id,
    isFood99Order,
    food99ActionLoading,
    food99CancelReasonsLoading,
    showError,
  ])

  const handleFood99CopyLocator = useCallback(async () => {
    if (!activeFood99Locator) {
      showError('Nenhum localizador disponivel para copiar.')
      return
    }

    try {
      const copied = await copyTextToClipboard(activeFood99Locator)

      if (!copied) {
        showError('Copia nao suportada neste dispositivo. Use o codigo exibido no modal.')
        return
      }

      showSuccess('Localizador copiado.')
    } catch (copyError) {
      showError(formatApiError(copyError))
    }
  }, [activeFood99Locator, showError, showSuccess])

  const handleFood99OpenHandoverLink = useCallback(async () => {
    if (!food99HandoverLink) {
      showError(isIfoodOrder
        ? 'O iFood nao enviou o link de confirmacao deste pedido.'
        : 'A 99Food nao enviou o link de confirmacao deste pedido.')
      return
    }

    try {
      const supported = await Linking.canOpenURL(food99HandoverLink)
      if (!supported) {
        throw new Error('Nao foi possivel abrir o link de confirmacao.')
      }

      await Linking.openURL(food99HandoverLink)
    } catch (linkError) {
      showError(formatApiError(linkError))
    }
  }, [food99HandoverLink, isIfoodOrder, showError])

  const handleFood99CopyHandoverLink = useCallback(async () => {
    if (!food99HandoverLink) {
      showError(isIfoodOrder
        ? 'O iFood nao enviou o link de confirmacao deste pedido.'
        : 'A 99Food nao enviou o link de confirmacao deste pedido.')
      return
    }

    try {
      const copied = await copyTextToClipboard(food99HandoverLink)

      if (!copied) {
        showError('Copia nao suportada neste dispositivo. Abra o link direto no navegador.')
        return
      }

      showSuccess('Link de confirmacao copiado.')
    } catch (copyError) {
      showError(formatApiError(copyError))
    }
  }, [food99HandoverLink, isIfoodOrder, showError, showSuccess])

  const handleFood99ShareHandoverWhatsapp = useCallback(async () => {
    if (!food99HandoverLink) {
      showError(isIfoodOrder
        ? 'O iFood nao enviou o link de confirmacao deste pedido.'
        : 'A 99Food nao enviou o link de confirmacao deste pedido.')
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
        throw new Error('WhatsApp indisponivel neste dispositivo.')
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
      showError(`Informe o localizador de ${food99LocatorLength} digitos.`)
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
        showSuccess('Entrega confirmada na 99Food.')

        if (isKds) {
          navigation.goBack()
        }
        return
      }

      if (nextStep === 'delivery_code') {
        setDeliveryFlowStep('delivery_code')
        showSuccess('Localizador validado. Agora confirme o codigo do cliente.')
        return
      }

      throw response?.result || { message: 'A 99Food retornou um fluxo inesperado para o localizador.' }
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
      showError(`Informe o localizador de ${food99LocatorLength} digitos.`)
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
      showError(`Informe o codigo do cliente com ${food99DeliveryCodeLength} digitos.`)
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
      showError('Selecione um motivo de cancelamento para continuar.')
      return
    }

    const reasonText = String(food99CancelReasonText || '').trim()
    if (requiresFood99CancelReasonText && !reasonText) {
      showError('Descreva o motivo do cancelamento para continuar.')
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

  const primaryKdsAction = useMemo(() => {
    const hasActions = isFood99Order || isIfoodOrder || platformCapabilities.canReady || platformCapabilities.canDeliver
    if (!hasActions) return null

    if (canReadyFood99Order) {
      return {
        label: 'Pedido Pronto',
        icon: 'check-circle',
        loadingKey: 'ready',
        disabled: !!(food99ActionLoading || orderActionLoading),
        onPress: () => runOrderAction('ready'),
      }
    }

    if (shouldShowFood99DeliveryAction) {
      return {
        label: 'Entregar Pedido',
        icon: 'local-shipping',
        loadingKey: 'delivered',
        disabled: !!(food99ActionLoading || orderActionLoading),
        onPress: handleFood99DeliveredPress,
      }
    }

    return null
  }, [
    canReadyFood99Order,
    food99ActionLoading,
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

  const resolvedPrimaryKdsAction = primaryKdsAction || (canMarkOrderAsPaidStandalone
    ? {
        label: 'Marcar como Pago',
        icon: 'payments',
        loadingKey: 'mark_paid',
        disabled: !!markPaidLoading,
        onPress: handleMarkOrderAsPaid,
      }
    : null)

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `Pedido #${orderDisplayId}`,
      showBottomToolBar: !shouldHideBottomToolBar,
      headerTitle: () => (
        <View style={localStyles.topBarTitleWrap}>
          <Text style={localStyles.topBarTitleText}>Pedido #{orderDisplayId}</Text>
          {!!orderDateLabel && (
            <Text style={localStyles.topBarTitleSubText}>{orderDateLabel}</Text>
          )}
        </View>
      ),
      headerRight: () => (
        <View style={localStyles.topBarActions}>
          <PrintButton
            printType="order"
            store="orders"
            compact
            iconColor={ppcColors.accentInfo}
            compactButtonStyle={localStyles.topBarIconButton}
            compactSelectStyle={localStyles.topBarIconButton}
            disabled={!item?.id}
          />

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
              <Text style={localStyles.mobileSummaryLabel}>Origem</Text>
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
              Desconto: {Formatter.formatMoney(orderDiscountTotal)}
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
          <Text style={localStyles.mobileTotalLabel}>{isPurchaseOrder ? 'Total a pagar' : 'Total a cobrar'}</Text>
          <Text style={localStyles.mobileTotalValue}>
            {Formatter.formatMoney(orderDisplayTotal)}
          </Text>
        </View>

        {isFood99Order && (
          <View style={localStyles.mobileSummaryMetaList}>
            {!!remoteOrderStateLabel && (
              <Text style={localStyles.mobileSummaryMetaText}>
                Estado remoto: {remoteOrderStateLabel}
              </Text>
            )}
            {!!food99Delivery?.delivery_label && (
              <Text style={localStyles.mobileSummaryMetaText}>
                Entrega: {food99Delivery.delivery_label}
              </Text>
            )}
            {!!formattedFood99Eta && (
              <Text style={localStyles.mobileSummaryMetaText}>
                ETA previsto: {formattedFood99Eta}
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
            <Text style={localStyles.mobileInfoLabel}>{isPurchaseOrder ? 'Fornecedor' : 'Cliente'}</Text>
            <Text style={localStyles.mobileInfoTitle}>
              {isPurchaseOrder
                ? (item?.client?.alias || item?.client?.name || orderParam?.client?.alias || orderParam?.client?.name || 'Fornecedor nao informado')
                : (orderCustomerName || 'Cliente nao identificado')
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
                {orderAddressPrimary || 'Endereco nao informado'}
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
              <Text style={localStyles.mobileNoteLabel}>Observacao do cliente</Text>
            </View>
            <Text style={localStyles.mobileNoteText}>{orderObservationText}</Text>
          </View>
        )}
      </View>

      <View style={localStyles.mobilePaymentGrid}>
        <View style={localStyles.mobilePaymentMetricCard}>
          <Text style={localStyles.mobilePaymentMetricLabel}>Pago</Text>
          <Text style={localStyles.mobilePaymentMetricValue}>
            {Formatter.formatMoney(food99Payment?.amount_paid || localPaidAmount || 0)}
          </Text>
        </View>
        <View style={localStyles.mobilePaymentMetricCard}>
          <Text style={localStyles.mobilePaymentMetricLabel}>Pendente</Text>
          <Text style={[localStyles.mobilePaymentMetricValue, localStyles.mobilePaymentPendingValue]}>
            {Formatter.formatMoney(food99Payment?.amount_pending || localPendingAmount || 0)}
          </Text>
          {shouldShowCollectOnDelivery && (
            <Text style={localStyles.mobilePaymentMetricHint}>
              Cobrar cliente: {Formatter.formatMoney(food99CashCollectionAmount || 0)}
            </Text>
          )}
        </View>
      </View>

      <View style={localStyles.mobileInfoCard}>
        <Text style={localStyles.mobileInfoLabel}>Pagamento</Text>
        <Text style={localStyles.mobileInfoTitle}>{orderPaymentMethodText}</Text>
        {!!food99PaymentChannelValue && (
          <Text style={localStyles.mobileInfoSubtitle}>Canal: {food99PaymentChannelValue}</Text>
        )}
        {food99ChangeFor > 0 ? (
          <Text style={localStyles.mobileInfoSubtitle}>
            Troco para: {Formatter.formatMoney(food99ChangeFor)}
          </Text>
        ) : isCashPaymentSelection ? (
          <Text style={localStyles.mobileInfoSubtitle}>Troco: nao solicitado</Text>
        ) : null}
        {food99NeedsChange ? (
          <Text style={localStyles.mobileInfoSubtitle}>
            Troco a devolver: {Formatter.formatMoney(food99ChangeAmount)}
          </Text>
        ) : null}
      </View>

      {(isFood99CourierToStore ||
        isFood99Delivering ||
        shouldHideReadyFood99Action ||
        hasFood99SyncIssue) && (
        <View style={localStyles.mobileWarningCard}>
          {isFood99CourierToStore ? (
            <Text style={localStyles.mobileWarningText}>
              Entregador designado e a caminho da loja.
            </Text>
          ) : null}
          {isFood99Delivering && !isFood99CourierToStore ? (
            <Text style={localStyles.mobileWarningText}>Pedido em entrega.</Text>
          ) : null}
          {shouldHideReadyFood99Action ? (
            <Text style={localStyles.mobileWarningText}>
              Pedido pronto aguardando atualizacao da plataforma 99.
            </Text>
          ) : null}
          {hasFood99SyncIssue ? (
            <Text style={localStyles.mobileWarningText}>
              Integracao com divergencia. Use detalhes para sincronizar.
            </Text>
          ) : null}
        </View>
      )}

      <View style={[cssStyles.itemsSection, localStyles.mobileProductsCard]}>
        <Text style={localStyles.mobileProductsTitle}>Itens do pedido</Text>
        {isPurchaseOrder
          ? (item?.orderProducts || orderParam?.orderProducts || []).map((op, idx) => {
              const prodName = op?.product?.product || op?.product?.name || `Produto #${idx + 1}`
              const prodDesc = op?.product?.description || ''
              const qty      = Number(op?.quantity || 0)
              const price    = Number(op?.unitPrice || op?.price || 0)
              const total    = qty * price
              const comment  = String(op?.comments || '').trim()
              return (
                <View key={op?.id || idx} style={localStyles.purchaseItemRow}>
                  <View style={localStyles.purchaseItemTop}>
                    <Text style={localStyles.purchaseItemName} numberOfLines={2}>{prodName}</Text>
                    <Text style={localStyles.purchaseItemQty}>{qty}Ã—</Text>
                  </View>
                  {!!prodDesc && (
                    <Text style={localStyles.purchaseItemDesc} numberOfLines={2}>{prodDesc}</Text>
                  )}
                  {!!comment && (
                    <Text style={localStyles.purchaseItemComment}>Obs: {comment}</Text>
                  )}
                  <View style={localStyles.purchaseItemPriceRow}>
                    {price > 0 && (
                      <Text style={localStyles.purchaseItemUnit}>
                        {Formatter.formatMoney(price)} / un
                      </Text>
                    )}
                    {price > 0 && (
                      <Text style={localStyles.purchaseItemTotal}>{Formatter.formatMoney(total)}</Text>
                    )}
                  </View>
                </View>
              )
            })
          : (
            <OrderProducts
              order={isIfoodOrder ? (ifoodDisplayOrder || item) : item}
              scale={scale}
              styles={kdsOrderProductsStyles}
              indentStep={18}
              showDetails
            />
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
                <Text style={localStyles.detailsModalEyebrow}>Resumo do pedido</Text>
                <Text style={localStyles.detailsModalTitle}>
                  Pedido #{item?.id || orderParam?.id || '--'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeDetailsModal}
                style={localStyles.detailsModalCloseButton}
              >
                <Icon name="close" size={22} color={ppcColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {canMarkOrderAsPaidStandalone && (
              <TouchableOpacity
                onPress={handleMarkOrderAsPaid}
                disabled={markPaidLoading}
                style={[
                  localStyles.detailsMarkPaidButton,
                  markPaidLoading && localStyles.kdsActionButtonDisabled,
                ]}
              >
                {markPaidLoading ? (
                  <ActivityIndicator size="small" color="#F8FAFC" />
                ) : (
                  <>
                    <Icon name="payments" size={18} color="#F8FAFC" />
                    <Text style={localStyles.detailsMarkPaidButtonText}>
                      Marcar como pago
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
                  <Text style={localStyles.detailsCardLabel}>Aplicativo</Text>
                  <Text style={localStyles.detailsCardValue}>{item?.app || '-'}</Text>
                </View>
                <View style={localStyles.detailsCard}>
                  <Text style={localStyles.detailsCardLabel}>Status local</Text>
                  <Text style={localStyles.detailsCardValue}>
                    {item?.status?.status || item?.status?.realStatus || '-'}
                  </Text>
                </View>
                <View style={localStyles.detailsCard}>
                  <Text style={localStyles.detailsCardLabel}>Pagamento local</Text>
                  <Text style={localStyles.detailsCardValue}>
                    {isOrderPaidForCompletion ? 'Pago' : 'Pendente'}
                  </Text>
                </View>
              </View>

              <View style={localStyles.detailsSection}>
                <Text style={localStyles.detailsSectionTitle}>Dados do pedido</Text>
                <Text style={localStyles.detailsInfoText}>
                  Criado em: {formatOrderDateTime(resolvedOrderDateValue)}
                </Text>
                <Text style={localStyles.detailsInfoText}>
                  Alterado em: {formatOrderDateTime(item?.alterDate || resolvedOrderDateValue)}
                </Text>
                <Text style={localStyles.detailsInfoText}>
                  Total local: {Formatter.formatMoney(localOrderTotal || 0)}
                </Text>
                <Text style={localStyles.detailsInfoText}>
                  Pago local: {Formatter.formatMoney(localPaidAmount || 0)}
                </Text>
                <Text style={localStyles.detailsInfoText}>
                  Pendente local: {Formatter.formatMoney(localPendingAmount || 0)}
                </Text>
              </View>

              {(isFood99Order || isIfoodOrder) && food99StateLoading && !food99State ? (
                <View style={localStyles.detailsLoadingState}>
                  <ActivityIndicator size="small" color="#38BDF8" />
                  <Text style={localStyles.detailsLoadingText}>
                    Carregando dados da integracao {isIfoodOrder ? 'iFood' : '99Food'}...
                  </Text>
                </View>
              ) : null}

              {(isFood99Order || isIfoodOrder) && hasFood99VisualData ? (
                <>
                  <View style={localStyles.detailsSection}>
                    <Text style={localStyles.detailsSectionTitle}>
                      {isIfoodOrder ? 'Operacao iFood' : 'Operacao 99Food'}
                    </Text>
                    {!!food99Identifiers?.order_index && (
                      <Text style={localStyles.detailsInfoText}>
                        {isIfoodOrder ? 'Numero iFood' : 'Numero 99Food'}: #{food99Identifiers.order_index}
                      </Text>
                    )}
                    <Text style={localStyles.detailsInfoText}>
                      Entrega: {food99Delivery?.delivery_label || '-'}
                    </Text>
                    <Text style={localStyles.detailsInfoText}>
                      Estado remoto: {remoteOrderStateLabel || '-'}
                    </Text>
                    <Text style={localStyles.detailsInfoText}>
                      Status remoto: {food99Delivery?.remote_delivery_status || '-'}
                    </Text>
                    {!!formattedFood99Eta && (
                      <Text style={localStyles.detailsInfoText}>
                        ETA previsto: {formattedFood99Eta}
                      </Text>
                    )}
                    {!!food99SelectedPaymentLabel && (
                      <Text style={localStyles.detailsInfoTextStrong}>
                        Forma de pagamento selecionada: {food99SelectedPaymentLabel}
                      </Text>
                    )}
                    {!!food99PaymentMethodValue && (
                      <Text style={localStyles.detailsInfoText}>
                        Metodo de pagamento (pay_method): {food99PaymentMethodValue}
                      </Text>
                    )}
                    {!!food99PaymentChannelValue && (
                      <Text style={localStyles.detailsInfoText}>
                        Canal de pagamento (pay_channel): {food99PaymentChannelValue}
                      </Text>
                    )}
                    {hasFood99CancellationInfo && (
                      <>
                        {!!food99CancellationSourceLabel && (
                          <Text style={localStyles.detailsInfoText}>
                            Origem do cancelamento: {food99CancellationSourceLabel}
                          </Text>
                        )}
                        {!!food99Integration?.cancel_code && (
                          <Text style={localStyles.detailsInfoText}>
                            Codigo de cancelamento: {food99Integration.cancel_code}
                          </Text>
                        )}
                        {!!food99Integration?.cancel_reason && (
                          <Text style={localStyles.detailsInfoText}>
                            Motivo do cancelamento: {food99Integration.cancel_reason}
                          </Text>
                        )}
                      </>
                    )}
                  </View>

                  {(food99RiderName || food99RiderPhone || food99RiderToStoreEta) && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>
                        {isIfoodOrder ? 'Entregador iFood' : 'Entregador 99'}
                      </Text>
                      {!!food99RiderName && (
                        <Text style={localStyles.detailsInfoText}>Nome: {food99RiderName}</Text>
                      )}
                      {!!food99RiderPhone && (
                        <Text style={localStyles.detailsInfoText}>Telefone: {food99RiderPhone}</Text>
                      )}
                      {!!food99RiderToStoreEta && (
                        <Text style={localStyles.detailsInfoText}>
                          ETA ate a loja: {food99RiderToStoreEta}
                        </Text>
                      )}
                    </View>
                  )}

                  {food99Financial && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>
                        {isIfoodOrder ? 'Financeiro iFood' : 'Financeiro 99Food'}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        Itens: {Formatter.formatMoney(food99Financial.items_total || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        Entrega: {Formatter.formatMoney(food99Financial.delivery_fee || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        Taxa de servico: {Formatter.formatMoney(food99Financial.service_fee || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        Taxa de pedido minimo: {Formatter.formatMoney(food99Financial.small_order_fee || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        Adicional/reforco: {Formatter.formatMoney(food99Financial.meal_top_up_fee || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        Descontos totais: {Formatter.formatMoney(food99Financial.discount_total || 0)}
                      </Text>
                      {isIfoodOrder && food99Financial.ifood_subsidy > 0 && (
                        <Text style={localStyles.detailsInfoText}>
                          Subsidio iFood: {Formatter.formatMoney(food99Financial.ifood_subsidy)}
                        </Text>
                      )}
                      {isIfoodOrder && food99Financial.merchant_subsidy > 0 && (
                        <Text style={localStyles.detailsInfoText}>
                          Subsidio loja: {Formatter.formatMoney(food99Financial.merchant_subsidy)}
                        </Text>
                      )}
                      {isIfoodOrder && !!food99Financial.payment_brand && (
                        <Text style={localStyles.detailsInfoText}>
                          Bandeira: {food99Financial.payment_brand}
                        </Text>
                      )}
                      {isIfoodOrder && food99Financial.change_for > 0 && (
                        <Text style={localStyles.detailsInfoTextStrong}>
                          Troco para: {Formatter.formatMoney(food99Financial.change_for)}
                        </Text>
                      )}
                      <Text style={localStyles.detailsInfoText}>
                        Desconto nos itens: {Formatter.formatMoney(food99Financial.items_discount_total || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        Desconto na entrega: {Formatter.formatMoney(food99Financial.delivery_discount_total || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        Cupom/desconto informado: {Formatter.formatMoney(food99Financial.coupon_discount_total || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        Cupom/desconto subsidiado pela loja: {Formatter.formatMoney(food99Financial.store_discount_total || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        Cupom/desconto subsidiado pela 99: {Formatter.formatMoney(food99Financial.platform_discount_total || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        Taxa original de entrega: {Formatter.formatMoney(food99Financial.store_charged_delivery_price || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoTextStrong}>
                        Total do cliente: {Formatter.formatMoney(food99Financial.customer_total || 0)}
                      </Text>
                      {shouldShowCollectOnDelivery && (
                        <Text style={localStyles.detailsInfoTextStrong}>
                          Cobrar do cliente (customer_need_paying_money): {Formatter.formatMoney(food99CashCollectionAmount || 0)}
                        </Text>
                      )}
                    </View>
                  )}

                  {food99Payment && (
                    <View style={localStyles.detailsGrid}>
                      <View style={localStyles.detailsCard}>
                        <Text style={localStyles.detailsCardLabel}>Pago</Text>
                        <Text style={localStyles.detailsCardValue}>
                          {Formatter.formatMoney(food99Payment.amount_paid || 0)}
                        </Text>
                      </View>
                      <View style={localStyles.detailsCard}>
                        <Text style={localStyles.detailsCardLabel}>Pendente</Text>
                        <Text style={localStyles.detailsCardValue}>
                          {Formatter.formatMoney(food99Payment.amount_pending || 0)}
                        </Text>
                      </View>
                      {shouldShowCollectOnDelivery && (
                        <View style={localStyles.detailsCard}>
                          <Text style={localStyles.detailsCardLabel}>Cobrar cliente</Text>
                          <Text style={localStyles.detailsCardValue}>
                            {Formatter.formatMoney(food99CashCollectionAmount || 0)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {food99Payment && shouldShowDeliveryPaymentSection && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>Pagamento na entrega</Text>
                      {shouldShowCollectOnDelivery && (
                        <Text style={localStyles.detailsInfoTextStrong}>
                          {collectOnDeliveryLabel}: {Formatter.formatMoney(food99CashCollectionAmount || 0)}
                        </Text>
                      )}
                      {food99ChangeFor > 0 ? (
                        <Text style={localStyles.detailsInfoText}>
                          Troco para: {Formatter.formatMoney(food99ChangeFor)}
                        </Text>
                      ) : isCashPaymentSelection ? (
                        <Text style={localStyles.detailsInfoText}>Troco: nao solicitado</Text>
                      ) : null}
                      {food99NeedsChange ? (
                        <Text style={localStyles.detailsInfoText}>
                          Troco a devolver: {Formatter.formatMoney(food99ChangeAmount)}
                        </Text>
                      ) : null}
                      {food99ShopPaidMoney > 0 ? (
                        <Text style={localStyles.detailsInfoText}>
                          Repasse ao lojista pelo entregador (shop_paid_money): {Formatter.formatMoney(food99ShopPaidMoney)}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {isScheduledOrder && (
                    <View style={localStyles.scheduledDeliveryBanner}>
                      <Text style={localStyles.scheduledDeliveryLabel}>⏰ ENTREGA AGENDADA</Text>
                      {!!scheduledWindowLabel && (
                        <Text style={localStyles.scheduledDeliveryDate}>Janela: {scheduledWindowLabel}</Text>
                      )}
                      {!!scheduledDeliveryDateTimeRaw && (
                        <Text style={localStyles.scheduledDeliveryDate}>
                          Entrega: {formatScheduledDate(scheduledDeliveryDateTimeRaw)}
                        </Text>
                      )}
                      {!!scheduledPreparationStartRaw && (
                        <Text style={localStyles.scheduledDeliveryDate}>
                          Iniciar preparo: {formatScheduledDate(scheduledPreparationStartRaw)}
                        </Text>
                      )}
                    </View>
                  )}

                  {(food99Customer?.name || food99Customer?.phone || food99Customer?.document_number) && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>Cliente</Text>
                      {!!food99Customer?.name && (
                        <Text style={localStyles.detailsInfoText}>{food99Customer.name}</Text>
                      )}
                      {!!food99Customer?.phone && (
                        <Text style={localStyles.detailsInfoText}>{food99Customer.phone}</Text>
                      )}
                      {!!food99Customer?.document_number && (
                        <Text style={localStyles.detailsInfoText}>CPF: {food99Customer.document_number}</Text>
                      )}
                    </View>
                  )}

                  {(food99AddressPrimaryLine ||
                    food99AddressStreetLine ||
                    food99Address?.district ||
                    food99AddressCityStateLine ||
                    food99Address?.postal_code ||
                    food99Address?.reference ||
                    food99Address?.complement) && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>Endereco do cliente</Text>
                      {!!food99AddressPrimaryLine && (
                        <Text style={localStyles.detailsInfoText}>{food99AddressPrimaryLine}</Text>
                      )}
                      {!!food99AddressStreetLine && (
                        <Text style={localStyles.detailsInfoText}>
                          Rua/numero: {food99AddressStreetLine}
                        </Text>
                      )}
                      {!!food99Address?.district && (
                        <Text style={localStyles.detailsInfoText}>
                          Bairro: {food99Address.district}
                        </Text>
                      )}
                      {!!food99AddressCityStateLine && (
                        <Text style={localStyles.detailsInfoText}>
                          Cidade/UF: {food99AddressCityStateLine}
                        </Text>
                      )}
                      {!!food99Address?.postal_code && (
                        <Text style={localStyles.detailsInfoText}>
                          CEP: {food99Address.postal_code}
                        </Text>
                      )}
                      {!!food99Address?.reference && (
                        <Text style={localStyles.detailsInfoText}>
                          Referencia: {food99Address.reference}
                        </Text>
                      )}
                      {!!food99Address?.complement && (
                        <Text style={localStyles.detailsInfoText}>
                          Complemento: {food99Address.complement}
                        </Text>
                      )}
                    </View>
                  )}

                  {(food99PickupCode ||
                    food99HandoverCode ||
                    food99Delivery?.locator ||
                    food99Delivery?.virtual_phone_number) && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>Codigos e suporte</Text>
                      {!!food99PickupCode && (
                        <Text style={localStyles.detailsInfoText}>
                          Pickup code: {food99PickupCode}
                        </Text>
                      )}
                      {!!food99HandoverCode && (
                        <Text style={localStyles.detailsInfoText}>
                          Handover code: {food99HandoverCode}
                        </Text>
                      )}
                      {!!food99Delivery?.locator && (
                        <Text style={localStyles.detailsInfoText}>
                          Localizador: {food99Delivery.locator}
                        </Text>
                      )}
                      {!!food99Delivery?.virtual_phone_number && (
                        <Text style={localStyles.detailsInfoText}>
                          Telefone virtual: {food99Delivery.virtual_phone_number}
                        </Text>
                      )}
                    </View>
                  )}

                  {showOrderObservationCard && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>Observacoes</Text>
                      <Text style={localStyles.detailsInfoText}>{orderObservationText}</Text>
                      {food99Notes?.need_cutlery !== null &&
                      food99Notes?.need_cutlery !== undefined ? (
                        <Text style={localStyles.detailsInfoText}>
                          Precisa de talheres: {food99Notes.need_cutlery ? 'Sim' : 'Nao'}
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
            <Text style={localStyles.cancelReasonBadge}>Cancelamento {cancelReasonChannelLabel}</Text>
            <Text style={localStyles.cancelReasonTitle}>Escolha o motivo oficial</Text>
            <Text style={localStyles.cancelReasonDescription}>
              Selecione um motivo oficial para cancelar este pedido no {cancelReasonChannelLabel}.
            </Text>

            {food99CancelReasonsLoading ? (
              <View style={localStyles.cancelReasonLoadingState}>
                <ActivityIndicator size="small" color="#38BDF8" />
                <Text style={localStyles.cancelReasonLoadingText}>
                  Carregando motivos oficiais...
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
                            Requer descricao
                          </Text>
                        ) : null}
                      </View>
                      <Text style={localStyles.cancelReasonOptionText}>
                        {reason?.description || 'Motivo sem descricao'}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            )}

            {requiresFood99CancelReasonText && (
              <View style={localStyles.cancelReasonInputBlock}>
                <Text style={localStyles.cancelReasonInputLabel}>Descricao do motivo</Text>
                <TextInput
                  value={food99CancelReasonText}
                  onChangeText={setFood99CancelReasonText}
                  editable={!food99ActionLoading}
                  multiline
                  numberOfLines={3}
                  placeholder="Explique brevemente o motivo do cancelamento."
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
                <Text style={localStyles.deliveryCodeButtonSecondaryText}>Fechar</Text>
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
                    Cancelar pedido
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
                    ? 'Fluxo iFood'
                    : (deliveryFlowStep === 'locator' ? 'Passo 1 de 2' : 'Passo 2 de 2')}
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
                {isIfoodHandoverFlow ? 'Entrega propria iFood' : 'Concluir entrega 99Food'}
              </Text>

              <ScrollView
                style={localStyles.deliveryCodeScroll}
                contentContainerStyle={localStyles.deliveryCodeScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={localStyles.deliveryCodeDescription}>
                  {isIfoodHandoverFlow
                    ? 'Use o localizador e o link oficial do iFood para compartilhar com o entregador e acompanhar a confirmacao da entrega.'
                    : (deliveryFlowStep === 'locator'
                    ? 'Confirme o localizador oficial da 99Food e envie o link de confirmacao ao entregador quando necessario.'
                    : 'Depois de encontrar o cliente, informe o codigo de confirmacao de 4 digitos para concluir a entrega.')}
                </Text>

                <View style={localStyles.deliveryLocatorHero}>
                  <Text style={localStyles.deliveryCodeMetaLabel}>
                    {isIfoodHandoverFlow ? 'Localizador iFood' : 'Localizador 99'}
                  </Text>
                  <Text style={localStyles.deliveryLocatorHeroValue}>
                    {activeFood99Locator || 'Nao informado'}
                  </Text>
                  <Text style={localStyles.deliveryLocatorHeroHelper}>
                    {isIfoodHandoverFlow
                      ? (food99Locator
                        ? 'Passe este localizador ao entregador para confirmar a entrega no fluxo oficial do iFood.'
                        : 'Sem localizador no payload. Use o ID de suporte e o link oficial do iFood.')
                      : (food99Locator
                        ? 'Passe este localizador ao entregador para confirmar a entrega no fluxo oficial da 99.'
                        : 'Se a 99 nao enviar o localizador no payload, use o numero do recibo e informe manualmente abaixo.')}
                  </Text>

                  {!!activeFood99Locator && (
                    <TouchableOpacity
                      onPress={handleFood99CopyLocator}
                      disabled={!!food99ActionLoading}
                      style={localStyles.deliveryLinkPrimaryButton}
                    >
                      <Text style={localStyles.deliveryLinkPrimaryButtonText}>
                        Copiar localizador
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {!!food99HandoverLink && (
                  <View style={localStyles.deliveryLinkCard}>
                    <Text style={localStyles.deliveryCodeMetaLabel}>Link para confirmar</Text>
                    <Text style={localStyles.deliveryLinkUrl} selectable>
                      {food99HandoverLink}
                    </Text>
                    <View style={localStyles.deliveryLinkActions}>
                      <TouchableOpacity
                        onPress={handleFood99OpenHandoverLink}
                        disabled={!!food99ActionLoading}
                        style={localStyles.deliveryLinkActionButton}
                      >
                        <Text style={localStyles.deliveryLinkActionText}>Abrir link</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleFood99CopyHandoverLink}
                        disabled={!!food99ActionLoading}
                        style={localStyles.deliveryLinkActionButton}
                      >
                        <Text style={localStyles.deliveryLinkActionText}>Copiar link</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleFood99ShareHandoverWhatsapp}
                        disabled={!!food99ActionLoading}
                        style={localStyles.deliveryLinkActionButton}
                      >
                        <Text style={localStyles.deliveryLinkActionText}>
                          Enviar via WhatsApp
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
                            <Text style={localStyles.deliveryCodeMetaLabel}>Pickup code</Text>
                            <Text style={localStyles.deliveryCodeMetaValueCompact}>{food99PickupCode}</Text>
                          </View>
                        )}

                        {!!food99HandoverCode && food99HandoverCode !== food99PickupCode && (
                          <View style={localStyles.deliveryCodeMetaCardCompact}>
                            <Text style={localStyles.deliveryCodeMetaLabel}>Handover code</Text>
                            <Text style={localStyles.deliveryCodeMetaValueCompact}>{food99HandoverCode}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    <Text style={localStyles.deliveryCodeTitle}>
                      {deliveryFlowStep === 'locator'
                        ? 'Validar localizador'
                        : 'Confirmar codigo do cliente'}
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
                        ? `O localizador oficial da 99Food tem ${food99LocatorLength} digitos.`
                        : `O codigo do cliente tem ${food99DeliveryCodeLength} digitos.`}
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
                      {deliveryFlowStep === 'delivery_code' ? 'Voltar' : 'Cancelar'}
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
                          ? 'Verificar e continuar'
                          : 'Concluir entrega'}
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
              <OrderHeader order={item} showCustomer />

              {isFood99Order && (
                <View style={localStyles.food99InfoCard}>
                  <View style={localStyles.food99InfoHeader}>
                    <Text style={localStyles.food99InfoTitle}>
                      {isIfoodOrder ? 'Operacao iFood' : 'Operacao 99Food'}
                    </Text>
                    <View style={localStyles.food99InfoHeaderRight}>
                      {food99StateLoading ? (
                        <ActivityIndicator size="small" color="#38BDF8" />
                      ) : (
                        <Text style={localStyles.food99InfoBadge}>
                          {food99Delivery?.delivery_label || 'Entrega indefinida'}
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

                  <Text style={localStyles.food99InfoText}>
                    Status remoto: {food99Delivery?.remote_delivery_status || food99Integration?.remote_order_state || 'Sem retorno'}
                  </Text>

                  {!!remoteOrderStateLabel && (
                    <Text style={localStyles.food99InfoText}>
                      Estado remoto: {remoteOrderStateLabel}
                    </Text>
                  )}

                  {isFood99CourierToStore ? (
                    <Text style={localStyles.food99InfoHint}>
                      Entregador designado pela 99 e a caminho da loja. O proximo avancao depende dos webhooks logisticos da plataforma.
                    </Text>
                  ) : null}

                  {isFood99Delivering && !isFood99CourierToStore ? (
                    <Text style={localStyles.food99InfoHint}>
                      {requiresFood99DeliveryLocator
                        ? `Pedido em entrega. Use Entregue para validar o localizador e concluir no app ${isIfoodOrder ? 'iFood' : '99Food'}.`
                        : `Pedido em entrega. Conclua em Entregue quando a loja finalizar no app ${isIfoodOrder ? 'iFood' : '99Food'}.`}
                    </Text>
                  ) : null}

                  {food99Delivery?.is_store_delivery && !food99Delivery?.locator ? (
                    <Text style={localStyles.food99InfoWarning}>
                      {isIfoodOrder
                        ? 'O iFood nao enviou o localizador neste payload. Use o numero do recibo manualmente e valide com o link oficial.'
                        : 'A 99 nao enviou o localizador neste payload. Pelo roteiro oficial, isso depende da lista de envio do localizador; use o numero do recibo manualmente e solicite habilitacao ao time da 99.'}
                    </Text>
                  ) : null}

                  {!!remoteStateAgeLabel && (
                    <Text style={localStyles.food99InfoText}>
                      Atualizacao remota: {remoteStateAgeLabel}
                    </Text>
                  )}

                  {!!formattedFood99Eta && (
                    <Text style={localStyles.food99InfoText}>
                      ETA previsto: {formattedFood99Eta}
                    </Text>
                  )}

                  {(food99RiderName || food99RiderPhone || food99RiderToStoreEta) && (
                    <View style={localStyles.food99SummaryBlock}>
                      <Text style={localStyles.food99SummaryTitle}>
                        {isIfoodOrder ? 'Entregador iFood' : 'Entregador 99'}
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
                      {isIfoodOrder ? 'Numero iFood' : 'Numero 99Food'}: #{food99Identifiers.order_index}
                    </Text>
                  )}

                  {!!food99HandoverCode && (
                    <Text style={localStyles.food99InfoText}>
                      Handover code: {food99HandoverCode}
                    </Text>
                  )}

                  {!!food99PickupCode && (
                    <Text style={localStyles.food99InfoText}>
                      Pickup code: {food99PickupCode}
                    </Text>
                  )}

                  {!!food99Delivery?.locator && (
                    <Text style={localStyles.food99InfoText}>
                      Localizador: {food99Delivery.locator}
                    </Text>
                  )}

                  {!!food99Delivery?.virtual_phone_number && (
                    <Text style={localStyles.food99InfoText}>
                      Telefone virtual: {food99Delivery.virtual_phone_number}
                    </Text>
                  )}

                  {!!food99SelectedPaymentLabel && (
                    <Text style={localStyles.food99InfoTextStrong}>
                      Forma de pagamento selecionada: {food99SelectedPaymentLabel}
                    </Text>
                  )}
                  {!!food99PaymentMethodValue && (
                    <Text style={localStyles.food99InfoText}>
                      Metodo de pagamento (pay_method): {food99PaymentMethodValue}
                    </Text>
                  )}
                  {!!food99PaymentChannelValue && (
                    <Text style={localStyles.food99InfoText}>
                      Canal de pagamento (pay_channel): {food99PaymentChannelValue}
                    </Text>
                  )}
                  {shouldShowCollectOnDelivery && (
                    <Text style={localStyles.food99InfoTextStrong}>
                      Cobrar do cliente (customer_need_paying_money): {Formatter.formatMoney(food99CashCollectionAmount || 0)}
                    </Text>
                  )}
                  {food99ChangeFor > 0 ? (
                    <Text style={localStyles.food99InfoText}>
                      Troco para: {Formatter.formatMoney(food99ChangeFor)}
                    </Text>
                  ) : isCashPaymentSelection ? (
                    <Text style={localStyles.food99InfoText}>Troco: nao solicitado</Text>
                  ) : null}
                  {food99NeedsChange ? (
                    <Text style={localStyles.food99InfoText}>
                      Troco a devolver: {Formatter.formatMoney(food99ChangeAmount)}
                    </Text>
                  ) : null}
                  {food99ShopPaidMoney > 0 ? (
                    <Text style={localStyles.food99InfoText}>
                      Repasse ao lojista pelo entregador (shop_paid_money): {Formatter.formatMoney(food99ShopPaidMoney)}
                    </Text>
                  ) : null}
                  {hasFood99CancellationInfo && (
                    <View style={localStyles.food99SummaryBlock}>
                      <Text style={localStyles.food99SummaryTitle}>Cancelamento</Text>
                      {!!food99CancellationSourceLabel && (
                        <Text style={localStyles.food99InfoText}>
                          Origem: {food99CancellationSourceLabel}
                        </Text>
                      )}
                      {!!food99Integration?.cancel_code && (
                        <Text style={localStyles.food99InfoText}>
                          Codigo: {food99Integration.cancel_code}
                        </Text>
                      )}
                      {!!food99Integration?.cancel_reason && (
                        <Text style={localStyles.food99InfoText}>
                          Motivo: {food99Integration.cancel_reason}
                        </Text>
                      )}
                    </View>
                  )}

                  {food99Payment && (
                    <View style={localStyles.food99SummaryRow}>
                      <View style={localStyles.food99SummaryPill}>
                        <Text style={localStyles.food99SummaryLabel}>Pago</Text>
                        <Text style={localStyles.food99SummaryValue}>
                          {Formatter.formatMoney(food99Payment.amount_paid || 0)}
                        </Text>
                      </View>
                      <View style={localStyles.food99SummaryPill}>
                        <Text style={localStyles.food99SummaryLabel}>Pendente</Text>
                        <Text style={localStyles.food99SummaryValue}>
                          {Formatter.formatMoney(food99Payment.amount_pending || 0)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {food99Financial && (
                    <View style={localStyles.food99SummaryBlock}>
                      <Text style={localStyles.food99SummaryTitle}>
                        {isIfoodOrder ? 'Resumo financeiro iFood' : 'Resumo financeiro 99Food'}
                      </Text>
                      <Text style={localStyles.food99InfoText}>
                        Itens: {Formatter.formatMoney(food99Financial.items_total || 0)}
                      </Text>
                      <Text style={localStyles.food99InfoText}>
                        Entrega: {Formatter.formatMoney(food99Financial.delivery_fee || 0)}
                      </Text>
                      {!!Number(food99Financial.service_fee || 0) && (
                        <Text style={localStyles.food99InfoText}>
                          Taxa de servico: {Formatter.formatMoney(food99Financial.service_fee || 0)}
                        </Text>
                      )}
                      {!!Number(food99Financial.small_order_fee || 0) && (
                        <Text style={localStyles.food99InfoText}>
                          Taxa de pedido minimo: {Formatter.formatMoney(food99Financial.small_order_fee || 0)}
                        </Text>
                      )}
                      {!!Number(food99Financial.meal_top_up_fee || 0) && (
                        <Text style={localStyles.food99InfoText}>
                          Adicional/reforco: {Formatter.formatMoney(food99Financial.meal_top_up_fee || 0)}
                        </Text>
                      )}
                      {!!Number(food99Financial.discount_total || 0) && (
                        <>
                          <Text style={localStyles.food99InfoText}>
                            Descontos totais: {Formatter.formatMoney(food99Financial.discount_total || 0)}
                          </Text>
                          <Text style={localStyles.food99InfoText}>
                            Desconto nos itens: {Formatter.formatMoney(food99Financial.items_discount_total || 0)}
                          </Text>
                          <Text style={localStyles.food99InfoText}>
                            Desconto na entrega: {Formatter.formatMoney(food99Financial.delivery_discount_total || 0)}
                          </Text>
                          <Text style={localStyles.food99InfoText}>
                            Cupom/desconto informado: {Formatter.formatMoney(food99Financial.coupon_discount_total || 0)}
                          </Text>
                        </>
                      )}
                      {!!Number(food99Financial.store_discount_total || 0) && (
                        <Text style={localStyles.food99InfoText}>
                          Desconto subsidiado pela loja: {Formatter.formatMoney(food99Financial.store_discount_total || 0)}
                        </Text>
                      )}
                      {!!Number(food99Financial.platform_discount_total || 0) && (
                        <Text style={localStyles.food99InfoText}>
                          Desconto subsidiado pela 99: {Formatter.formatMoney(food99Financial.platform_discount_total || 0)}
                        </Text>
                      )}
                      <Text style={localStyles.food99InfoTextStrong}>
                        Total do cliente: {Formatter.formatMoney(food99Financial.customer_total || 0)}
                      </Text>
                      {shouldShowCollectOnDelivery && (
                        <Text style={localStyles.food99InfoTextStrong}>
                          {collectOnDeliveryLabel}: {Formatter.formatMoney(food99CashCollectionAmount || 0)}
                        </Text>
                      )}
                    </View>
                  )}

                  {(food99AddressPrimaryLine ||
                    food99AddressStreetLine ||
                    food99Address?.district ||
                    food99AddressCityStateLine ||
                    food99Address?.postal_code ||
                    food99Address?.reference ||
                    food99Address?.complement) && (
                    <View style={localStyles.food99SummaryBlock}>
                      <Text style={localStyles.food99SummaryTitle}>Endereco do cliente</Text>
                      {!!food99AddressPrimaryLine && (
                        <Text style={localStyles.food99InfoText}>{food99AddressPrimaryLine}</Text>
                      )}
                      {!!food99AddressStreetLine && (
                        <Text style={localStyles.food99InfoText}>
                          Rua/numero: {food99AddressStreetLine}
                        </Text>
                      )}
                      {!!food99Address?.district && (
                        <Text style={localStyles.food99InfoText}>
                          Bairro: {food99Address.district}
                        </Text>
                      )}
                      {!!food99AddressCityStateLine && (
                        <Text style={localStyles.food99InfoText}>
                          Cidade/UF: {food99AddressCityStateLine}
                        </Text>
                      )}
                      {!!food99Address?.postal_code && (
                        <Text style={localStyles.food99InfoText}>
                          CEP: {food99Address.postal_code}
                        </Text>
                      )}
                      {!!food99Address?.reference && (
                        <Text style={localStyles.food99InfoText}>
                          Referencia: {food99Address.reference}
                        </Text>
                      )}
                      {!!food99Address?.complement && (
                        <Text style={localStyles.food99InfoText}>
                          Complemento: {food99Address.complement}
                        </Text>
                      )}
                    </View>
                  )}

                  {isScheduledOrder && (
                    <View style={localStyles.scheduledDeliveryBanner}>
                      <Text style={localStyles.scheduledDeliveryLabel}>⏰ ENTREGA AGENDADA</Text>
                      {!!scheduledWindowLabel && (
                        <Text style={localStyles.scheduledDeliveryDate}>Janela: {scheduledWindowLabel}</Text>
                      )}
                      {!!scheduledDeliveryDateTimeRaw && (
                        <Text style={localStyles.scheduledDeliveryDate}>
                          Entrega: {formatScheduledDate(scheduledDeliveryDateTimeRaw)}
                        </Text>
                      )}
                      {!!scheduledPreparationStartRaw && (
                        <Text style={localStyles.scheduledDeliveryDate}>
                          Iniciar preparo: {formatScheduledDate(scheduledPreparationStartRaw)}
                        </Text>
                      )}
                    </View>
                  )}

                  {(food99Customer?.name || food99Customer?.phone || food99Customer?.document_number) && (
                    <View style={localStyles.food99SummaryBlock}>
                      <Text style={localStyles.food99SummaryTitle}>Cliente</Text>
                      {!!food99Customer?.name && (
                        <Text style={localStyles.food99InfoText}>{food99Customer.name}</Text>
                      )}
                      {!!food99Customer?.phone && (
                        <Text style={localStyles.food99InfoText}>{food99Customer.phone}</Text>
                      )}
                      {!!food99Customer?.document_number && (
                        <Text style={localStyles.food99InfoText}>CPF: {food99Customer.document_number}</Text>
                      )}
                    </View>
                  )}

                  {showOrderObservationCard && (
                    <View style={localStyles.food99SummaryBlock}>
                      <Text style={localStyles.food99SummaryTitle}>Observacoes</Text>
                      <Text style={localStyles.food99InfoText}>{orderObservationText}</Text>
                      {food99Notes?.need_cutlery !== null &&
                        food99Notes?.need_cutlery !== undefined && (
                          <Text style={localStyles.food99InfoText}>
                            Precisa de talheres: {food99Notes?.need_cutlery ? 'Sim' : 'Nao'}
                          </Text>
                        )}
                    </View>
                  )}

                  {food99Delivery?.is_platform_delivery ? (
                    <Text style={localStyles.food99InfoHint}>
                      Entrega 99: a loja conclui no status Pronto. A plataforma finaliza a entrega.
                    </Text>
                  ) : null}


                  {!!lastActionAgeLabel && (
                    <Text style={localStyles.food99InfoText}>
                      Ultima acao: {lastActionAgeLabel}
                    </Text>
                  )}

                  {!!lastReconcileAgeLabel && (
                    <Text style={localStyles.food99InfoText}>
                      Ultima conciliacao: {lastReconcileAgeLabel}
                    </Text>
                  )}

                  {shouldHideReadyFood99Action ? (
                    <Text style={localStyles.food99InfoHint}>
              Pedido pronto aguardando plataforma. O cliente sera atualizado pela {isIfoodOrder ? 'iFood' : '99Food'}.
                    </Text>
                  ) : null}

                  {hasFood99SyncIssue ? (
                    <Text style={localStyles.food99InfoWarning}>
                      Integracao com divergencia. Toque no refresh para atualizar o estado.
                    </Text>
                  ) : null}

                </View>
              )}

              {isFood99Order || isIfoodOrder ? (
                <View style={localStyles.kdsActionRow}>
                  {isIfoodOrder && effectiveCaps?.can_confirm && (
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
                        <Text style={localStyles.kdsActionText}>Confirmar</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {canCancelFood99Order && (
                    <TouchableOpacity
                      onPress={handleFood99CancelPress}
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
                        <Text style={localStyles.kdsActionText}>Cancelar</Text>
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
                        <Text style={localStyles.kdsActionText}>Pronto</Text>
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
                        <Text style={localStyles.kdsActionText}>Entregue</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={localStyles.kdsActionRow}>
                  {shouldShowKdsCancel && (
                    <TouchableOpacity
                      onPress={() => runOrderAction('cancel')}
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
                        <Text style={localStyles.kdsActionText}>Cancelar</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {canGenericReadyOrder && (
                    <TouchableOpacity
                      onPress={() => runOrderAction('ready')}
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
                        <Text style={localStyles.kdsActionText}>Pronto</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {canGenericDeliveredOrder && (
                    <TouchableOpacity
                      onPress={() => runOrderAction('delivered')}
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
                        <Text style={localStyles.kdsActionText}>Entregue</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={localStyles.kdsActionRow}>
                {showBarcodeInput && isManualInput && (
                  <TouchableOpacity
                    onPress={handleAddProduct}
                    style={[localStyles.kdsActionButton, localStyles.kdsActionPrimary]}
                  >
                    <Icon name="add-circle" size={18} color="#fff" />
                    <Text style={[localStyles.kdsActionText, { marginLeft: 6 }]}>Adicionar Item</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleOrderTools}
                  style={[localStyles.kdsActionButton, localStyles.kdsActionPrimary]}
                >
                  <Icon name="settings" size={18} color="#fff" />
                  <Text style={[localStyles.kdsActionText, { marginLeft: 6 }]}>Detalhes</Text>
                </TouchableOpacity>
              </View>
            </>
          )) : (
            <>
              <OrderHeader key={item.id} order={item} />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isManualInput && (
                  <TouchableOpacity
                    onPress={handleAddProduct}
                    style={[globalStyles.button, { marginRight: 5 }]}
                  >
                    <Icon name="add-circle" size={24} color="#fff" />
                    <Text style={{ color: '#fff', marginLeft: 8 }}>
                      Adicionar Item
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleOrderTools}
                  style={[globalStyles.button, { marginLeft: 5 }]}
                >
                  <Icon name="settings" size={24} color="#fff" />
                  <Text style={{ color: '#fff', marginLeft: 8 }}>
                    Detalhes
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
                <OrderProducts
                  order={isIfoodOrder ? (ifoodDisplayOrder || item) : item}
                  scale={scale}
                  styles={localStyles}
                  indentStep={22}
                  showDetails
                />
              </View>
            </ScrollView>
          )}

          {isKds && (
            <View style={localStyles.mobileBottomActionsWrap}>
              {(() => {
                const cancelLoading =
                  orderActionLoading === 'cancel' ||
                  food99ActionLoading === 'cancel' ||
                  food99CancelReasonsLoading

                return (
              <TouchableOpacity
                onPress={(isFood99Order || isIfoodOrder) ? handleFood99CancelPress : () => runOrderAction('cancel')}
                disabled={!shouldShowKdsCancel || cancelLoading}
                style={[
                  localStyles.mobileCancelActionButton,
                  (!shouldShowKdsCancel || cancelLoading) &&
                    localStyles.mobileActionButtonDisabled,
                ]}
              >
                {cancelLoading ? (
                  <ActivityIndicator size="small" color={ppcColors.dangerText} />
                ) : (
                  <Icon name="close" size={22} color={ppcColors.dangerText} />
                )}
              </TouchableOpacity>
                )
              })()}

              <TouchableOpacity
                onPress={resolvedPrimaryKdsAction?.onPress}
                disabled={!resolvedPrimaryKdsAction || resolvedPrimaryKdsAction.disabled}
                style={[
                  localStyles.mobilePrimaryActionButton,
                  (!resolvedPrimaryKdsAction || resolvedPrimaryKdsAction.disabled) &&
                    localStyles.mobileActionButtonDisabled,
                ]}
              >
                {resolvedPrimaryKdsAction &&
                ((resolvedPrimaryKdsAction.loadingKey === 'mark_paid' && markPaidLoading) ||
                  (resolvedPrimaryKdsAction.loadingKey !== 'mark_paid' &&
                    food99ActionLoading === resolvedPrimaryKdsAction.loadingKey)) ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon
                      name={resolvedPrimaryKdsAction?.icon || 'check-circle'}
                      size={19}
                      color="#FFFFFF"
                    />
                    <Text style={localStyles.mobilePrimaryActionText}>
                      {resolvedPrimaryKdsAction?.label || 'Sem acao disponivel'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  )
}

const createStyles = (scale, palette) =>
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
    cancelReasonModal: {
      width: '100%',
      maxHeight: '88%',
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
      maxHeight: '84%',
      minHeight: 320,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.modalBg,
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 14,
      overflow: 'hidden',
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
      maxHeight: '100%',
      justifyContent: 'flex-end',
      marginTop: 'auto',
    },
    deliveryCodeModal: {
      width: '100%',
      maxHeight: '92%',
      minHeight: 360,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.modalBg,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
      overflow: 'hidden',
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
