import React, { useCallback, useMemo, useState } from 'react'
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
import { SafeAreaView } from 'react-native-safe-area-context'
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
import { buildFood99OrderSummary } from '@controleonline/ui-orders/src/react/services/food99OrderSummary'

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
const normalizeText = value => String(value ?? '').trim()

const hasMeaningfulValue = value =>
  !(
    value === null ||
    value === undefined ||
    (typeof value === 'string' && normalizeText(value) === '')
  )

const resolvePreferredText = (...values) => {
  for (const value of values) {
    const normalized = normalizeText(value)
    if (normalized) return normalized
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

const buildFood99LocatorShareMessage = ({ locator, url }) => {
  const parts = ['Confirmacao de entrega 99Food']

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
  const normalized = Number(value)
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null
}

const formatOrderDateTime = value => {
  if (!value) return ''

  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleString('pt-BR')
  }

  return String(value)
}

const OrderDetails = ({ route, navigation }) => {
  const orderParam = route.params.order
  const isKds = !!route.params?.kds
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
  const { width } = useWindowDimensions()

  const scale = useMemo(() => {
    if (width >= 2200) return 1.15
    if (width >= 1700) return 1.05
    if (width >= 1300) return 0.97
    return 0.92
  }, [width])

  const localStyles = useMemo(() => createStyles(scale), [scale])

  const deviceConfigStore = useStore('device_config')
  const device = deviceConfigStore.getters?.item
  const productInputType = device?.configs?.['product-input-type'] || 'manual'

  // @todo implementar. já vem do banco.
  const selectionType = device?.configs?.['selection-type'] || 'single' // ou multiple

  const isManualInput = productInputType === 'manual'
  const showBarcodeInput = item?.app === 'POS' && !isManualInput
  const isFood99Order = /food99|99food/i.test(String(item?.app || ''))

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

  const loadFood99OrderState = useCallback(async ({ silent = false } = {}) => {
    if (!item?.id || !isFood99Order) {
      setFood99State(null)
      return
    }

    try {
      setFood99StateLoading(true)
      const response = await api.fetch(
        `/marketplace/integrations/99food/orders/${item.id}/state`,
      )
      setFood99State(response || null)
    } catch (stateError) {
      setFood99State(null)
      if (!silent) {
        showError(formatApiError(stateError))
      }
    } finally {
      setFood99StateLoading(false)
    }
  }, [item?.id, isFood99Order, showError])

  useFocusEffect(
    useCallback(() => {
      if (item?.id && isFood99Order) {
        loadFood99OrderState({ silent: true })
      }
    }, [item?.id, isFood99Order, loadFood99OrderState]),
  )

  const resetFood99CancelReasonFlow = useCallback(() => {
    setCancelReasonModalVisible(false)
    setSelectedFood99CancelReasonId(null)
    setFood99CancelReasonText('')
    setFood99CancelReasons([])
  }, [])

  const runFood99OrderAction = useCallback(
    async (action, options = {}) => {
      if (!item?.id || !isFood99Order || food99ActionLoading) {
        return
      }

      const capabilities = food99State?.capabilities || {}
      if (
        (action === 'ready' && capabilities.can_ready === false) ||
        (action === 'cancel' && capabilities.can_cancel === false) ||
        (action === 'delivered' && capabilities.can_delivered === false)
      ) {
        return
      }

      const reconcilePath = `/marketplace/integrations/99food/orders/${item.id}/reconcile`
      const actionMap = {
        ready: {
          path: `/marketplace/integrations/99food/orders/${item.id}/ready`,
          success: 'Pedido marcado como pronto na 99Food.',
        },
        cancel: {
          path: `/marketplace/integrations/99food/orders/${item.id}/cancel`,
          success: 'Pedido cancelado na 99Food.',
        },
        delivered: {
          path: `/marketplace/integrations/99food/orders/${item.id}/delivered`,
          success: 'Pedido finalizado na 99Food.',
        },
        reconcile: {
          path: reconcilePath,
          success: 'Pedido sincronizado com a 99Food.',
        },
      }

      const actionConfig = actionMap[action]
      if (!actionConfig) {
        return
      }

      try {
        setFood99ActionLoading(action)
        const response = await api.fetch(actionConfig.path, {
          method: 'POST',
          body: {
            ...(options?.body || {}),
            ...(options?.deliveryCode ? { delivery_code: options.deliveryCode } : {}),
            ...(options?.locator ? { locator: options.locator } : {}),
          },
        })

        if (normalizeErrno(response?.result?.errno) !== '0') {
          throw response?.result || response
        }

        if (response?.state) {
          setFood99State(response.state)
        }

        if (action === 'ready') {
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
            // Keep user flow going; full state refresh runs below.
          }
        }

        await refreshCurrentOrder()
        await loadFood99OrderState({ silent: true })

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
        setFood99ActionLoading('')
      }
    },
    [
      item?.id,
      isFood99Order,
      food99ActionLoading,
      food99State,
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

  const fallbackFood99Summary = useMemo(() => buildFood99OrderSummary(item), [item])
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
      store_receivable_total: financial.storeReceivableTotal ?? 0,
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
      pay_channel: payment.payChannel || '',
      amount_paid: payment.amountPaid ?? 0,
      amount_pending: payment.amountPending ?? 0,
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
    }
  }, [fallbackFood99Summary])
  const food99Delivery = food99State?.delivery || null
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
      store_receivable_total: resolvePreferredMoney(
        stateFinancial.store_receivable_total,
        fallbackFood99Financial.store_receivable_total,
      ),
      store_charged_delivery_price: resolvePreferredMoney(
        stateFinancial.store_charged_delivery_price,
        fallbackFood99Financial.store_charged_delivery_price,
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
      pay_type_label: resolvePreferredText(
        statePayment.pay_type_label,
        fallbackFood99Payment.pay_type_label,
      ),
      pay_method: resolvePreferredText(statePayment.pay_method, fallbackFood99Payment.pay_method),
      pay_channel: resolvePreferredText(statePayment.pay_channel, fallbackFood99Payment.pay_channel),
      amount_paid: resolvePreferredMoney(statePayment.amount_paid, fallbackFood99Payment.amount_paid),
      amount_pending: resolvePreferredMoney(
        statePayment.amount_pending,
        fallbackFood99Payment.amount_pending,
      ),
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
    }
  }, [food99State?.address, fallbackFood99Address])
  const food99Notes = useMemo(() => {
    const stateNotes = food99State?.notes || null
    const remark = String(stateNotes?.remark || fallbackFood99Notes?.remark || '').trim()
    const needCutlery =
      stateNotes?.need_cutlery ??
      fallbackFood99Notes?.need_cutlery ??
      fallbackFood99Notes?.needCutlery ??
      null

    if (!remark && (needCutlery === null || needCutlery === undefined)) {
      return null
    }

    return {
      remark,
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
  const normalizedOrderRealStatus = String(
    food99State?.order?.status?.real_status || item?.status?.realStatus || '',
  ).toLowerCase()
  const isTerminalFood99Order =
    typeof food99Capabilities?.is_terminal === 'boolean'
      ? food99Capabilities.is_terminal
      : ['closed', 'cancelled', 'canceled'].includes(normalizedOrderRealStatus)
  const canCancelFood99Order =
    typeof food99Capabilities?.can_cancel === 'boolean'
      ? food99Capabilities.can_cancel
      : !isTerminalFood99Order
  const canManualCompleteFood99Order =
    typeof food99Capabilities?.can_delivered === 'boolean'
      ? food99Capabilities.can_delivered
      : !!food99Delivery?.allows_manual_delivery_completion
  const requiresFood99DeliveryLocator =
    typeof food99Capabilities?.requires_delivery_locator === 'boolean'
      ? food99Capabilities.requires_delivery_locator
      : !!food99Delivery?.is_store_delivery
  const food99LocatorLength =
    Number(food99Capabilities?.delivery_locator_length) > 0
      ? Number(food99Capabilities.delivery_locator_length)
      : 8
  const food99DeliveryCodeLength =
    Number(food99Capabilities?.delivery_code_length) > 0
      ? Number(food99Capabilities.delivery_code_length)
      : 4
  const shouldShowFood99DeliveryAction = canManualCompleteFood99Order
  const formattedFood99Eta = formatFood99Eta(food99Delivery?.expected_arrived_eta)
  const remoteOrderStateLabel = food99Integration?.remote_order_state_label || food99Integration?.remote_order_state || ''
  const remoteOrderStateKey = String(food99Integration?.remote_order_state || '').toLowerCase()
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
    food99Delivery?.handover_confirmation_url || food99Delivery?.handover_page_url || '',
  ).trim()
  const activeFood99Locator = String(deliveryLocator || food99Locator).trim()
  const isFood99Ready = remoteOrderStateKey === 'ready'
  const isFood99CourierToStore = remoteOrderStateKey === 'courier_to_store'
  const shouldHideReadyFood99Action = !!food99Delivery?.is_platform_delivery && isFood99Ready
  const canReadyFood99Order =
    typeof food99Capabilities?.can_ready === 'boolean'
      ? food99Capabilities.can_ready
      : !isTerminalFood99Order && !shouldHideReadyFood99Action
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
    typeof food99Capabilities?.is_delivering === 'boolean'
      ? food99Capabilities.is_delivering
      : ['courier_to_store', 'picked_up', 'delivering', 'arriving'].includes(remoteOrderStateKey)
  const remoteStateAgeLabel = formatAgeMinutes(food99Observability?.remote_state_age_minutes)
  const lastActionAgeLabel = formatAgeMinutes(food99Observability?.last_action_age_minutes)
  const lastReconcileAgeLabel = formatAgeMinutes(food99Observability?.last_reconcile_age_minutes)
  const localPaidAmount = Array.isArray(invoices)
    ? invoices.reduce((sum, invoice) => sum + Number(invoice?.price || 0), 0)
    : 0
  const localOrderTotal = Number(item?.price || 0)
  const localPendingAmount = Math.max(localOrderTotal - localPaidAmount, 0)
  const paidStatusId = String(defaultCompany?.configs?.['pos-paid-status'] || '').trim()
  const localStatusLabel = String(item?.status?.status || '').trim().toLowerCase()
  const localStatusId = String(item?.status?.['@id'] || item?.status?.id || '').trim()
  const isStatusMarkedPaid =
    localStatusLabel === 'paid' ||
    (paidStatusId &&
      (localStatusId === paidStatusId ||
        localStatusId.endsWith(`/${paidStatusId}`)))
  const isFinanciallyPaid =
    (isFood99Order && food99Payment?.is_fully_paid) ||
    localPendingAmount <= 0.009
  const isOrderPaidForCompletion = isStatusMarkedPaid || isFinanciallyPaid
  const canMarkOrderAsPaid =
    !!item?.id && !!paidStatusId && !isStatusMarkedPaid
  const hasFood99SyncIssue =
    food99Observability?.is_healthy === false ||
    hasErrnoError(food99Integration?.last_action_errno) ||
    hasErrnoError(food99Integration?.confirm_errno) ||
    hasErrnoError(food99Integration?.reconcile_errno)

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

    if (item?.id && isFood99Order && !food99State && !food99StateLoading) {
      await loadFood99OrderState({ silent: true })
    }
  }, [item?.id, isFood99Order, food99State, food99StateLoading, loadFood99OrderState])

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
    if (!item?.id || !isFood99Order || food99ActionLoading || food99CancelReasonsLoading) {
      return
    }

    try {
      setFood99CancelReasonsLoading(true)
      const response = await api.fetch(
        `/marketplace/integrations/99food/orders/${item.id}/cancel-reasons`,
      )

      if (response?.state) {
        setFood99State(response.state)
      }

      const reasons = Array.isArray(response?.result?.data?.reasons)
        ? response.result.data.reasons.filter(Boolean)
        : []

      if (reasons.length === 0) {
        showError('A 99Food nao retornou motivos de cancelamento para este pedido.')
        return
      }

      const applicableReasons = reasons.filter(reason => reason?.applicable !== false)
      const defaultReason =
        applicableReasons.find(reason => normalizeFood99CancelReasonId(reason?.reason_id) === 1080) ||
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
      showError('A 99Food nao enviou o link de confirmacao deste pedido.')
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
  }, [food99HandoverLink, showError])

  const handleFood99CopyHandoverLink = useCallback(async () => {
    if (!food99HandoverLink) {
      showError('A 99Food nao enviou o link de confirmacao deste pedido.')
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
  }, [food99HandoverLink, showError, showSuccess])

  const handleFood99ShareHandoverWhatsapp = useCallback(async () => {
    if (!food99HandoverLink) {
      showError('A 99Food nao enviou o link de confirmacao deste pedido.')
      return
    }

    const message = buildFood99LocatorShareMessage({
      locator: activeFood99Locator,
      url: food99HandoverLink,
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
  }, [food99HandoverLink, activeFood99Locator, showError])

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
    const normalizedDeliveryCode = normalizeDigits(
      deliveryCustomerCode,
      food99DeliveryCodeLength,
    )

    if (normalizedLocator.length !== food99LocatorLength) {
      showError(`Informe o localizador de ${food99LocatorLength} digitos.`)
      setDeliveryFlowStep('locator')
      return
    }

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
    showError,
    runFood99OrderAction,
  ])

  const handleFood99DeliveredPress = useCallback(() => {
    if (!isOrderPaidForCompletion) {
      showError('Marque o pedido como pago antes de concluir a entrega.')
      return
    }

    if (requiresFood99DeliveryLocator) {
      openFood99DeliveryFlow()
      return
    }

    runFood99OrderAction('delivered')
  }, [
    isOrderPaidForCompletion,
    showError,
    requiresFood99DeliveryLocator,
    openFood99DeliveryFlow,
    runFood99OrderAction,
  ])

  const handleFood99CancelConfirm = useCallback(async () => {
    const reasonId = normalizeFood99CancelReasonId(selectedFood99CancelReasonId)
    if (!reasonId) {
      showError('Selecione um motivo oficial da 99Food para cancelar.')
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

  return (
    <SafeAreaView
      style={[
        cssStyles.container,
        { flex: 1, paddingBottom: 120 },
        isKds && localStyles.kdsContainer,
      ]}
    >
      {showBarcodeInput && <BarcodeInput />}

      <StateStore store="orders" />

      <Modal
        transparent
        animationType="fade"
        visible={detailsModalVisible}
        onRequestClose={closeDetailsModal}
      >
        <View style={localStyles.deliveryCodeOverlay}>
          <View style={localStyles.detailsModal}>
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
                <Icon name="close" size={22} color="#E2E8F0" />
              </TouchableOpacity>
            </View>

            {canMarkOrderAsPaid && (
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
              contentContainerStyle={localStyles.detailsModalScrollContent}
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
                  Criado em: {formatOrderDateTime(item?.orderDate)}
                </Text>
                <Text style={localStyles.detailsInfoText}>
                  Alterado em: {formatOrderDateTime(item?.alterDate)}
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

              {isFood99Order && food99StateLoading && !food99State ? (
                <View style={localStyles.detailsLoadingState}>
                  <ActivityIndicator size="small" color="#38BDF8" />
                  <Text style={localStyles.detailsLoadingText}>
                    Carregando dados da integracao 99Food...
                  </Text>
                </View>
              ) : null}

              {isFood99Order && food99State ? (
                <>
                  <View style={localStyles.detailsSection}>
                    <Text style={localStyles.detailsSectionTitle}>Operacao 99Food</Text>
                    {!!food99Identifiers?.order_index && (
                      <Text style={localStyles.detailsInfoText}>
                        Numero 99Food: #{food99Identifiers.order_index}
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
                    {!!food99Payment?.pay_type_label && (
                      <Text style={localStyles.detailsInfoText}>
                        Pagamento: {food99Payment.pay_type_label}
                      </Text>
                    )}
                    {!!food99Payment?.pay_channel && (
                      <Text style={localStyles.detailsInfoText}>
                        Canal de pagamento: {food99Payment.pay_channel}
                      </Text>
                    )}
                  </View>

                  {(food99RiderName || food99RiderPhone || food99RiderToStoreEta) && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>Entregador 99</Text>
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
                      <Text style={localStyles.detailsSectionTitle}>Financeiro 99Food</Text>
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
                      <Text style={localStyles.detailsInfoText}>
                        Desconto loja: {Formatter.formatMoney(food99Financial.store_discount_total || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoText}>
                        Desconto 99: {Formatter.formatMoney(food99Financial.platform_discount_total || 0)}
                      </Text>
                      <Text style={localStyles.detailsInfoTextStrong}>
                        Total do cliente: {Formatter.formatMoney(food99Financial.customer_total || 0)}
                      </Text>
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
                    </View>
                  )}

                  {(food99Customer?.name || food99Customer?.phone || food99Address?.display) && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>Cliente e entrega</Text>
                      {!!food99Customer?.name && (
                        <Text style={localStyles.detailsInfoText}>{food99Customer.name}</Text>
                      )}
                      {!!food99Customer?.phone && (
                        <Text style={localStyles.detailsInfoText}>{food99Customer.phone}</Text>
                      )}
                      {!!food99Address?.display && (
                        <Text style={localStyles.detailsInfoText}>{food99Address.display}</Text>
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

                  {(food99Notes?.remark ||
                    (food99Notes?.need_cutlery !== null &&
                      food99Notes?.need_cutlery !== undefined)) && (
                    <View style={localStyles.detailsSection}>
                      <Text style={localStyles.detailsSectionTitle}>Observacoes</Text>
                      {!!food99Notes?.remark && (
                        <Text style={localStyles.detailsInfoText}>{food99Notes.remark}</Text>
                      )}
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
        <View style={localStyles.deliveryCodeOverlay}>
          <View style={localStyles.cancelReasonModal}>
            <Text style={localStyles.cancelReasonBadge}>Cancelamento 99Food</Text>
            <Text style={localStyles.cancelReasonTitle}>Escolha o motivo oficial</Text>
            <Text style={localStyles.cancelReasonDescription}>
              A 99 exige um motivo padrao para cancelar pedidos. Selecionamos abaixo
              apenas os motivos validos para este tipo de entrega.
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
                  placeholderTextColor="#64748B"
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
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={deliveryCodeModalVisible}
        onRequestClose={() => {
          if (!food99ActionLoading) {
            closeFood99DeliveryFlow()
          }
        }}
      >
        <View style={localStyles.deliveryCodeOverlay}>
          <View style={localStyles.deliveryCodeModal}>
            <Text style={localStyles.deliveryCodeStepBadge}>
              {deliveryFlowStep === 'locator' ? 'Passo 1 de 2' : 'Passo 2 de 2'}
            </Text>
            <Text style={localStyles.deliveryCodeDescription}>
              {deliveryFlowStep === 'locator'
                ? 'Confirme o localizador oficial da 99Food e envie o link de confirmacao ao entregador quando necessario.'
                : 'Depois de encontrar o cliente, informe o codigo de confirmacao de 4 digitos para concluir a entrega.'}
            </Text>

            <View style={localStyles.deliveryLocatorHero}>
              <Text style={localStyles.deliveryCodeMetaLabel}>Localizador 99</Text>
              <Text style={localStyles.deliveryLocatorHeroValue}>
                {activeFood99Locator || 'Nao informado'}
              </Text>
              <Text style={localStyles.deliveryLocatorHeroHelper}>
                {food99Locator
                  ? 'Passe este localizador ao entregador para confirmar a entrega no fluxo oficial da 99.'
                  : 'Se a 99 nao enviar o localizador no payload, use o numero do recibo e informe manualmente abaixo.'}
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
              {deliveryFlowStep === 'locator' ? 'Validar localizador' : 'Confirmar codigo do cliente'}
            </Text>

            <TextInput
              value={deliveryFlowStep === 'locator' ? deliveryLocator : deliveryCustomerCode}
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
              placeholderTextColor="#64748B"
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
                onPress={
                  deliveryFlowStep === 'locator'
                    ? handleFood99LocatorVerify
                    : handleFood99DeliveryCodeConfirm
                }
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
          </View>
        </View>
      </Modal>

      {!isLoading && item && !error && (
        <View style={{ flex: 1 }}>
          {isKds ? (
            <>
              <OrderHeader order={item} showCustomer />

              {isFood99Order && (
                <View style={localStyles.food99InfoCard}>
                  <View style={localStyles.food99InfoHeader}>
                    <Text style={localStyles.food99InfoTitle}>Operacao 99Food</Text>
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
                        ? 'Pedido em entrega. Use Entregue para validar o localizador e confirmar o codigo do cliente.'
                        : 'Pedido em entrega. Conclua em Entregue quando a loja finalizar no app 99Food.'}
                    </Text>
                  ) : null}

                  {food99Delivery?.is_store_delivery && !food99Delivery?.locator ? (
                    <Text style={localStyles.food99InfoWarning}>
                      A 99 nao enviou o localizador neste payload. Pelo roteiro oficial, isso depende da lista de envio do localizador; use o numero do recibo manualmente e solicite habilitacao ao time da 99.
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
                      <Text style={localStyles.food99SummaryTitle}>Entregador 99</Text>
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
                      Numero 99Food: #{food99Identifiers.order_index}
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

                  {!!food99Payment?.pay_type_label && (
                    <Text style={localStyles.food99InfoText}>
                      Pagamento: {food99Payment.pay_type_label}
                    </Text>
                  )}
                  {!!food99Payment?.pay_channel && (
                    <Text style={localStyles.food99InfoText}>
                      Canal de pagamento: {food99Payment.pay_channel}
                    </Text>
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
                      <Text style={localStyles.food99SummaryTitle}>Resumo financeiro 99Food</Text>
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
                        <Text style={localStyles.food99InfoText}>
                          Descontos totais: {Formatter.formatMoney(food99Financial.discount_total || 0)}
                        </Text>
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
                    </View>
                  )}

                  {!!food99Address?.display && (
                    <View style={localStyles.food99SummaryBlock}>
                      <Text style={localStyles.food99SummaryTitle}>Endereco do cliente</Text>
                      <Text style={localStyles.food99InfoText}>{food99Address.display}</Text>
                    </View>
                  )}

                  {(food99Customer?.name || food99Customer?.phone) && (
                    <View style={localStyles.food99SummaryBlock}>
                      <Text style={localStyles.food99SummaryTitle}>Cliente</Text>
                      {!!food99Customer?.name && (
                        <Text style={localStyles.food99InfoText}>{food99Customer.name}</Text>
                      )}
                      {!!food99Customer?.phone && (
                        <Text style={localStyles.food99InfoText}>{food99Customer.phone}</Text>
                      )}
                    </View>
                  )}

                  {(food99Notes?.remark || food99Notes?.need_cutlery !== null && food99Notes?.need_cutlery !== undefined) && (
                    <View style={localStyles.food99SummaryBlock}>
                      <Text style={localStyles.food99SummaryTitle}>Observacoes</Text>
                      {!!food99Notes?.remark && (
                        <Text style={localStyles.food99InfoText}>{food99Notes.remark}</Text>
                      )}
                      {food99Notes?.need_cutlery !== null && food99Notes?.need_cutlery !== undefined && (
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
                      Pedido pronto aguardando plataforma. O cliente sera atualizado pela 99Food.
                    </Text>
                  ) : null}

                  {hasFood99SyncIssue ? (
                    <Text style={localStyles.food99InfoWarning}>
                      Integracao com divergencia. Toque no refresh para atualizar o estado.
                    </Text>
                  ) : null}

                  {!isOrderPaidForCompletion && shouldShowFood99DeliveryAction ? (
                    <Text style={localStyles.food99InfoWarning}>
                      Este pedido ainda nao esta pago localmente. Marque como pago em Detalhes antes de concluir a entrega.
                    </Text>
                  ) : null}
                </View>
              )}

              {isFood99Order ? (
                <View style={localStyles.kdsActionRow}>
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
                      disabled={!!food99ActionLoading || !isOrderPaidForCompletion}
                      style={[
                        localStyles.kdsActionButton,
                        localStyles.kdsActionSuccess,
                        (food99ActionLoading || !isOrderPaidForCompletion) &&
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
                  <TouchableOpacity style={[localStyles.kdsActionButton, localStyles.kdsActionDanger]}>
                    <Text style={localStyles.kdsActionText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[localStyles.kdsActionButton, localStyles.kdsActionSuccess]}>
                    <Text style={localStyles.kdsActionText}>Entregue</Text>
                  </TouchableOpacity>
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
          ) : (
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

          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            <View
              style={[
                cssStyles.itemsSection,
                {
                  flex: 1,
                  flexDirection: 'column',
                  width: '100%',
                  backgroundColor: isKds ? '#060A11' : undefined,
                  borderRadius: isKds ? 12 : 0,
                  padding: isKds ? 8 : 0,
                },
              ]}
            >
              <OrderProducts
                order={item}
                scale={scale}
                styles={localStyles}
                indentStep={22}
              />
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  )
}

const createStyles = scale =>
  StyleSheet.create({
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
      backgroundColor: '#060A11',
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
    cancelReasonModal: {
      width: '92%',
      maxWidth: 520,
      maxHeight: '84%',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#1E3A5F',
      backgroundColor: '#0A1420',
      padding: 16,
      shadowColor: '#020617',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 12,
    },
    cancelReasonBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#1D4ED8',
      backgroundColor: '#0F172A',
      color: '#93C5FD',
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    cancelReasonTitle: {
      color: '#F8FAFC',
      fontSize: 24,
      fontWeight: '900',
      marginBottom: 6,
    },
    cancelReasonDescription: {
      color: '#CBD5E1',
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
      color: '#CBD5E1',
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
      borderColor: '#1E293B',
      backgroundColor: '#0B1220',
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    cancelReasonOptionSelected: {
      borderColor: '#38BDF8',
      backgroundColor: '#0C1A2A',
    },
    cancelReasonOptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    cancelReasonOptionCode: {
      color: '#93C5FD',
      fontSize: 11,
      fontWeight: '800',
    },
    cancelReasonOptionBadge: {
      color: '#FCD34D',
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    cancelReasonOptionText: {
      color: '#F8FAFC',
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    },
    cancelReasonInputBlock: {
      marginTop: 12,
      marginBottom: 2,
    },
    cancelReasonInputLabel: {
      color: '#93C5FD',
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    cancelReasonInput: {
      minHeight: 82,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#1E3A5F',
      backgroundColor: '#020617',
      color: '#F8FAFC',
      fontSize: 16,
      fontWeight: '700',
      paddingHorizontal: 12,
      paddingVertical: 10,
      textAlignVertical: 'top',
    },
    cancelReasonButtonDanger: {
      borderColor: '#991B1B',
      backgroundColor: '#7F1D1D',
    },
    detailsModal: {
      width: '94%',
      maxWidth: 860,
      maxHeight: '88%',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#163047',
      backgroundColor: '#0A1420',
      padding: 18,
      shadowColor: '#020617',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 14,
    },
    detailsModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 14,
    },
    detailsModalEyebrow: {
      color: '#93C5FD',
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    detailsModalTitle: {
      color: '#F8FAFC',
      fontSize: 28,
      fontWeight: '900',
    },
    detailsModalCloseButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#1E3A5F',
      backgroundColor: '#0F172A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailsModalScroll: {
      flexGrow: 0,
    },
    detailsModalScrollContent: {
      paddingBottom: 6,
      gap: 12,
    },
    detailsMarkPaidButton: {
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#166534',
      backgroundColor: '#102617',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    detailsMarkPaidButtonText: {
      color: '#F8FAFC',
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
      borderColor: '#1E293B',
      backgroundColor: '#0B1220',
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    detailsCardLabel: {
      color: '#93C5FD',
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    detailsCardValue: {
      color: '#F8FAFC',
      fontSize: 17,
      fontWeight: '800',
    },
    detailsSection: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#1E293B',
      backgroundColor: '#0B1220',
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    detailsSectionTitle: {
      color: '#93C5FD',
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    detailsInfoText: {
      color: '#CBD5E1',
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 19,
      marginBottom: 4,
    },
    detailsInfoTextStrong: {
      color: '#F8FAFC',
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 19,
      marginBottom: 4,
    },
    detailsLoadingState: {
      minHeight: 120,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#1E293B',
      backgroundColor: '#0B1220',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    detailsLoadingText: {
      color: '#CBD5E1',
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
      color: '#FDBA74',
      fontSize: 12,
      fontWeight: '700',
      marginTop: 6,
    },
    deliveryCodeOverlay: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.78)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    deliveryCodeModal: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#163047',
      backgroundColor: '#0A1420',
      padding: 18,
    },
    deliveryCodeStepBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#1D4ED8',
      backgroundColor: '#0F172A',
      color: '#93C5FD',
      fontSize: 11,
      fontWeight: '800',
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginBottom: 10,
      overflow: 'hidden',
      textTransform: 'uppercase',
    },
    deliveryCodeTitle: {
      color: '#F8FAFC',
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 8,
    },
    deliveryCodeDescription: {
      color: '#CBD5E1',
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 14,
    },
    deliveryCodeInput: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#1E3A5F',
      backgroundColor: '#020617',
      color: '#F8FAFC',
      minHeight: 52,
      paddingHorizontal: 16,
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: 6,
      textAlign: 'center',
      marginBottom: 10,
    },
    deliveryCodeHelper: {
      color: '#94A3B8',
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 14,
    },
    deliveryCodeActions: {
      flexDirection: 'row',
      gap: 10,
    },
    deliveryCodeMetaCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#1E293B',
      backgroundColor: '#020617',
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
      borderColor: '#1E293B',
      backgroundColor: '#020617',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    deliveryCodeMetaLabel: {
      color: '#94A3B8',
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    deliveryCodeMetaValue: {
      color: '#F8FAFC',
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: 2,
    },
    deliveryCodeMetaValueCompact: {
      color: '#F8FAFC',
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: 1.5,
    },
    deliveryLocatorHero: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#2B4A62',
      backgroundColor: '#08111D',
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 12,
    },
    deliveryLocatorHeroValue: {
      color: '#F8FAFC',
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: 4,
      marginBottom: 8,
    },
    deliveryLocatorHeroHelper: {
      color: '#CBD5E1',
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 10,
    },
    deliveryLinkCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#23405A',
      backgroundColor: '#09131F',
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
    },
    deliveryLinkUrl: {
      color: '#7DD3FC',
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
      borderColor: '#2B4A62',
      backgroundColor: '#0F172A',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    deliveryLinkActionText: {
      color: '#E2E8F0',
      fontSize: 12,
      fontWeight: '700',
    },
    deliveryLinkPrimaryButton: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#1D4ED8',
      backgroundColor: '#0F172A',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    deliveryLinkPrimaryButtonText: {
      color: '#DBEAFE',
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
      borderColor: '#475569',
      backgroundColor: '#0F172A',
    },
    deliveryCodeButtonPrimary: {
      borderColor: '#166534',
      backgroundColor: '#102617',
    },
    deliveryCodeButtonSecondaryText: {
      color: '#E2E8F0',
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
