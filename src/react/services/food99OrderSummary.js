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

const unwrapPayload = payload => {
  let current = payload

  for (let depth = 0; depth < 5; depth += 1) {
    if (!isObject(current?.Food99)) {
      break
    }

    current = current.Food99
  }

  return isObject(current) ? current : {}
}

const toMoney = value => {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  return Math.round((Number(value) / 100) * 100) / 100
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
      return 'Pagamento online'
    case '2':
      return 'Pagamento offline'
    case '0':
      return 'Nao informado pela 99'
    default:
      return 'Metodo nao mapeado'
  }
}

const resolveFood99PaymentTypeLabel = ({ payType, deliveryType }) => {
  switch (normalizeText(payType)) {
    case '1':
      return 'Pagamento online'
    case '2':
      return 'Dinheiro'
    case '3':
      return 'POS'
    case '4':
      return 'Carteira / 99Pay'
    case '5':
      return 'PayPay sem senha'
    case '6':
      return 'PayPay com senha'
    default:
      return normalizeText(deliveryType) === '1'
        ? 'Pagamento processado pela 99Food'
        : 'Pagamento nao mapeado'
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
      return 'Nao informado pela 99'
    case '110':
      return 'Cupom'
    case '120':
      return '99Food Wallet'
    case '150':
      return 'Cartao de credito / debito'
    case '153':
      return 'Dinheiro'
    case '154':
      return 'POS'
    case '167':
      return 'Preauth'
    case '182':
      return 'PayPay sem senha'
    case '184':
      return 'PayPay com senha'
    case '190':
      return '99Pay'
    case '212':
      return 'PIX'
    case '219':
      return '99Food Cuenta'
    case '229':
      return 'NuPay'
    case '234':
      return 'Apple Pay (pre-auth)'
    case '235':
      return 'Apple Pay'
    case '257':
      return 'Vale Refeicao Pluxee'
    case '258':
      return 'Vale Refeicao Ticket'
    case '259':
      return 'Vale Refeicao VR'
    case '260':
      return 'Vale Refeicao Alelo'
    case '261':
      return 'NEQUI'
    case '262':
      return 'POS cartao de credito'
    case '263':
      return 'POS cartao de debito'
    case '264':
      return 'POS vale refeicao'
    case '272':
      return 'Google Pay'
    case '273':
      return 'Google Pay (pre-auth)'
    case '310':
      return 'Yape'
    case '311':
      return 'Plin'
    case '901':
      return 'Beneficio'
    case '2008':
      return 'Marketing'
    default:
      if (normalizedPayMethod === '1') {
        return normalizedDeliveryType === '1'
          ? 'Pagamento online'
          : 'Pagamento online selecionado pelo cliente'
      }
      if (normalizedPayMethod === '2') return 'Pagamento offline'
      return 'Canal nao mapeado'
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
        'Nao informado pela 99',
        'Canal nao mapeado',
        'Metodo nao mapeado',
        'Pagamento nao mapeado',
      ].includes(label),
  )

  return preferredLabel || candidates[0] || ''
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
  const otherInformations = decodeJson(order?.otherInformations)
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
  const allCandidateKeys = [...new Set([...candidateKeys, ...discoveredKeys])]
  const rankedCandidates = []

  for (const key of allCandidateKeys) {
    const candidate = decodeJson(otherInformations?.[key])
    const payload = unwrapPayload(candidate)
    if (!Object.keys(payload).length) continue

    rankedCandidates.push({
      payload,
      score: getPayloadScore(payload),
      priority: priorityMap.has(key) ? priorityMap.get(key) : candidateKeys.length + 10,
    })
  }

  const directPayload = unwrapPayload(otherInformations)
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
  /food99|99food/i.test(normalizeText(order?.app))

export const buildFood99OrderSummary = order => {
  if (!isFood99Order(order)) {
    return null
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
  }
}
