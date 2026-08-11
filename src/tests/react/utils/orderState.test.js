import {
  calculateOrderProductsSubtotal,
  mergeOrderWithOrderProducts,
  removeOrderProductFromList,
  resolveOrderDisplayTotal,
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

  it('still adjusts the local price for a real optimistic product removal', () => {
    const currentOrder = {
      id: 72477,
      price: 115.01,
      orderProducts: [pizza, pizzaComplement, coca],
    }
    const remainingOrderProducts = removeOrderProductFromList(
      currentOrder.orderProducts,
      pizza,
    )

    expect(
      mergeOrderWithOrderProducts(currentOrder, remainingOrderProducts).price,
    ).toBe(13)
  })

  it('uses the authoritative order price while shallow items cannot identify descendants', () => {
    const shallowProducts = [
      {
        id: 107229,
        product: {id: 1343, product: 'Produto customizado'},
        quantity: 2,
        price: 116.86,
        total: 233.72,
      },
      {
        id: 107230,
        product: {id: 1109, product: 'Componente'},
        quantity: 2,
        price: 49.85,
        total: 99.7,
      },
    ]

    expect(calculateOrderProductsSubtotal(shallowProducts)).toBe(333.42)
    expect(
      resolveOrderDisplayTotal({
        order: {id: 72883, price: 233.72},
        orderProducts: shallowProducts,
      }),
    ).toBe(233.72)
  })

  it('reconstructs the subtotal only when the order has no authoritative price', () => {
    expect(
      resolveOrderDisplayTotal({
        order: {id: 72883},
        orderProducts: [pizza, pizzaComplement, coca],
      }),
    ).toBe(115.01)
  })

  it('keeps an explicit zero price authoritative for a free order', () => {
    expect(
      resolveOrderDisplayTotal({
        order: {id: 72883, price: 0},
        orderProducts: [pizza, pizzaComplement],
      }),
    ).toBe(0)
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
