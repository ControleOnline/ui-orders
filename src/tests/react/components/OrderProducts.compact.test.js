const React = require('react')
const renderer = require('react-test-renderer')
const { jest } = require('@jest/globals')

global.IS_REACT_ACT_ENVIRONMENT = true

jest.mock('react-native', () => {
  const React = require('react')
  const createComponent = name => props => React.createElement(name, props, props.children)

  return {
    Image: createComponent('Image'),
    StyleSheet: { create: value => value },
    Text: createComponent('Text'),
    View: createComponent('View'),
  }
})

jest.mock('@expo/vector-icons', () => {
  const React = require('react')
  return {
    MaterialCommunityIcons: props => React.createElement('MaterialCommunityIcons', props),
  }
}, { virtual: true })

jest.mock('@controleonline/../../src/styles/branding', () => ({
  withOpacity: color => color,
}))

jest.mock('@controleonline/ui-common/src/react/utils/fileUrl', () => ({
  resolveFileImageUrl: () => '',
}))

jest.mock('@controleonline/ui-common/src/utils/formatter', () => ({
  __esModule: true,
  default: { formatMoney: value => String(value) },
}))

const OrderProducts = require('../../../react/components/OrderProducts').default

const createCard = quantity => ({
  key: 'product:10',
  name: 'Maionese Verde - pote 60ml',
  quantity,
  rootItem: { id: 1, quantity, product: { id: 10, product: 'Maionese Verde - pote 60ml' } },
  groups: [],
  itemColor: '#0891B2',
})

const collectText = tree => tree.root
  .findAll(node => node.type === 'Text')
  .map(node => React.Children.toArray(node.props.children)
    .filter(value => typeof value === 'string' || typeof value === 'number')
    .join(''))

const findStatusBullets = tree => tree.root.findAll(node =>
  node.type === 'View' &&
  Array.isArray(node.props.style) &&
  node.props.style.some(style => style?.width === 9 && style?.height === 9),
)

const findOperationalLines = tree => tree.root.findAll(node =>
  node.type === 'View' &&
  Array.isArray(node.props.style) &&
  node.props.style.some(style =>
    style?.borderLeftWidth === 3 && style?.borderLeftColor !== 'transparent',
  ),
)

const findStatusBulletSpacers = tree => tree.root.findAll(node =>
  node.type === 'View' &&
  node.props.style?.width === 9 &&
  node.props.style?.flexShrink === 0 &&
  node.props.style?.height === undefined,
)

const findLinePlaceholders = tree => tree.root.findAll(node =>
  node.type === 'View' &&
  Array.isArray(node.props.style) &&
  node.props.style.some(style =>
    style?.borderLeftWidth === 3 && style?.borderLeftColor === 'transparent',
  ),
)

const findCompactQuantityColumns = tree => tree.root.findAll(node =>
  node.type === 'Text' &&
  Array.isArray(node.props.style) &&
  node.props.style.some(style =>
    style?.width === 25 && style?.textAlign === 'right',
  ),
)

