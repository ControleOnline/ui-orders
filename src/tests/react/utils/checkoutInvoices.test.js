const {
  appendSyntheticOrderInvoice,
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
        orderTotal: 100,
        pendingAmount: 70,
        receivedAmount: 30,
      }),
    ).toBe(70)
    expect(
      resolveOperationalDisplayLabelKey({
        pendingAmount: 70,
        receivedAmount: 30,
      }),
    ).toBe('pending')
  })

  it('keeps the full order total before any payment and reaches paid when the balance is zero', () => {
    expect(
      resolveOperationalDisplayAmount({
        orderTotal: 100,
        pendingAmount: 100,
        receivedAmount: 0,
      }),
    ).toBe(100)
    expect(
      resolveOperationalDisplayLabelKey({
        pendingAmount: 100,
        receivedAmount: 0,
      }),
    ).toBe('localTotal')
    expect(
      resolveOperationalDisplayLabelKey({
        pendingAmount: 0,
        receivedAmount: 100,
      }),
    ).toBe('paid')
  })
})
