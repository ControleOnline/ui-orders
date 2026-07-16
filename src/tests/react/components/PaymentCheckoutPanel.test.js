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

jest.mock('@controleonline/ui-orders/src/react/css/orders', () => () => ({
  styles: {
    container: {flex: 1},
    scrollContent: {},
  },
}))

jest.mock('@controleonline/ui-orders/src/react/components/cart/BottomCart', () => props =>
  React.createElement('BottomCart', props),
)

jest.mock('@controleonline/ui-common/src/react/components/MessageService', () => ({
  useMessage: () => ({
    showError: jest.fn(),
  }),
}))

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
          actionIcon: 'credit-card',
          onPay,
          onSelectPayment,
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
              title: 'Neste equipamento',
            },
            {
              actionLabel: 'Trocar',
              key: 'remote',
              onPressAction: jest.fn(),
              options: [
                {
                  key: 'remote:credit',
                  label: 'Credito',
                  payment: {paymentType: {id: 2, paymentType: 'Crédito'}},
                },
              ],
              title: 'PDV principal',
            },
          ],
          pendingAmount: 47.45,
          selectedPaymentKey: 'local:cash',
        }),
      )
    })

    const textNodes = tree.root.findAll(
      node => node.type === 'Text' && typeof node.props.children === 'string',
    )
    const labels = textNodes.map(node => node.props.children)

    expect(labels).toContain('Neste equipamento')
    expect(labels).toContain('PDV principal')
    expect(labels).toContain('Dinheiro')
    expect(labels).toContain('Credito')
    expect(labels).toContain('Trocar')
    expect(labels).not.toContain('Barra única de pagamento')

    const bar = tree.root.findByType('BottomCart')
    expect(bar.props.actionLabel).toBe('Enviar para PDV principal')
    expect(bar.props.actionIcon).toBe('credit-card')
    expect(bar.props.variant).toBe('payment-status')
  })
})
