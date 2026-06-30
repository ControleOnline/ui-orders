const {
  buildFood99OrderSummary,
} = require('../../../react/services/marketplaceOrderSummary')

const {describe, expect, it} = global

describe('marketplaceOrderSummary', () => {
  it('builds a 99Food summary when the order app is stored as 99', () => {
    const order = {
      id: 70949,
      app: '99',
      otherInformations: JSON.stringify({
        Food99: {
          data: {
            order_info: {
              order_index: '570005',
              delivery_type: '1',
              pay_type: '1',
              pay_method: '1',
              pay_channel: '150',
            },
            price: {
              order_price: 7738,
              real_price: 7738,
              customer_need_paying_money: 7738,
            },
          },
        },
      }),
    }

    const summary = buildFood99OrderSummary(order)

    expect(summary).not.toBeNull()
    expect(summary.identifiers.orderIndex).toBe('570005')
  })

  it('uses the iFood order_index from the canonical payload before technical ids', () => {
    const order = {
      id: 71759,
      app: 'iFood',
      otherInformations: JSON.stringify({
        ifood: {
          data: {
            order_info: {
              order_index: '3984',
            },
            order: {
              id: '9103',
            },
          },
        },
      }),
    }

    const summary = buildFood99OrderSummary(order)

    expect(summary).not.toBeNull()
    expect(summary.identifiers.orderIndex).toBe('3984')
  })

  it('does not synthesize an iFood orderIndex from pickup or display ids', () => {
    const order = {
      id: 71759,
      app: 'iFood',
      otherInformations: JSON.stringify({
        ifood: {
          data: {
            order: {
              id: '9103',
              displayId: '9103',
              delivery: {
                pickupCode: '9103',
              },
            },
          },
        },
      }),
    }

    const summary = buildFood99OrderSummary(order)

    expect(summary).not.toBeNull()
    expect(summary.identifiers.orderIndex).toBe('')
  })
})
