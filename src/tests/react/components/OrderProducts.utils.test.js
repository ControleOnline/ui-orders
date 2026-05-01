const {
  buildOrderProductCards,
  canReopenOrderProductCustomization,
  isOrderProductProductionCompleted,
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
            status: { status: 'Em preparo', realStatus: 'working', color: '#F59E0B' },
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

  it('keeps nested embedded removals visible as group items', () => {
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
    expect(cards[0].groups[0].items.map(item => item.name)).toEqual([
      'Queijo',
      'Cebola Roxa',
    ])
    expect(cards[0].groups[0].items[1].isZero).toBe(true)
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
          status: { status: 'Em preparo', realStatus: 'working', color: '#F59E0B' },
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
