const normalizeRawValue = value => String(value || '').trim()
const roundMoney = value => Math.round(Number(value || 0) * 100) / 100

export const normalizeEntityId = value => {
  if (!value) return ''

  if (typeof value === 'object') {
    return normalizeEntityId(value.id || value['@id'] || value.value)
  }

  const matches = normalizeRawValue(value).match(/\d+/g)
  return matches ? matches[matches.length - 1] : ''
}

const mergeOrderProduct = (currentOrderProduct, nextOrderProduct) => ({
  ...(currentOrderProduct || {}),
  ...(nextOrderProduct || {}),
  product: nextOrderProduct?.product || currentOrderProduct?.product || null,
  orderProduct:
    nextOrderProduct?.orderProduct ||
    currentOrderProduct?.orderProduct ||
    null,
  order_product:
    nextOrderProduct?.order_product ||
    currentOrderProduct?.order_product ||
    null,
  parentProduct:
    nextOrderProduct?.parentProduct ||
    currentOrderProduct?.parentProduct ||
    null,
  orderProductComponents: Array.isArray(nextOrderProduct?.orderProductComponents)
    ? nextOrderProduct.orderProductComponents
    : (currentOrderProduct?.orderProductComponents || []),
})

export const mergeOrderIntoList = (orders, order, { prependIfMissing = false } = {}) => {
  const nextOrders = Array.isArray(orders) ? [...orders] : []
  const targetId = normalizeEntityId(order)

  if (!targetId) return nextOrders

  const existingIndex = nextOrders.findIndex(
    currentOrder => normalizeEntityId(currentOrder) === targetId,
  )

  if (existingIndex >= 0) {
    nextOrders[existingIndex] = order
    return nextOrders
  }

  if (prependIfMissing) {
    nextOrders.unshift(order)
    return nextOrders
  }

  nextOrders.push(order)
  return nextOrders
}

export const mergeOrderProductIntoList = (orderProducts, orderProduct) => {
  const nextOrderProducts = Array.isArray(orderProducts) ? [...orderProducts] : []
  const targetId = normalizeEntityId(orderProduct)

  if (!targetId) return nextOrderProducts

  const existingIndex = nextOrderProducts.findIndex(
    currentOrderProduct => normalizeEntityId(currentOrderProduct) === targetId,
  )

  if (existingIndex >= 0) {
    nextOrderProducts[existingIndex] = mergeOrderProduct(
      nextOrderProducts[existingIndex],
      orderProduct,
    )
    return nextOrderProducts
  }

  nextOrderProducts.push(orderProduct)
  return nextOrderProducts
}

export const removeOrderProductFromList = (orderProducts, targetOrderProduct) => {
  const targetId = normalizeEntityId(targetOrderProduct)

  if (!targetId) {
    return Array.isArray(orderProducts) ? [...orderProducts] : []
  }

  const items = Array.isArray(orderProducts) ? orderProducts : []
  const removedIds = new Set([targetId])
  let foundDescendant = true

  while (foundDescendant) {
    foundDescendant = false
    items.forEach(orderProduct => {
      const orderProductId = normalizeEntityId(orderProduct)
      const parentOrderProductId = normalizeEntityId(
        orderProduct?.orderProduct || orderProduct?.order_product,
      )

      if (
        orderProductId &&
        parentOrderProductId &&
        removedIds.has(parentOrderProductId) &&
        !removedIds.has(orderProductId)
      ) {
        removedIds.add(orderProductId)
        foundDescendant = true
      }
    })
  }

  return items.filter(orderProduct => !removedIds.has(normalizeEntityId(orderProduct)))
}

export const mergeOrderWithOrderProducts = (order, orderProducts) => ({
  ...(order || {}),
  orderProducts: Array.isArray(orderProducts) ? orderProducts : [],
  price: resolveNextOrderPrice(order, orderProducts),
})

export const hydrateOrderWithOrderProducts = (order, orderProducts) => ({
  ...(order || {}),
  orderProducts: Array.isArray(orderProducts) ? orderProducts : [],
})

const hasLinkedParentOrderProduct = orderProduct =>
  !!normalizeEntityId(orderProduct?.orderProduct || orderProduct?.order_product)

const hasLinkedParentProduct = orderProduct =>
  !!normalizeEntityId(orderProduct?.parentProduct)

const isTopLevelOrderProduct = orderProduct => {
  if (!orderProduct) return false
  if (orderProduct?.productGroup) return false
  if (hasLinkedParentOrderProduct(orderProduct)) return false
  if (hasLinkedParentProduct(orderProduct)) return false
  return true
}

const resolveOrderProductUnitPrice = orderProduct => {
  const directUnitPrice = Number(
    orderProduct?.unitPrice ??
    orderProduct?.value ??
    orderProduct?.price ??
    0,
  )

  if (Number.isFinite(directUnitPrice) && directUnitPrice > 0) {
    return directUnitPrice
  }

  const quantity = Number(orderProduct?.quantity || 0)
  const total = Number(orderProduct?.total || 0)
  if (quantity > 0 && total > 0) {
    return total / quantity
  }

  const productUnitPrice = Number(orderProduct?.product?.price || 0)
  return Number.isFinite(productUnitPrice) ? productUnitPrice : 0
}

export const resolveOrderProductTotal = orderProduct => {
  const explicitTotal = Number(orderProduct?.total || 0)
  if (Number.isFinite(explicitTotal) && explicitTotal > 0) {
    return roundMoney(explicitTotal)
  }

  return roundMoney(
    resolveOrderProductUnitPrice(orderProduct) * Number(orderProduct?.quantity || 0),
  )
}

export const calculateOrderProductsSubtotal = orderProducts =>
  roundMoney(
    (Array.isArray(orderProducts) ? orderProducts : [])
      .filter(isTopLevelOrderProduct)
      .reduce((sum, orderProduct) => sum + resolveOrderProductTotal(orderProduct), 0),
  )

export const resolveOrderDisplayTotal = ({order, orderProducts} = {}) => {
  const hasAuthoritativePrice = Object.prototype.hasOwnProperty.call(
    order || {},
    'price',
  )
  const authoritativePrice = Number(order?.price)

  if (
    hasAuthoritativePrice &&
    order?.price !== null &&
    order?.price !== '' &&
    Number.isFinite(authoritativePrice)
  ) {
    return roundMoney(authoritativePrice)
  }

  return calculateOrderProductsSubtotal(orderProducts)
}

const resolveNextOrderPrice = (order, nextOrderProducts) => {
  const nextSubtotal = calculateOrderProductsSubtotal(nextOrderProducts)
  const currentPrice = Number(order?.price)

  if (!Number.isFinite(currentPrice)) {
    return nextSubtotal
  }

  const currentSubtotal = calculateOrderProductsSubtotal(order?.orderProducts)
  if (currentPrice <= 0 && currentSubtotal > 0 && nextSubtotal > 0) {
    return nextSubtotal
  }

  const adjustedPrice = currentPrice + (nextSubtotal - currentSubtotal)

  return roundMoney(Math.max(0, adjustedPrice))
}

export const withOrderProductQuantity = (orderProduct, quantity) => {
  const nextQuantity = Math.max(0, Number(quantity || 0))
  const unitPrice = resolveOrderProductUnitPrice(orderProduct)

  return {
    ...(orderProduct || {}),
    quantity: nextQuantity,
    total: unitPrice > 0 ? roundMoney(unitPrice * nextQuantity) : 0,
  }
}
