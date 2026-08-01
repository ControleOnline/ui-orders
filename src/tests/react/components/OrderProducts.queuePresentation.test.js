const React = require('react')
const {renderToStaticMarkup} = require('react-dom/server')
const {jest} = require('@jest/globals')

const {afterEach, beforeEach, describe, expect, it} = global
let consoleErrorSpy

jest.mock('react-native', () => {
  const React = require('react')
  const createComponent = name => props =>
    React.createElement(name.toLowerCase(), props, props.children)

  return {
    Image: createComponent('Image'),
    Text: createComponent('Text'),
    View: createComponent('View'),
  }
})

jest.mock('@expo/vector-icons', () => {
  const React = require('react')
  return {
    MaterialCommunityIcons: props => React.createElement('i', props),
  }
}, {virtual: true})

jest.mock('@controleonline/../../src/styles/branding', () => ({
  withOpacity: color => color,
}))

jest.mock('../../../react/components/OrderProducts.styles', () => ({
  groupItemActions: {},
  groupItemContent: {},
  groupItemMainRow: {},
  groupItemMetaText: {},
  groupItemMetaWrap: {},
  groupItemPriceText: {},
  groupItemText: {},
  groupItemTitleRow: {},
  groupItemTitleText: {},
  groupTitle: {},
  groupTitlePill: {},
  groupWrap: {},
  independentChildGroup: {},
  independentChildrenWrap: {},
  itemActions: {},
  itemContent: {},
  itemLead: {},
  itemMainRow: {},
  itemRow: {},
  itemTitleRow: {},
  itemTitleText: {},
  itemThumbImage: {},
  itemThumbPlaceholder: {},
  itemThumbPlaceholderText: {},
  itemThumbWrap: {},
  metaWrap: {},
  priceRow: {},
  qtyText: {},
  queueBadge: {},
  queueBadgeDot: {},
  queueBadgeText: {},
  statusMarker: {},
  subText: {},
  text: {},
}))

jest.mock('../../../react/components/OrderProducts.utils', () => ({
  buildOrderProductCards: () => [
    {
      groups: [],
      itemColor: '#334155',
      key: 'card-1',
      name: 'Combo Alpha Produto Exemplo',
      description: 'Pao Frances (Com Parmesao)',
      observation: 'Sem cebola',
      quantity: 1,
      queuePresentation: {
        color: '#2563EB',
        label: 'Produto Exemplo Churrasco / Pronto para Retirar',
      },
      rootItem: {
        quantity: 1,
        product: {
          product: 'Combo Alpha Produto Exemplo',
        },
      },
      totalPrice: 0,
      unitPrice: 0,
    },
    {
      groups: [],
      itemColor: '#F59E0B',
      key: 'card-2',
      name: 'Mini Churros',
      description: '',
      observation: '',
      originGroup: {
        key: 'dessert',
        label: 'Sobremesa',
      },
      parentCardKey: 'card-1',
      quantity: 2,
      queuePresentation: {
        color: '#F59E0B',
        label: 'Fritadeira / Preparando',
      },
      rootItem: {
        id: 2,
        quantity: 2,
        product: {
          product: 'Mini Churros',
        },
      },
      totalPrice: 0,
      unitPrice: 0,
    },
  ],
  formatOrderProductQuantityPrefix: () => '',
  getOrderProductFiles: () => [],
  normalizeOrderProductQuantity: value => value,
}))

const OrderProducts = require('../../../react/components/OrderProducts').default

describe('OrderProducts queue presentation', () => {
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy?.mockRestore()
  })

  const renderTree = props => {
    return renderToStaticMarkup(
      React.createElement(OrderProducts, {
        orderProducts: [{id: 1}],
        showDetails: false,
        showImages: false,
        showPricing: false,
        showRootQuantityPrefix: false,
        ...props,
      }),
    )
  }

  it('shows queue presentation by default', () => {
    const html = renderTree()
    expect(html).toContain(
      'Produto Exemplo Churrasco / Pronto para Retirar',
    )
  })

  it('hides queue presentation when requested by the products display', () => {
    const html = renderTree({showQueuePresentation: false})
    expect(html).not.toContain(
      'Produto Exemplo Churrasco / Pronto para Retirar',
    )
  })

  it('renders prebuilt product cards when the presentation supplies them', () => {
    const html = renderTree({
      productCards: [
        {
          groups: [],
          itemColor: '#334155',
          key: 'operational-card',
          name: '4x consolidated visually',
          quantity: 4,
          rootItem: {id: 99, quantity: 4},
          totalPrice: 0,
          unitPrice: 0,
        },
      ],
    })

    expect(html).toContain('4x consolidated visually')
    expect(html).not.toContain('Combo Alpha Produto Exemplo')
  })

  it('hides descriptions independently from operational observations', () => {
    const html = renderTree({showDetails: true, showDescriptions: false})

    expect(html).not.toContain('Pao Frances (Com Parmesao)')
    expect(html).toContain('Obs: Sem cebola')
  })

  it('renders an operational child under its origin group without hiding its own queue', () => {
    const html = renderTree({showHierarchyGuides: true})

    expect(html).toContain('Sobremesa')
    expect(html).toContain('Mini Churros')
    expect(html).toContain('Fritadeira / Preparando')
    expect(html.indexOf('Combo Alpha Produto Exemplo')).toBeLessThan(
      html.indexOf('Sobremesa'),
    )
    expect(html.indexOf('Sobremesa')).toBeLessThan(html.indexOf('Mini Churros'))
  })

  it('uses a separate quantity column without status asterisks in compact displays', () => {
    const html = renderTree({
      compact: true,
      showGroupStatusMarker: false,
      showHierarchyGuides: true,
      showRootQuantityPrefix: true,
      showRootStatusMarker: false,
    })

    expect(html).toContain('<text></text>')
    expect(html).toContain('>2x </text>')
    expect(html).not.toContain('>1x</text>')
    expect(html).not.toContain('*')
  })
})
