export const normalizeText = value => String(value ?? '').trim()

export const formatOrderCode = value => {
  const normalized = normalizeText(value)
  return normalized ? `#${normalized}` : ''
}

export const normalizeKey = value =>
  normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export const isObject = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export const parseJsonObject = value => {
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

export const getExtraDataList = order => {
  if (Array.isArray(order?.extraData)) {
    return order.extraData
  }

  if (Array.isArray(order?.extra_data)) {
    return order.extra_data
  }

  return []
}

export const getExtraDataMap = order =>
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

export const decodeOrderOtherInformations = order =>
  parseJsonObject(
    order?.otherInformations ??
      order?.other_information ??
      order?.otherInformation ??
      order?.otherInformationsJson ??
      order?.other_information_json,
  )

export const getContextFromOtherInformations = (order, context) => {
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

export const findNestedFieldValue = (source, fieldName) => {
  if (Array.isArray(source)) {
    for (const entry of source) {
      const nestedValue = findNestedFieldValue(entry, fieldName)
      if (nestedValue) {
        return nestedValue
      }
    }

    return ''
  }

  if (!isObject(source)) {
    return ''
  }

  const normalizedFieldName = normalizeKey(fieldName)
  const matchedKey = Object.keys(source).find(
    key => normalizeKey(key) === normalizedFieldName,
  )

  if (matchedKey) {
    const directValue = normalizeText(source?.[matchedKey])
    if (directValue) {
      return directValue
    }
  }

  for (const value of Object.values(source)) {
    const nestedValue = findNestedFieldValue(value, fieldName)
    if (nestedValue) {
      return nestedValue
    }
  }

  return ''
}

export const getMarketplaceField = (order, contexts, fieldName) => {
  const extraDataMap = getExtraDataMap(order)

  for (const context of contexts) {
    const value = normalizeText(extraDataMap?.[normalizeKey(context)]?.[fieldName])
    if (value) {
      return value
    }
  }

  for (const context of contexts) {
    const value = findNestedFieldValue(
      getContextFromOtherInformations(order, context),
      fieldName,
    )
    if (value) {
      return value
    }
  }

  return ''
}

export const getRemoteSummaryIdentifier = (remoteOrderSummary, fieldNames = []) => {
  for (const fieldName of fieldNames) {
    const value = normalizeText(remoteOrderSummary?.identifiers?.[fieldName])
    if (value) {
      return value
    }
  }

  return ''
}
