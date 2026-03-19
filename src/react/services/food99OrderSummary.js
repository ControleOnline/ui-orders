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

  for (const key of candidateKeys) {
    const candidate = decodeJson(otherInformations?.[key])
    const payload = unwrapPayload(candidate)
    const data = isObject(payload?.data) ? payload.data : {}
    const orderInfo = isObject(data?.order_info) ? data.order_info : {}

    if (Object.keys(orderInfo).length || Object.keys(data).length) {
      return payload
    }
  }

  const directPayload = unwrapPayload(otherInformations)
  if (Object.keys(directPayload).length) {
    return directPayload
  }

  return null
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
  const receiveAddress = isObject(data?.receive_address) ? data.receive_address : {}
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
      storeChargedDeliveryPrice: originalDeliveryFee,
      storeReceivableTotal: toMoney(price?.real_price),
    },
    payment: {
      payType,
      payTypeLabel: isPlatformDelivery
        ? 'Online pela 99Food'
        : payType === '2'
          ? 'Pagamento fora da plataforma'
          : payType === '1'
            ? 'Pagamento na entrega'
            : 'Pagamento fora da plataforma',
      payMethod,
      payChannel,
      amountPaid,
      amountPending,
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
    },
    notes: {
      remark: normalizeText(orderInfo?.remark ?? data?.remark),
      needCutlery: orderInfo?.need_cutlery ?? data?.need_cutlery ?? null,
    },
    identifiers: {
      orderIndex: normalizeText(orderInfo?.order_index ?? data?.order_index),
      pickupCode: normalizeText(data?.pickup_code ?? orderInfo?.pickup_code),
      handoverCode: normalizeText(data?.handover_code ?? orderInfo?.handover_code),
    },
  }
}
