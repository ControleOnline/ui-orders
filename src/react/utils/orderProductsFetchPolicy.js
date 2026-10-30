import {calculateOrderProductsSubtotal} from '../../utils/orderState'

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

const hasExplicitHierarchy = line =>
  line?.hierarchyComplete === true ||
  ['orderProduct', 'parentProduct', 'productGroup'].every(key =>
    Object.prototype.hasOwnProperty.call(line, key))

export const hasDetailedOrderProductMetadata = orderProducts => {
  if (!hasOrderProducts(orderProducts)) return false
  if (orderProducts.some(line => Object.prototype.hasOwnProperty.call(line, 'hierarchyComplete'))) {
    return orderProducts.every(hasExplicitHierarchy)
  }
  return orderProducts.every(hasExplicitHierarchy) ||
    hasGroupingMetadata(orderProducts) || hasEmbeddedOrderProductComponents(orderProducts)
}

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

// Flat legacy responses cannot safely distinguish a component from a sold root.
export const resolveOrderProductsDisplayTotal = (orderProducts, confirmedTotal) =>
  !hasOrderProducts(orderProducts) || hasDetailedOrderProductMetadata(orderProducts)
    ? calculateOrderProductsSubtotal(orderProducts)
    : Number(confirmedTotal || 0)
