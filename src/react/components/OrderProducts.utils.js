import { resolveOrderProductTotal } from '@controleonline/ui-orders/src/utils/orderState'

const DEFAULT_ITEM_COLOR = '#334155'
const DEFAULT_GROUP_KEY = 'default-group'

export const normalizeOrderProductText = value => String(value || '').trim()

export const normalizeOrderProductQuantity = value => {
  const numericValue = Number(value || 0)
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1
}

export const formatOrderProductQuantityPrefix = value => {
  const quantity = normalizeOrderProductQuantity(value)
  return quantity >= 2 ? `${quantity}x ` : ''
}

export const toOrderProductEntityId = value => {
  if (!value) return ''

  if (typeof value === 'object') {
    return toOrderProductEntityId(value.id || value['@id'] || value.value)
  }

  return normalizeOrderProductText(value).replace(/^.*\//, '')
}

const toMoney = value => {
  const amount = Number(value || 0)
  return Number.isFinite(amount) ? amount : 0
}

const getHydraCollectionItems = value => {
  if (Array.isArray(value)) {
    return value
  }

  if (Array.isArray(value?.member)) {
    return value.member
  }

  if (Array.isArray(value?.['hydra:member'])) {
    return value['hydra:member']
  }

  return []
}

export const getOrderProductQueues = orderProduct => {
  const collections = [
    orderProduct?.orderProductQueues,
    orderProduct?.order_product_queues,
  ]

  for (const collection of collections) {
    const items = getHydraCollectionItems(collection)
    if (items.length > 0) {
      return items
    }
  }

  return []
}

const getQueueTimestamp = queueItem => {
  const rawValue =
    queueItem?.updateTime ||
    queueItem?.update_time ||
    queueItem?.registerTime ||
    queueItem?.register_time ||
    ''
  const timestamp = rawValue ? Date.parse(rawValue) : Number.NaN

  return Number.isFinite(timestamp) ? timestamp : 0
}

export const resolveCurrentOrderProductQueue = orderProduct => {
  const queueItems = getOrderProductQueues(orderProduct)
    .filter(queueItem => queueItem?.status)
    .slice()

  if (!queueItems.length) {
    return null
  }

  return queueItems.sort((left, right) => {
    const timestampDifference = getQueueTimestamp(right) - getQueueTimestamp(left)
    if (timestampDifference !== 0) {
      return timestampDifference
    }

    return Number(toOrderProductEntityId(right)) - Number(toOrderProductEntityId(left))
  })[0]
}

export const resolveOrderProductQueuePresentation = orderProduct => {
  const currentQueue = resolveCurrentOrderProductQueue(orderProduct)
  if (!currentQueue) {
    return null
  }

  const queueLabel = normalizeOrderProductText(
    currentQueue?.queue?.queue ||
    currentQueue?.queue?.name,
  )
  const statusLabel = normalizeOrderProductText(currentQueue?.status?.status)
  const color = normalizeOrderProductText(
    currentQueue?.status?.color ||
    currentQueue?.queue?.color,
  )
  const label = [queueLabel, statusLabel].filter(Boolean).join(' / ')

  return {
    color: color || '',
    label: label || statusLabel || queueLabel,
    queue: currentQueue,
    queueLabel,
    statusLabel,
  }
}

export const getOrderProductComponents = orderProduct => {
  const collections = [
    orderProduct?.orderProductComponents,
    orderProduct?.order_product_components,
  ]

  for (const collection of collections) {
    const items = getHydraCollectionItems(collection)
    if (items.length > 0) {
      return items
    }
  }

  return []
}

export const getOrderProductFiles = orderProduct => {
  const collections = [
    orderProduct?.product?.productFiles,
    orderProduct?.product?.product_files,
    orderProduct?.productFiles,
    orderProduct?.product_files,
    orderProduct?.product?.files,
    orderProduct?.files,
  ]

  for (const collection of collections) {
    const items = getHydraCollectionItems(collection)
    if (items.length > 0) {
      return items
    }
  }

  return []
}

export const isCustomizableOrderProduct = orderProduct => {
  const productType = normalizeOrderProductText(orderProduct?.product?.type).toLowerCase()

  return productType === 'custom' || getOrderProductComponents(orderProduct).length > 0
}

export const canReopenOrderProductCustomization = orderProduct => {
  if (!isCustomizableOrderProduct(orderProduct)) {
    return false
  }

  return !isOrderProductProductionCompleted(orderProduct)
}

export const isOrderProductProductionCompleted = orderProduct => {
  const currentQueue = resolveCurrentOrderProductQueue(orderProduct)
  const currentQueueRealStatus = normalizeOrderProductText(
    currentQueue?.status?.realStatus,
  ).toLowerCase()

  if (!currentQueueRealStatus) {
    return false
  }

  return currentQueueRealStatus === 'out'
}

const getNodeName = node =>
  normalizeOrderProductText(
    node?.product?.name ||
    node?.product?.product ||
    node?.name ||
    node?.product?.description ||
    '',
  )

const getNodeDescription = node =>
  normalizeOrderProductText(node?.product?.description || node?.description || '')

const getNodeObservation = node =>
  normalizeOrderProductText(
    node?.comments ||
    node?.comment ||
    node?.observation ||
    node?.observations ||
    node?.note ||
    node?.remark ||
    node?.product?.comments ||
    node?.product?.observations ||
    '',
  )

const getCategoryLabel = node =>
  normalizeOrderProductText(
    node?.product?.category?.name ||
    node?.product?.category?.category ||
    node?.category?.name ||
    node?.category?.category ||
    node?.product?.productCategory?.category?.name ||
    node?.product?.productCategory?.category?.category ||
    node?.product?.productCategories?.[0]?.category?.name ||
    node?.product?.productCategories?.[0]?.category?.category ||
    node?.productCategory?.category?.name ||
    node?.productCategory?.category?.category ||
    node?.product?.categoryName ||
    '',
  )

const getGroupLabel = node =>
  normalizeOrderProductText(
    node?.productGroup?.productGroup ||
    node?.productGroup?.name ||
    node?.productGroupName ||
    node?.groupName ||
    '',
  ) || 'Outros'

const getChildBucketLabel = node =>
  getCategoryLabel(node) || getGroupLabel(node)

const getParentReference = node =>
  node?.orderProduct || node?.parentProduct || node?.productGroup?.parentProduct || null

const hasGroupedParent = node =>
  !!(
    node?.productGroup ||
    node?.orderProduct ||
    node?.parentProduct ||
    node?.productGroup?.parentProduct
  )

const getCatalogProductKey = node =>
  toOrderProductEntityId(node?.product?.id || node?.product?.['@id'])

const getParentCatalogProductKey = node =>
  toOrderProductEntityId(
    node?.productGroup?.parentProduct?.id ||
    node?.productGroup?.parentProduct?.['@id'] ||
    node?.productGroup?.parentProduct,
  )

const getOrderProductBucketLabel = orderProduct =>
  getCategoryLabel(orderProduct) || getGroupLabel(orderProduct) || 'Outros'

const getOrderProductBucketKey = orderProduct =>
  normalizeOrderProductText(
    orderProduct?.product?.category?.id ||
    orderProduct?.product?.category?.['@id'] ||
    orderProduct?.category?.id ||
    orderProduct?.category?.['@id'] ||
    orderProduct?.product?.productCategory?.category?.id ||
    orderProduct?.product?.productCategory?.category?.['@id'] ||
    orderProduct?.product?.productCategories?.[0]?.category?.id ||
    orderProduct?.product?.productCategories?.[0]?.category?.['@id'] ||
    orderProduct?.productCategory?.category?.id ||
    orderProduct?.productCategory?.category?.['@id'] ||
    getOrderProductBucketLabel(orderProduct),
  ) || DEFAULT_GROUP_KEY

const resolveEntryColor = (orderProduct, fallbackColor) =>
  resolveOrderProductQueuePresentation(orderProduct)?.color ||
  normalizeOrderProductText(fallbackColor) ||
  DEFAULT_ITEM_COLOR

const createCard = ({
  cards,
  cardsByRootKey,
  cardsByCatalogProductKey,
  fallbackColor,
  cardKey,
  orderIndex,
  rootItem = null,
  name = '',
  description = '',
}) => {
  const card = {
    key: cardKey,
    order: orderIndex,
    rootItem,
    rootKey: rootItem ? toOrderProductEntityId(rootItem?.id || rootItem?.['@id']) : '',
    rootProductKey: rootItem ? getCatalogProductKey(rootItem) : '',
    name: normalizeOrderProductText(name),
    description: normalizeOrderProductText(description),
    observation: '',
    quantity: 0,
    unitPrice: 0,
    totalPrice: 0,
    itemColor: resolveEntryColor(rootItem, fallbackColor),
    queuePresentation: resolveOrderProductQueuePresentation(rootItem),
    groups: new Map(),
  }

  cards.push(card)
  cardsByRootKey.set(cardKey, card)

  if (card.rootProductKey) {
    if (!cardsByCatalogProductKey.has(card.rootProductKey)) {
      cardsByCatalogProductKey.set(card.rootProductKey, [])
    }

    cardsByCatalogProductKey.get(card.rootProductKey).push(card)
  }

  return card
}

export const buildOrderProductCards = (orderProducts, { fallbackColor = DEFAULT_ITEM_COLOR } = {}) => {
  const items = Array.isArray(orderProducts) ? orderProducts : []
  const cards = []
  const cardsByRootKey = new Map()
  const cardsByCatalogProductKey = new Map()

  const getOrCreateRootCard = (item, index) => {
    const rootKey = toOrderProductEntityId(item?.id || item?.['@id']) || `root-${index}`

    if (cardsByRootKey.has(rootKey)) {
      return cardsByRootKey.get(rootKey)
    }

    return createCard({
      cards,
      cardsByRootKey,
      cardsByCatalogProductKey,
      fallbackColor,
      cardKey: rootKey,
      orderIndex: index,
      rootItem: item,
      name: getNodeName(item) || `Item #${index + 1}`,
      description: getNodeDescription(item),
    })
  }

  const getFallbackCardForGroupedItem = (item, index) => {
    const parentReference = getParentReference(item)
    const fallbackKey =
      `group-${toOrderProductEntityId(parentReference) || getParentCatalogProductKey(item) || index}`

    if (cardsByRootKey.has(fallbackKey)) {
      return cardsByRootKey.get(fallbackKey)
    }

    const card = createCard({
      cards,
      cardsByRootKey,
      cardsByCatalogProductKey,
      fallbackColor,
      cardKey: fallbackKey,
      orderIndex: index,
      rootItem: null,
      name:
        normalizeOrderProductText(
          parentReference?.product?.product ||
          parentReference?.product?.name ||
          parentReference?.product ||
          parentReference?.name ||
          item?.productGroup?.parentProduct?.product ||
          item?.productGroup?.parentProduct?.name ||
          '',
        ) || `Item #${index + 1}`,
      description: normalizeOrderProductText(
        parentReference?.product?.description ||
        parentReference?.description ||
        item?.productGroup?.parentProduct?.description ||
        '',
      ),
    })

    const fallbackRootProductKey =
      getParentCatalogProductKey(item) ||
      toOrderProductEntityId(parentReference?.id || parentReference?.['@id'])

    if (fallbackRootProductKey) {
      card.rootProductKey = fallbackRootProductKey

      if (!cardsByCatalogProductKey.has(fallbackRootProductKey)) {
        cardsByCatalogProductKey.set(fallbackRootProductKey, [])
      }

      cardsByCatalogProductKey.get(fallbackRootProductKey).push(card)
    }

    return card
  }

  const resolveCardForGroupedItem = (item, index) => {
    const explicitParentKey = toOrderProductEntityId(getParentReference(item))
    if (explicitParentKey && cardsByRootKey.has(explicitParentKey)) {
      return cardsByRootKey.get(explicitParentKey)
    }

    const parentCatalogProductKey = getParentCatalogProductKey(item)
    const productMatches = parentCatalogProductKey
      ? (cardsByCatalogProductKey.get(parentCatalogProductKey) || [])
      : []

    if (productMatches.length) {
      const nearestPreviousCard =
        [...productMatches]
          .filter(card => card.order <= index)
          .sort((left, right) => right.order - left.order)[0] ||
        productMatches[productMatches.length - 1]

      if (nearestPreviousCard) {
        return nearestPreviousCard
      }
    }

    return getFallbackCardForGroupedItem(item, index)
  }

  items.forEach((item, index) => {
    if (hasGroupedParent(item)) return

    const card = getOrCreateRootCard(item, index)
    const quantity = Number(item?.quantity || 0)
    const unitPrice = toMoney(item?.unitPrice ?? item?.value ?? item?.price)

    card.order = Math.min(card.order, index)
    card.rootItem = item
    card.rootKey = card.rootKey || toOrderProductEntityId(item?.id || item?.['@id'])
    card.rootProductKey = card.rootProductKey || getCatalogProductKey(item)
    card.name = getNodeName(item) || card.name || `Item #${index + 1}`
    card.description = getNodeDescription(item) || card.description
    card.observation = getNodeObservation(item) || card.observation
    card.quantity = quantity
    card.unitPrice = unitPrice > 0 ? unitPrice : card.unitPrice
    card.totalPrice = toMoney(item?.total ?? resolveOrderProductTotal(item))
    card.itemColor = resolveEntryColor(item, fallbackColor)
    card.queuePresentation = resolveOrderProductQueuePresentation(item)
  })

  items.forEach((item, index) => {
    if (!hasGroupedParent(item)) return

    const card = resolveCardForGroupedItem(item, index)
    const quantity = Number(item?.quantity || 0)
    const unitPrice = toMoney(item?.unitPrice ?? item?.value ?? item?.price)
    const totalPrice = toMoney(item?.total ?? resolveOrderProductTotal(item))
    const groupLabel = getChildBucketLabel(item)
    const groupKey = getOrderProductBucketKey(item)

    if (!card.groups.has(groupKey)) {
      card.groups.set(groupKey, {
        id: groupKey,
        label: groupLabel,
        order: index,
        items: [],
      })
    }

    card.groups.get(groupKey).items.push({
      id: toOrderProductEntityId(item?.id || item?.['@id']) || `${card.key}-${groupKey}-${index}`,
      name: getNodeName(item),
      quantity,
      description: getNodeDescription(item),
      observation: getNodeObservation(item),
      totalPrice,
      unitPrice,
      itemColor: resolveEntryColor(item, fallbackColor),
      isZero: quantity === 0,
      order: index,
      orderProduct: item,
      queuePresentation: resolveOrderProductQueuePresentation(item),
    })
  })

  const normalizedCards = cards
    .sort((left, right) => left.order - right.order)
    .map(card => ({
      ...card,
      quantity: card.quantity > 0 ? card.quantity : Number(card?.rootItem?.quantity || 0),
      groups: Array.from(card.groups.values())
        .sort((left, right) => left.order - right.order)
        .map(group => ({
          ...group,
          items: group.items.slice().sort((left, right) => left.order - right.order),
        })),
    }))

  const cardsByProductKey = new Map()
  normalizedCards.forEach(card => {
    const productKey = normalizeOrderProductText(card.rootProductKey)
    if (!productKey) return

    if (!cardsByProductKey.has(productKey)) {
      cardsByProductKey.set(productKey, [])
    }

    cardsByProductKey.get(productKey).push(card)
  })

  cardsByProductKey.forEach(cardGroup => {
    if (cardGroup.length < 2) return

    const groupedCard = cardGroup.find(card =>
      card.groups.length > 0 &&
      Number(card?.rootItem?.quantity || card.quantity || 0) <= 0,
    )

    if (!groupedCard) return

    const donorCard = cardGroup.find(card =>
      card !== groupedCard &&
      card.groups.length === 0 &&
      Number(card.quantity || 0) > 0 &&
      normalizeOrderProductText(card.name).toLowerCase() ===
        normalizeOrderProductText(groupedCard.name).toLowerCase(),
    )

    if (!donorCard) return

    groupedCard.quantity = donorCard.quantity
    groupedCard.unitPrice = groupedCard.unitPrice > 0 ? groupedCard.unitPrice : donorCard.unitPrice
    groupedCard.totalPrice = groupedCard.totalPrice > 0 ? groupedCard.totalPrice : donorCard.totalPrice
    groupedCard.description = groupedCard.description || donorCard.description
    groupedCard.observation = groupedCard.observation || donorCard.observation
    groupedCard.itemColor = groupedCard.itemColor || donorCard.itemColor
    groupedCard.queuePresentation = groupedCard.queuePresentation || donorCard.queuePresentation
    groupedCard.rootItem = {
      ...(groupedCard.rootItem || {}),
      quantity: donorCard.quantity,
      value: donorCard.unitPrice,
      price: donorCard.unitPrice,
      total: donorCard.totalPrice,
    }

    donorCard.hidden = true
  })

  return normalizedCards
    .filter(card => !card.hidden)
    .filter(card => card.rootItem || card.groups.length > 0)
}

const estimateTextUnits = (value, charsPerLine = 28) => {
  const normalized = normalizeOrderProductText(value)
  if (!normalized) return 0

  const safeCharsPerLine = Math.max(12, Math.round(Number(charsPerLine || 0)))
  return Math.max(1, Math.ceil(normalized.length / safeCharsPerLine))
}

export const estimateOrderProductCardUnits = (card, charsPerLine = 28) => {
  const groups = Array.isArray(card?.groups) ? card.groups : []
  let units = 1

  units += estimateTextUnits(card?.name, charsPerLine)
  units += estimateTextUnits(card?.description, charsPerLine + 8)
  units += estimateTextUnits(card?.observation, charsPerLine + 6)
  units += estimateTextUnits(card?.queuePresentation?.label, charsPerLine + 8)

  groups.forEach(group => {
    units += estimateTextUnits(group?.label, charsPerLine + 10)

    ;(Array.isArray(group?.items) ? group.items : []).forEach(item => {
      units += estimateTextUnits(
        `${formatOrderProductQuantityPrefix(item?.quantity)}${normalizeOrderProductText(item?.name)}`.trim(),
        charsPerLine,
      )
      units += estimateTextUnits(item?.description, charsPerLine + 6)
      units += estimateTextUnits(item?.observation, charsPerLine + 6)
      units += estimateTextUnits(item?.queuePresentation?.label, charsPerLine + 8)
    })
  })

  return Math.max(3, units)
}
