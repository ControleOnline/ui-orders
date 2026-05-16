const {describe, expect, it} = global

const {
  resolveOrderLogisticsSnapshot,
} = require('../../../../../react/pages/orders/sales/orderLogisticsPresentation')

describe('orderLogisticsPresentation', () => {
  it('marks Uber logistics as store managed when the request is already created', () => {
    const snapshot = resolveOrderLogisticsSnapshot({
      id: 70002,
      addressOrigin: {
        number: 123,
        complement: 'Apto 10',
        street: {
          street: 'Rua Teste',
          district: {
            district: 'Centro',
            city: {
              city: 'Sao Paulo',
              state: {
                uf: 'SP',
                state: 'Sao Paulo',
              },
            },
          },
          cep: {
            cep: '01234567',
          },
        },
        latitude: -23.55,
        longitude: -46.63,
      },
      addressDestination: {
        number: 321,
        street: {
          street: 'Rua Cliente',
          district: {
            district: 'Bairro',
            city: {
              city: 'Sao Paulo',
              state: {
                uf: 'SP',
                state: 'Sao Paulo',
              },
            },
          },
          cep: {
            cep: '09876543',
          },
        },
      },
      retrieveContact: {
        alias: 'Loja Teste',
        phone: [
          {
            ddi: 55,
            ddd: 11,
            phone: 999999999,
          },
        ],
      },
      client: {
        alias: 'Marco',
        phone: [
          {
            ddi: 55,
            ddd: 11,
            phone: 988888888,
          },
        ],
      },
      otherInformations: {
        Uber: {
          requested_at: '2026-05-15 10:00:00',
          delivery_id: 'delivery_123',
          tracking_url: 'https://tracking.uber.com/order_123',
          rider_name: 'Joao',
          rider_phone: '+55 (11) 97777-7777',
          store_id: 'store_abc',
        },
      },
    })

    expect(snapshot.managedByStore).toBe(true)
    expect(snapshot.canRequestDriver).toBe(false)
    expect(snapshot.hasDriver).toBe(true)
    expect(snapshot.pickupAddressParts).toEqual(
      expect.objectContaining({
        primary: 'Rua Teste, 123',
      }),
    )
    expect(snapshot.pickupContact).toEqual(
      expect.objectContaining({
        name: 'Loja Teste',
      }),
    )
    expect(snapshot.dropoffContact).toEqual(
      expect.objectContaining({
        name: 'Marco',
      }),
    )
  })

  it('treats POS orders as store managed and builds front quote cards', () => {
    const snapshot = resolveOrderLogisticsSnapshot({
      id: 70003,
      app: 'POS',
      price: 120.5,
      addressOrigin: {
        number: 45,
        street: {
          street: 'Rua da Loja',
          district: {
            district: 'Centro',
            city: {
              city: 'Sao Paulo',
              state: {
                uf: 'SP',
                state: 'Sao Paulo',
              },
            },
          },
          cep: {
            cep: '01001000',
          },
        },
      },
      addressDestination: {
        number: 99,
        street: {
          street: 'Rua do Cliente',
          district: {
            district: 'Bairro',
            city: {
              city: 'Sao Paulo',
              state: {
                uf: 'SP',
                state: 'Sao Paulo',
              },
            },
          },
          cep: {
            cep: '02002000',
          },
        },
      },
    })

    expect(snapshot.managedByStore).toBe(true)
    expect(snapshot.management).toEqual(
      expect.objectContaining({
        mode: 'store',
        managedByStore: true,
      }),
    )
    expect(snapshot.integrations).toHaveLength(3)
    expect(snapshot.integrations.map(card => card.key)).toEqual(['uber', 'ifood', 'food99'])
    expect(snapshot.integrations.every(card => card.frontOnly)).toBe(true)
    expect(snapshot.integrations.every(card => typeof card.price === 'number')).toBe(true)
    expect(snapshot.canRequestDriver).toBe(true)
  })
})
