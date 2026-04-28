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

  it('prioritizes the iFood pickup code over the display id', () => {
    const order = {
      id: 70951,
      app: 'ifood',
      otherInformations: JSON.stringify({
        ifood: {
          latest_event_type: 'PLACED',
          PLACED: {
            displayId: '3149',
            delivery: {
              pickupCode: 'A1B2',
            },
          },
        },
      }),
    }

    const identity = resolveOrderIdentity(order)

    expect(identity.externalLabel).toBe('IFOOD')
    expect(identity.externalId).toBe('A1B2')
    expect(identity.primaryText).toBe('IFOOD #A1B2')
    expect(identity.secondaryText).toBe('Pedido #70951')
  })
})