describe('OrderProducts compact quantity', () => {
  it('hides 1x while preserving the compact quantity column', () => {
    let tree
    renderer.act(() => {
      tree = renderer.create(React.createElement(OrderProducts, {
        compact: true,
        productCards: [createCard(1)],
        showRootQuantityPrefix: true,
        showUnitQuantity: false,
        statusIndicatorMode: 'bullet',
        styles: {},
      }))
    })

    expect(collectText(tree)).not.toContain('1x ')
    expect(findCompactQuantityColumns(tree)).toHaveLength(1)
    expect(React.Children.toArray(
      findCompactQuantityColumns(tree)[0].props.children,
    ).join('')).toBe('')
  })

  it('shows 2x and can explicitly restore 1x', () => {
    let tree
    renderer.act(() => {
      tree = renderer.create(React.createElement(OrderProducts, {
        compact: true,
        productCards: [createCard(2)],
        showRootQuantityPrefix: true,
        showUnitQuantity: false,
        statusIndicatorMode: 'bullet',
        styles: {},
      }))
    })
    expect(collectText(tree)).toContain('2x ')
    expect(findCompactQuantityColumns(tree)).toHaveLength(1)

    renderer.act(() => {
      tree.update(React.createElement(OrderProducts, {
        compact: true,
        productCards: [createCard(1)],
        showRootQuantityPrefix: true,
        showUnitQuantity: true,
        statusIndicatorMode: 'bullet',
        styles: {},
      }))
    })
    expect(collectText(tree)).toContain('1x ')
  })

  it('uses the display as a global gate for group names', () => {
    const card = {
      ...createCard(1),
      groups: [{
        id: 'group:1',
        label: 'ESCOLHA SEU QUEIJO',
        customizationType: 'addition',
        showUnitQuantity: null,
        items: [{
          id: 'item:2',
          name: 'Catupiry Original',
          quantity: 1,
          isZero: false,
          itemColor: '#0891B2',
          groups: [],
        }],
      }],
    }
    let tree

    renderer.act(() => {
      tree = renderer.create(React.createElement(OrderProducts, {
        compact: true,
        productCards: [card],
        showGroupNames: false,
        styles: {},
      }))
    })
    expect(collectText(tree)).not.toContain('ESCOLHA SEU QUEIJO')

    renderer.act(() => {
      tree.update(React.createElement(OrderProducts, {
        compact: true,
        productCards: [card],
        showGroupNames: true,
        styles: {},
      }))
    })
    expect(collectText(tree)).toContain('ESCOLHA SEU QUEIJO')
  })

  it('aligns incorporated items with the parent name and leaves neutral markers empty', () => {
    const card = {
      ...createCard(1),
      groups: [{
        id: 'group:neutral',
        label: 'ACOMPANHAMENTOS',
        customizationType: 'neutral',
        items: [{
          id: 'item:neutral',
          name: 'Bacon',
          quantity: 1,
          isZero: false,
          groups: [],
        }],
      }],
    }
    let tree

    renderer.act(() => {
      tree = renderer.create(React.createElement(OrderProducts, {
        compact: true,
        productCards: [card],
        showRootQuantityPrefix: true,
        styles: {},
      }))
    })

    const compactGroupWraps = tree.root.findAll(node =>
      node.type === 'View' &&
      Array.isArray(node.props.style) &&
      node.props.style.flat(Infinity).some(style => style?.marginTop === 3) &&
      node.props.style.flat(Infinity).some(style => style?.paddingLeft === 26),
    )
    const semanticSpacers = tree.root.findAll(node =>
      node.type === 'View' &&
      node.props.style?.width === 14 &&
      node.props.style?.flexShrink === 0,
    )

    expect(compactGroupWraps).toHaveLength(1)
    expect(tree.root.findAllByType('MaterialCommunityIcons')).toHaveLength(0)
    expect(semanticSpacers).toHaveLength(1)
  })

  it('does not invent a queue indicator for a product without an operational queue', () => {
    let tree
    renderer.act(() => {
      tree = renderer.create(React.createElement(OrderProducts, {
        compact: true,
        productCards: [createCard(1)],
        statusIndicatorMode: 'bullet',
        styles: {},
      }))
    })
    expect(findStatusBullets(tree)).toHaveLength(0)
    expect(findStatusBulletSpacers(tree)).toHaveLength(1)

    renderer.act(() => {
      tree.update(React.createElement(OrderProducts, {
        compact: true,
        productCards: [createCard(1)],
        statusIndicatorMode: 'line',
        styles: {},
      }))
    })
    expect(findOperationalLines(tree)).toHaveLength(0)
    expect(findLinePlaceholders(tree)).toHaveLength(1)
  })

  it('keeps the configured queue indicator when the product has a queue status', () => {
    const queuedCard = {
      ...createCard(1),
      queuePresentation: {
        color: '#F97316',
        queue: {queue: {id: 5, queue: 'Fritadeira'}},
      },
    }
    let tree

    renderer.act(() => {
      tree = renderer.create(React.createElement(OrderProducts, {
        compact: true,
        productCards: [queuedCard],
        statusIndicatorMode: 'bullet',
        styles: {},
      }))
    })
    expect(findStatusBullets(tree)).toHaveLength(1)

    renderer.act(() => {
      tree.update(React.createElement(OrderProducts, {
        compact: true,
        productCards: [queuedCard],
        statusIndicatorMode: 'line',
        styles: {},
      }))
    })
    expect(findOperationalLines(tree)).toHaveLength(1)
  })

  it('shows the conference check only after the order product is checked', () => {
    const checkedCard = createCard(1)
    checkedCard.rootItem.status = {
      color: '#16A34A',
      realStatus: 'conferido',
      status: 'Conferido',
    }
    let tree

    renderer.act(() => {
      tree = renderer.create(React.createElement(OrderProducts, {
        compact: true,
        productCards: [checkedCard],
        showConferenceCheck: true,
        styles: {},
      }))
    })
    expect(collectText(tree)).toContain('✓ ')

    renderer.act(() => {
      tree.update(React.createElement(OrderProducts, {
        compact: true,
        productCards: [createCard(1)],
        showConferenceCheck: true,
        styles: {},
      }))
    })
    expect(collectText(tree)).not.toContain('✓ ')
  })
})
