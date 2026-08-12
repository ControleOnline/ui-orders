export const normalizeHydrationEntityId = value => {
  let currentValue = value
  const visitedNodes = new Set()

  while (currentValue && typeof currentValue === 'object') {
    if (visitedNodes.has(currentValue)) {
      return ''
    }
    visitedNodes.add(currentValue)

    const preferredIdentity = currentValue['@id'] || currentValue.id
    if (preferredIdentity) {
      currentValue = preferredIdentity
      break
    }

    currentValue = currentValue.orderProduct || currentValue.order || ''
  }

  const digits = String(currentValue || '').match(/\d+/g) || []
  return digits.length ? digits[digits.length - 1] : ''
}

export const extractHydraCollectionItems = response => {
  if (Array.isArray(response)) return response.filter(Boolean)
  if (Array.isArray(response?.member)) return response.member.filter(Boolean)
  if (Array.isArray(response?.['hydra:member'])) {
    return response['hydra:member'].filter(Boolean)
  }
  return []
}

export const resolveHydraCollectionTotalItems = (response, items = []) =>
  Number(response?.totalItems || response?.['hydra:totalItems'] || items.length || 0)

export const mergeHydraCollectionItemsById = (currentItems = [], pageItems = []) => {
  const nextItems = [...(Array.isArray(currentItems) ? currentItems : [])]
  const itemIndexById = new Map()

  nextItems.forEach((item, index) => {
    const itemId = normalizeHydrationEntityId(item)
    if (itemId) {
      itemIndexById.set(itemId, index)
    }
  })

  ;(Array.isArray(pageItems) ? pageItems : []).forEach(item => {
    const itemId = normalizeHydrationEntityId(item)
    const existingIndex = itemId ? itemIndexById.get(itemId) : -1

    if (typeof existingIndex === 'number' && existingIndex >= 0) {
      nextItems[existingIndex] = item
      return
    }

    nextItems.push(item)
    if (itemId) {
      itemIndexById.set(itemId, nextItems.length - 1)
    }
  })

  return nextItems
}

export const fetchAllHydraCollectionPages = async (
  fetchPage,
  {startPage = 1, maxPages = 100} = {},
) => {
  if (typeof fetchPage !== 'function') {
    return {items: [], totalItems: 0, complete: true}
  }

  let page = Math.max(1, Number(startPage || 1))
  const pageLimit = Math.max(1, Number(maxPages || 1))
  let items = []
  let totalItems = 0

  for (let pageIndex = 0; pageIndex < pageLimit; pageIndex += 1) {
    const response = await fetchPage(page)
    const pageItems = extractHydraCollectionItems(response)

    items = mergeHydraCollectionItemsById(items, pageItems)
    totalItems = Math.max(totalItems, resolveHydraCollectionTotalItems(response, items))

    if (totalItems > 0 && items.length >= totalItems) {
      return {items, totalItems, complete: true}
    }

    if (pageItems.length === 0) {
      break
    }

    page += 1
  }

  if (totalItems <= 0) {
    return {items, totalItems: items.length, complete: true}
  }

  return {
    items,
    totalItems,
    complete: items.length >= totalItems,
  }
}
