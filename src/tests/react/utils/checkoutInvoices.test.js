const {
  appendSyntheticOrderInvoice,
  resolvePaidAmountForOrder,
  resolveCheckoutRemainingAmount,
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
})

describe('resolveCheckoutRemainingAmount — order-scoped balance (ui-orders#6)', () => {
  // Reproduces order #72884: navigating to Checkout while the store still holds
  // order #72883 (price=105.87, payable=-105.87).  isOrderScopedToRoute is false
  // because the loaded order id does not yet match the route order id.
  it('returns 0 while the target order has not been loaded yet (order not scoped)', () => {
    expect(
      resolveCheckoutRemainingAmount({
        isOrderScopedToRoute: false,
        orderPrice: 105.87, // stale from order #72883 still in store
        payable: -105.87,   // stale payable from order #72883
      }),
    ).toBe(0)
  })

  it('returns order.price once the order is in sync and no payments have been made', () => {
    // payable was reset to 0 by useFocusEffect before the fetch and PayableToolbar
    // has not yet recomputed for the new order.
    expect(
      resolveCheckoutRemainingAmount({
        isOrderScopedToRoute: true,
        orderPrice: 116.86,
        payable: 0,
      }),
    ).toBe(116.86)
  })

  it('returns the partial remaining balance when a payment has been made', () => {
    // Order price: 116.86, partial payment: 50 → payable = 50 − 116.86 = −66.86
    expect(
      resolveCheckoutRemainingAmount({
        isOrderScopedToRoute: true,
        orderPrice: 116.86,
        payable: -66.86,
      }),
    ).toBe(66.86)
  })

  it('uses payable as outstanding balance even when it differs from order.price (partial payment)', () => {
    // payable=-105.87 on an order priced 116.86 represents ~10.99 already paid.
    // The function trusts payable when scoped; distinguishing stale from real
    // partial payment is the job of useFocusEffect resetting payable on order switch.
    expect(
      resolveCheckoutRemainingAmount({
        isOrderScopedToRoute: true,
        orderPrice: 116.86,
        payable: -105.87,
      }),
    ).toBe(105.87)
  })

  it('returns order.price when payable is exactly 0 (fresh session, no payments yet)', () => {
    expect(
      resolveCheckoutRemainingAmount({
        isOrderScopedToRoute: true,
        orderPrice: 38,
        payable: 0,
      }),
    ).toBe(38)
  })

  it('returns 0 with defaults when called without arguments', () => {
    expect(resolveCheckoutRemainingAmount()).toBe(0)
  })

  it('returns 0 for negative or zero orderPrice when scoped and no payable', () => {
    expect(
      resolveCheckoutRemainingAmount({
        isOrderScopedToRoute: true,
        orderPrice: 0,
        payable: 0,
      }),
    ).toBe(0)
  })
})
