const normalizeText = value => String(value ?? '').trim()

const isPrivacyPlaceholder = value => {
  const normalized = normalizeText(value).toLowerCase()
  if (!normalized) return false

  return ['privacy protection', 'privacy_protection', 'privacy-protection'].includes(
    normalized,
  )
}

const sanitizeIdentityValue = value => {
  const normalized = normalizeText(value)
  return normalized && !isPrivacyPlaceholder(normalized) ? normalized : ''
}

const resolveCustomerName = receiveAddress =>
  [
    sanitizeIdentityValue(receiveAddress?.name),
    sanitizeIdentityValue(receiveAddress?.first_name),
    sanitizeIdentityValue(receiveAddress?.last_name),
  ]
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(' ')

const isObject = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const normalizeKey = value =>
  normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const decodeJson = value => {
  if (Array.isArray(value)) {
    return value
  }

  if (isObject(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return {}
  }

  try {
    const decoded = JSON.parse(value)
    if (typeof decoded === 'string') {
      return decodeJson(decoded)
    }

    return isObject(decoded) ? decoded : {}
  } catch {
    return {}
  }
}

const decodeOrderOtherInformations = order =>
  decodeJson(
    order?.otherInformations ??
      order?.other_information ??
      order?.otherInformation ??
      order?.otherInformationsJson ??
      order?.other_information_json,
  )

const unwrapPayload = payload => {
  let current = payload

  for (let depth = 0; depth < 10; depth += 1) {
    if (!isObject(current)) {
      break
    }

    const keys = Object.keys(current)
    const wrapperKey =
      keys.find(key => ['food99', '99food', 'ifood'].includes(normalizeKey(key))) ||
      (keys.length === 1 ? keys[0] : null)

    if (!wrapperKey || !isObject(current[wrapperKey])) {
      break
    }

    current = current[wrapperKey]
  }

  return isObject(current) ? current : {}
}

const resolveEventPayload = payload => {
  const current = unwrapPayload(payload)
  const latestEventType = normalizeText(
    current?.latest_event_type ||
      current?.latestEventType ||
      current?.event_type ||
      current?.eventType,
  )

  if (latestEventType) {
    const eventKey = Object.keys(current).find(
      key => normalizeKey(key) === normalizeKey(latestEventType) && isObject(current[key]),
    )

    if (eventKey) {
      return current[eventKey]
    }
  }

  return current
}

const toMoney = value => {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  return Math.round((Number(value) / 100) * 100) / 100
}

const toIfoodMoney = value => {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  const normalized = Number(String(value).replace(',', '.'))
  return Number.isFinite(normalized) ? normalized : 0
}

const sumStoreSubsidy = promotions =>
  promotions.reduce((total, promotion) => {
    if (!isObject(promotion)) return total
    return total + toMoney(promotion.shop_subside_price)
  }, 0)

const sumPromotionDiscount = promotions =>
  promotions.reduce((total, promotion) => {
    if (!isObject(promotion)) return total
    return total + toMoney(promotion.promo_discount)
  }, 0)

const extractPromotionList = payload => {
  const data = isObject(payload?.data) ? payload.data : {}
  const orderInfo = isObject(data?.order_info) ? data.order_info : {}
  const promotions = Array.isArray(orderInfo?.promotions)
    ? orderInfo.promotions
    : Array.isArray(data?.promotions)
      ? data.promotions
      : []

  if (promotions.length) {
    return promotions.filter(isObject)
  }

  const items = Array.isArray(orderInfo?.order_items)
    ? orderInfo.order_items
    : Array.isArray(data?.order_items)
      ? data.order_items
      : []

  return items
    .map(item => (isObject(item?.promotion_detail) ? item.promotion_detail : null))
    .filter(isObject)
}

const extractOrderItems = payload => {
  const data = isObject(payload?.data) ? payload.data : {}
  const orderInfo = isObject(data?.order_info) ? data.order_info : {}

  const items = Array.isArray(orderInfo?.order_items)
    ? orderInfo.order_items
    : Array.isArray(data?.order_items)
      ? data.order_items
      : []

  return items.filter(isObject)
}

const resolveFood99PaymentMethodLabel = payMethod => {
  switch (normalizeText(payMethod)) {
    case '1':
      return global.t?.t('orders', 'label', 'paymentOnline')
    case '2':
      return global.t?.t('orders', 'label', 'paymentOffline')
    case '0':
      return global.t?.t('orders', 'label', 'notInformedBy99')
    default:
      return global.t?.t('orders', 'label', 'methodNotMapped')
  }
}

const resolveFood99PaymentTypeLabel = ({ payType, deliveryType }) => {
  switch (normalizeText(payType)) {
    case '1':
      return global.t?.t('orders', 'label', 'paymentOnline')
    case '2':
      return global.t?.t('orders', 'label', 'cash')
    case '3':
      return global.t?.t('orders', 'label', 'pos')
    case '4':
      return global.t?.t('orders', 'label', 'wallet99Pay')
    case '5':
      return global.t?.t('orders', 'label', 'payPayWithoutPassword')
    case '6':
      return global.t?.t('orders', 'label', 'payPayWithPassword')
    default:
      return normalizeText(deliveryType) === '1'
        ? global.t?.t('orders', 'label', 'paymentProcessedBy99Food')
        : global.t?.t('orders', 'label', 'paymentNotMapped')
  }
}

const resolveFood99PaymentChannelLabel = ({
  payChannel,
  payMethod,
  deliveryType,
}) => {
  const normalizedPayChannel = normalizeText(payChannel)
  const normalizedPayMethod = normalizeText(payMethod)
  const normalizedDeliveryType = normalizeText(deliveryType)

  if (!normalizedPayChannel) {
    return ''
  }

  switch (normalizedPayChannel) {
    case '0':
      return global.t?.t('orders', 'label', 'notInformedBy99')
    case '110':
      return global.t?.t('orders', 'label', 'coupon')
    case '120':
      return global.t?.t('orders', 'label', 'wallet99Food')
    case '150':
      return global.t?.t('orders', 'label', 'creditDebitCard')
    case '153':
      return global.t?.t('orders', 'label', 'cash')
    case '154':
      return global.t?.t('orders', 'label', 'pos')
    case '167':
      return global.t?.t('orders', 'label', 'preAuth')
    case '182':
      return global.t?.t('orders', 'label', 'payPayWithoutPassword')
    case '184':
      return global.t?.t('orders', 'label', 'payPayWithPassword')
    case '190':
      return global.t?.t('orders', 'label', 'pay99')
    case '212':
      return global.t?.t('orders', 'label', 'pix')
    case '219':
      return global.t?.t('orders', 'label', 'account99Food')
    case '229':
      return global.t?.t('orders', 'label', 'nuPay')
    case '234':
      return global.t?.t('orders', 'label', 'applePayPreAuth')
    case '235':
      return global.t?.t('orders', 'label', 'applePay')
    case '257':
      return global.t?.t('orders', 'label', 'pluxeeMealVoucher')
    case '258':
      return global.t?.t('orders', 'label', 'ticketMealVoucher')
    case '259':
      return global.t?.t('orders', 'label', 'vrMealVoucher')
    case '260':
      return global.t?.t('orders', 'label', 'aleloMealVoucher')
    case '261':
      return 'NEQUI'
    case '262':
      return `${global.t?.t('orders', 'label', 'pos')} ${global.t?.t('orders', 'label', 'creditCard').toLowerCase()}`
    case '263':
      return `${global.t?.t('orders', 'label', 'pos')} ${global.t?.t('orders', 'label', 'debitCard').toLowerCase()}`
    case '264':
      return `${global.t?.t('orders', 'label', 'pos')} ${global.t?.t('orders', 'label', 'mealVoucher').toLowerCase()}`
    case '272':
      return global.t?.t('orders', 'label', 'googlePay')
    case '273':
      return global.t?.t('orders', 'label', 'googlePayPreAuth')
    case '310':
      return 'Yape'
    case '311':
      return 'Plin'
    case '901':
      return global.t?.t('orders', 'label', 'benefit')
    case '2008':
      return global.t?.t('orders', 'label', 'marketing')
    default:
      if (normalizedPayMethod === '1') {
        return normalizedDeliveryType === '1'
          ? global.t?.t('orders', 'label', 'paymentOnline')
          : global.t?.t('orders', 'label', 'paymentOnlineSelectedByCustomer')
      }
      if (normalizedPayMethod === '2') return global.t?.t('orders', 'label', 'paymentOffline')
      return global.t?.t('orders', 'label', 'channelNotMapped')
  }
}

const resolveFood99SelectedPaymentLabel = ({
  payChannelLabel,
  payTypeLabel,
  payMethodLabel,
}) => {
  const candidates = [payChannelLabel, payTypeLabel, payMethodLabel]
    .map(normalizeText)
    .filter(Boolean)

  const preferredLabel = candidates.find(
    label =>
      ![
        global.t?.t('orders', 'label', 'notInformedBy99'),
        global.t?.t('orders', 'label', 'channelNotMapped'),
        global.t?.t('orders', 'label', 'methodNotMapped'),
        global.t?.t('orders', 'label', 'paymentNotMapped'),
      ].includes(label),
  )

  return preferredLabel || candidates[0] || ''
}

const resolveIfoodPaymentMethodLabel = method => {
  switch (normalizeKey(method)) {
    case 'cash':
      return global.t?.t('orders', 'label', 'cashPayment')
    case 'credit':
      return global.t?.t('orders', 'label', 'creditCardPayment')
    case 'debit':
      return global.t?.t('orders', 'label', 'debitCardPayment')
    case 'pix':
      return global.t?.t('orders', 'label', 'pixPayment')
    default:
      return normalizeText(method) || global.t?.t('orders', 'label', 'methodNotMapped')
  }
}

const resolveIfoodPaymentChannelLabel = method => {
  switch (normalizeKey(method)) {
    case 'cash':
      return global.t?.t('orders', 'label', 'cash')
    case 'credit':
      return global.t?.t('orders', 'label', 'creditCard')
    case 'debit':
      return global.t?.t('orders', 'label', 'debitCard')
    case 'pix':
      return global.t?.t('orders', 'label', 'pix')
    default:
      return normalizeText(method) || global.t?.t('orders', 'label', 'methodNotMapped')
  }
}

const resolveIfoodPaymentTypeLabel = type => {
  switch (normalizeKey(type)) {
    case 'online':
      return global.t?.t('orders', 'label', 'paymentOnline')
    case 'offline':
      return global.t?.t('orders', 'label', 'paymentOnDelivery')
    default:
      return normalizeText(type) || global.t?.t('orders', 'label', 'paymentNotMapped')
  }
}

const resolveIfoodSelectedPaymentLabel = ({ methodLabel, typeLabel, brand, prepaid }) => {
  const normalizedBrand = normalizeText(brand)
  const normalizedMethod = normalizeText(methodLabel)
  const normalizedType = normalizeText(typeLabel)
  const methodKey = normalizeKey(methodLabel)
  const candidates = []

  if (normalizedMethod) {
    if ((methodKey.includes('cartao de credito') || methodKey.includes('cartao de debito')) && normalizedBrand) {
      candidates.push(`${normalizedMethod} (${normalizedBrand.toUpperCase()})`)
    } else {
      candidates.push(normalizedMethod)
    }
  }

  if (prepaid && normalizedType) {
    candidates.push(normalizedType)
  }

  if (normalizedBrand && !(methodKey.includes('cartao de credito') || methodKey.includes('cartao de debito'))) {
    candidates.push(normalizedBrand)
  }

  return candidates.find(Boolean) || ''
}

const getPayloadScore = payload => {
  const data = isObject(payload?.data) ? payload.data : {}
  const orderInfo = isObject(data?.order_info) ? data.order_info : {}

  const hasData = Object.keys(data).length > 0
  const hasOrderInfo = Object.keys(orderInfo).length > 0
  const hasPrice = isObject(orderInfo?.price) || isObject(data?.price)
  const hasAddress = isObject(orderInfo?.receive_address) || isObject(data?.receive_address)
  const hasItems =
    (Array.isArray(orderInfo?.order_items) && orderInfo.order_items.length > 0) ||
    (Array.isArray(data?.order_items) && data.order_items.length > 0)
  const hasPromotions =
    (Array.isArray(orderInfo?.promotions) && orderInfo.promotions.length > 0) ||
    (Array.isArray(data?.promotions) && data.promotions.length > 0)

  let score = 0
  if (hasData) score += 1
  if (hasOrderInfo) score += 8
  if (hasPrice) score += 10
  if (hasAddress) score += 10
  if (hasItems) score += 8
  if (hasPromotions) score += 2
  if (normalizeText(orderInfo?.order_index ?? data?.order_index)) score += 2
  if (normalizeText(orderInfo?.delivery_type ?? data?.delivery_type)) score += 1
  if (normalizeText(orderInfo?.pay_type ?? data?.pay_type)) score += 1
  if (normalizeText(orderInfo?.remark ?? data?.remark)) score += 3
  if (
    normalizeText(
      data?.handover_code ??
        orderInfo?.handover_code ??
        data?.pickup_code ??
        orderInfo?.pickup_code,
    )
  ) {
    score += 1
  }
  if (normalizeText(data?.order_id ?? orderInfo?.order_id)) score += 1

  return score
}

const getBestPayload = order => {
  const otherInformations = decodeOrderOtherInformations(order)
  const latestEventType = normalizeText(otherInformations?.latest_event_type)
  const candidateKeys = [
    latestEventType,
    'orderDetailSync',
    'orderNew',
    'Food99',
    '99Food',
  ].filter(Boolean)

  const priorityMap = new Map(
    candidateKeys.map((key, index) => [key, index]),
  )
  const discoveredKeys = Object.keys(otherInformations || {})
  const allCandidateKeys = [...new Set([...candidateKeys, ...discoveredKeys, 'iFood', 'ifood'])]
  const rankedCandidates = []

  for (const key of allCandidateKeys) {
    const candidate = decodeJson(otherInformations?.[key])
    const payload = resolveEventPayload(candidate)
    if (!Object.keys(payload).length) continue

    rankedCandidates.push({
      payload,
      score: getPayloadScore(payload),
      priority: priorityMap.has(key) ? priorityMap.get(key) : candidateKeys.length + 10,
    })
  }

  const directPayload = resolveEventPayload(otherInformations)
  if (Object.keys(directPayload).length) {
    rankedCandidates.push({
      payload: directPayload,
      score: getPayloadScore(directPayload),
      priority: candidateKeys.length + 20,
    })
  }

  if (!rankedCandidates.length) {
    return null
  }

  rankedCandidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score
    return left.priority - right.priority
  })

  return rankedCandidates[0]?.payload || null
}

