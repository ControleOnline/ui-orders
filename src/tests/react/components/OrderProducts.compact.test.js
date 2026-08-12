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
  withOpacity: (color, opacity) => `${color}:${opacity}`,
}))

jest.mock('@controleonline/ui-common/src/react/utils/fileUrl', () => ({
  resolveFileImageUrl: () => '',
}))

jest.mock('@controleonline/ui-common/src/utils/formatter', () => ({
  __esModule: true,
  default: { formatMoney: value => String(value) },
}))

const {
  default: OrderProducts,
  resolveOrderProductHierarchyIndent,
  resolveOrderProductImageSize,
} = require('../../../react/components/OrderProducts')

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
  it('uses bounded indentation and progressively smaller images by depth', () => {
    expect([
      resolveOrderProductImageSize(0),
      resolveOrderProductImageSize(1),
      resolveOrderProductImageSize(2),
      resolveOrderProductImageSize(8),
    ]).toEqual([56, 42, 34, 34])
    expect([
      resolveOrderProductImageSize(0, true),
      resolveOrderProductImageSize(1, true),
      resolveOrderProductImageSize(2, true),
      resolveOrderProductImageSize(8, true),
    ]).toEqual([48, 32, 26, 26])
    expect([
      resolveOrderProductHierarchyIndent(1, true),
      resolveOrderProductHierarchyIndent(2, true),
      resolveOrderProductHierarchyIndent(8, true),
    ]).toEqual([12, 24, 36])
    expect([
      resolveOrderProductHierarchyIndent(1, true, true),
      resolveOrderProductHierarchyIndent(2, true, true),
      resolveOrderProductHierarchyIndent(8, true, true),
    ]).toEqual([10, 20, 30])
  })

  it('renders consolidated quantities at every visual tree level', () => {
    const root = {...createCard(2), key: 'root'}
    const child = {
      ...createCard(2),
      key: 'child',
      name: 'Batata Frita Media',
      parentCardKey: 'root',
    }
    const grandchild = {
      ...createCard(4),
      key: 'grandchild',
      name: 'Molho degustacao',
      parentCardKey: 'child',
    }
    let tree

    renderer.act(() => {
      tree = renderer.create(React.createElement(OrderProducts, {
        compact: true,
        compactTree: true,
        productCards: [root, child, grandchild],
        showHierarchyGuides: true,
        showImages: true,
        showRootQuantityPrefix: true,
        styles: {},
      }))
    })

    const imageSizes = tree.root.findAll(node =>
      node.type === 'View' &&
      String(node.props.accessibilityLabel || '').startsWith('Imagem de '),
    ).map(node => node.props.style.flat(Infinity).at(-1)?.width)

    expect(imageSizes).toEqual([48, 32, 26])
    expect(tree.root.findByProps({
      accessibilityLabel: 'Quantidade 2 de Maionese Verde - pote 60ml',
    })).toBeTruthy()
    expect(tree.root.findByProps({
      accessibilityLabel: 'Quantidade 2 de Batata Frita Media',
    })).toBeTruthy()
    expect(tree.root.findByProps({
      accessibilityLabel: 'Quantidade 4 de Molho degustacao',
    })).toBeTruthy()
    expect(findCompactQuantityColumns(tree)).toHaveLength(0)
  })

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

  it('renders incorporated items as compact semantic lines', () => {
    const card = {
      ...createCard(1),
      groups: [{
        id: 'group:addition',
        label: 'ADICIONAIS',
        customizationType: 'addition',
        items: [{
          id: 'item:addition',
          name: 'Catupiry Original',
          description: 'Descricao que nao deve ocupar espaco',
          quantity: 1,
          isZero: false,
          groups: [],
        }],
      }, {
        id: 'group:neutral',
        label: 'ACOMPANHAMENTOS',
        customizationType: 'neutral',
        items: [{
          id: 'item:neutral',
          name: 'Pao Frances',
          quantity: 1,
          isZero: false,
          groups: [],
        }],
      }],
    }
    let tree

    renderer.act(() => {
      tree = renderer.create(React.createElement(OrderProducts, {
        compactTree: true,
        productCards: [card],
        showDescriptions: true,
        showGroupNames: true,
        showGroupStatusMarker: true,
        showRootStatusMarker: true,
        showUnitQuantity: true,
        styles: {},
      }))
    })

    expect(collectText(tree)).not.toContain('ADICIONAIS')
    expect(collectText(tree)).not.toContain('ACOMPANHAMENTOS')
    expect(collectText(tree)).not.toContain('Descricao que nao deve ocupar espaco')
    expect(collectText(tree)).not.toContain('1x ')
    expect(collectText(tree)).not.toContain('* ')
    expect(collectText(tree)).not.toContain('=')
    expect(tree.root.findAllByType('MaterialCommunityIcons')).toHaveLength(1)
  })

  it('shows positive incorporated prices without exposing row actions', () => {
    const card = {
      ...createCard(1),
      groups: [{
        id: 'group:prices',
        label: 'ADICIONAIS',
        customizationType: 'addition',
        items: [{
          id: 'item:paid',
          name: 'Catupiry Original',
          quantity: 1,
          totalPrice: 8.99,
          isZero: false,
          groups: [],
        }, {
          id: 'item:free',
          name: 'Molho brinde',
          quantity: 1,
          totalPrice: 0,
          isZero: false,
          groups: [],
        }],
      }],
    }
    let tree

    renderer.act(() => {
      tree = renderer.create(React.createElement(OrderProducts, {
        compactTree: true,
        productCards: [card],
        renderActions: ({entry}) => entry?.name === 'Catupiry Original'
          ? React.createElement('View', {accessibilityLabel: 'Acao Catupiry'})
          : null,
        showPricing: true,
        styles: {},
      }))
    })

    expect(collectText(tree)).toContain('8.99')
    expect(collectText(tree)).not.toContain('0')
    expect(tree.root.findAllByProps({accessibilityLabel: 'Acao Catupiry'})).toHaveLength(0)
  })

  it('renders one tonal family with progressively lighter hierarchy layers', () => {
    const root = {...createCard(1), key: 'root'}
    const child = {
      ...createCard(1),
      key: 'child',
      parentCardKey: 'root',
    }
    const grandchild = {
      ...createCard(1),
      key: 'grandchild',
      parentCardKey: 'child',
    }
    let tree

    renderer.act(() => {
      tree = renderer.create(React.createElement(OrderProducts, {
        compactTree: true,
        hierarchyGuideColor: '#00AACC',
        hierarchySurfaceColor: '#FFFFFF',
        productCards: [root, child, grandchild],
        showHierarchyGuides: true,
        styles: {},
      }))
    })

    const styledViews = tree.root.findAll(node =>
      node.type === 'View' && Array.isArray(node.props.style),
    )
    const hasStyleValue = value => styledViews.some(node =>
      node.props.style.flat(Infinity).some(style => style?.backgroundColor === value),
    )

    expect(hasStyleValue('#00AACC:0.08')).toBe(true)
    expect(hasStyleValue('#00AACC:0.14')).toBe(true)
    expect(hasStyleValue('#00AACC:0.06')).toBe(true)
    expect(hasStyleValue('#FFFFFF')).toBe(true)
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
