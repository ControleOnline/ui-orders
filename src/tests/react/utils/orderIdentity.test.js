const {jest} = require('@jest/globals')
const {
  resolveOrderIdentity,
} = require('../../../react/utils/orderIdentity')

const {describe, expect, it} = global

global.t = {
  t: jest.fn((store, type, key) => {
    if (store === 'orders' && type === 'title' && key === 'table') {
      return 'Mesa'
    }

    if (store === 'orders' && type === 'title' && key === 'order') {
      return 'Pedido'
    }

    return ''
  }),
}

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
    expect(identity.secondaryText).toBe('#70911')
  })

  it('prioritizes the iFood pickup code over display id', () => {
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
    expect(identity.externalId).toBe('0176')
    expect(identity.primaryText).toBe('#0176')
    expect(identity.secondaryText).toBe('#81234')
  })

  it('prioritizes POS externalCode as the main order identity', () => {
    const order = {
      id: 71604,
      app: 'POS',
      externalCode: '570002',
    }

    const identity = resolveOrderIdentity(order)

    expect(identity.externalLabel).toBe('')
    expect(identity.externalId).toBe('570002')
    expect(identity.primaryText).toBe('Mesa #570002')
    expect(identity.secondaryText).toBe('#71604')
    expect(global.t.t).toHaveBeenCalledWith('orders', 'title', 'table')
  })

  it('uses only the hash-prefixed local id for non-marketplace orders', () => {
    const order = {
      id: 70700,
      app: 'shop',
    }

    const identity = resolveOrderIdentity(order)

    expect(identity.externalLabel).toBe('')
    expect(identity.externalId).toBe('')
    expect(identity.primaryText).toBe('#70700')
    expect(identity.secondaryText).toBe('')
  })
})
