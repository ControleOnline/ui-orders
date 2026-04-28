import {buildFood99OrderSummary} from '@controleonline/ui-orders/src/react/services/food99OrderSummary'

const normalizeText = value => String(value ?? '').trim()

const normalizeKey = value =>
  normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const isObject = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const parseJsonObject = value => {
  if (isObject(value)) {
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

    return isObject(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const getExtraDataList = order => {
  if (Array.isArray(order?.extraData)) {
    return order.extraData
  }

  if (Array.isArray(order?.extra_data)) {
    return order.extra_data
  }

  return []
}

const getExtraDataMap = order =>
  getExtraDataList(order).reduce((currentMap, extraData) => {
    const context = normalizeKey(
      extraData?.extra_fields?.context || extraData?.extraFields?.context,
    )
    const name = normalizeText(
      extraData?.extra_fields?.name || extraData?.extraFields?.name,
    )
    const value = normalizeText(extraData?.value)

    if (!context || !name || !value) {
      return currentMap
    }

    if (!currentMap[context]) {
      currentMap[context] = {}
    }

    currentMap[context][name] = value
    return currentMap
  }, {})

const decodeOrderOtherInformations = order =>
  parseJsonObject(
    order?.otherInformations ??
      order?.other_information ??
      order?.otherInformation ??
      order?.otherInformationsJson ??
      order?.other_information_json,
  )

const getContextFromOtherInformations = (order, context) => {
  const otherInformations = decodeOrderOtherInformations(order)
  const matchedKey = Object.keys(otherInformations).find(
    key => normalizeKey(key) === normalizeKey(context),
  )

  if (!matchedKey) {
    return {}
  }

  const matchedValue = otherInformations?.[matchedKey]
  return isObject(matchedValue) ? matchedValue : parseJsonObject(matchedValue)
}

const getMarketplaceField = (order, contexts, fieldName) => {
  const extraDataMap = getExtraDataMap(order)

  for (const context of contexts) {
    const value = normalizeText(extraDataMap?.[normalizeKey(context)]?.[fieldName])
    if (value) {
      return value
    }
  }

  for (const context of contexts) {
    const value = normalizeText(
      getContextFromOtherInformations(order, context)?.[fieldName],
    )
    if (value) {
      return value
    }
  }

  return ''
}

const getRemoteSummaryIdentifier = (remoteOrderSummary, fieldNames = []) => {
  for (const fieldName of fieldNames) {
    const value = normalizeText(remoteOrderSummary?.identifiers?.[fieldName])
    if (value) {
      return value
    }
  }

  return ''
}

const findNestedField = (value, fieldNames = []) => {
  if (!value || fieldNames.length === 0) {
    return ''
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNestedField(item, fieldNames)
      if (found) {
        return found
      }
    }

    return ''
  }

  if (!isObject(value)) {
    return ''
  }

  const normalizedFields = fieldNames.map(normalizeKey)
  for (const [key, item] of Object.entries(value)) {
    if (normalizedFields.includes(normalizeKey(key))) {
      const found = normalizeText(item)
      if (found) {
        return found
      }
    }
  }

  for (const item of Object.values(value)) {
    const found = findNestedField(item, fieldNames)
    if (found) {
      return found
    }
  }

  return ''
}

const getNestedMarketplaceField = (order, contexts, fieldNames = []) => {
  for (const context of contexts) {
    const value = findNestedField(getContextFromOtherInformations(order, context), fieldNames)
    if (value) {
      return value
    }
  }

  return ''
}

export const resolveMarketplaceAppLabel = order => {
  const app = normalizeText(order?.app).toLowerCase()

  if (app === 'ifood') {
    return 'IFOOD'
  }

  if (['99', '99food', '99 food', 'food99'].includes(app)) {
    return '99'
  }

  return normalizeText(order?.app).toUpperCase()
}

export const resolveMarketplaceOrderCode = (order, remoteOrderSummary = null) => {
  const app = normalizeText(order?.app).toLowerCase()
  const fallbackCode = getRemoteSummaryIdentifier(remoteOrderSummary, [
    'order_index',
    'orderIndex',
  ])

  if (app === 'ifood') {
    const displayCode = normalizeText(
      fallbackCode ||
        getRemoteSummaryIdentifier(remoteOrderSummary, [
          'displayId',
          'display_id',
        ]) ||
        getMarketplaceField(order, ['ifood'], 'displayId') ||
        getMarketplaceField(order, ['ifood'], 'display_id') ||
        getMarketplaceField(order, ['ifood'], 'code'),
    )
    const pickupCode = normalizeText(
      getRemoteSummaryIdentifier(remoteOrderSummary, [
        'pickup_code',
        'pickupCode',
        'handover_code',
        'handoverCode',
        'locator',
        'localizer',
      ]) ||
        getMarketplaceField(order, ['ifood'], 'pickup_code') ||
        getMarketplaceField(order, ['ifood'], 'pickupCode') ||
        getMarketplaceField(order, ['ifood'], 'handover_code') ||
        getMarketplaceField(order, ['ifood'], 'handoverCode') ||
        getMarketplaceField(order, ['ifood'], 'locator') ||
        getMarketplaceField(order, ['ifood'], 'localizer') ||
        getNestedMarketplaceField(order, ['ifood'], [
          'pickup_code',
          'pickupCode',
          'handover_code',
          'handoverCode',
          'locator',
          'localizer',
        ]),
    )

    return normalizeText(
      pickupCode && pickupCode !== displayCode ? pickupCode : displayCode,
    )
  }

  if (['99', '99food', '99 food', 'food99'].includes(app)) {
    return normalizeText(
      getMarketplaceField(order, ['99', '99food', 'food99'], 'pickup_code') ||
        getMarketplaceField(order, ['99', '99food', 'food99'], 'pickupCode') ||
        getMarketplaceField(order, ['99', '99food', 'food99'], 'handover_code') ||
        getMarketplaceField(order, ['99', '99food', 'food99'], 'handoverCode') ||
        getRemoteSummaryIdentifier(remoteOrderSummary, [
          'pickupCode',
          'pickup_code',
          'handoverCode',
          'handover_code',
          'localizer',
          'locator',
          'orderIndex',
        ]) ||
        getNestedMarketplaceField(order, ['99', '99food', 'food99'], [
          'pickup_code',
          'pickupCode',
          'handover_code',
          'handoverCode',
          'locator',
          'localizer',
        ]) ||
        getMarketplaceField(order, ['99', '99food', 'food99'], 'locator') ||
        getMarketplaceField(order, ['99', '99food', 'food99'], 'localizer') ||
        fallbackCode ||
        getMarketplaceField(order, ['99', '99food', 'food99'], 'displayId') ||
        getMarketplaceField(order, ['99', '99food', 'food99'], 'display_id') ||
        getMarketplaceField(order, ['99', '99food', 'food99'], 'code') ||
        getMarketplaceField(order, ['99', '99food', 'food99'], 'id'),
    )
  }

  return ''
}

export const resolveOrderIdentityRemoteSummary = (order, remoteOrderSummary = null) =>
  remoteOrderSummary || buildFood99OrderSummary(order) || null

export const resolveOrderIdentity = (order, remoteOrderSummary = null) => {
  const effectiveRemoteOrderSummary = resolveOrderIdentityRemoteSummary(
    order,
    remoteOrderSummary,
  )
  const internalId = normalizeText(order?.id)
  const marketplaceLabel = resolveMarketplaceAppLabel(order)
  const marketplaceOrderCode = resolveMarketplaceOrderCode(
    order,
    effectiveRemoteOrderSummary,
  )
  const hasMarketplaceReference = !!marketplaceLabel && !!marketplaceOrderCode

  if (hasMarketplaceReference) {
    return {
      internalId,
      externalId: marketplaceOrderCode,
      externalLabel: marketplaceLabel,
      hasMarketplaceReference: true,
      primaryText: `${marketplaceLabel} #${marketplaceOrderCode}`,
      secondaryText: internalId ? `${global.t?.t('orders', 'title', 'order') || 'Pedido'} #${internalId}` : '',
    }
  }

  return {
    internalId,
    externalId: '',
    externalLabel: '',
    hasMarketplaceReference: false,
    primaryText: internalId
      ? `${global.t?.t('orders', 'title', 'order') || 'Pedido'} #${internalId}`
      : global.t?.t('orders', 'title', 'order') || 'Pedido',
    secondaryText: '',
  }
}
