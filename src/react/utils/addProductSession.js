const normalizeProductId = value => {
  if (!value && value !== 0) return ''

  if (typeof value === 'object') {
    return normalizeProductId(value?.id || value?.['@id'] || value?.value)
  }

  return String(value || '').replace(/\D+/g, '').trim()
}

const pendingSelections = new Map()

export const ADD_PRODUCT_SELECTION_CHANGE_EVENT = 'orders:add-product-selection-change'

export const getPendingAddProductQuantity = product =>
  Number(pendingSelections.get(normalizeProductId(product))?.quantity || 0)

export const setPendingAddProductQuantity = (product, quantity) => {
  const productId = normalizeProductId(product)
  const nextQuantity = Math.max(0, Number(quantity || 0))

  if (!productId) {
    return null
  }

  if (nextQuantity <= 0) {
    pendingSelections.delete(productId)
    return null
  }

  const entry = {
    product,
    productId,
    quantity: nextQuantity,
  }

  pendingSelections.set(productId, entry)
  return entry
}

export const listPendingAddProducts = () =>
  Array.from(pendingSelections.values())
    .filter(entry => Number(entry?.quantity || 0) > 0)
    .map(entry => ({
      product: entry.product,
      productId: entry.productId,
      quantity: Number(entry.quantity || 0),
    }))

export const clearPendingAddProducts = () => {
  pendingSelections.clear()
}

export const resolvePendingAddProductId = normalizeProductId
