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
})
