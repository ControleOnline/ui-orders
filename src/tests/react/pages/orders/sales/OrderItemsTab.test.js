const React = require('react')
const renderer = require('react-test-renderer')
const {jest} = require('@jest/globals')

const {act} = renderer
const {beforeEach, describe, expect, it} = global
global.IS_REACT_ACT_ENVIRONMENT = true

const mockOrderProductsRender = jest.fn(() => null)
const mockUseStore = jest.fn()

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Image: 'Image',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  useWindowDimensions: () => ({height: 800, width: 400}),
}))

jest.mock('@store', () => ({
  useStore: (...args) => mockUseStore(...args),
}))

jest.mock('@controleonline/ui-orders/src/react/css/orders', () => () => ({
  styles: {
    itemsSection: {},
  },
}))

jest.mock('@controleonline/ui-orders/src/react/components/OrderProducts', () =>
  props => mockOrderProductsRender(props),
)

jest.mock('../../../../../react/pages/orders/sales/useOrderDetailsVisuals', () => () => ({
  ppcColors: {
    accentInfo: '#0EA5E9',
    primary: '#0EA5E9',
    textSecondary: '#64748B',
  },
  styles: {},
}))

jest.mock('../../../../../react/pages/orders/sales/orderDetails.styles', () => ({
  inlineStyle_2116_14: {},
  inlineStyle_2121_14: () => ({}),
  inlineStyle_2128_20: {},
}))

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon')

const OrderItemsTab = require('../../../../../react/pages/orders/sales/OrderItemsTab').default
const {
  getOrderSyncSignature,
} = require('../../../../../react/pages/orders/sales/OrderItemsTab')

const shallowOrderProducts = [
  {
    id: 107229,
    product: {id: 1343, product: 'Produto customizado', type: 'custom'},
    quantity: 2,
    price: 116.86,
    total: 233.72,
  },
  {
    id: 107230,
    product: {id: 1109, product: 'Componente'},
    quantity: 2,
    price: 49.85,
    total: 99.7,
  },
]

const detailedOrderProducts = [
  {...shallowOrderProducts[0], order: {id: 72883}},
  {
    ...shallowOrderProducts[1],
    order: {id: 72883},
    orderProduct: '/order_products/107229',
    parentProduct: '/products/1343',
    productGroup: '/product_groups/102',
  },
]

const createProps = () => ({
  order: {
    id: 72883,
    price: 233.72,
    orderProducts: shallowOrderProducts,
  },
  orderProducts: shallowOrderProducts,
  routeOrderId: 72883,
})

describe('OrderItemsTab detailed tree hydration', () => {
  let orderProductsActions
  let orderProductsGetters

  beforeEach(() => {
    mockOrderProductsRender.mockClear()
    orderProductsGetters = {
      items: [],
      totalItems: 0,
    }
    orderProductsActions = {
      getItems: jest.fn(),
    }
    mockUseStore.mockImplementation(resource => {
      if (resource === 'order_products') {
        return {
          actions: orderProductsActions,
          getters: orderProductsGetters,
        }
      }

      return {actions: {}, getters: {}}
    })
  })

  it('keeps shallow descendants out of the renderer while details are loading', () => {
    orderProductsActions.getItems.mockReturnValue(new Promise(() => {}))
    let tree

    act(() => {
      tree = renderer.create(React.createElement(OrderItemsTab, createProps()))
    })

    expect(mockOrderProductsRender).not.toHaveBeenCalled()

    act(() => tree.unmount())
  })

  it('renders only the complete detailed collection', async () => {
    orderProductsActions.getItems.mockImplementation(async () => {
      orderProductsGetters.totalItems = detailedOrderProducts.length
      return detailedOrderProducts
    })

    await act(async () => {
      renderer.create(React.createElement(OrderItemsTab, createProps()))
      await Promise.resolve()
    })

    expect(orderProductsActions.getItems).toHaveBeenCalledWith({
      'order.id': 72883,
      itemsPerPage: 50,
      page: 1,
    })
    expect(mockOrderProductsRender).toHaveBeenCalledWith(
      expect.objectContaining({orderProducts: detailedOrderProducts}),
    )
  })

  it('trusts an explicitly complete embedded tree without a redundant request', async () => {
    const simpleOrderProducts = [
      {
        id: 107250,
        product: {id: 1400, product: 'Refrigerante', type: 'product'},
        quantity: 2,
        price: 8.5,
        total: 17,
      },
    ]

    await act(async () => {
      renderer.create(
        React.createElement(OrderItemsTab, {
          ...createProps(),
          order: {
            id: 72884,
            orderProducts: simpleOrderProducts,
            orderProductsTreeComplete: true,
            price: 17,
          },
          orderProducts: simpleOrderProducts,
          routeOrderId: 72884,
        }),
      )
      await Promise.resolve()
    })

    expect(orderProductsActions.getItems).not.toHaveBeenCalled()
    expect(mockOrderProductsRender).toHaveBeenCalledWith(
      expect.objectContaining({orderProducts: simpleOrderProducts}),
    )
  })

  it('allows retry after the detailed collection request fails', async () => {
    orderProductsActions.getItems
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockImplementationOnce(async () => {
        orderProductsGetters.totalItems = detailedOrderProducts.length
        return detailedOrderProducts
      })
    let tree

    await act(async () => {
      tree = renderer.create(React.createElement(OrderItemsTab, createProps()))
      await Promise.resolve()
    })

    const retryButton = tree.root
      .findAllByType('TouchableOpacity')
      .find(button =>
        button.findAllByType('Text').some(text =>
          text.children.includes('Tentar novamente'),
        ),
      )

    expect(retryButton).toBeDefined()
    expect(mockOrderProductsRender).not.toHaveBeenCalled()

    await act(async () => {
      retryButton.props.onPress()
      await Promise.resolve()
    })

    expect(orderProductsActions.getItems).toHaveBeenCalledTimes(2)
    expect(mockOrderProductsRender).toHaveBeenCalledWith(
      expect.objectContaining({orderProducts: detailedOrderProducts}),
    )
  })

  it('builds a stable sync signature for equivalent order payloads', () => {
    const baseOrder = {
      id: 71546,
      status: {status: 'open', realStatus: 'open', color: '#0EA5E9'},
      client: {id: 42},
      addressDestination: {id: 99},
      comments: '',
      orderProducts: [],
    }
    const equivalentOrder = {
      ...baseOrder,
      status: {...baseOrder.status},
      client: {...baseOrder.client},
      addressDestination: {...baseOrder.addressDestination},
      orderProducts: [],
    }
    const changedOrder = {
      ...baseOrder,
      status: {...baseOrder.status, realStatus: 'preparing'},
    }

    expect(getOrderSyncSignature(baseOrder)).toBe(getOrderSyncSignature(equivalentOrder))
    expect(getOrderSyncSignature(baseOrder)).not.toBe(getOrderSyncSignature(changedOrder))
  })
})
