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
  groupTitle: {},
  groupTitlePill: {},
  groupWrap: {},
  itemActions: {},
  itemContent: {},
  itemLead: {},
  itemMainRow: {},
  itemRow: {},
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
        product: {
          product: 'Combo Alpha Produto Exemplo',
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

  it('hides descriptions independently from operational observations', () => {
    const html = renderTree({showDetails: true, showDescriptions: false})

    expect(html).not.toContain('Pao Frances (Com Parmesao)')
    expect(html).toContain('Obs: Sem cebola')
  })
})
