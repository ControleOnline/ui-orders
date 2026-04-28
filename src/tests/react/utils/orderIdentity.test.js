const {
  resolveOrderIdentity,
} = require('../../../react/utils/orderIdentity')

const {describe, expect, it} = global

describe('orderIdentity', () => {
  it('prioritizes the marketplace order index from 99Food extra data', () => {
    const order = {
      id: 70911,
      app: '99Food',
      extraData: [
        {
          extraFields: {
            context: 'Food99',
            name: 'code',
          },
          value: '70001',
        },
        {
          extraFields: {
            context: 'Food99',
            name: 'handover_code',
          },
          value: '0050',
        },
      ],
    }

    const identity = resolveOrderIdentity(order)

    expect(identity.externalLabel).toBe('99')
    expect(identity.externalId).toBe('70001')
    expect(identity.primaryText).toBe('#70001')
    expect(identity.secondaryText).toBe('Pedido #70911')
  })

  it('prioritizes the iFood display id over pickup code', () => {
    const order = {
      id: 81234,
      app: 'ifood',
      otherInformations: JSON.stringify({
        ifood: {
          latest_event_type: 'PLACED',
          PLACED: {
            order: {
              id: 'ifood-order-1',
              displayId: '70002',
              delivery: {
                pickupCode: '0176',
              },
            },
          },
        },
      }),
    }

    const identity = resolveOrderIdentity(order)

    expect(identity.externalLabel).toBe('IFOOD')
    expect(identity.externalId).toBe('70002')
    expect(identity.primaryText).toBe('#70002')
    expect(identity.secondaryText).toBe('Pedido #81234')
  })
})
