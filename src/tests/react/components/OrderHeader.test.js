const {jest} = require('@jest/globals')

const {describe, expect, it} = global

jest.mock('react-native', () => {
  const React = require('react')
  const createComponent = name => props =>
    React.createElement(name, props, props.children)

  return {
    Animated: {
      Value: function Value(initial) {
        this.initial = initial
        this.setValue = jest.fn()
      },
      loop: () => ({start: jest.fn()}),
      sequence: () => ({}),
      timing: () => ({}),
      View: createComponent('AnimatedView'),
    },
    Image: createComponent('Image'),
    Text: createComponent('Text'),
    View: createComponent('View'),
  }
})

jest.mock('react-native-vector-icons/Feather', () => 'FeatherIcon')
jest.mock('@controleonline/ui-common/src/utils/formatter', () => ({
  formatDateYmdTodmY: jest.fn(() => '27/04/2026, 19:36'),
  formatMoney: jest.fn(value => `R$ ${value}`),
}))
jest.mock('@controleonline/../../src/styles/branding', () => ({
  withOpacity: jest.fn((color, opacity) => `${color}:${opacity}`),
}))
jest.mock('@assets/ppc/channels', () => ({
  getOrderChannelLabel: jest.fn(() => 'Shop'),
  getOrderChannelLogo: jest.fn(() => null),
}))
jest.mock('../../../react/components/OrderCardHeader', () => 'OrderCardHeader')
jest.mock('../../../react/components/OrderHeader.styles', () =>
  jest.fn(() => ({
    container: {},
    identityWrap: {},
    leftSection: {},
    leadingLabel: {},
    leadingLogo: {},
    leadingWrap: {},
    leadingWrapLoss: {},
    leadingWrapPurchase: {},
    leadingWrapTransfer: {},
    orderDate: {},
    orderId: {},
    orderIdSecondary: {},
    priceText: {},
    rightSection: {},
    statusBadge: {},
    statusDot: {},
    statusText: {},
    titleWrap: {},
    waitingChip: {},
    waitingText: {},
  })),
)

const {
  resolveDisplayedOrderStatus,
} = require('../../../react/components/OrderHeader')

describe('OrderHeader', () => {
  it('uses only realStatus to resolve the displayed label', () => {
    const status = resolveDisplayedOrderStatus({
      status: {
        realStatus: 'pending',
        status: 'ready',
        color: '#EF4444',
      },
    })

    expect(status.label).toBe('pending')
    expect(status.labelUpper).toBe('PENDING')
    expect(status.key).toBe('pending')
    expect(status.isOpen).toBe(false)
    expect(status.color).toBe('#EF4444')
  })

  it('falls back to open when realStatus is absent', () => {
    const status = resolveDisplayedOrderStatus({
      status: {
        status: 'ready',
      },
    })

    expect(status.label).toBe('open')
    expect(status.labelUpper).toBe('OPEN')
    expect(status.key).toBe('open')
    expect(status.isOpen).toBe(true)
  })
})
