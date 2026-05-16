const React = require('react')
const ReactDOMServer = require('react-dom/server')
const {jest} = require('@jest/globals')

const {describe, expect, it} = global

let mockLogisticsSnapshot = {
  canQuote: false,
  currentIntegration: null,
  dropoffAddressParts: null,
  dropoffContact: null,
  management: {
    managedByStore: true,
    label: 'Cotacoes da loja',
    mode: 'quote',
    source: 'POS',
  },
  pickupAddressParts: null,
  pickupContact: null,
  providers: [],
  quoteStatus: {
    providers: 0,
    quotes: 0,
    ready: 0,
    pending: 0,
    selected: 0,
    unavailable: 0,
    error: 0,
  },
  quotes: [],
  selection: {
    quoteOrderId: null,
    providerKey: '',
    price: null,
    trackingUrl: null,
    selectedAt: '',
  },
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
            app: 'POS',
            status: {
              color: '#0EA5E9',
            },
          },
        },
      }
    }

    if (name === 'websocket') {
      return {
        actions: {},
        getters: {
          messages: [],
        },
      }
    }

    if (name === 'people') {
      return {
        actions: {},
        getters: {
          currentCompany: {
            id: 33,
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
      providers: [],
      quotes: [],
      currentIntegration: null,
      management: {
        managedByStore: true,
        label: 'Cotacoes da loja',
        mode: 'quote',
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

  it('renders real quote cards and the selected delivery provider', () => {
    mockLogisticsSnapshot = {
      canQuote: true,
      currentIntegration: {
        id: 801,
        providerKey: 'ifood',
        providerLabel: 'iFood',
        price: 14.66,
        quoteState: 'selected',
        quoteStateLabel: 'Entrega solicitada',
        trackingUrl: 'https://tracking.ifood.com/quote/801',
        selected: true,
      },
      dropoffAddressParts: {
        primary: 'Rua Cliente, 321',
        secondary: 'Bairro • Sao Paulo / SP',
        complement: '',
      },
      dropoffContact: {
        name: 'Marco',
        phone: '+55 (11) 98888-8888',
        email: '',
      },
      management: {
        managedByStore: true,
        label: 'Cotacoes da loja',
        mode: 'quote',
        source: 'POS',
      },
      pickupAddressParts: {
        primary: 'Rua Teste, 123',
        secondary: 'Centro • Sao Paulo / SP',
        complement: 'Apto 10',
      },
      pickupContact: {
        name: 'Loja Teste',
        phone: '+55 (11) 99999-9999',
        email: '',
      },
      providers: [
        {
          key: 'ifood',
          label: 'iFood',
          connected: true,
          online: true,
        },
        {
          key: 'uber',
          label: 'Uber',
          connected: true,
          online: true,
        },
      ],
      quoteStatus: {
        providers: 2,
        quotes: 2,
        ready: 1,
        pending: 1,
        selected: 1,
        unavailable: 0,
        error: 0,
      },
      quotes: [
        {
          id: 801,
          providerKey: 'ifood',
          providerLabel: 'iFood',
          price: 14.66,
          eta: '20 - 30 min',
          quoteState: 'selected',
          quoteStateLabel: 'Entrega solicitada',
          requestable: false,
          selected: true,
          trackingUrl: 'https://tracking.ifood.com/quote/801',
          summary: 'Entrega solicitada',
        },
        {
          id: 802,
          providerKey: 'uber',
          providerLabel: 'Uber',
          price: 15.35,
          eta: '22 - 35 min',
          quoteState: 'ready',
          quoteStateLabel: 'Cotacao pronta',
          requestable: true,
          selected: false,
          summary: 'Cotacao pronta',
        },
      ],
      selection: {
        quoteOrderId: 801,
        providerKey: 'ifood',
        price: 14.66,
        trackingUrl: 'https://tracking.ifood.com/quote/801',
        selectedAt: '2026-05-16 10:00:00',
      },
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

    expect(markup).toContain('Cotacoes logisticas')
    expect(markup).toContain('Atualizar cotações')
    expect(markup).toContain('iFood')
    expect(markup).toContain('Uber')
    expect(markup).toContain('R$ 14,66')
    expect(markup).toContain('Selecionada')
    expect(markup).toContain('Escolher cotacao')
  })
})
