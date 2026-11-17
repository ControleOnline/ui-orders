const {
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
})

it('accepts explicit null hierarchy fields for simple products without another read', () => {
  const lines = [{id: 1, orderProduct: null, parentProduct: null, productGroup: null}]
  expect(hasDetailedOrderProductMetadata(lines)).toBe(true)
  expect(needsDetailedOrderProductsFetch(lines)).toBe(false)
})

it('uses the confirmed server total while hierarchy is unavailable', () => {
  const {resolveOrderProductsDisplayTotal} = require('../../../react/utils/orderProductsFetchPolicy')
  const flat = [{id: 1, quantity: 1, total: 73}, {id: 2, quantity: 1, total: 10}]
  expect(resolveOrderProductsDisplayTotal(flat, 73)).toBe(73)
  const complete = [{...flat[0], orderProduct: null, parentProduct: null, productGroup: null},
    {...flat[1], orderProduct: '/order_products/1', parentProduct: null, productGroup: null}]
  expect(resolveOrderProductsDisplayTotal(complete, 0)).toBe(73)
  expect(resolveOrderProductsDisplayTotal([], 73)).toBe(0)
})

it('recognizes complete API lines even when null values are omitted by JSON-LD', () => {
  expect(needsDetailedOrderProductsFetch([{id: 1, hierarchyComplete: true}])).toBe(false)
})

it('requires a reread when a newly added line is incomplete beside confirmed lines', () => {
  const lines = [{id: 1, hierarchyComplete: true},
    {id: 2, orderProduct: '/order_products/1', productGroup: {id: 20}, hierarchyComplete: true},
    {id: 3, product: {type: 'custom'}}]
  expect(needsDetailedOrderProductsFetch(lines)).toBe(true)
})
