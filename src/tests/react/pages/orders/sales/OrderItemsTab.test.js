const React = require('react')
const renderer = require('react-test-renderer')
const {jest} = require('@jest/globals')

const {afterEach, beforeEach, describe, expect, it} = global

let orderProductsGetItemsMock

jest.mock('react-native', () => {
  const React = require('react')
  const createComponent = name => props =>
    React.createElement(name, props, props.children)

  return {
    ActivityIndicator: createComponent('ActivityIndicator'),
    Text: createComponent('Text'),
    TextInput: createComponent('TextInput'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    useWindowDimensions: () => ({height: 800, width: 400}),
    View: createComponent('View'),
  }
})

jest.mock('@store', () => ({
  useStore: jest.fn(name => {
    if (name === 'order_products') {
      return {
        actions: {
          getItems: orderProductsGetItemsMock,
        },
        getters: {
          error: '',
          isLoading: false,
          items: [],
        },
      }
    }

    return {
      actions: {},
      getters: {},
    }
  }),
}))

jest.mock('@controleonline/ui-orders/src/react/css/orders', () => () => ({
  styles: {
    itemsSection: {},
  },
}))

jest.mock('@controleonline/ui-orders/src/react/components/OrderProducts', () => props =>
  React.createElement('OrderProducts', props),
)

jest.mock('../../../../../react/pages/orders/sales/useOrderDetailsVisuals', () => () => ({
  ppcColors: {
    accentInfo: '#0EA5E9',
    primary: '#0EA5E9',
    textSecondary: '#64748B',
  },
  styles: {},
}))

jest.mock(
  '../../../../../react/pages/orders/sales/orderDetails.styles',
  () => ({
    inlineStyle_2116_14: {},
    inlineStyle_2121_14: () => ({}),
    inlineStyle_2128_20: {},
  }),
)

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon')

const OrderItemsTab =
  require('../../../../../react/pages/orders/sales/OrderItemsTab').default

describe('OrderItemsTab', () => {
  beforeEach(() => {
    orderProductsGetItemsMock = jest.fn(() => ({
      catch: jest.fn(() => null),
    }))
  })

  afterEach(() => {
    orderProductsGetItemsMock.mockClear()
  })

  it('requests fallback order products only once for the same incomplete payload', () => {
    const baseOrderProducts = [
      {
        id: 1,
        order: '/orders/71546',
        quantity: 1,
        product: {
          id: 101,
          product: 'Refrigerante',
          type: 'product',
        },
      },
    ]

    let tree

    renderer.act(() => {
      tree = renderer.create(
        React.createElement(OrderItemsTab, {
          addProductsButtonLabel: 'Adicionar produtos',
          canAddProductsToOrder: false,
          order: {
            id: 71546,
            status: {},
          },
          orderProducts: baseOrderProducts,
          routeOrderId: '71546',
        }),
      )
    })

    expect(orderProductsGetItemsMock).toHaveBeenCalledTimes(1)

    renderer.act(() => {
      tree.update(
        React.createElement(OrderItemsTab, {
          addProductsButtonLabel: 'Adicionar produtos',
          canAddProductsToOrder: false,
          order: {
            id: 71546,
            status: {},
          },
          orderProducts: [
            {
              ...baseOrderProducts[0],
            },
          ],
          routeOrderId: '71546',
        }),
      )
    })

    expect(orderProductsGetItemsMock).toHaveBeenCalledTimes(1)
  })
})
