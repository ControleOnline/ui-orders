const {
  buildFood99OrderSummary,
} = require('../../../react/services/food99OrderSummary')

const {describe, expect, it} = global

describe('food99OrderSummary', () => {
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
})
