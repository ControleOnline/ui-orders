const {
  appendSyntheticOrderInvoice,
  filterOrderProductsForOrder,
  resolveCheckoutRemainingAmount,
  resolvePaidAmountForOrder,
  resolveOperationalDisplayAmount,
  resolveOperationalDisplayLabelKey,
  resolveNextOperationalPayable,
} = require('../../../react/utils/checkoutInvoices')

const {describe, expect, it} = global

describe('checkoutInvoices', () => {
  it('resolves the next payable from the displayed remaining amount when the store is still neutral', () => {
    expect(
      resolveNextOperationalPayable({
        paidAmount: 5,
        payable: 0,
        remainingAmount: 10,
      }),
    ).toBe(-5)
  })

  it('keeps partial payments consistent when the payable store already tracks debt', () => {
    expect(
      resolveNextOperationalPayable({
        paidAmount: 5,
        payable: -10,
        remainingAmount: 10,
      }),
    ).toBe(-5)
  })

  it('reaches zero when the payment settles the displayed balance', () => {
    expect(
      resolveNextOperationalPayable({
        paidAmount: 10,
        payable: -10,
        remainingAmount: 10,
      }),
    ).toBe(0)
  })

  it('appends a synthetic order invoice entry and replaces duplicates by invoice id', () => {
    const nextItems = appendSyntheticOrderInvoice(
      [
        {
          id: 1,
          invoice: {id: 7, price: 3},
          realPrice: 3,
        },
        {
          id: 2,
          invoice: {id: 9, price: 4},
          realPrice: 4,
        },
      ],
      {
        invoice: {id: 7, price: 5},
        orderIri: '/orders/42',
        realPrice: 5,
      },
    )

    expect(nextItems).toHaveLength(2)
    expect(nextItems[0].invoice.id).toBe(9)
    expect(nextItems[1]).toEqual({
      id: 'local-7',
      invoice: {id: 7, price: 5},
      order: '/orders/42',
      realPrice: 5,
    })
  })

  it('switches the operational display amount to the remaining balance after a partial payment', () => {
    expect(
      resolveOperationalDisplayAmount({
        orderTotal: 38,
        pendingAmount: 30,
        receivedAmount: 8,
      }),
    ).toBe(30)
    expect(
      resolveOperationalDisplayLabelKey({
        pendingAmount: 30,
        receivedAmount: 8,
      }),
    ).toBe('pending')
  })

  it('keeps the full order total before any payment and reaches paid when the balance is zero', () => {
    expect(
      resolveOperationalDisplayAmount({
        orderTotal: 38,
        pendingAmount: 38,
        receivedAmount: 0,
      }),
    ).toBe(38)
    expect(
      resolveOperationalDisplayLabelKey({
        pendingAmount: 38,
        receivedAmount: 0,
      }),
    ).toBe('localTotal')
    expect(
      resolveOperationalDisplayLabelKey({
        pendingAmount: 0,
        receivedAmount: 38,
      }),
    ).toBe('paid')
  })

  it('ignores a paid invoice relation left by the previous order', () => {
    const paid = resolvePaidAmountForOrder({
      order: {id: 72842, '@id': '/orders/72842'},
      orderInvoices: [
        {
          order: '/orders/72840',
          realPrice: 21.9,
          invoice: {id: 33301, price: 21.9},
        },
      ],
    })

    expect(paid).toBe(0)
    expect(paid - 106.88).toBe(-106.88)
  })

  it('sums only the current order realPrice, not the full shared invoice price', () => {
    const paid = resolvePaidAmountForOrder({
      order: {id: 72842, '@id': '/orders/72842'},
      orderInvoices: [
        {
          order: {id: 72840, '@id': '/orders/72840'},
          realPrice: 21.9,
          invoice: {id: 33301, price: 21.9},
        },
        {
          order: {id: 72842, '@id': '/orders/72842'},
          realPrice: 5,
          invoice: {id: 33302, price: 123.77},
        },
      ],
    })

    expect(paid).toBe(5)
  })

  it('prioritizes the synced order price over a stale positive payable', () => {
    expect(
      resolveCheckoutRemainingAmount({
        order: {id: 72884, '@id': '/orders/72884', price: 116.86},
        payable: 105.87,
        routeOrderId: 72884,
      }),
    ).toBe(116.86)
  })

  it('does not expose totals while the route points to another order', () => {
    expect(
      resolveCheckoutRemainingAmount({
        order: {id: 72883, price: 105.87},
        payable: 105.87,
        routeOrderId: 72884,
      }),
    ).toBe(0)
  })

  it('totals only products that belong to the checkout order', () => {
    const orderProducts = [
      {id: 1, order: '/orders/72883', price: 105.87, quantity: 1},
      {id: 2, order: '/orders/72884', price: 58.43, quantity: 2},
    ]

    expect(filterOrderProductsForOrder(orderProducts, '/orders/72884')).toEqual([
      {id: 2, order: '/orders/72884', price: 58.43, quantity: 2},
    ])
    expect(
      resolveCheckoutRemainingAmount({
        order: {id: 72884},
        orderProducts,
        routeOrderId: 72884,
      }),
    ).toBe(116.86)
  })
})
