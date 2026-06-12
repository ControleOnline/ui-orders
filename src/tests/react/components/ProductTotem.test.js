const React = require('react')
const renderer = require('react-test-renderer')
const {jest} = require('@jest/globals')

const {afterEach, beforeEach, describe, expect, it} = global
global.IS_REACT_ACT_ENVIRONMENT = true

const mockNavigate = jest.fn()
const mockReplaceProducts = jest.fn()
const mockSyncOrder = jest.fn()
const mockExecuteQueue = jest.fn(callback => Promise.resolve(callback()))
const mockUpdatedOrder = {
  id: 123,
  orderProducts: [{product: {id: 102}, quantity: 1}],
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
  },
  getters: {
    item: mockOrder,
  },
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
    mockExecuteQueue.mockClear()
    mockReplaceProducts.mockResolvedValue(mockUpdatedOrder)
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
    expect(mockSyncOrder).toHaveBeenCalledWith({
      id: 123,
      orderProducts: [{product: {id: 102}, quantity: 1}],
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
})
