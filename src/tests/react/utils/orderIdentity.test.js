const {
  resolveOrderIdentity,
} = require('../../../react/utils/orderIdentity')

const {describe, expect, it} = global

describe('orderIdentity', () => {
  it('resolves the highlighted 99Food code from nested marketplace payloads', () => {
    const order = {
      id: 70911,
      app: '99Food',
      otherInformations: JSON.stringify({
        food99: {
          data: {
            order_info: {
              order_index: '998877',
              pickup_code: 'MOTO123',
            },
            price: {
              order_price: 3600,
            },
          },
        },
      }),
    }

    const identity = resolveOrderIdentity(order)

    expect(identity.externalLabel).toBe('99')
    expect(identity.externalId).toBe('MOTO123')
    expect(identity.primaryText).toBe('99 #MOTO123')
    expect(identity.secondaryText).toBe('Pedido #70911')
  })
})
