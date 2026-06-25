const {
  buildOrderProductCards,
  canReopenOrderProductCustomization,
  isOrderProductProductionCompleted,
  formatOrderProductQuantityPrefix,
  resolveOrderProductQueuePresentation,
} = require('../../../react/components/OrderProducts.utils')

const { describe, expect, it } = global

describe('OrderProducts.utils', () => {
  it('groups child components under the same parent card', () => {
    const cards = buildOrderProductCards([
      {
        id: 1,
        quantity: 2,
        total: 64,
        product: {
          id: 101,
          product: 'Pizza Grande',
          description: '8 fatias',
        },
        orderProductQueues: [
          {
            id: 10,
            updateTime: '2026-04-22T12:00:00Z',
            queue: { queue: 'Cozinha' },
            status: { status: 'Em preparo', realStatus: 'working', color: '#e67e22' },
          },
        ],
      },
      {
        id: 2,
        quantity: 1,
        product: { id: 201, product: 'Bacon' },
        productGroup: {
          id: 900,
          productGroup: 'Sabores',
          parentProduct: { id: 101, product: 'Pizza Grande' },
        },
      },
      {
        id: 3,
        quantity: 1,
        product: { id: 202, product: 'Catupiry' },
        productGroup: {
          id: 900,
          productGroup: 'Sabores',
          parentProduct: { id: 101, product: 'Pizza Grande' },
        },
      },
    ])

    expect(cards).toHaveLength(1)
    expect(cards[0].name).toBe('Pizza Grande')
    expect(cards[0].queuePresentation.label).toBe('Cozinha / Em preparo')
    expect(cards[0].groups).toHaveLength(1)
    expect(cards[0].groups[0].label).toBe('Sabores')
    expect(cards[0].groups[0].items.map(item => item.name)).toEqual(['Bacon', 'Catupiry'])
  })

  it('hides descriptions that only repeat the product name', () => {
    const cards = buildOrderProductCards([
      {
        id: 1,
        quantity: 1,
        product: {
          id: 101,
          product: 'Pizza',
          description: 'Pizza Grande 8 Pedaços',
        },
        orderProductComponents: [
          {
            id: 2,
            quantity: 1,
            product: {
              id: 29,
              product: 'Calabreza Fatiada',
              description: '  calabreza   fatiada ',
            },
            productGroup: {
              id: 900,
              productGroup: 'Sabores',
              parentProduct: { id: 101, product: 'Pizza' },
            },
          },
        ],
      },
    ])

    expect(cards[0].description).toBe('Pizza Grande 8 Pedaços')
    expect(cards[0].groups[0].items[0].description).toBe('')
  })

  it('hides the group title when showInDisplay is false without collapsing the bucket', () => {
    const cards = buildOrderProductCards([
      {
        id: 5,
        quantity: 1,
        total: 64,
        product: {
          id: 301,
          product: 'Alpha Gyros (Fraldinha)',
        },
        orderProductComponents: [
          {
            id: 6,
            quantity: 1,
            product: { id: 302, product: 'Queijo Mucarela' },
            productGroup: {
              id: 910,
              productGroup: 'Escolha seu queijo',
              showInDisplay: false,
              parentProduct: { id: 301, product: 'Alpha Gyros (Fraldinha)' },
            },
          },
          {
            id: 7,
            quantity: 1,
            product: { id: 303, product: 'Bacon' },
            productGroup: {
              id: 911,
              productGroup: 'Adicionais',
              showInDisplay: true,
              parentProduct: { id: 301, product: 'Alpha Gyros (Fraldinha)' },
            },
          },
        ],
      },
    ])

    expect(cards).toHaveLength(1)
    expect(cards[0].groups).toHaveLength(2)
    expect(cards[0].groups.map(group => group.label)).toEqual(['', 'Adicionais'])
    expect(cards[0].groups[0].items.map(item => item.name)).toEqual(['Queijo Mucarela'])
    expect(cards[0].groups[1].items.map(item => item.name)).toEqual(['Bacon'])
  })

  it('only shows quantity prefixes above one unit', () => {
    expect(formatOrderProductQuantityPrefix(1)).toBe('')
    expect(formatOrderProductQuantityPrefix(2)).toBe('2x ')
    expect(formatOrderProductQuantityPrefix(3)).toBe('3x ')
  })

  it('keeps hidden children out of the parent card while preserving them as standalone items', () => {
    const cards = buildOrderProductCards([
      {
        id: 1,
        quantity: 1,
        total: 73,
        product: {
          id: 101,
          product: 'Combo Alpha Gyros',
        },
        orderProductComponents: [
          {
            id: 2,
            quantity: 1,
            total: 0,
            product: {
              id: 201,
              product: 'Batata Frita Média',
            },
            showInParentQueue: false,
            orderProductQueues: [
              {
                id: 20,
                updateTime: '2026-04-22T12:00:00Z',
                queue: { queue: 'Gyros Fritadeira' },
                status: {
                  status: 'Pronto',
                  realStatus: 'out',
                  color: '#16A34A',
                },
              },
            ],
            productGroup: {
              id: 900,
              productGroup: 'Escolha sua batata',
              parentProduct: { id: 101, product: 'Combo Alpha Gyros' },
            },
          },
        ],
      },
      {
        id: 2,
        quantity: 1,
        total: 0,
        product: {
          id: 201,
          product: 'Batata Frita Média',
        },
        showInParentQueue: false,
        orderProduct: '/order_products/1',
        parentProduct: '/products/101',
        orderProductQueues: [
          {
            id: 21,
            updateTime: '2026-04-22T12:05:00Z',
            queue: { queue: 'Gyros Fritadeira' },
            status: {
              status: 'Pronto',
              realStatus: 'out',
              color: '#16A34A',
            },
          },
        ],
        productGroup: {
          id: 900,
          productGroup: 'Escolha sua batata',
          parentProduct: { id: 101, product: 'Combo Alpha Gyros' },
        },
      },
    ])

    expect(cards.map(card => card.name)).toEqual([
      'Combo Alpha Gyros',
      'Batata Frita Média',
    ])
    expect(cards[0].groups).toHaveLength(0)
    expect(cards[1].queuePresentation.label).toBe('Gyros Fritadeira / Pronto')
  })

  it('does not create fake parent cards from reused catalog product groups', () => {
    const cards = buildOrderProductCards([
      {
        id: 101372,
        quantity: 1,
        total: 73,
        product: {
          id: 1343,
          product: 'Combo Alpha Gyros',
        },
      },
      {
        id: 101373,
        quantity: 1,
        total: 0,
        product: {
          id: 1108,
          product: 'Batata Frita Média',
        },
        productGroup: {
          id: 194,
          productGroup: 'Escolha sua batata',
          parentProduct: {
            id: 1326,
            product: 'Combo Gyros (Batata + Bebida)',
          },
        },
      },
      {
        id: 101374,
        quantity: 1,
        total: 5.99,
        product: {
          id: 1112,
          product: 'Maionese Verde - pote 60ml',
        },
        productGroup: {
          id: 100,
          productGroup: 'Molhos extra à parte',
          parentProduct: {
            id: 1104,
            product: 'Alpha Gyros (Fraldinha)',
          },
        },
      },
      {
        id: 101375,
        quantity: 1,
        total: 0,
        product: {
          id: 1340,
          product: 'Sal',
        },
        productGroup: {
          id: 197,
          productGroup: 'Escolha o tempero da sua Batata',
          parentProduct: {
            id: 1326,
            product: 'Combo Gyros (Batata + Bebida)',
          },
        },
      },
    ])

    expect(cards.map(card => card.name)).toEqual([
      'Combo Alpha Gyros',
      'Batata Frita Média',
      'Maionese Verde - pote 60ml',
      'Sal',
    ])
    expect(cards.some(card => card.name === 'Alpha Gyros (Fraldinha)')).toBe(false)
    expect(cards.some(card => card.name === 'Combo Gyros (Batata + Bebida)')).toBe(false)
  })

  it('renders embedded orderProductComponents from the root item without collapsing them', () => {
    const cards = buildOrderProductCards([
      {
        id: 10,
        quantity: 1,
        total: 65.9,
        product: {
          id: 501,
          product: 'Combo Gyros',
          description: 'Batata + Bebida',
        },
        orderProductComponents: [
          {
            id: 11,
            quantity: 1,
            product: { id: 601, product: 'Batata Rustica' },
            productGroup: {
              id: 1000,
              productGroup: 'Acompanhamento',
            },
          },
          {
            id: 12,
            quantity: 1,
            product: { id: 602, product: 'Guarana Lata' },
            productGroup: {
              id: 1001,
              productGroup: 'Bebida',
            },
          },
        ],
      },
    ])

    expect(cards).toHaveLength(1)
    expect(cards[0].groups).toHaveLength(2)
    expect(cards[0].groups.map(group => group.label)).toEqual([
      'Acompanhamento',
      'Bebida',
    ])
    expect(cards[0].groups[0].items[0].name).toBe('Batata Rustica')
    expect(cards[0].groups[1].items[0].name).toBe('Guarana Lata')
  })

  it('hides duplicate root cards when the same component already appears inside its parent tree', () => {
    const cards = buildOrderProductCards([
      {
        id: 70,
        quantity: 1,
        total: 73,
        product: { id: 1101, product: 'Combo Alpha Gyros' },
        orderProductComponents: [
          {
            id: 71,
            quantity: 1,
            total: 0,
            product: { id: 1102, product: 'Batata Frita Media' },
            productGroup: {
              id: 1400,
              productGroup: 'Escolha sua Batata',
              parentProduct: { id: 1101, product: 'Combo Alpha Gyros' },
            },
            orderProductComponents: [
              {
                id: 72,
                quantity: 1,
                total: 0,
                product: { id: 1103, product: 'Paprica' },
                productGroup: {
                  id: 1401,
                  productGroup: 'Temperos',
                  parentProduct: { id: 1102, product: 'Batata Frita Media' },
                },
              },
              {
                id: 73,
                quantity: 1,
                total: 0,
                product: { id: 1104, product: 'Sal' },
                productGroup: {
                  id: 1401,
                  productGroup: 'Temperos',
                  parentProduct: { id: 1102, product: 'Batata Frita Media' },
                },
              },
              {
                id: 74,
                quantity: 1,
                total: 0,
                product: { id: 1105, product: 'Lemon Pepper' },
                productGroup: {
                  id: 1401,
                  productGroup: 'Temperos',
                  parentProduct: { id: 1102, product: 'Batata Frita Media' },
                },
              },
            ],
          },
        ],
      },
      {
        id: 71,
        quantity: 1,
        total: 0,
        product: { id: 1102, product: 'Batata Frita Media' },
        orderProduct: '/order_products/70',
        parentProduct: '/products/1101',
        productGroup: {
          id: 1400,
          productGroup: 'Escolha sua Batata',
          parentProduct: { id: 1101, product: 'Combo Alpha Gyros' },
        },
        orderProductComponents: [
          {
            id: 72,
            quantity: 1,
            total: 0,
            product: { id: 1103, product: 'Paprica' },
            orderProduct: '/order_products/71',
            parentProduct: '/products/1102',
            productGroup: {
              id: 1401,
              productGroup: 'Temperos',
              parentProduct: { id: 1102, product: 'Batata Frita Media' },
            },
          },
          {
            id: 73,
            quantity: 1,
            total: 0,
            product: { id: 1104, product: 'Sal' },
            orderProduct: '/order_products/71',
            parentProduct: '/products/1102',
            productGroup: {
              id: 1401,
              productGroup: 'Temperos',
              parentProduct: { id: 1102, product: 'Batata Frita Media' },
            },
          },
          {
            id: 74,
            quantity: 1,
            total: 0,
            product: { id: 1105, product: 'Lemon Pepper' },
            orderProduct: '/order_products/71',
            parentProduct: '/products/1102',
            productGroup: {
              id: 1401,
              productGroup: 'Temperos',
              parentProduct: { id: 1102, product: 'Batata Frita Media' },
            },
          },
        ],
      },
      {
        id: 72,
        quantity: 1,
        total: 0,
        product: { id: 1103, product: 'Paprica' },
        orderProduct: '/order_products/71',
        parentProduct: '/products/1102',
        productGroup: {
          id: 1401,
          productGroup: 'Temperos',
          parentProduct: { id: 1102, product: 'Batata Frita Media' },
        },
      },
      {
        id: 73,
        quantity: 1,
        total: 0,
        product: { id: 1104, product: 'Sal' },
        orderProduct: '/order_products/71',
        parentProduct: '/products/1102',
        productGroup: {
          id: 1401,
          productGroup: 'Temperos',
          parentProduct: { id: 1102, product: 'Batata Frita Media' },
        },
      },
      {
        id: 74,
        quantity: 1,
        total: 0,
        product: { id: 1105, product: 'Lemon Pepper' },
        orderProduct: '/order_products/71',
        parentProduct: '/products/1102',
        productGroup: {
          id: 1401,
          productGroup: 'Temperos',
          parentProduct: { id: 1102, product: 'Batata Frita Media' },
        },
      },
    ])

    expect(cards.map(card => card.name)).toEqual(['Combo Alpha Gyros'])
    expect(cards[0].groups).toHaveLength(1)
    expect(cards[0].groups[0].items.map(item => item.name)).toEqual([
      'Batata Frita Media',
    ])
    expect(cards[0].groups[0].items[0].groups).toHaveLength(1)
    expect(cards[0].groups[0].items[0].groups[0].items.map(item => item.name)).toEqual([
      'Paprica',
      'Sal',
      'Lemon Pepper',
    ])
    expect(cards.some(card => card.name === 'Batata Frita Media')).toBe(false)
    expect(cards.some(card => card.name === 'Paprica')).toBe(false)
    expect(cards.some(card => card.name === 'Sal')).toBe(false)
    expect(cards.some(card => card.name === 'Lemon Pepper')).toBe(false)
  })

  it('keeps nested embedded components visible as regular group items', () => {
    const cards = buildOrderProductCards([
      {
        id: 20,
        quantity: 1,
        total: 32,
        product: {
          id: 701,
          product: 'Hamburguer Especial',
        },
        orderProductComponents: [
          {
            id: 21,
            quantity: 1,
            product: { id: 702, product: 'Queijo' },
            productGroup: {
              id: 1002,
              productGroup: 'Complementos',
            },
            orderProductComponents: [
              {
                id: 22,
                quantity: 1,
                product: { id: 703, product: 'Cebola Roxa' },
              },
            ],
          },
        ],
      },
    ])

    expect(cards).toHaveLength(1)
    expect(cards[0].groups).toHaveLength(1)
    expect(cards[0].groups[0].label).toBe('Complementos')
    expect(cards[0].groups[0].items.map(item => item.name)).toEqual(['Queijo'])
    expect(cards[0].groups[0].items[0].groups).toHaveLength(1)
    expect(cards[0].groups[0].items[0].groups[0].label).toBe('Outros')
    expect(cards[0].groups[0].items[0].groups[0].items.map(item => item.name)).toEqual([
      'Cebola Roxa',
    ])
    expect(cards[0].groups[0].items[0].groups[0].items[0].isZero).toBe(false)
  })

  it('keeps three-level local components under the root order item', () => {
    const cards = buildOrderProductCards([
      {
        id: 40,
        quantity: 1,
        total: 63,
        product: { id: 901, product: 'Combo Beta Gyros' },
      },
      {
        id: 41,
        quantity: 1,
        product: { id: 902, product: 'Batata Frita Media' },
        orderProduct: '/order_products/40',
        parentProduct: '/products/901',
        productGroup: {
          id: 1200,
          productGroup: 'Escolha sua Batata',
        },
      },
      {
        id: 42,
        quantity: 1,
        product: { id: 903, product: 'Sal' },
        orderProduct: '/order_products/41',
        parentProduct: '/products/902',
        productGroup: {
          id: 1201,
          productGroup: 'Escolha o tempero da sua Batata',
        },
      },
    ])

    expect(cards).toHaveLength(1)
    expect(cards[0].name).toBe('Combo Beta Gyros')
    expect(cards[0].groups.map(group => group.label)).toEqual(['Escolha sua Batata'])
    expect(cards[0].groups[0].items.map(item => item.name)).toEqual([
      'Batata Frita Media',
    ])
    expect(cards[0].groups[0].items[0].groups).toHaveLength(1)
    expect(cards[0].groups[0].items[0].groups[0].label).toBe(
      'Escolha o tempero da sua Batata',
    )
    expect(cards[0].groups[0].items[0].groups[0].items.map(item => item.name)).toEqual(['Sal'])
    expect(cards[0].groups[0].items[0].groups[0].items[0].isZero).toBe(false)
  })

  it('keeps revisited grouped items from leaking their nested components into sibling groups', () => {
    const cards = buildOrderProductCards([
      {
        id: 60,
        quantity: 1,
        total: 69.99,
        product: { id: 1001, product: 'Combo Gamma Gyros' },
        orderProductComponents: [
          {
            id: 61,
            quantity: 1,
            product: { id: 1002, product: 'Batata Frita Média' },
            productGroup: {
              id: 1300,
              productGroup: 'Escolha sua Batata',
            },
          },
          {
            id: 64,
            quantity: 1,
            product: { id: 1005, product: 'Fanta Laranja lata 350 ml' },
            productGroup: {
              id: 1303,
              productGroup: 'Escolha sua Bebida',
            },
          },
        ],
      },
      {
        id: 61,
        quantity: 1,
        product: { id: 1002, product: 'Batata Frita Média' },
        orderProduct: '/order_products/60',
        parentProduct: '/products/1001',
        productGroup: {
          id: 1300,
          productGroup: 'Escolha sua Batata',
        },
        orderProductComponents: [
          {
            id: 62,
            quantity: 1,
            product: { id: 1003, product: 'Maionese da Casa - pote 60ml' },
            productGroup: {
              id: 1301,
              productGroup: 'Molhos extra à parte',
            },
          },
          {
            id: 63,
            quantity: 1,
            product: { id: 1004, product: 'Sal' },
            productGroup: {
              id: 1302,
              productGroup: 'Escolha o tempero da sua Batata',
            },
          },
        ],
      },
      {
        id: 64,
        quantity: 1,
        product: { id: 1005, product: 'Fanta Laranja lata 350 ml' },
        orderProduct: '/order_products/60',
        parentProduct: '/products/1001',
        productGroup: {
          id: 1303,
          productGroup: 'Escolha sua Bebida',
        },
      },
    ])

    expect(cards).toHaveLength(1)
    expect(cards[0].groups.map(group => group.label)).toEqual([
      'Escolha sua Batata',
      'Escolha sua Bebida',
    ])
    expect(cards[0].groups[0].items[0].groups.map(group => group.label)).toEqual([
      'Molhos extra à parte',
      'Escolha o tempero da sua Batata',
    ])
    expect(cards[0].groups[0].items[0].groups[0].items.map(item => item.name)).toEqual([
      'Maionese da Casa - pote 60ml',
    ])
    expect(cards[0].groups[1].items[0].groups).toHaveLength(0)
  })

  it('hides zero-value duplicate root cards for components already shown inside a combo', () => {
    const cards = buildOrderProductCards([
      {
        id: 50,
        quantity: 1,
        total: 63,
        product: { id: 951, product: 'Combo Beta Gyros' },
      },
      {
        id: 51,
        quantity: 1,
        product: { id: 952, product: 'Batata Frita Media' },
        orderProduct: '/order_products/50',
        parentProduct: '/products/951',
        productGroup: {
          id: 1250,
          productGroup: 'Escolha sua Batata',
        },
      },
      {
        id: 52,
        quantity: 1,
        price: 0,
        total: 0,
        product: { id: 952, product: 'Batata Frita Media' },
      },
      {
        id: 53,
        quantity: 1,
        product: { id: 953, product: 'Sal' },
        orderProduct: '/order_products/52',
        parentProduct: '/products/952',
        productGroup: {
          id: 1251,
          productGroup: 'Escolha o tempero da sua Batata',
        },
      },
    ])

    expect(cards).toHaveLength(1)
    expect(cards[0].name).toBe('Combo Beta Gyros')
    expect(cards[0].groups.map(group => group.label)).toEqual(['Escolha sua Batata'])
    expect(cards[0].groups[0].items.map(item => item.name)).toEqual([
      'Batata Frita Media',
    ])
    expect(cards[0].groups[0].items[0].groups).toHaveLength(1)
    expect(cards[0].groups[0].items[0].groups[0].label).toBe(
      'Escolha o tempero da sua Batata',
    )
    expect(cards[0].groups[0].items[0].groups[0].items.map(item => item.name)).toEqual(['Sal'])
    expect(cards[0].groups[0].items[0].groups[0].items[0].isZero).toBe(false)
  })

  it('hydrates embedded component IRIs from sibling collection items', () => {
    const cards = buildOrderProductCards([
      {
        id: 30,
        quantity: 1,
        total: 65.9,
        product: {
          id: 801,
          type: 'custom',
          product: 'Combo Gyros',
        },
        orderProductComponents: [
          '/order_products/31',
          '/order_products/32',
        ],
      },
      {
        id: 31,
        quantity: 1,
        product: { id: 802, product: 'Alpha Gyros' },
        orderProduct: '/order_products/30',
        parentProduct: '/products/801',
        productGroup: {
          id: 1100,
          productGroup: 'Escolha seu Gyros',
        },
      },
      {
        id: 32,
        quantity: 1,
        product: { id: 803, product: 'Coca-Cola lata 350 ml' },
        orderProduct: '/order_products/30',
        parentProduct: '/products/801',
        productGroup: {
          id: 1101,
          productGroup: 'Escolha sua Bebida',
        },
      },
    ])

    expect(cards).toHaveLength(1)
    expect(cards[0].groups).toHaveLength(2)
    expect(cards[0].groups.map(group => group.label)).toEqual([
      'Escolha seu Gyros',
      'Escolha sua Bebida',
    ])
    expect(cards[0].groups[0].items[0].name).toBe('Alpha Gyros')
    expect(cards[0].groups[1].items[0].name).toBe('Coca-Cola lata 350 ml')
  })

  it('uses the most recent queue status as the current preparation stage', () => {
    const presentation = resolveOrderProductQueuePresentation({
      id: 99,
      product: { id: 301, product: 'Lanche Custom' },
      orderProductQueues: [
        {
          id: 1001,
          updateTime: '2026-04-22T12:00:00Z',
          queue: { queue: 'Cozinha' },
          status: { status: 'Em preparo', realStatus: 'working', color: '#e67e22' },
        },
        {
          id: 1002,
          updateTime: '2026-04-22T12:05:00Z',
          queue: { queue: 'Expedicao' },
          status: { status: 'Pronto', realStatus: 'out', color: '#16A34A' },
        },
      ],
    })

    expect(presentation.label).toBe('Expedicao / Pronto')
    expect(presentation.statusLabel).toBe('Pronto')
    expect(presentation.color).toBe('#16A34A')
  })

  it('allows reopening customization before the final production stage', () => {
    expect(
      canReopenOrderProductCustomization({
        id: 77,
        product: { id: 400, type: 'custom', product: 'Hamburguer' },
        orderProductQueues: [
          {
            id: 88,
            queue: { queue: 'Cozinha' },
            status: { status: 'Fila', realStatus: 'in', color: '#0EA5E9' },
          },
        ],
      }),
    ).toBe(true)
  })

  it('blocks customization when the item already reached the final queue stage', () => {
    const finalizedOrderProduct = {
      id: 78,
      product: { id: 401, type: 'custom', product: 'Hamburguer' },
      orderProductQueues: [
        {
          id: 89,
          queue: { queue: 'Expedicao' },
          status: { status: 'Pronto', realStatus: 'out', color: '#16A34A' },
        },
      ],
    }

    expect(isOrderProductProductionCompleted(finalizedOrderProduct)).toBe(true)
    expect(canReopenOrderProductCustomization(finalizedOrderProduct)).toBe(false)
  })
})
