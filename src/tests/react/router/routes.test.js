const React = require('react')
const ReactDOMServer = require('react-dom/server')
const {jest} = require('@jest/globals')

const {afterAll, describe, expect, it} = global

jest.mock('@env', () => ({
  env: {
    APP_TYPE: 'manager',
  },
}))

jest.mock('@store', () => ({
  useStore: jest.fn(name => {
    if (name === 'orders') {
      return {
        getters: {
          item: {
            id: 71119,
            client: {
              name: 'Cliente Exemplo',
            },
          },
        },
      }
    }

    return {
      getters: {},
    }
  }),
}))

jest.mock('react-native', () => ({
  View: props => React.createElement('view', null, props.children),
}))

jest.mock('@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails', () => () =>
  React.createElement('order-details', null),
)
jest.mock('@controleonline/ui-orders/src/react/pages/checkout/Checkout', () => () =>
  React.createElement('checkout', null),
)
jest.mock('@controleonline/ui-orders/src/react/pages/checkout/AddProductScreen', () => () =>
  React.createElement('add-product-screen', null),
)
jest.mock('@controleonline/ui-orders/src/react/pages/CashRegister', () => () =>
  React.createElement('cash-register', null),
)
jest.mock('@controleonline/ui-orders/src/react/pages/CashRegister/Withdrawal', () => () =>
  React.createElement('withdrawal', null),
)
jest.mock('@controleonline/ui-orders/src/react/pages/CashRegister/CloseCashRegister', () => () =>
  React.createElement('close-cash-register', null),
)
jest.mock('@controleonline/ui-orders/src/react/pages/Prints', () => () =>
  React.createElement('print-queue-page', null),
)
jest.mock('@controleonline/ui-orders/src/react/pages/orders/OrderHistoryPage', () => () =>
  React.createElement('order-history-page', null),
)
jest.mock('@controleonline/ui-logistic/src/react/pages/orders/OrderLogisticsPage', () => () =>
  React.createElement('order-logistics-page', null),
)
jest.mock('@controleonline/ui-orders/src/react/components/OrderIdentityLabel', () => props =>
  React.createElement('order-identity-label', props, props.children),
)
jest.mock('@controleonline/ui-shop/src/react/router/routes', () => ({
  menuStorefrontRoute: {
    name: 'MenuStorefront',
  },
}))
jest.mock('@controleonline/ui-orders/src/react/utils/orderRoute', () => ({
  shouldShowOrderHistoryCompanyFilter: jest.fn(() => false),
}))

const originalUseEffect = React.useEffect
React.useEffect = effect => effect()

const {WrappedOrderLogistics} = require('../../../react/router/routes')

describe('orders router', () => {
  afterAll(() => {
    React.useEffect = originalUseEffect
  })

  it('uses the canonical order header in the logistics navigation header', () => {
    const navigation = {
      setOptions: jest.fn(),
    }

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(WrappedOrderLogistics, {
        navigation,
        route: {
          params: {
            order: {
              id: 71119,
              client: {
                name: 'Cliente Exemplo',
              },
            },
          },
        },
      }),
    )

    const options = navigation.setOptions.mock.calls[0][0]

    expect(options.headerShown).toBe(false)
  })
})
