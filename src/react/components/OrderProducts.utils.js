import { resolveOrderProductTotal } from '@controleonline/ui-orders/src/utils/orderState'

const DEFAULT_ITEM_COLOR = '#334155'
const DEFAULT_GROUP_KEY = 'default-group'
const CHECKED_ORDER_PRODUCT_STATUSES = new Set(['checked', 'conferido'])

export const normalizeOrderProductText = value => String(value || '').trim()

export const normalizeOrderProductQuantity = value => {
  const numericValue = Number(value || 0)
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1
}

export const formatOrderProductQuantityPrefix = value => {
  const quantity = normalizeOrderProductQuantity(value)
  return quantity > 1 ? `${quantity}x ` : ''
}

export const isOrderProductChecked = orderProduct => {
  const status = orderProduct?.status || {}
  const values = [
    status?.realStatus,
    status?.real_status,
    status?.status,
  ]

  return values.some(value =>
    CHECKED_ORDER_PRODUCT_STATUSES.has(normalizeOrderProductText(value).toLowerCase()),
  )
}

export const isOperationalOrderProductCardChecked = card => {
  const sourceItems = (Array.isArray(card?.sourceCards) ? card.sourceCards : [])
    .map(sourceCard => sourceCard?.rootItem)
    .filter(Boolean)
  const orderProducts = sourceItems.length > 0
    ? sourceItems
    : [card?.rootItem].filter(Boolean)

  return orderProducts.length > 0 && orderProducts.every(isOrderProductChecked)
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

const normalizeComparableOrderProductText = value =>
  normalizeOrderProductText(value)
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')

const getNodeDescription = node => {
  const name = getNodeName(node)
  const description = normalizeOrderProductText(
    node?.product?.description || node?.description || '',
  )

  return normalizeComparableOrderProductText(description) ===
    normalizeComparableOrderProductText(name)
    ? ''
    : description
}

export const isOptionalOrderProductComponent = orderProduct => {
  const productGroup = orderProduct?.productGroup
  if (!productGroup) return false

  const minimum = Number(productGroup?.minimum || 0)
  const requiredValue = productGroup?.required
  const required =
    requiredValue === true ||
    Number(requiredValue) === 1 ||
    String(requiredValue || '').trim().toLowerCase() === 'true'

  return !required && (!Number.isFinite(minimum) || minimum <= 0)
}

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

const getGroupDisplayName = node =>
  normalizeOrderProductText(
    node?.productGroup?.productGroup ||
    node?.productGroup?.name ||
    node?.productGroupName ||
    node?.groupName ||
    '',
  )

export const getOrderProductGroupPresentation = node => {
  const displayName = getGroupDisplayName(node)
  const hasGroup = !!node?.productGroup

  return {
    key: normalizeOrderProductText(
      node?.productGroup?.id ||
      node?.productGroup?.['@id'] ||
      displayName ||
      node?.productGroupName ||
      node?.groupName ||
      '',
    ) || DEFAULT_GROUP_KEY,
    label: !hasGroup || node?.productGroup?.showInDisplay !== false
      ? displayName
      : '',
    customizationType: ['addition', 'removal'].includes(node?.productGroup?.customizationType)
      ? node.productGroup.customizationType
      : 'neutral',
    showUnitQuantity: typeof node?.productGroup?.showUnitQuantity === 'boolean'
      ? node.productGroup.showUnitQuantity
      : null,
  }
}

const getGroupLabel = node => getOrderProductGroupPresentation(node).label

const getGroupKey = node => getOrderProductGroupPresentation(node).key

const getChildBucketLabel = node =>
  getCategoryLabel(node) ||
  getGroupLabel(node) ||
  (!node?.productGroup ? 'Outros' : '')

const getParentReference = node =>
  node?.orderProduct ||
  node?.order_product ||
  node?.parentProduct ||
  node?.productGroup?.parentProduct ||
  null

const hasExplicitParentReference = node =>
  !!(
    node?.orderProduct ||
    node?.order_product ||
    node?.parentProduct
  )

const shouldShowInParentQueue = node =>
  node?.showInParentQueue !== false &&
  node?.show_in_parent_queue !== false &&
  node?.showProductGroupInQueue !== false &&
  node?.show_product_group_in_queue !== false

const getCatalogProductKey = node =>
  toOrderProductEntityId(node?.product?.id || node?.product?.['@id'])

const getCollectionItems = value => {
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

const getParentCatalogProductKey = node =>
  toOrderProductEntityId(
    node?.productGroup?.parentProduct?.id ||
    node?.productGroup?.parentProduct?.['@id'] ||
    node?.productGroup?.parentProduct,
  )

const getParentCatalogProductKeys = node => {
  const parentKeys = new Set()
  const directParentKey = getParentCatalogProductKey(node)

  if (directParentKey) {
    parentKeys.add(directParentKey)
  }

  getCollectionItems(node?.productGroup?.parentProducts).forEach(parentLink => {
    const parentKey = toOrderProductEntityId(
      parentLink?.parentProduct?.id ||
      parentLink?.parentProduct?.['@id'] ||
      parentLink?.parentProduct,
    )

    if (parentKey) {
      parentKeys.add(parentKey)
    }
  })

  return Array.from(parentKeys)
}

export const getOrderProductBucketLabel = orderProduct =>
  getCategoryLabel(orderProduct) ||
  getGroupLabel(orderProduct) ||
  (!orderProduct?.productGroup ? 'Outros' : '')

export const getOrderProductBucketKey = orderProduct =>
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
    getGroupKey(orderProduct),
  ) || DEFAULT_GROUP_KEY

const resolveEntryColor = (orderProduct, fallbackColor, resolveItemColor = null) =>
  (typeof resolveItemColor === 'function'
    ? normalizeOrderProductText(resolveItemColor(orderProduct, fallbackColor))
    : '') ||
  resolveOrderProductQueuePresentation(orderProduct)?.color ||
  normalizeOrderProductText(fallbackColor) ||
  DEFAULT_ITEM_COLOR

const EMBEDDED_COMPONENT_ORDER_STEP = 0.001

const createCard = ({
  cards,
  cardsByRootKey,
  cardsByCatalogProductKey,
  fallbackColor,
  resolveItemColor,
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
    trackingCategory: rootItem?.product?.trackingCategory || null,
    name: normalizeOrderProductText(name),
    description: normalizeOrderProductText(description),
    observation: '',
    quantity: 0,
    unitPrice: 0,
    totalPrice: 0,
    itemColor: resolveEntryColor(rootItem, fallbackColor, resolveItemColor),
    queuePresentation: resolveOrderProductQueuePresentation(rootItem),
    parentCardKey: '',
    originGroup: null,
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

export const buildOrderProductCards = (orderProducts, {
  fallbackColor = DEFAULT_ITEM_COLOR,
  resolveItemColor = null,
} = {}) => {
  const items = Array.isArray(orderProducts) ? orderProducts : []
  const cards = []
  const cardsByRootKey = new Map()
  const cardsByCatalogProductKey = new Map()
  const groupEntryKeysByCardKey = new Map()
  const componentCardByOrderProductId = new Map()
  const componentEntryByOrderProductId = new Map()
  const componentEntriesByProductKey = new Map()
  const itemsByEntityId = new Map()
  const componentParentEntityIdByChildId = new Map()
  const catalogProductKeysInOrder = new Set()
  let embeddedComponentOrderSequence = 0

  items.forEach(item => {
    const itemEntityId = toOrderProductEntityId(item?.id || item?.['@id'])
    if (itemEntityId) {
      itemsByEntityId.set(itemEntityId, item)
    }

    const itemCatalogProductKey = getCatalogProductKey(item)
    if (itemCatalogProductKey) {
      catalogProductKeysInOrder.add(itemCatalogProductKey)
    }
  })

  const collectComponentParentLinks = (parentItem, ancestorIds = new Set()) => {
    const parentEntityId = toOrderProductEntityId(
      parentItem?.id || parentItem?.['@id'],
    )

    if (!parentEntityId || ancestorIds.has(parentEntityId)) {
      return
    }

    const nextAncestorIds = new Set(ancestorIds)
    nextAncestorIds.add(parentEntityId)

    getOrderProductComponents(parentItem).forEach(rawComponent => {
      const componentEntityId = toOrderProductEntityId(
        rawComponent?.id || rawComponent?.['@id'] || rawComponent,
      )

      if (!componentEntityId || componentEntityId === parentEntityId) {
        return
      }

      if (!componentParentEntityIdByChildId.has(componentEntityId)) {
        componentParentEntityIdByChildId.set(componentEntityId, parentEntityId)
      }

      const componentItem =
        itemsByEntityId.get(componentEntityId) ||
        (rawComponent && typeof rawComponent === 'object' ? rawComponent : null)

      if (componentItem) {
        collectComponentParentLinks(componentItem, nextAncestorIds)
      }
    })
  }

  items.forEach(item => collectComponentParentLinks(item))

  const getParentOrderProductEntityId = item => {
    const explicitParentEntityId = toOrderProductEntityId(
      item?.orderProduct || item?.order_product,
    )

    if (explicitParentEntityId) {
      return explicitParentEntityId
    }

    const itemEntityId = toOrderProductEntityId(item?.id || item?.['@id'])
    return itemEntityId
      ? componentParentEntityIdByChildId.get(itemEntityId) || ''
      : ''
  }

  const hasCatalogParentInCurrentOrder = item => {
    const parentCatalogProductKeys = getParentCatalogProductKeys(item)
    return parentCatalogProductKeys.some(parentCatalogProductKey =>
      catalogProductKeysInOrder.has(parentCatalogProductKey),
    )
  }

  const shouldTreatAsGroupedItem = item =>
    !!getParentOrderProductEntityId(item) ||
    hasExplicitParentReference(item) ||
    hasCatalogParentInCurrentOrder(item)

  const renderSingleHiddenGroupedItemAsRoot =
    items.length === 1 &&
    shouldTreatAsGroupedItem(items[0]) &&
    !shouldShowInParentQueue(items[0])

  const getGroupEntryKeys = target => {
    const targetKey = target?.key || `entry-${target?.id || ''}`
    if (!groupEntryKeysByCardKey.has(targetKey)) {
      groupEntryKeysByCardKey.set(targetKey, new Set())
    }

    return groupEntryKeysByCardKey.get(targetKey)
  }

  const ensureTargetGroup = (target, groupKey, groupLabel, order, item = null) => {
    const presentation = getOrderProductGroupPresentation(item)
    if (!target.groups.has(groupKey)) {
      target.groups.set(groupKey, {
        id: groupKey,
        label: groupLabel,
        customizationType: presentation.customizationType,
        showUnitQuantity: presentation.showUnitQuantity,
        order,
        items: [],
      })
    }

    return target.groups.get(groupKey)
  }

  const addGroupedItemToCard = ({
    card,
    item,
    groupKey,
    groupLabel,
    order,
    forceRemoval = false,
    parentEntry = null,
  }) => {
    const target = parentEntry || card
    const resolvedGroupKey =
      normalizeOrderProductText(groupKey) || getOrderProductBucketKey(item)
    const resolvedGroupLabel =
      normalizeOrderProductText(groupLabel) || getChildBucketLabel(item)
    const itemEntityId = toOrderProductEntityId(item?.id || item?.['@id'])
    const dedupeKey = itemEntityId
      ? `${resolvedGroupKey}:id:${itemEntityId}`
      : ''

    if (dedupeKey) {
      const groupEntryKeys = getGroupEntryKeys(target)
      if (groupEntryKeys.has(dedupeKey)) {
        return itemEntityId ? componentEntryByOrderProductId.get(itemEntityId) || null : null
      }

      groupEntryKeys.add(dedupeKey)
    }

    const quantity = Number(item?.quantity || 0)
    const unitPrice = toMoney(item?.unitPrice ?? item?.value ?? item?.price)
    const totalPrice = toMoney(item?.total ?? resolveOrderProductTotal(item))

    const entry = {
      id: itemEntityId || `${card.key}-${resolvedGroupKey}-${order}`,
      name: getNodeName(item),
      quantity,
      description: getNodeDescription(item),
      observation: getNodeObservation(item),
      totalPrice,
      unitPrice,
      itemColor: resolveEntryColor(item, fallbackColor, resolveItemColor),
      isZero: forceRemoval || quantity === 0,
      order,
      orderProduct: item,
      queuePresentation: resolveOrderProductQueuePresentation(item),
      groups: new Map(),
    }

    ensureTargetGroup(target, resolvedGroupKey, resolvedGroupLabel, order, item).items.push(entry)

    if (itemEntityId) {
      componentCardByOrderProductId.set(itemEntityId, card)
      componentEntryByOrderProductId.set(itemEntityId, entry)
    }

    const componentProductKey = getCatalogProductKey(item)
    if (componentProductKey) {
      if (!componentEntriesByProductKey.has(componentProductKey)) {
        componentEntriesByProductKey.set(componentProductKey, [])
      }

      componentEntriesByProductKey.get(componentProductKey).push({
        card,
        entry,
        order,
      })
    }

    return entry
  }

  const resolveIndependentParentCardKey = item => {
    const visitedParentIds = new Set()
    let currentItem = item

    while (currentItem) {
      const parentOrderProductId = getParentOrderProductEntityId(currentItem)
      if (!parentOrderProductId || visitedParentIds.has(parentOrderProductId)) {
        return ''
      }

      visitedParentIds.add(parentOrderProductId)

      const parentItem = itemsByEntityId.get(parentOrderProductId)
      if (!parentItem) {
        return ''
      }

      if (
        !getParentOrderProductEntityId(parentItem) ||
        !shouldShowInParentQueue(parentItem)
      ) {
        return parentOrderProductId
      }

      currentItem = parentItem
    }

    return ''
  }

  const resolveComponentEntryByProductKey = (productKey, index) => {
    const matches = productKey ? (componentEntriesByProductKey.get(productKey) || []) : []
    if (!matches.length) {
      return null
    }

    return (
      [...matches]
        .filter(match => match.order <= index)
        .sort((left, right) => right.order - left.order)[0] ||
      matches[matches.length - 1]
    )
  }

  const resolveAncestorTargetForGroupedItem = (item, index) => {
    const visitedParentIds = new Set()
    let currentItem = item

    while (currentItem) {
      const parentOrderProductId = getParentOrderProductEntityId(currentItem)
      if (!parentOrderProductId || visitedParentIds.has(parentOrderProductId)) {
        return null
      }

      visitedParentIds.add(parentOrderProductId)

      if (
        componentCardByOrderProductId.has(parentOrderProductId) &&
        componentEntryByOrderProductId.has(parentOrderProductId)
      ) {
        return {
          card: componentCardByOrderProductId.get(parentOrderProductId),
          parentEntry: componentEntryByOrderProductId.get(parentOrderProductId),
        }
      }

      const parentItem = itemsByEntityId.get(parentOrderProductId) || null
      const componentEntryMatch = resolveComponentEntryByProductKey(
        getCatalogProductKey(parentItem),
        index,
      )
      if (componentEntryMatch) {
        return {
          card: componentEntryMatch.card,
          parentEntry: componentEntryMatch.entry,
        }
      }

      if (cardsByRootKey.has(parentOrderProductId)) {
        return {
          card: cardsByRootKey.get(parentOrderProductId),
          parentEntry: null,
        }
      }

      currentItem = parentItem
    }

    return null
  }

  const appendEmbeddedGroupedItems = ({
    card,
    sourceItem,
    baseOrder,
    fallbackGroupKey = '',
    fallbackGroupLabel = '',
    forceRemoval = false,
    parentEntry = null,
  }) => {
    getOrderProductComponents(sourceItem).forEach(rawComponent => {
      const componentEntityId = toOrderProductEntityId(
        rawComponent?.id || rawComponent?.['@id'] || rawComponent,
      )
      const component =
        (componentEntityId && itemsByEntityId.get(componentEntityId)) ||
        (rawComponent && typeof rawComponent === 'object' ? rawComponent : null)

      if (!component) {
        return
      }

      if (!shouldShowInParentQueue(component)) {
        return
      }

      embeddedComponentOrderSequence += 1

      const componentOrder =
        Number(baseOrder || 0) +
        embeddedComponentOrderSequence * EMBEDDED_COMPONENT_ORDER_STEP
      const componentGroupKey =
        getOrderProductBucketKey(component) || normalizeOrderProductText(fallbackGroupKey)
      const componentGroupLabel =
        getChildBucketLabel(component) || normalizeOrderProductText(fallbackGroupLabel)

      const componentEntry = addGroupedItemToCard({
        card,
        item: component,
        groupKey: componentGroupKey,
        groupLabel: componentGroupLabel,
        order: componentOrder,
        forceRemoval,
        parentEntry,
      })

      appendEmbeddedGroupedItems({
        card,
        sourceItem: component,
        baseOrder: componentOrder,
        fallbackGroupKey: componentGroupKey,
        fallbackGroupLabel: componentGroupLabel,
        forceRemoval,
        parentEntry: componentEntry || parentEntry,
      })
    })
  }

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
      resolveItemColor,
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
      `group-${toOrderProductEntityId(parentReference) || getParentCatalogProductKeys(item)[0] || index}`

    if (cardsByRootKey.has(fallbackKey)) {
      return cardsByRootKey.get(fallbackKey)
    }

    const card = createCard({
      cards,
      cardsByRootKey,
      cardsByCatalogProductKey,
      fallbackColor,
      resolveItemColor,
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
      getParentCatalogProductKeys(item)[0] ||
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
    const ancestorTarget = resolveAncestorTargetForGroupedItem(item, index)
    if (ancestorTarget) {
      return ancestorTarget
    }

    const explicitParentKey = toOrderProductEntityId(getParentReference(item))
    if (explicitParentKey && cardsByRootKey.has(explicitParentKey)) {
      return {
        card: cardsByRootKey.get(explicitParentKey),
        parentEntry: null,
      }
    }

    const productMatches = getParentCatalogProductKeys(item)
      .flatMap(parentCatalogProductKey => cardsByCatalogProductKey.get(parentCatalogProductKey) || [])

    if (productMatches.length) {
      const nearestPreviousCard =
        [...productMatches]
          .filter(card => card.order <= index)
          .sort((left, right) => right.order - left.order)[0] ||
        productMatches[productMatches.length - 1]

      if (nearestPreviousCard) {
        return {
          card: nearestPreviousCard,
          parentEntry: null,
        }
      }
    }

    return {
      card: getFallbackCardForGroupedItem(item, index),
      parentEntry: null,
    }
  }

  items.forEach((item, index) => {
    if (
      shouldTreatAsGroupedItem(item) &&
      shouldShowInParentQueue(item) &&
      !renderSingleHiddenGroupedItemAsRoot
    ) {
      return
    }

    const card = getOrCreateRootCard(item, index)
    const quantity = Number(item?.quantity || 0)
    const unitPrice = toMoney(item?.unitPrice ?? item?.value ?? item?.price)

    card.order = Math.min(card.order, index)
    card.rootItem = item
    card.rootKey = card.rootKey || toOrderProductEntityId(item?.id || item?.['@id'])
    card.rootProductKey = card.rootProductKey || getCatalogProductKey(item)
    card.trackingCategory = card.trackingCategory || item?.product?.trackingCategory || null
    card.name = getNodeName(item) || card.name || `Item #${index + 1}`
    card.description = getNodeDescription(item) || card.description
    card.observation = getNodeObservation(item) || card.observation
    card.quantity = quantity
    card.unitPrice = unitPrice > 0 ? unitPrice : card.unitPrice
    card.totalPrice = toMoney(item?.total ?? resolveOrderProductTotal(item))
    card.itemColor = resolveEntryColor(item, fallbackColor, resolveItemColor)
    card.queuePresentation = resolveOrderProductQueuePresentation(item)

    if (shouldTreatAsGroupedItem(item) && !shouldShowInParentQueue(item)) {
      const parentCardKey = resolveIndependentParentCardKey(item)
      const originGroupPresentation = getOrderProductGroupPresentation(item)
      card.parentCardKey = parentCardKey
      card.originGroup = parentCardKey
        ? {
            key: originGroupPresentation.key,
            label: originGroupPresentation.label,
          }
        : null
    }

    appendEmbeddedGroupedItems({
      card,
      sourceItem: item,
      baseOrder: index,
    })
  })

  items.forEach((item, index) => {
    if (!shouldTreatAsGroupedItem(item)) return
    if (!shouldShowInParentQueue(item)) return

    const { card, parentEntry } = resolveCardForGroupedItem(item, index)
    const groupLabel = getChildBucketLabel(item)
    const groupKey = getOrderProductBucketKey(item)

    const groupEntry = addGroupedItemToCard({
      card,
      item,
      groupKey,
      groupLabel,
      order: index,
      parentEntry,
    })

    appendEmbeddedGroupedItems({
      card,
      sourceItem: item,
      baseOrder: index,
      fallbackGroupKey: groupKey,
      fallbackGroupLabel: groupLabel,
      forceRemoval: false,
      parentEntry: groupEntry || parentEntry,
    })
  })

  const normalizeGroups = groups =>
    Array.from(groups.values())
      .sort((left, right) => left.order - right.order)
      .map(group => ({
        ...group,
        items: group.items
          .slice()
          .sort((left, right) => left.order - right.order)
          .map(item => ({
            ...item,
            groups: normalizeGroups(item.groups),
          })),
      }))

  const normalizedCards = cards
    .sort((left, right) => left.order - right.order)
    .map(card => ({
      ...card,
      quantity: card.quantity > 0 ? card.quantity : Number(card?.rootItem?.quantity || 0),
      groups: normalizeGroups(card.groups),
    }))

  const cardsByProductKey = new Map()
  const componentProductKeys = new Set()
  const collectComponentProductKeys = groupItem => {
    const componentProductKey = getCatalogProductKey(groupItem.orderProduct)
    if (componentProductKey) {
      componentProductKeys.add(componentProductKey)
    }

    groupItem.groups.forEach(group => {
      group.items.forEach(collectComponentProductKeys)
    })
  }

  normalizedCards.forEach(card => {
    const productKey = normalizeOrderProductText(card.rootProductKey)
    if (!productKey) return

    if (!cardsByProductKey.has(productKey)) {
      cardsByProductKey.set(productKey, [])
    }

    cardsByProductKey.get(productKey).push(card)

    card.groups.forEach(group => {
      group.items.forEach(collectComponentProductKeys)
    })
  })

  normalizedCards.forEach(card => {
    const productKey = normalizeOrderProductText(card.rootProductKey)
    const rootHasOwnValue =
      Number(card.unitPrice || 0) > 0 ||
      Number(card.totalPrice || 0) > 0 ||
      Number(card?.rootItem?.price || 0) > 0 ||
      Number(card?.rootItem?.total || 0) > 0

    if (
      productKey &&
      componentProductKeys.has(productKey) &&
      !rootHasOwnValue
    ) {
      card.hidden = true
    }
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

const getQueueSignature = queuePresentation => {
  const queueItem = queuePresentation?.queue || null

  return {
    queue: toOrderProductEntityId(queueItem?.queue) ||
      normalizeOrderProductText(queuePresentation?.queueLabel),
    status: toOrderProductEntityId(queueItem?.status) ||
      normalizeOrderProductText(queuePresentation?.statusLabel),
  }
}

function getOperationalGroupsSignature(groups) {
  return (Array.isArray(groups) ? groups : [])
    .map(group => ({
      group: normalizeOrderProductText(group?.id || group?.label),
      label: normalizeOrderProductText(group?.label),
      items: (Array.isArray(group?.items) ? group.items : [])
        .map(getOperationalGroupItemSignature)
        .sort((left, right) =>
          JSON.stringify(left).localeCompare(JSON.stringify(right)),
        ),
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    )
}

function getOperationalGroupItemSignature(item) {
  return {
    product: getCatalogProductKey(item?.orderProduct) ||
      `name:${normalizeOrderProductText(item?.name)}`,
    quantity: Number(item?.quantity || 0),
    isZero: Boolean(item?.isZero),
    observation: normalizeOrderProductText(item?.observation),
    queue: getQueueSignature(item?.queuePresentation),
    groups: getOperationalGroupsSignature(item?.groups),
  }
}

const getOperationalCardSignature = card => {
  const productKey = normalizeOrderProductText(card?.rootProductKey)

  if (!productKey) {
    return `card:${normalizeOrderProductText(card?.key)}`
  }

  return JSON.stringify({
    product: productKey,
    observation: normalizeOrderProductText(card?.observation),
    queue: getQueueSignature(card?.queuePresentation),
    groups: getOperationalGroupsSignature(card?.groups),
  })
}

export const consolidateOperationalOrderProductCards = cards => {
  const consolidatedCards = []
  const cardsBySignature = new Map()

  ;(Array.isArray(cards) ? cards : []).forEach(card => {
    const operationalCard = {
      ...card,
      parentCardKey: '',
      originGroup: null,
      sourceCards: [card],
    }
    const signature = getOperationalCardSignature(operationalCard)
    const existingCard = cardsBySignature.get(signature)

    if (!existingCard) {
      cardsBySignature.set(signature, operationalCard)
      consolidatedCards.push(operationalCard)
      return
    }

    const quantity =
      normalizeOrderProductQuantity(existingCard.quantity) +
      normalizeOrderProductQuantity(operationalCard.quantity)

    existingCard.quantity = quantity
    existingCard.totalPrice =
      Number(existingCard.totalPrice || 0) +
      Number(operationalCard.totalPrice || 0)
    existingCard.rootItem = {
      ...(existingCard.rootItem || {}),
      quantity,
    }
    existingCard.sourceCards.push(card)
  })

  return consolidatedCards.sort((left, right) => {
    const leftRawRank = left?.trackingCategory?.rank
    const rightRawRank = right?.trackingCategory?.rank
    const leftRank = Number(leftRawRank)
    const rightRank = Number(rightRawRank)
    const normalizedLeftRank = leftRawRank !== null && leftRawRank !== undefined && Number.isFinite(leftRank) && leftRank >= 0
      ? leftRank
      : Number.POSITIVE_INFINITY
    const normalizedRightRank = rightRawRank !== null && rightRawRank !== undefined && Number.isFinite(rightRank) && rightRank >= 0
      ? rightRank
      : Number.POSITIVE_INFINITY

    if (normalizedLeftRank !== normalizedRightRank) {
      return normalizedLeftRank - normalizedRightRank
    }

    return Number(left?.order || 0) - Number(right?.order || 0)
  })
}

export const buildOperationalOrderProductCards = (orderProducts, options = {}) =>
  consolidateOperationalOrderProductCards(
    buildOrderProductCards(orderProducts, options),
  )

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
