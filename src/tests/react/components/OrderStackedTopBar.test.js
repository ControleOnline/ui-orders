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
    Text: createComponent('Text'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    View: createComponent('View'),
  }
})

jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons')
jest.mock('../../../react/pages/orders/sales/useOrderDetailsVisuals', () => () => ({
  styles: {
    topBarActionSectionStacked: {id: 'topBarActionSectionStacked'},
    topBarActionsStacked: {id: 'topBarActionsStacked'},
    topBarBackButton: {id: 'topBarBackButton'},
    topBarHeaderContentStacked: {id: 'topBarHeaderContentStacked'},
    topBarHeaderRowStacked: {id: 'topBarHeaderRowStacked'},
    topBarHeaderSectionStacked: {id: 'topBarHeaderSectionStacked'},
    topBarIconButton: {id: 'topBarIconButton'},
    topBarIconButtonDisabled: {id: 'topBarIconButtonDisabled'},
    topBarInlineWrap: {id: 'topBarInlineWrap'},
  },
  ppcColors: {
    accentInfo: '#0EA5E9',
    textPrimary: '#0F172A',
  },
}))
jest.mock('../../../react/components/OrderHeader', () => props => {
  global.__orderHeaderProps = props
  return null
})
jest.mock('../../../react/pages/orders/sales/components/OrderTopBarActions', () => props => {
  global.__topBarActionsProps = props
  return null
})

const OrderStackedTopBar =
  require('../../../react/pages/orders/sales/components/OrderStackedTopBar').default

describe('OrderStackedTopBar', () => {
  it('renders the canonical order header without the actions section when requested', () => {
    global.__orderHeaderProps = null
    global.__topBarActionsProps = null

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderStackedTopBar, {
        order: {
          id: 812,
          client: {
            name: 'Cliente Exemplo',
          },
        },
        onBackPress: jest.fn(),
        showActions: false,
      }),
    )

    expect(global.__orderHeaderProps).toMatchObject({
      order: {
        id: 812,
        client: {
          name: 'Cliente Exemplo',
        },
      },
      isKds: false,
    })
    expect(global.__topBarActionsProps).toBeNull()
  })
})
