const hasHydraItems = value =>
  Array.isArray(value) ||
  Array.isArray(value?.member) ||
  Array.isArray(value?.['hydra:member'])

const getHydraItems = value => {
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

const hasEmbeddedOrderProductComponents = orderProducts =>
  Array.isArray(orderProducts) &&
  orderProducts.some(orderProduct =>
    hasHydraItems(orderProduct?.orderProductComponents) ||
    hasHydraItems(orderProduct?.order_product_components),
  )

export const hasOrderProducts = orderProducts =>
  Array.isArray(orderProducts) && orderProducts.length > 0

export const hasGroupingMetadata = orderProducts =>
  Array.isArray(orderProducts) &&
  orderProducts.some(
    orderProduct =>
      !!(
        orderProduct?.orderProduct ||
        orderProduct?.parentProduct ||
        orderProduct?.productGroup
      ),
  )

export const hasDetailedOrderProductMetadata = orderProducts =>
  hasGroupingMetadata(orderProducts) ||
  hasEmbeddedOrderProductComponents(orderProducts)

export const hasCompleteEmbeddedOrderProductsTree = order =>
  order?.orderProductsTreeComplete === true ||
  order?.order_products_tree_complete === true

export const needsDetailedOrderProductsFetch = orderProducts => {
  if (!hasOrderProducts(orderProducts)) {
    return true
  }

  if (hasDetailedOrderProductMetadata(orderProducts)) {
    return false
  }

  return true
}

export const getEmbeddedOrderProductComponents = orderProduct =>
  getHydraItems(orderProduct?.orderProductComponents)
