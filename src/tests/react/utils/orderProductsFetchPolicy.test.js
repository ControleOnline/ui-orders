const {
  hasCompleteEmbeddedOrderProductsTree,
  hasDetailedOrderProductMetadata,
  needsDetailedOrderProductsFetch,
} = require('../../../react/utils/orderProductsFetchPolicy')

const { describe, expect, it } = global

describe('orderProductsFetchPolicy', () => {
  it('requires fallback when the order has no embedded items', () => {
    expect(needsDetailedOrderProductsFetch([])).toBe(true)
  })

  it('requires fallback even for a single simple item when metadata is missing', () => {
    expect(
      needsDetailedOrderProductsFetch([
        {
          id: 1,
          quantity: 1,
          product: { id: 101, type: 'product', product: 'Refrigerante' },
        },
      ]),
    ).toBe(true)
  })

  it('requires fallback for a single customizable root item', () => {
    expect(
      needsDetailedOrderProductsFetch([
        {
          id: 1,
          quantity: 1,
          product: { id: 101, type: 'custom', product: 'Combo Produto Exemplo' },
        },
      ]),
    ).toBe(true)
  })

  it('does not treat an order reference alone as detailed hierarchy metadata', () => {
    const orderProducts = [
      {
        id: 1,
        order: '/orders/71000',
        quantity: 1,
        product: { id: 101, type: 'product', product: 'Refrigerante' },
      },
    ]

    expect(hasDetailedOrderProductMetadata(orderProducts)).toBe(false)
    expect(needsDetailedOrderProductsFetch(orderProducts)).toBe(true)
  })

  it('detects when the embedded payload already has hierarchy metadata', () => {
    const orderProducts = [
      {
        id: 1,
        quantity: 1,
        product: { id: 101, type: 'custom', product: 'Combo Produto Exemplo' },
      },
      {
        id: 2,
        quantity: 1,
        orderProduct: '/order_products/1',
        productGroup: {
          id: 501,
          productGroup: 'Bebida',
        },
        product: { id: 202, type: 'product', product: 'Coca-Cola' },
      },
    ]

    expect(hasDetailedOrderProductMetadata(orderProducts)).toBe(true)
    expect(needsDetailedOrderProductsFetch(orderProducts)).toBe(false)
  })

  it('recognizes the explicit complete-tree contract on an order detail', () => {
    expect(
      hasCompleteEmbeddedOrderProductsTree({
        id: 72884,
        orderProductsTreeComplete: true,
      }),
    ).toBe(true)
    expect(hasCompleteEmbeddedOrderProductsTree({id: 72884})).toBe(false)
  })
})
