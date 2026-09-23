const {jest} = require('@jest/globals')
const React = require('react')
const ReactDOMServer = require('react-dom/server')

const {describe, expect, it} = global

jest.mock('react-native', () => {
  const React = require('react')

  const createComponent = name =>
    function MockComponent(props) {
      return React.createElement(name.toLowerCase(), null, props.children)
    }

  return {
    TouchableOpacity: createComponent('TouchableOpacity'),
    View: createComponent('View'),
  }
})

jest.mock('react-native-vector-icons/MaterialIcons', () => {
  const React = require('react')

  return function MaterialIcons(props) {
    global.__topBarIcons = global.__topBarIcons || []
    global.__topBarIcons.push(props.name)
    return React.createElement('icon', props)
  }
})

jest.mock('@controleonline/ui-orders/src/react/components/PrintButton', () => () => null)

const {
  ORDER_TOP_BAR_ACTIONS,
} = require('../../../react/pages/orders/sales/components/OrderTopBarActions')

const OrderTopBarActions =
  require('../../../react/pages/orders/sales/components/OrderTopBarActions').default

describe('OrderTopBarActions', () => {
  it('renders the NF action when requested', () => {
    global.__topBarIcons = []

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderTopBarActions, {
        buttons: [ORDER_TOP_BAR_ACTIONS.NF],
        iconButtonStyle: {},
        iconButtonDisabledStyle: {},
        iconColor: '#0EA5E9',
        onPressNf: jest.fn(),
      }),
    )

    expect(global.__topBarIcons).toContain('receipt')
  })

  it('exposes the attachments action icon', () => {
    global.__topBarIcons = []

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderTopBarActions, {
        buttons: [ORDER_TOP_BAR_ACTIONS.ATTACHMENTS],
        iconButtonStyle: {},
        iconButtonDisabledStyle: {},
        iconColor: '#0EA5E9',
        onPressAttachments: jest.fn(),
      }),
    )

    expect(global.__topBarIcons).toContain('attach-file')
  })
})