export const isFood99Order = order =>
  /food99|99food|ifood/i.test(normalizeText(order?.app))

const buildIfoodOrderSummary = order => {
  const payload = getBestPayload(order)
  if (!payload) {
    return null
  }

  const ifoodOrder = isObject(payload?.order)
    ? payload.order
    : isObject(payload?.data?.order)
      ? payload.data.order
      : isObject(payload?.order_info)
        ? payload.order_info
        : payload

  const delivery = isObject(ifoodOrder?.delivery) ? ifoodOrder.delivery : {}
  const deliveryAddress = isObject(delivery?.deliveryAddress) ? delivery.deliveryAddress : {}
  const customer = isObject(ifoodOrder?.customer) ? ifoodOrder.customer : {}
  const phone = isObject(customer?.phone) ? customer.phone : {}
  const payments = isObject(ifoodOrder?.payments) ? ifoodOrder.payments : {}
  const paymentMethod = Array.isArray(payments?.methods) && payments.methods.length
    ? payments.methods[0]
    : {}
  const total = isObject(ifoodOrder?.total) ? ifoodOrder.total : {}
  const additionalFees = Array.isArray(ifoodOrder?.additionalFees)
    ? ifoodOrder.additionalFees.filter(isObject)
    : []
  const items = Array.isArray(ifoodOrder?.items)
    ? ifoodOrder.items.filter(isObject)
    : []

  const itemRemarks = items
    .map(item => normalizeText(item?.observations))
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(' | ')

  const itemsTotal = toIfoodMoney(total?.subTotal)
  const deliveryFee = toIfoodMoney(total?.deliveryFee)
  const serviceFee = additionalFees.reduce((sum, fee) => sum + toIfoodMoney(fee?.value), 0)
  const discountTotal = toIfoodMoney(total?.benefits)
  const customerTotal = toIfoodMoney(total?.orderAmount)
  const amountPaid = toIfoodMoney(payments?.prepaid)
  const amountPending = toIfoodMoney(payments?.pending)
  const isPaidOnline = amountPaid > 0 && amountPending <= 0.009
  const methodType = normalizeText(paymentMethod?.method)
  const paymentMethodLabel = resolveIfoodPaymentMethodLabel(methodType)
  const paymentTypeLabel = resolveIfoodPaymentTypeLabel(paymentMethod?.type)
  const paymentBrand = normalizeText(paymentMethod?.card?.brand)
  const paymentChannelLabel = resolveIfoodPaymentChannelLabel(methodType)
  const selectedPaymentLabel = resolveIfoodSelectedPaymentLabel({
    methodLabel: paymentMethodLabel,
    typeLabel: paymentTypeLabel,
    brand: paymentBrand,
    prepaid: paymentMethod?.prepaid === true,
  })
  const changeFor = toIfoodMoney(paymentMethod?.cash?.changeFor)
  const changeAmount = changeFor > customerTotal ? Math.max(0, Math.round((changeFor - customerTotal) * 100) / 100) : 0
  const customerNeedPayingMoney = amountPending > 0 ? amountPending : customerTotal
  const deliveryLabel = delivery?.deliveredBy === 'MERCHANT' ? 'Entrega da loja' : 'Entrega pela plataforma'
  const deliveryMode = normalizeText(delivery?.mode)
  const localizer = normalizeText(phone?.localizer)
  const pickupCode = normalizeText(delivery?.pickupCode)
  const handoverCode = normalizeText(delivery?.handoverCode || delivery?.pickupCode || pickupCode)
  const observations = normalizeText(delivery?.observations)

  return {
    integration: {
      latestEventType: normalizeText(payload?.latest_event_type || payload?.latestEventType),
    },
    financial: {
      itemsTotal,
      deliveryFee,
      serviceFee,
      smallOrderFee: 0,
      mealTopUpFee: 0,
      tipTotal: 0,
      subtotalBeforeDiscounts: Math.max(0, Math.round((itemsTotal + deliveryFee + serviceFee) * 100) / 100),
      discountTotal,
      storeDiscountTotal: 0,
      platformDiscountTotal: 0,
      customerTotal,
      promotionsTotal: discountTotal,
      itemsDiscountTotal: 0,
      deliveryDiscountTotal: 0,
      couponDiscountTotal: 0,
      customerNeedPayingMoney,
      realPayTotal: amountPaid,
      refundTotal: 0,
      shopPaidMoney: 0,
      storeChargedDeliveryPrice: deliveryFee,
      storeReceivableTotal: customerTotal,
      ifoodSubsidy: 0,
      merchantSubsidy: 0,
      paymentBrand,
    },
    payment: {
      payType: paymentMethod?.type || '',
      payTypeLabel: paymentTypeLabel,
      payMethod: methodType,
      payMethodLabel: paymentMethodLabel,
      payChannel: paymentMethod?.card?.brand || methodType,
      payChannelLabel: paymentChannelLabel || paymentBrand || paymentMethodLabel,
      selectedPaymentLabel,
      amountPaid,
      amountPending,
      collectOnDeliveryAmount: amountPending,
      customerNeedPayingMoney,
      shopPaidMoney: 0,
      changeFor,
      changeAmount,
      needsChange: changeAmount > 0.009,
      isPaidOnline,
      isFullyPaid: amountPending <= 0.009,
      paymentBrand,
    },
    customer: {
      name: sanitizeIdentityValue(customer?.name) || normalizeText(order?.customerName) || '',
      phone: normalizeText(phone?.number),
      localizer,
    },
    delivery: {
      deliveryLabel,
      deliveredBy: normalizeText(delivery?.deliveredBy),
      deliveryMode,
      expectedArrivedEta: normalizeText(delivery?.deliveryDateTime),
      pickupCode,
      handoverCode,
      localizer,
      handoverPageUrl: 'https://confirmacao-entrega-propria.ifood.com.br/',
      handoverConfirmationUrl: 'https://confirmacao-entrega-propria.ifood.com.br/',
      virtualPhoneNumber: normalizeText(phone?.number),
      riderName: '',
      riderPhone: normalizeText(phone?.number),
      riderToStoreEta: '',
      isStoreDelivery: delivery?.deliveredBy === 'MERCHANT',
      isPlatformDelivery: delivery?.deliveredBy !== 'MERCHANT',
      allowsManualDeliveryCompletion: delivery?.deliveredBy === 'MERCHANT',
    },
    address: {
      display: [
        deliveryAddress?.formattedAddress,
        deliveryAddress?.neighborhood,
        deliveryAddress?.city,
        deliveryAddress?.state,
        deliveryAddress?.reference,
      ]
        .map(normalizeText)
        .filter(Boolean)
        .filter((value, index, list) => list.indexOf(value) === index)
        .join(', '),
      streetName: normalizeText(deliveryAddress?.streetName),
      streetNumber: normalizeText(deliveryAddress?.streetNumber),
      district: normalizeText(deliveryAddress?.neighborhood),
      city: normalizeText(deliveryAddress?.city),
      state: normalizeText(deliveryAddress?.state),
      postalCode: normalizeText(deliveryAddress?.postalCode),
      reference: normalizeText(deliveryAddress?.reference),
      complement: normalizeText(deliveryAddress?.complement),
      poiAddress: normalizeText(deliveryAddress?.formattedAddress),
    },
    notes: {
      remark: observations,
      itemRemarks,
      needCutlery: ifoodOrder?.needCutlery ?? null,
    },
    identifiers: {
      orderIndex: normalizeText(ifoodOrder?.displayId || ifoodOrder?.display_id || ifoodOrder?.id || order?.id),
      pickupCode,
      handoverCode,
      localizer,
      handoverPageUrl: 'https://confirmacao-entrega-propria.ifood.com.br/',
    },
    items: items.map(item => ({
      name: normalizeText(item?.name),
      quantity: Number(item?.quantity || 0),
      unitPrice: toIfoodMoney(item?.unitPrice ?? item?.price),
      totalPrice: toIfoodMoney(item?.totalPrice ?? item?.price),
      description: normalizeText(item?.externalCode || item?.unit || item?.type),
      observation: normalizeText(item?.observations),
      type: normalizeText(item?.type),
    })),
  }
}

