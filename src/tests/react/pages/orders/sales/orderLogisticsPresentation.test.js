const {describe, expect, it} = global

const {
  resolveOrderLogisticsSnapshot,
} = require('../../../../../react/pages/orders/sales/orderLogisticsPresentation')

describe('orderLogisticsPresentation', () => {
  it('normalizes quote payloads and keeps only real prices when they are ready', () => {
    const snapshot = resolveOrderLogisticsSnapshot({
      order: {
        id: 71103,
        app: 'POS',
        price: 120.5,
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
        deliveryContact: {
          alias: 'Marco',
          phone: [
            {
              ddi: 55,
              ddd: 11,
              phone: 988888888,
            },
          ],
        },
      },
      route: {
        pickupAddress: {
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
        },
        dropoffAddress: {
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
        pickupContact: {
          alias: 'Loja Teste',
          phone: [
            {
              ddi: 55,
              ddd: 11,
              phone: 999999999,
            },
          ],
        },
        dropoffContact: {
          alias: 'Marco',
          phone: [
            {
              ddi: 55,
              ddd: 11,
              phone: 988888888,
            },
          ],
        },
      },
      providers: [
        {
          key: 'ifood',
          label: 'iFood',
          connected: true,
          online: true,
        },
        {
          key: 'uber',
          label: 'Uber',
          connected: true,
          online: true,
        },
      ],
      quotes: [
        {
          id: 801,
          mainOrderId: 71103,
          orderType: 'delivery',
          app: 'iFood',
          providerKey: 'ifood',
          providerLabel: 'iFood',
          price: 14.66,
          eta: '20 - 30 min',
          quoteState: 'ready',
          requestable: true,
        },
        {
          id: 802,
          mainOrderId: 71103,
          orderType: 'delivery',
          app: 'Uber',
          providerKey: 'uber',
          providerLabel: 'Uber',
          price: null,
          eta: null,
          quoteState: 'pending',
          requestable: false,
        },
      ],
      selection: {
        quoteOrderId: 801,
        providerKey: 'ifood',
        price: 14.66,
        trackingUrl: 'https://tracking.ifood.com/quote/801',
        selectedAt: '2026-05-16 10:00:00',
      },
      quoteStatus: {
        providers: 2,
        quotes: 2,
        ready: 1,
        pending: 1,
        selected: 1,
        unavailable: 0,
        error: 0,
      },
      management: {
        mode: 'quote',
        managedByStore: true,
        label: 'Cotacoes da loja',
        source: 'POS',
        mainOrderId: 71103,
      },
    })

    expect(snapshot.canQuote).toBe(true)
    expect(snapshot.providers).toHaveLength(2)
    expect(snapshot.quotes).toHaveLength(2)
    expect(snapshot.quotes[0]).toEqual(
      expect.objectContaining({
        providerKey: 'ifood',
        price: 14.66,
        quoteState: 'ready',
        requestable: true,
      }),
    )
    expect(snapshot.quotes[1]).toEqual(
      expect.objectContaining({
        providerKey: 'uber',
        price: null,
        quoteState: 'pending',
        requestable: false,
      }),
    )
    expect(snapshot.selection).toEqual(
      expect.objectContaining({
        quoteOrderId: 801,
        providerKey: 'ifood',
        price: 14.66,
        trackingUrl: 'https://tracking.ifood.com/quote/801',
      }),
    )
    expect(snapshot.quoteStatus).toEqual(
      expect.objectContaining({
        providers: 2,
        quotes: 2,
        ready: 1,
        selected: 1,
      }),
    )
    expect(snapshot.pickupAddressParts).toEqual(
      expect.objectContaining({
        primary: 'Rua Teste, 123',
      }),
    )
    expect(snapshot.dropoffContact).toEqual(
      expect.objectContaining({
        name: 'Marco',
      }),
    )
  })

  it('keeps a safe empty quote snapshot when only the order exists', () => {
    const snapshot = resolveOrderLogisticsSnapshot({
      order: {
        id: 71104,
        app: 'POS',
      },
    })

    expect(snapshot.canQuote).toBe(false)
    expect(snapshot.quotes).toEqual([])
    expect(snapshot.providers).toEqual([])
    expect(snapshot.quoteStatus).toEqual(
      expect.objectContaining({
        providers: 0,
        quotes: 0,
        pending: 0,
      }),
    )
  })

  it('matches the selected quote even when the ids arrive as strings', () => {
    const snapshot = resolveOrderLogisticsSnapshot({
      order: {
        id: 71105,
        app: 'POS',
      },
      providers: [
        {
          key: 'ifood',
          label: 'iFood',
          connected: true,
          online: true,
        },
      ],
      quotes: [
        {
          id: 801,
          providerKey: 'ifood',
          providerLabel: 'iFood',
          price: 14.66,
          quoteState: 'selected',
          requestable: false,
        },
      ],
      selection: {
        quoteOrderId: '801',
        providerKey: 'ifood',
        price: '14.66',
        trackingUrl: 'https://tracking.ifood.com/quote/801',
        selectedAt: '2026-05-16 10:00:00',
      },
    })

    expect(snapshot.currentIntegration).toEqual(
      expect.objectContaining({
        providerKey: 'ifood',
        price: 14.66,
        selected: true,
      }),
    )
    expect(snapshot.selection).toEqual(
      expect.objectContaining({
        quoteOrderId: '801',
        price: 14.66,
      }),
    )
  })
})
