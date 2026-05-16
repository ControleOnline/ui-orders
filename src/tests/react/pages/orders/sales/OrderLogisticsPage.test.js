const React = require('react')
const ReactDOMServer = require('react-dom/server')
const {jest} = require('@jest/globals')

const {describe, expect, it} = global

let mockLogisticsSnapshot = {
  canRequestDriver: true,
  dropoffAddressParts: null,
  dropoffContact: null,
  hasDriver: false,
  managedByStore: false,
  managedByStoreLabel: 'Nao gerenciada pela loja',
  pickupAddressParts: null,
  pickupContact: null,
  uberState: {},
}

jest.mock('react-native', () => {
  const React = require('react')
  const createComponent = name => props =>
    React.createElement(name.toLowerCase(), null, props.children)

  return {
    ActivityIndicator: createComponent('ActivityIndicator'),
    ScrollView: createComponent('ScrollView'),
    StyleSheet: {create: value => value},
    Text: createComponent('Text'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    View: createComponent('View'),
  }
})

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: props => React.createElement('safeareaview', null, props.children),
  useSafeAreaInsets: () => ({bottom: 0, top: 0}),
}))

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}))

jest.mock('@store', () => ({
  useStore: jest.fn(name => {
    if (name === 'orders') {
      return {
        actions: {
          get: jest.fn(),
        },
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
      actions: {},
      getters: {},
    }
  }),
}))

jest.mock('@controleonline/ui-common/src/react/components/MessageService', () => ({
  useMessage: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
  }),
}))

jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: jest.fn(),
  },
}))

jest.mock('@controleonline/ui-orders/src/react/pages/orders/sales/useOrderDetailsVisuals', () => () => ({
  ppcColors: {
    accentInfo: '#0EA5E9',
    borderSoft: '#D6E4F0',
    cardBg: '#FFFFFF',
    cardBgSoft: '#F8FAFC',
    pageBg: '#F8FAFC',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
  },
  styles: {
    detailsCard: {id: 'detailsCard'},
    detailsCardLabel: {id: 'detailsCardLabel'},
    detailsCardValue: {id: 'detailsCardValue'},
    detailsGrid: {id: 'detailsGrid'},
    detailsInfoText: {id: 'detailsInfoText'},
    detailsSection: {id: 'detailsSection'},
    detailsSectionTitle: {id: 'detailsSectionTitle'},
    detailsTabStack: {id: 'detailsTabStack'},
    actionButton: {id: 'actionButton'},
    actionButtonPrimary: {id: 'actionButtonPrimary'},
    actionButtonText: {id: 'actionButtonText'},
    actionButtonTextPrimary: {id: 'actionButtonTextPrimary'},
    actionButtonDisabled: {id: 'actionButtonDisabled'},
    actionRow: {id: 'actionRow'},
    pageRoot: {id: 'pageRoot'},
  },
}))

jest.mock('@controleonline/ui-orders/src/react/pages/orders/sales/orderLogisticsPresentation', () => ({
  __esModule: true,
  default: jest.fn(() => mockLogisticsSnapshot),
  resolveOrderLogisticsSnapshot: jest.fn(() => mockLogisticsSnapshot),
}))

jest.mock('@controleonline/ui-logistic/src/react/pages/orders/orderLogisticsPresentation', () => ({
  __esModule: true,
  default: jest.fn(() => mockLogisticsSnapshot),
  resolveOrderLogisticsSnapshot: jest.fn(() => mockLogisticsSnapshot),
}))

jest.mock('@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderStackedTopBar', () => props => {
  global.__orderStackedTopBarProps = props
  return React.createElement('order-stacked-top-bar', null, props.children)
})

jest.mock('react-native-vector-icons/MaterialIcons', () => 'material-icons')
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'material-community-icons',
}))

const OrderLogisticsPage =
  require('../../../../../react/pages/orders/sales/OrderLogisticsPage').default

describe('OrderLogisticsPage', () => {
  it('renders the stacked order header in the logistics body', () => {
    mockLogisticsSnapshot = {
      ...mockLogisticsSnapshot,
      couriers: [],
      currentIntegration: null,
      delivery: {},
      integrations: [],
      managedByStore: false,
      management: {
        managedByStore: false,
        label: 'Nao gerenciada pela loja',
        mode: 'integration',
        source: 'POS',
      },
    }
    global.__orderStackedTopBarProps = null

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderLogisticsPage, {
        navigation: {
          goBack: jest.fn(),
        },
        route: {
          params: {
            id: 71119,
          },
        },
      }),
    )

    expect(global.__orderStackedTopBarProps).toEqual(
      expect.objectContaining({
        isKds: true,
        showActions: false,
        order: expect.objectContaining({
          id: 71119,
          status: expect.objectContaining({
            color: '#0EA5E9',
          }),
        }),
      }),
    )
  })

  it('renders front quote cards when logistics is store managed', () => {
    mockLogisticsSnapshot = {
      canRequestDriver: true,
      couriers: [],
      currentIntegration: null,
      delivery: {
        currentIntegrationKey: null,
        requestedAt: null,
        status: 'Cotacoes disponiveis',
        trackingUrl: null,
      },
      dropoffAddressParts: null,
      dropoffContact: null,
      hasDriver: false,
      integrations: [
        {
          key: 'uber',
          label: 'Uber',
          price: 12.5,
          eta: '20 - 30 min',
          status: 'Cotacao estimada no front',
          summary: 'Cotacao estimada no front',
          request: {
            enabled: true,
            type: 'uber',
          },
        },
        {
          key: 'ifood',
          label: 'iFood',
          price: 13.8,
          eta: '25 - 40 min',
          status: 'Cotacao estimada no front',
          summary: 'Cotacao estimada no front',
          request: {
            enabled: true,
            type: 'ifood',
          },
        },
        {
          key: 'food99',
          label: '99 Food',
          price: 14.2,
          eta: '22 - 35 min',
          status: 'Cotacao estimada no front',
          summary: 'Cotacao estimada no front',
          request: {
            enabled: true,
            type: 'food99',
          },
        },
      ],
      managedByStore: true,
      managedByStoreLabel: 'Gerenciada pela loja',
      management: {
        managedByStore: true,
        label: 'Gerenciada pela loja',
        mode: 'store',
        source: 'POS',
      },
      pickupAddressParts: null,
      pickupContact: null,
      uberState: {},
    }

    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderLogisticsPage, {
        navigation: {
          goBack: jest.fn(),
        },
        route: {
          params: {
            id: 71119,
          },
        },
      }),
    )

    expect(markup).toContain('Marketplace')
    expect(markup).toContain('Uber')
    expect(markup).toContain('iFood')
    expect(markup).toContain('99 Food')
    expect(markup).toContain('Solicitar via Uber')
  })
})