export const buildFood99OrderSummary = order => {
  if (!isFood99Order(order)) {
    return null
  }

  if (/ifood/i.test(normalizeText(order?.app))) {
    return buildIfoodOrderSummary(order)
  }

  const payload = getBestPayload(order)
  if (!payload) {
    return null
  }

  const data = isObject(payload?.data) ? payload.data : {}
  const orderInfo = isObject(data?.order_info) ? data.order_info : {}
  const price = isObject(orderInfo?.price)
    ? orderInfo.price
    : isObject(data?.price)
      ? data.price
      : {}
  const otherFees = isObject(price?.others_fees) ? price.others_fees : {}
  const receiveAddress = isObject(orderInfo?.receive_address)
    ? orderInfo.receive_address
    : isObject(data?.receive_address)
      ? data.receive_address
      : {}
  const orderItems = extractOrderItems(payload)
  const itemRemarks = orderItems
    .map(item => normalizeText(item?.remark))
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(' | ')
  const promotions = extractPromotionList(payload)
  const deliveryType = normalizeText(orderInfo?.delivery_type ?? data?.delivery_type)
  const payType = normalizeText(orderInfo?.pay_type ?? data?.pay_type)
  const payMethod = normalizeText(orderInfo?.pay_method ?? data?.pay_method)
  const payChannel = normalizeText(orderInfo?.pay_channel ?? data?.pay_channel)
  const itemsDiscountTotal = toMoney(price?.items_discount)
  const deliveryDiscountTotal = toMoney(price?.delivery_discount)
  const couponDiscountTotal = toMoney(otherFees?.coupon_discount)
  const originalDeliveryFee = toMoney(
    price?.store_charged_delivery_price ?? price?.delivery_price,
  )
  const promotionsTotal = sumPromotionDiscount(promotions)
  const customerNeedPayingMoney = toMoney(price?.customer_need_paying_money)
  const realPayTotal = toMoney(price?.real_pay_price)
  const refundTotal = toMoney(price?.refund_price)
  const changeFor = toMoney(orderInfo?.change_for ?? data?.change_for)
  const shopPaidMoney = toMoney(price?.shop_paid_money)

  const itemsTotal = toMoney(price?.order_price)
  const deliveryFee = originalDeliveryFee
  const serviceFee = toMoney(otherFees?.service_price)
  const smallOrderFee = toMoney(otherFees?.small_order_price)
  const mealTopUpFee = toMoney(otherFees?.meal_top_up_price)
  const tipTotal = toMoney(otherFees?.total_tip_money)
  const subtotalBeforeDiscounts =
    itemsTotal + deliveryFee + serviceFee + smallOrderFee + mealTopUpFee + tipTotal
  const explicitCustomerTotal = toMoney(
    price?.customer_need_paying_money ?? price?.real_pay_price ?? price?.real_price,
  )
  const knownDiscountTotal = Math.max(
    itemsDiscountTotal + deliveryDiscountTotal + couponDiscountTotal,
    promotionsTotal,
  )
  const customerTotal = explicitCustomerTotal > 0
    ? explicitCustomerTotal
    : Math.max(
        0,
        Math.round((subtotalBeforeDiscounts - knownDiscountTotal) * 100) / 100,
      )
  const storeDiscountTotal = sumStoreSubsidy(promotions)
  const discountTotal = Math.max(
    0,
    Math.round((subtotalBeforeDiscounts - customerTotal) * 100) / 100,
  )
  const platformDiscountTotal = Math.max(
    0,
    Math.round((discountTotal - storeDiscountTotal) * 100) / 100,
  )
  const isPlatformDelivery = deliveryType === '1'
  const isPaidOnline = isPlatformDelivery
  const amountPaid = isPaidOnline ? customerTotal : 0
  const amountPending = Math.max(
    0,
    Math.round((customerTotal - amountPaid) * 100) / 100,
  )
  const paymentTypeLabel = resolveFood99PaymentTypeLabel({ payType, deliveryType })
  const paymentMethodLabel = resolveFood99PaymentMethodLabel(payMethod)
  const paymentChannelLabel = resolveFood99PaymentChannelLabel({
    payChannel,
    payMethod,
    deliveryType,
  })
  const selectedPaymentLabel = resolveFood99SelectedPaymentLabel({
    payChannelLabel: paymentChannelLabel,
    payTypeLabel: paymentTypeLabel,
    payMethodLabel: paymentMethodLabel,
  })
  const changeAmount = changeFor > 0 && customerNeedPayingMoney > 0
    ? Math.max(
        0,
        Math.round((changeFor - customerNeedPayingMoney) * 100) / 100,
      )
    : 0

  return {
    financial: {
      itemsTotal,
      deliveryFee,
      serviceFee,
      smallOrderFee,
      mealTopUpFee,
      tipTotal,
      subtotalBeforeDiscounts,
      discountTotal,
      storeDiscountTotal,
      platformDiscountTotal,
      customerTotal,
      promotionsTotal,
      itemsDiscountTotal,
      deliveryDiscountTotal,
      couponDiscountTotal,
      customerNeedPayingMoney,
      realPayTotal,
      refundTotal,
      shopPaidMoney,
      storeChargedDeliveryPrice: originalDeliveryFee,
      storeReceivableTotal: toMoney(price?.real_price),
    },
    payment: {
      payType,
      payTypeLabel: paymentTypeLabel,
      payMethod,
      payMethodLabel: paymentMethodLabel,
      payChannel,
      payChannelLabel: paymentChannelLabel,
      selectedPaymentLabel,
      amountPaid,
      amountPending,
      collectOnDeliveryAmount: isPaidOnline ? 0 : customerTotal,
      customerNeedPayingMoney,
      shopPaidMoney,
      changeFor,
      changeAmount,
      needsChange: changeAmount > 0.009,
      isPaidOnline,
      isFullyPaid: amountPending <= 0.009,
    },
    customer: {
      name: resolveCustomerName(receiveAddress),
      phone: normalizeText(receiveAddress?.phone),
    },
    address: {
      display: [
        receiveAddress?.poi_address,
        receiveAddress?.district,
        receiveAddress?.city,
        receiveAddress?.state,
        receiveAddress?.reference,
      ]
        .map(normalizeText)
        .filter(Boolean)
        .filter((value, index, list) => list.indexOf(value) === index)
        .join(', '),
      streetName: normalizeText(receiveAddress?.street_name),
      streetNumber: normalizeText(receiveAddress?.street_number),
      district: normalizeText(receiveAddress?.district),
      city: normalizeText(receiveAddress?.city),
      state: normalizeText(receiveAddress?.state),
      postalCode: normalizeText(receiveAddress?.postal_code),
      reference: normalizeText(receiveAddress?.reference),
      complement: normalizeText(receiveAddress?.complement),
      poiAddress: normalizeText(receiveAddress?.poi_address),
    },
    notes: {
      remark: normalizeText(orderInfo?.remark ?? data?.remark),
      itemRemarks,
      needCutlery: orderInfo?.need_cutlery ?? data?.need_cutlery ?? null,
    },
    identifiers: {
      orderIndex: normalizeText(orderInfo?.order_index ?? data?.order_index),
      pickupCode: normalizeText(data?.pickup_code ?? orderInfo?.pickup_code),
      handoverCode: normalizeText(data?.handover_code ?? orderInfo?.handover_code),
    },
    items: orderItems.map(item => ({
      name: normalizeText(item?.name),
      quantity: Number(item?.amount || item?.quantity || 0),
      unitPrice: toMoney(item?.sku_price ?? item?.price ?? item?.total_price),
      totalPrice: toMoney(item?.total_price ?? item?.real_price ?? item?.price),
      description: normalizeText(item?.remark || item?.short_desc),
      observation: normalizeText(item?.remark),
      type: normalizeText(item?.sales_type),
    })),
  }
}
