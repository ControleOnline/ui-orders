const React = require('react')
const ReactDOMServer = require('react-dom/server')
const {jest} = require('@jest/globals')

const {afterAll, beforeEach, describe, expect, it} = global

let mockOrder = null
let mockGetOrder = jest.fn()

jest.mock('@store', () => ({
  useStore: jest.fn(name => {
    if (name === 'orders') {
      return {
        actions: {
          get: mockGetOrder,
        },
        getters: {
          item: mockOrder,
        },
      }
    }

    return {
      actions: {},
      getters: {},
    }
  }),
}))

jest.mock('react-native', () => ({
  ActivityIndicator: props => React.createElement('activity-indicator', props),
  Text: props => React.createElement('text', null, props.children),
  View: props => React.createElement('view', null, props.children),
}))

jest.mock('@controleonline/ui-orders/src/react/components/OrderIdentityLabel', () => props =>
  React.createElement('order-identity-label', props, props.children),
)

jest.mock('@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails', () => () =>
  React.createElement('sale-order-details', null),
)

jest.mock('@controleonline/ui-logistic/src/react/pages/orders/OrderLogisticsPage', () => () =>
  React.createElement('delivery-order-details', null),
)

const originalUseEffect = React.useEffect
React.useEffect = effect => effect()

const OrderDetailsPage =
  require('../../../../react/pages/orders/OrderDetailsPage').default

describe('OrderDetailsPage', () => {
  afterAll(() => {
    React.useEffect = originalUseEffect
  })

  beforeEach(() => {
    mockOrder = null
    mockGetOrder = jest.fn(() => Promise.resolve(mockOrder))
  })

  it('requests the order by id while it is being resolved', () => {
    const navigation = {
      setOptions: jest.fn(),
    }

    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderDetailsPage, {
        navigation,
        route: {
          params: {
            id: 72532,
          },
        },
      }),
    )

    expect(markup).toContain('Carregando...')
    expect(mockGetOrder).toHaveBeenCalledWith('72532')
    expect(navigation.setOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        headerBackVisible: true,
        title: 'Pedido',
      }),
    )
  })

  it('renders the delivery component when the loaded order is delivery', () => {
    mockOrder = {
      id: 72532,
      orderType: 'delivery',
    }

    const navigation = {
      setOptions: jest.fn(),
    }

    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderDetailsPage, {
        navigation,
        route: {
          params: {
            id: 72532,
          },
        },
      }),
    )

    expect(markup).toContain('delivery-order-details')
    expect(mockGetOrder).not.toHaveBeenCalled()
    expect(navigation.setOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        headerShown: false,
        showBottomCart: false,
        showBottomToolBar: false,
      }),
    )
  })

  it('renders the sale component when the loaded order is cart', () => {
    mockOrder = {
      id: 72532,
      orderType: 'cart',
    }

    const navigation = {
      setOptions: jest.fn(),
    }

    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderDetailsPage, {
        navigation,
        route: {
          params: {
            id: 72532,
          },
        },
      }),
    )

    expect(markup).toContain('sale-order-details')
    expect(mockGetOrder).not.toHaveBeenCalled()
    expect(navigation.setOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        headerBackVisible: true,
        title: 'Pedido',
      }),
    )
  })
})
