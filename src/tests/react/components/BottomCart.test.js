const React = require('react')
const ReactDOMServer = require('react-dom/server')
const {jest} = require('@jest/globals')

const {afterEach, beforeEach, describe, expect, it} = global

jest.mock('react-native', () => {
  const React = require('react')
  const createComponent = name => props => {
    if (name === 'View') {
      global.__bottomCartViewProps = global.__bottomCartViewProps || []
      global.__bottomCartViewProps.push(props)
    }
    if (name === 'Text') {
      global.__bottomCartTextChildren = global.__bottomCartTextChildren || []
      global.__bottomCartTextChildren.push(props.children)
    }

    return React.createElement(name, props, props.children)
  }

  return {
    StyleSheet: {create: value => value},
    Text: createComponent('Text'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    View: createComponent('View'),
    useWindowDimensions: () => ({width: 390}),
  }
})

jest.mock('@store', () => ({
  useStore: jest.fn(name => {
    if (name === 'theme') {
      return {
        getters: {
          colors: {},
        },
      }
    }

    if (name === 'orders') {
      return {
        actions: {
          setItems: jest.fn(),
          syncOrder: jest.fn(),
        },
        getters: {
          item: null,
        },
      }
    }

    return {
      actions: {},
      getters: {},
    }
  }),
}))

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({}),
  useRoute: () => ({params: {}}),
}))

jest.mock('@controleonline/ui-orders/src/react/components/PayableToolbar', () => props =>
  React.createElement('PayableToolbar', props),
)
jest.mock('@controleonline/ui-orders/src/react/components/OrderTotalToolbar', () => props =>
  React.createElement('OrderTotalToolbar', props),
)
jest.mock('@controleonline/ui-common/src/utils/formatter', () => ({
  formatMoney: jest.fn(value => `R$ ${value}`),
}))
jest.mock('@controleonline/ui-orders/src/react/utils/orderRoute', () => ({
  isPdvRouteContext: jest.fn(() => false),
}))
jest.mock('@controleonline/ui-orders/src/react/utils/addProductSession', () => ({
  ADD_PRODUCT_SELECTION_CHANGE_EVENT: 'add-product-selection-change',
  listPendingAddProducts: jest.fn(() => []),
}))
jest.mock('@controleonline/ui-common/src/react/components/MessageService', () => ({
  useMessage: () => ({
    showError: jest.fn(),
  }),
}))
jest.mock('@controleonline/ui-common/src/react/components/EventBus', () => ({
  on: jest.fn(),
  off: jest.fn(),
}))
jest.mock('@controleonline/ui-orders/src/react/hooks/usePosOrderMaterialization', () => () => ({
  materializeOrderWithProducts: jest.fn(),
  openOrderDetails: jest.fn(),
}))
jest.mock('react-native-vector-icons/Feather', () => 'Icon')
jest.mock('@env', () => ({
  env: {},
}))

const BottomCart = require('../../../react/components/cart/BottomCart').default
let consoleErrorSpy

describe('BottomCart', () => {
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    global.__bottomCartViewProps = []
    global.__bottomCartTextChildren = []
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('keeps the paid breakdown bar tighter and closer to the bottom dock', () => {
    ReactDOMServer.renderToStaticMarkup(
      React.createElement(BottomCart, {
        bottomOffset: 12,
        onPaidDetailsPress: jest.fn(),
        paidDetailsLabel: 'Detalhes',
        paidOrderAmount: 17,
        paidOrderLabel: 'Total local',
        paidReceivedAmount: 17,
        paidReceivedLabel: 'Pago',
        paymentPendingAmount: 0,
        showPaidBreakdown: true,
        variant: 'payment-status',
      }),
    )

    const toolbar = global.__bottomCartViewProps.find(
      props =>
        Array.isArray(props?.style) &&
        props.style.some(style => style && style.backgroundColor === '#F3FFF7'),
    )

    expect(toolbar.style).toEqual([
      {
        alignItems: 'center',
        backgroundColor: '#F3FFF7',
        borderColor: '#16A34A',
        borderRadius: 16,
        borderWidth: 1,
        elevation: 4,
        flexDirection: 'row',
        gap: 4,
        left: 5,
        padding: 4,
        position: 'absolute',
        right: 5,
        shadowColor: '#0F172A',
        shadowOffset: {height: 4, width: 0},
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      {
        bottom: 20,
        minHeight: 78,
      },
    ])
  })

  it('keeps the financial breakdown visible and uses checkout as the pending action', () => {
    ReactDOMServer.renderToStaticMarkup(
      React.createElement(BottomCart, {
        actionLabel: 'Pay',
        onActionPress: jest.fn(),
        onPaidDetailsPress: jest.fn(),
        paidDetailsLabel: 'Details',
        paidOrderAmount: 13,
        paidOrderLabel: 'Local total',
        paidReceivedAmount: 0,
        paidReceivedLabel: 'Paid',
        paymentPendingAmount: 13,
        showPaidBreakdown: true,
        variant: 'payment-status',
      }),
    )

    const textChildren = global.__bottomCartTextChildren
      .flatMap(children => React.Children.toArray(children))
      .filter(child => typeof child === 'string')

    expect(textChildren).toEqual(
      expect.arrayContaining(['Local total', 'Paid', 'Pay']),
    )
    expect(textChildren).not.toContain('Details')
  })

  it('keeps details as the financial breakdown action when there is no pending amount', () => {
    ReactDOMServer.renderToStaticMarkup(
      React.createElement(BottomCart, {
        actionLabel: 'Pay',
        onActionPress: jest.fn(),
        onPaidDetailsPress: jest.fn(),
        paidDetailsLabel: 'Details',
        paidOrderAmount: 13,
        paidOrderLabel: 'Local total',
        paidReceivedAmount: 13,
        paidReceivedLabel: 'Paid',
        paymentPendingAmount: 0,
        showPaidBreakdown: true,
        variant: 'payment-status',
      }),
    )

    const textChildren = global.__bottomCartTextChildren
      .flatMap(children => React.Children.toArray(children))
      .filter(child => typeof child === 'string')

    expect(textChildren).toEqual(
      expect.arrayContaining(['Local total', 'Paid', 'Details']),
    )
    expect(textChildren).not.toContain('Pay')
  })
})
