import {
  calculateOrderProductsSubtotal,
  mergeOrderWithOrderProducts,
  removeOrderProductFromList,
} from '@controleonline/ui-orders/src/utils/orderState'

const pizza = {
  id: 105039,
  product: { id: 1, product: 'Pizza Grande 8 Pedacos' },
  quantity: 1,
  price: 102.01,
  total: 102.01,
}

const pizzaComplement = {
  id: 105040,
  product: { id: 2, product: 'Atum' },
  orderProduct: '/order_products/105039',
  quantity: 1,
  price: 70,
  total: 70,
}

const coca = {
  id: 105046,
  product: { id: 7, product: 'Coca-Cola 2L' },
  quantity: 1,
  price: 13,
  total: 13,
}

describe('orderState', () => {
  it('calculates subtotal from top-level order products only', () => {
    expect(calculateOrderProductsSubtotal([pizza, pizzaComplement, coca])).toBe(115.01)
  })

  it('rebuilds local price from remaining products when current price is stale zero', () => {
    const currentOrder = {
      id: 72477,
      price: 0,
      orderProducts: [pizza, pizzaComplement, coca],
    }
    const remainingOrderProducts = removeOrderProductFromList(
      currentOrder.orderProducts,
      pizza,
    )

    expect(remainingOrderProducts).toEqual([coca])
    expect(
      mergeOrderWithOrderProducts(currentOrder, remainingOrderProducts).price,
    ).toBe(13)
  })

  it('removes every descendant of an optional component optimistically', () => {
    const fries = {
      id: 105041,
      orderProduct: '/order_products/105039',
      product: {id: 3, product: 'Batata'},
    }
    const sauce = {
      id: 105042,
      orderProduct: '/order_products/105041',
      product: {id: 4, product: 'Molho'},
    }

    expect(
      removeOrderProductFromList([pizza, fries, sauce, coca], fries),
    ).toEqual([pizza, coca])
  })
})

// Losing parent links on a partial update must not count combo components twice.
describe('confirmed cart hierarchy preservation', () => {
  const {preserveOrderProductHierarchy} = require('../../../utils/orderState')
  it('keeps links for matching lines while accepting new quantities and removed lines', () => {
    const current = {id: 1, orderProducts: [pizza, pizzaComplement, coca]}
    const next = {id: 1, orderProducts: [{...pizza, quantity: 2, total: 204.02},
      {id: 105040, product: pizzaComplement.product, quantity: 2, total: 140}]}
    const result = preserveOrderProductHierarchy(current, next)
    expect(result.orderProducts).toHaveLength(2)
    expect(result.orderProducts[1].orderProduct).toBe('/order_products/105039')
    expect(calculateOrderProductsSubtotal(result.orderProducts)).toBe(204.02)
    expect(next.orderProducts[1].orderProduct).toBeUndefined()
  })
  it('respects explicit null links, an empty authoritative list and a different order', () => {
    const current = {id: 1, orderProducts: [pizza, pizzaComplement]}
    const detached = {id: 1, orderProducts: [{...pizzaComplement, orderProduct: null}]}
    expect(preserveOrderProductHierarchy(current, detached).orderProducts[0].orderProduct).toBeNull()
    expect(preserveOrderProductHierarchy(current, {id: 1, orderProducts: []}).orderProducts).toEqual([])
    const other = {id: 2, orderProducts: [{id: 105040}]}
    expect(preserveOrderProductHierarchy(current, other)).toBe(other)
  })
})

it('does not retain an alternate parent reference after explicit detachment', () => {
  const {preserveOrderProductHierarchy} = require('../../../utils/orderState')
  const previous = {id: 1, orderProducts: [{id: 2, order_product: '/order_products/1'}]}
  const next = {id: 1, orderProducts: [{id: 2, orderProduct: null, quantity: 1, total: 10}]}
  expect(calculateOrderProductsSubtotal(preserveOrderProductHierarchy(previous, next).orderProducts)).toBe(10)
})

it('does not restore omitted links in a complete authoritative response', () => {
  const {preserveOrderProductHierarchy} = require('../../../utils/orderState')
  const previous = {id: 1, orderProducts: [{id: 2, orderProduct: '/order_products/1'}]}
  const next = {id: 1, orderProducts: [{id: 2, hierarchyComplete: true, quantity: 1, total: 10}]}
  expect(calculateOrderProductsSubtotal(preserveOrderProductHierarchy(previous, next).orderProducts)).toBe(10)
})

it('keeps a simple line complete after a partial quantity update', () => {
  const {preserveOrderProductHierarchy} = require('../../../utils/orderState')
  const previous = {id: 1, orderProducts: [{id: 2, hierarchyComplete: true, total: 5}]}
  const next = {id: 1, orderProducts: [{id: 2, quantity: 2, total: 10}]}
  expect(preserveOrderProductHierarchy(previous, next).orderProducts[0].hierarchyComplete).toBe(true)
})
