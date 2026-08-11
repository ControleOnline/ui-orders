const React = require('react')
const renderer = require('react-test-renderer')
const {jest} = require('@jest/globals')

const {afterEach, beforeEach, describe, expect, it} = global
global.IS_REACT_ACT_ENVIRONMENT = true

const mockNavigate = jest.fn()
const mockReplaceProducts = jest.fn()
const mockSyncOrder = jest.fn()
const mockSyncOrderProducts = jest.fn()
const mockGetOrderProducts = jest.fn()
const mockExecuteQueue = jest.fn(callback => Promise.resolve(callback()))
const mockUpdatedOrder = {
  id: 123,
}
const mockMaterializedOrder = {
  ...mockUpdatedOrder,
  orderProducts: [{product: {id: 102}, quantity: 1}],
  price: 8.9,
}
const mockOrder = {
  id: 123,
  orderProducts: [],
}

const mockOrdersStore = {
  actions: {
    executeQueue: mockExecuteQueue,
    replaceProducts: mockReplaceProducts,
    syncOrder: mockSyncOrder,
    syncOrderProducts: mockSyncOrderProducts,
  },
  getters: {
    item: mockOrder,
  },
}

const mockOrderProductsStore = {
  actions: {
    getItems: mockGetOrderProducts,
  },
  getters: {},
}

jest.mock('react-native', () => {
  const React = require('react')
  const createComponent = name => props =>
    React.createElement(name, props, props.children)

  return {
    Text: createComponent('Text'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    View: createComponent('View'),
  }
})

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}))

jest.mock('@store', () => ({
  useStore: jest.fn(name => {
    if (name === 'orders') {
      return mockOrdersStore
    }

    if (name === 'order_products') {
      return mockOrderProductsStore
    }

    return {
      actions: {},
      getters: {},
    }
  }),
}))

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon')

const ProductTotem =
  require('../../../react/components/cart/ProductTotem').default

describe('ProductTotem', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockReplaceProducts.mockClear()
    mockSyncOrder.mockClear()
    mockSyncOrderProducts.mockClear()
    mockGetOrderProducts.mockClear()
    mockExecuteQueue.mockClear()
    mockReplaceProducts.mockResolvedValue(mockUpdatedOrder)
    mockGetOrderProducts.mockResolvedValue(mockMaterializedOrder.orderProducts)
    mockSyncOrderProducts.mockReturnValue(mockMaterializedOrder)
  })

  afterEach(() => {
    mockNavigate.mockClear()
  })

  it('abre o checkout depois de selecionar o produto no modo single item', async () => {
    const product = {
      id: 102,
      product: 'Suco',
    }

    let tree
    await renderer.act(async () => {
      tree = renderer.create(
        React.createElement(ProductTotem, {
          product,
          singleItemMode: true,
        }),
      )
    })

    const button = tree.root.findByType('TouchableOpacity')

    await renderer.act(async () => {
      await button.props.onPress()
    })

    expect(mockExecuteQueue).toHaveBeenCalledTimes(1)
    expect(mockReplaceProducts).toHaveBeenCalledWith('123', [
      {product: '102', quantity: 1},
    ])
    expect(mockSyncOrder).toHaveBeenCalledWith({id: 123})
    expect(mockGetOrderProducts).toHaveBeenCalledWith({
      'order.id': 123,
      itemsPerPage: 50,
      page: 1,
    })
    expect(mockSyncOrderProducts).toHaveBeenCalledWith({
      orderId: 123,
      orderProducts: mockMaterializedOrder.orderProducts,
    })
    expect(mockNavigate).toHaveBeenCalledWith(
      'Checkout',
      expect.objectContaining({
        id: '123',
        interactionMode: 'pdv',
        showBottomCart: false,
        showBottomToolBar: true,
      }),
    )
  })

  it('permite que o card inteiro use a mesma selecao unitaria', async () => {
    const renderCard = jest.fn(({isSelected}) =>
      React.createElement('SingleItemCard', {isSelected}),
    )

    let tree
    await renderer.act(async () => {
      tree = renderer.create(
        React.createElement(ProductTotem, {
          accessibilityLabel: 'Caminhonetas',
          children: renderCard,
          product: {id: 102, product: 'Caminhonetas'},
          singleItemMode: true,
        }),
      )
    })

    const button = tree.root.findByType('TouchableOpacity')
    expect(button.props.accessibilityLabel).toBe('Caminhonetas')
    expect(button.props.accessibilityRole).toBe('radio')
    expect(button.props.accessibilityState.checked).toBe(false)
    expect(renderCard).toHaveBeenCalledWith({
      isSavingSelection: false,
      isSelected: false,
    })

    await renderer.act(async () => {
      await button.props.onPress()
    })

    expect(mockReplaceProducts).toHaveBeenCalledWith('123', [
      {product: '102', quantity: 1},
    ])
    expect(mockNavigate).toHaveBeenCalledWith(
      'Checkout',
      expect.objectContaining({id: '123'}),
    )
  })
})
