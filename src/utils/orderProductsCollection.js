const DEFAULT_ITEMS_PER_PAGE = 50
const MAX_COLLECTION_PAGES = 1000

const normalizeCollectionItems = response => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.member)) return response.member
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member']
  return []
}

const resolveResponseTotalItems = response => {
  const rawTotal = response?.totalItems ?? response?.['hydra:totalItems']
  const total = Number(rawTotal)

  return Number.isFinite(total) && total >= 0 ? total : null
}

const normalizeOrderProductId = orderProduct =>
  String(orderProduct?.id || orderProduct?.['@id'] || '').replace(/\D+/g, '')

const mergeCollectionPage = (currentItems, pageItems) => {
  const mergedItems = Array.isArray(currentItems) ? [...currentItems] : []

  ;(Array.isArray(pageItems) ? pageItems : []).forEach(orderProduct => {
    const orderProductId = normalizeOrderProductId(orderProduct)
    const existingIndex = orderProductId
      ? mergedItems.findIndex(
          currentItem => normalizeOrderProductId(currentItem) === orderProductId,
        )
      : -1

    if (existingIndex >= 0) {
      mergedItems[existingIndex] = orderProduct
      return
    }

    mergedItems.push(orderProduct)
  })

  return mergedItems
}

export const fetchCompleteOrderProducts = async ({
  fetchPage,
  getTotalItems = null,
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
} = {}) => {
  if (typeof fetchPage !== 'function') {
    throw new TypeError('fetchPage must be a function')
  }

  const normalizedItemsPerPage = Math.max(1, Number(itemsPerPage) || DEFAULT_ITEMS_PER_PAGE)
  let collectedItems = []

  for (let page = 1; page <= MAX_COLLECTION_PAGES; page += 1) {
    const response = await fetchPage({
      itemsPerPage: normalizedItemsPerPage,
      page,
    })
    const pageItems = normalizeCollectionItems(response)
    const previousItemsCount = collectedItems.length
    collectedItems = mergeCollectionPage(collectedItems, pageItems)

    const responseTotalItems = resolveResponseTotalItems(response)
    const storeTotalItems = Number(
      typeof getTotalItems === 'function' ? getTotalItems() : NaN,
    )
    const expectedTotalItems =
      responseTotalItems !== null
        ? responseTotalItems
        : Number.isFinite(storeTotalItems) && storeTotalItems >= 0
          ? storeTotalItems
          : null

    if (
      expectedTotalItems !== null &&
      collectedItems.length >= expectedTotalItems
    ) {
      return collectedItems
    }

    if (pageItems.length < normalizedItemsPerPage && expectedTotalItems === null) {
      return collectedItems
    }

    if (pageItems.length === 0 || collectedItems.length === previousItemsCount) {
      throw new Error(
        `Incomplete order-products collection: loaded ${collectedItems.length}` +
          (expectedTotalItems === null ? '' : ` of ${expectedTotalItems}`),
      )
    }
  }

  throw new Error('Incomplete order-products collection: page limit exceeded')
}

export const fetchCompleteOrderProductsFromStore = ({
  actions,
  getters,
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  params = {},
} = {}) =>
  fetchCompleteOrderProducts({
    itemsPerPage,
    getTotalItems: () => getters?.totalItems,
    fetchPage: ({page, itemsPerPage: pageSize}) =>
      actions.getItems({
        ...params,
        itemsPerPage: pageSize,
        page,
        ...(page > 1 ? {append: true} : {}),
      }),
  })

