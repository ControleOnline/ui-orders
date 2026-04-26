const LINKED_ORDER_TYPE_VALUES = ['comanda', 'mesa']

const normalizeText = value => String(value ?? '').trim()

const normalizeKey = value =>
  normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const parseJsonObject = value => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return {}
  }

  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'string') {
      return parseJsonObject(parsed)
    }

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {}
  } catch {
    return {}
  }
}

export const LINKED_ORDER_TYPE_COMANDA = 'comanda'
export const LINKED_ORDER_TYPE_MESA = 'mesa'

export const normalizeEntityId = value => {
  if (value === null || value === undefined) return null

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/\D+/g, '').trim()
    return normalized ? Number(normalized) : null
  }

  if (typeof value === 'object') {
    return (
      normalizeEntityId(value?.id) ||
      normalizeEntityId(value?.['@id']) ||
      normalizeEntityId(value?.mainOrderId) ||
      null
    )
  }

  return null
}

export const normalizeLinkedOrderType = value => {
  const normalizedValue = normalizeKey(value)

  if (['comanda', 'tab', 'check', 'ticket'].includes(normalizedValue)) {
    return LINKED_ORDER_TYPE_COMANDA
  }

  if (['mesa', 'table'].includes(normalizedValue)) {
    return LINKED_ORDER_TYPE_MESA
  }

  return ''
}

export const isLinkedParentOrderType = value =>
  LINKED_ORDER_TYPE_VALUES.includes(normalizeLinkedOrderType(value))

export const resolveLinkedOrderLabel = value => {
  const normalizedType = normalizeLinkedOrderType(value)

  if (normalizedType === LINKED_ORDER_TYPE_MESA) {
    return global.t?.t('orders', 'title', 'table') || 'Mesa'
  }

  if (normalizedType === LINKED_ORDER_TYPE_COMANDA) {
    return global.t?.t('orders', 'title', 'tab') || 'Comanda'
  }

  return global.t?.t('orders', 'title', 'order') || 'Pedido'
}

const getOtherInformations = order =>
  parseJsonObject(
    order?.otherInformations ??
      order?.other_information ??
      order?.otherInformation ??
      order?.otherInformationsJson,
  )

const getLinkedOrderRawContext = order => {
  const otherInformations = getOtherInformations(order)
  const candidates = [
    otherInformations?.linked_order,
    otherInformations?.linkedOrder,
    otherInformations?.check,
    otherInformations?.tab,
    otherInformations?.mesa,
    otherInformations?.table,
  ]

  return (
    candidates.find(
      candidate =>
        candidate && typeof candidate === 'object' && !Array.isArray(candidate),
    ) || {}
  )
}

export const getLinkedOrderContext = order => {
  const rawContext = getLinkedOrderRawContext(order)
  const orderType =
    normalizeLinkedOrderType(
      rawContext?.order_type ||
        rawContext?.orderType ||
        order?.orderType,
    ) || ''
  const externalCode = normalizeText(
    rawContext?.external_code ||
      rawContext?.externalCode ||
      rawContext?.code,
  )
  const inputType = normalizeText(
    rawContext?.input_type ||
      rawContext?.inputType ||
      rawContext?.check_type ||
      rawContext?.checkType,
  )
  const mainOrderId =
    normalizeEntityId(order?.mainOrderId) ||
    normalizeEntityId(order?.mainOrder) ||
    normalizeEntityId(rawContext?.main_order_id) ||
    normalizeEntityId(rawContext?.mainOrderId)

  return {
    externalCode,
    inputType,
    isLinkedChild: !!mainOrderId,
    isLinkedParent: isLinkedParentOrderType(orderType) && !mainOrderId,
    label: resolveLinkedOrderLabel(orderType),
    mainOrderId,
    orderType,
  }
}

export const buildLinkedOrderMetadata = ({
  externalCode = '',
  inputType = '',
  mainOrderId = null,
  orderType = '',
} = {}) => {
  const normalizedType = normalizeLinkedOrderType(orderType)
  const normalizedExternalCode = normalizeText(externalCode)
  const normalizedInputType = normalizeText(inputType)

  return {
    linked_order: {
      ...(normalizedExternalCode ? {external_code: normalizedExternalCode} : {}),
      ...(normalizedInputType ? {input_type: normalizedInputType} : {}),
      ...(mainOrderId ? {main_order_id: Number(mainOrderId)} : {}),
      ...(normalizedType ? {order_type: normalizedType} : {}),
    },
  }
}

export const isLinkedParentOrder = order =>
  getLinkedOrderContext(order).isLinkedParent

export const isLinkedChildOrder = order =>
  getLinkedOrderContext(order).isLinkedChild

export const matchesLinkedOrderExternalCode = (
  order,
  externalCode,
  orderType = '',
) => {
  const orderContext = getLinkedOrderContext(order)
  const normalizedExternalCode = normalizeKey(externalCode)
  const normalizedOrderType = normalizeLinkedOrderType(orderType)

  if (!normalizedExternalCode || !orderContext.externalCode) {
    return false
  }

  if (
    normalizedOrderType &&
    normalizedOrderType !== normalizeLinkedOrderType(orderContext.orderType)
  ) {
    return false
  }

  return normalizeKey(orderContext.externalCode) === normalizedExternalCode
}
