const {jest} = require('@jest/globals')
const React = require('react')
const ReactDOMServer = require('react-dom/server')

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
    TouchableOpacity: createComponent('TouchableOpacity'),
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
jest.mock('../../../react/components/OrderCardHeader', () => props => {
  global.__orderCardHeaderProps = props
  return null
})
jest.mock('../../../react/components/OrderHeader.styles', () =>
  jest.fn(() => ({
    container: {id: 'container'},
    containerStackedRightSection: {id: 'containerStackedRightSection'},
    identityWrap: {id: 'identityWrap'},
    leftSection: {id: 'leftSection'},
    leftSectionStackedRightSection: {id: 'leftSectionStackedRightSection'},
    leadingLabel: {id: 'leadingLabel'},
    leadingLogo: {id: 'leadingLogo'},
    leadingWrap: {id: 'leadingWrap'},
    leadingWrapLoss: {id: 'leadingWrapLoss'},
    leadingWrapPurchase: {id: 'leadingWrapPurchase'},
    leadingWrapTransfer: {id: 'leadingWrapTransfer'},
    metaChip: {id: 'metaChip'},
    metaChipStacked: {id: 'metaChipStacked'},
    metaChipText: {id: 'metaChipText'},
    metaRow: {id: 'metaRow'},
    orderDate: {id: 'orderDate'},
    orderId: {id: 'orderId'},
    orderIdSecondary: {id: 'orderIdSecondary'},
    priceText: {id: 'priceText'},
    rightSection: {id: 'rightSection'},
    rightSectionStacked: {id: 'rightSectionStacked'},
    statusBadge: {id: 'statusBadge'},
    statusBadgeStacked: {id: 'statusBadgeStacked'},
    statusDot: {id: 'statusDot'},
    statusText: {id: 'statusText'},
    titleWrap: {id: 'titleWrap'},
    customerActionButton: {id: 'customerActionButton'},
    customerActionButtonDisabled: {id: 'customerActionButtonDisabled'},
    customerActionText: {id: 'customerActionText'},
    waitingChip: {id: 'waitingChip'},
    waitingChipStacked: {id: 'waitingChipStacked'},
    waitingText: {id: 'waitingText'},
  })),
)

const {
  default: OrderHeader,
  resolveDisplayedOrderStatus,
  shouldShowKdsWaitingTime,
} = require('../../../react/components/OrderHeader')

describe('OrderHeader', () => {
  it('prefers status.status for the displayed label and keeps realStatus as state key', () => {
    const status = resolveDisplayedOrderStatus({
      status: {
        realStatus: 'pending',
        status: 'ready',
        color: '#c10015',
      },
    })

    expect(status.label).toBe('ready')
    expect(status.labelUpper).toBe('READY')
    expect(status.key).toBe('pending')
    expect(status.isOpen).toBe(false)
    expect(status.color).toBe('#c10015')
  })

  it('falls back to status.status when realStatus is absent', () => {
    const status = resolveDisplayedOrderStatus({
      status: {
        status: 'ready',
      },
    })

    expect(status.label).toBe('ready')
    expect(status.labelUpper).toBe('READY')
    expect(status.key).toBe('ready')
    expect(status.isOpen).toBe(false)
  })

  it('shows waiting time only for preparation statuses', () => {
    expect(
      shouldShowKdsWaitingTime({
        status: {
          realStatus: 'working',
          status: 'Em preparo',
        },
      }),
    ).toBe(true)

    expect(
      shouldShowKdsWaitingTime({
        status: {
          realStatus: 'open',
          status: 'Open',
        },
      }),
    ).toBe(false)
  })

  it('stacks status and waiting time below the identity area when requested for KDS', () => {
    global.__orderCardHeaderProps = null

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHeader, {
        isKds: true,
        stackRightSectionBelow: true,
        order: {
          alterDate: '2026-05-05T21:07:04.000Z',
          status: {
            realStatus: 'working',
            status: 'Preparing',
            color: '#10b981',
          },
        },
      }),
    )

    expect(global.__orderCardHeaderProps.containerStyle).toEqual([
      {id: 'container'},
      {id: 'containerStackedRightSection'},
    ])
    expect(global.__orderCardHeaderProps.leftSectionStyle).toEqual([
      {id: 'leftSection'},
      {id: 'leftSectionStackedRightSection'},
    ])
    expect(global.__orderCardHeaderProps.rightSectionStyle).toEqual([
      {id: 'rightSection'},
      {id: 'rightSectionStacked'},
    ])
    expect(global.__orderCardHeaderProps.statusBadgeStyle).toEqual([
      {id: 'statusBadge'},
      {id: 'statusBadgeStacked'},
      {
        backgroundColor: '#10b981:0.08',
        borderColor: '#10b981:0.4',
      },
    ])
  })

  it('does not fall back to the order date in the left metadata row', () => {
    global.__orderCardHeaderProps = null

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHeader, {
        order: {
          alterDate: '2026-05-05T21:07:04.000Z',
          status: {
            realStatus: 'open',
            status: 'Open',
            color: '#10b981',
          },
        },
      }),
    )

    expect(global.__orderCardHeaderProps.dateText).toBe('')
  })

  it('hides price by default outside KDS', () => {
    global.__orderCardHeaderProps = null

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHeader, {
        order: {
          price: 42,
          status: {
            realStatus: 'open',
            status: 'Open',
            color: '#10b981',
          },
        },
      }),
    )

    expect(global.__orderCardHeaderProps.rightContent).toBeNull()
  })

  it('shows price when explicitly enabled outside KDS', () => {
    global.__orderCardHeaderProps = null

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHeader, {
        showPricing: true,
        order: {
          price: 42,
          status: {
            realStatus: 'open',
            status: 'Open',
            color: '#10b981',
          },
        },
      }),
    )

    expect(global.__orderCardHeaderProps.rightContent?.props?.children).toBe('R$ 42')
  })

  it('does not show price by default on KDS headers', () => {
    global.__orderCardHeaderProps = null

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHeader, {
        isKds: true,
        order: {
          price: 42,
          status: {
            realStatus: 'open',
            status: 'Open',
            color: '#10b981',
          },
        },
      }),
    )

    expect(global.__orderCardHeaderProps.rightContent).toBeNull()
  })

  it('hides price when showPricing is disabled outside KDS', () => {
    global.__orderCardHeaderProps = null

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHeader, {
        showPricing: false,
        order: {
          price: 42,
          status: {
            realStatus: 'open',
            status: 'Open',
            color: '#10b981',
          },
        },
      }),
    )

    expect(global.__orderCardHeaderProps.rightContent).toBeNull()
  })

  it('prefixes the customer name with the comanda code when mainOrder.externalCode exists', () => {
    global.__orderCardHeaderProps = null

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHeader, {
        order: {
          client: {
            name: 'Cliente da mesa',
          },
          mainOrder: {
            externalCode: '570002',
          },
          status: {
            realStatus: 'open',
            status: 'Open',
            color: '#10b981',
          },
        },
      }),
    )

    expect(global.__orderCardHeaderProps.dateText).toBe('Comanda: #570002 Cliente da mesa')
  })

  it('only uses order.client.name for the metadata label', () => {
    global.__orderCardHeaderProps = null

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHeader, {
        order: {
          client: {
            alias: 'Cliente Antigo',
          },
          customer: {
            name: 'Outro Nome',
          },
          customerName: 'Fallback Indevido',
          status: {
            realStatus: 'open',
            status: 'Open',
            color: '#10b981',
          },
        },
      }),
    )

    expect(global.__orderCardHeaderProps.dateText).toBe('')
  })
})
