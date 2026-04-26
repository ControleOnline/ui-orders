const React = require('react')
const renderer = require('react-test-renderer')
const {jest} = require('@jest/globals')

const {afterEach, beforeEach, describe, expect, it} = global

jest.mock('react-native', () => {
  const React = require('react')
  const createComponent = name => props =>
    React.createElement(name, props, props.children)

  return {
    ActivityIndicator: createComponent('ActivityIndicator'),
    ScrollView: createComponent('ScrollView'),
    StyleSheet: {create: value => value},
    Text: createComponent('Text'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    View: createComponent('View'),
  }
})

jest.mock('@store', () => ({
  useStore: () => ({
    getters: {
      colors: {},
    },
  }),
}))

jest.mock('@controleonline/ui-orders/src/react/css/orders', () => () => ({
  styles: {
    container: {flex: 1},
    scrollContent: {},
  },
}))

jest.mock('@controleonline/ui-common/src/react/components/UnifiedPaymentBar', () => props =>
  React.createElement('UnifiedPaymentBar', props),
)

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon')

const PaymentCheckoutPanel =
  require('../../../react/components/PaymentCheckoutPanel').default
let consoleErrorSpy

describe('PaymentCheckoutPanel', () => {
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders only payment options and keeps the remote swap action discrete', () => {
    const onSelectPayment = jest.fn()
    const onPay = jest.fn()
    let tree
    renderer.act(() => {
      tree = renderer.create(
        React.createElement(PaymentCheckoutPanel, {
          actionLabel: 'Enviar para PDV principal',
          onPay,
          onSelectPayment,
          paidAmount: 0,
          paymentSections: [
            {
              key: 'local',
              options: [
                {
                  key: 'local:cash',
                  label: 'Dinheiro',
                  payment: {paymentType: {id: 1, paymentType: 'Dinheiro'}},
                },
              ],
              title: 'Neste device',
            },
            {
              actionLabel: 'Trocar',
              key: 'remote',
              onPressAction: jest.fn(),
              options: [
                {
                  key: 'remote:credit',
                  label: 'Credito',
                  payment: {paymentType: {id: 2, paymentType: 'Credito'}},
                },
              ],
              title: 'PDV principal',
            },
          ],
          pendingAmount: 47.45,
          selectedPaymentKey: 'local:cash',
          totalAmount: 47.45,
        }),
      )
    })

    const textNodes = tree.root.findAll(
      node => node.type === 'Text' && typeof node.props.children === 'string',
    )
    const labels = textNodes.map(node => node.props.children)

    expect(labels).toContain('Neste device')
    expect(labels).toContain('PDV principal')
    expect(labels).toContain('Dinheiro')
    expect(labels).toContain('Credito')
    expect(labels).toContain('Trocar')
    expect(labels).not.toContain('Barra unica de pagamento')

    const bar = tree.root.findByType('UnifiedPaymentBar')
    expect(bar.props.actions[0].label).toBe('Enviar para PDV principal')
  })
})
