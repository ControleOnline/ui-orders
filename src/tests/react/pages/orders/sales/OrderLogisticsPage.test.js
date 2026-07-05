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
    Image: createComponent('Image'),
    Modal: props => (props.visible ? React.createElement('modal', null, props.children) : null),
    Platform: {OS: 'web'},
    ScrollView: createComponent('ScrollView'),
    StyleSheet: {create: value => value},
    Text: createComponent('Text'),
    TextInput: createComponent('TextInput'),
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

    if (name === 'order_logistics') {
      return {
        actions: {
          get: jest.fn(),
          requestQuotes: jest.fn(),
          selectQuote: jest.fn(),
          confirm: jest.fn(),
          cancel: jest.fn(),
          delivered: jest.fn(),
        },
        getters: {
          item: mockLogisticsSnapshot,
          isLoading: false,
          isSaving: false,
          error: '',
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

jest.mock('@controleonline/ui-people/src/react/components/AddCompanyModal', () => () => null)

jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: jest.fn(),
  },
}))

jest.mock('@controleonline/ui-layout/src/react/components/StateStore', () => props =>
  React.createElement('state-store', null, props.children),
)

jest.mock('@assets/ppc/channels', () => ({
  getOrderChannelLabel: jest.fn(({app}) => {
    const value = String(app || '').toLowerCase()
    if (value.includes('99')) return '99 Food'
    if (value.includes('ifood')) return 'iFood'
    if (value.includes('uber')) return 'Uber'
    return 'Shop'
  }),
  getOrderChannelLogo: jest.fn(() => null),
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

jest.mock(
  '@controleonline/ui-default/src/react/components/map/DefaultMap',
  () => props => React.createElement('default-map', null, props.children),
  {virtual: true},
)

jest.mock('@controleonline/ui-logistic/src/react/pages/orders/orderLogisticsPresentation', () => ({
  __esModule: true,
  default: jest.fn(() => mockLogisticsSnapshot),
  resolveOrderLogisticsSnapshot: jest.fn(() => mockLogisticsSnapshot),
}))

jest.mock('@controleonline/ui-logistic/src/react/pages/orders/OrderLogisticsQuotesList', () => props => {
  const React = require('react')

  const quotes = Array.isArray(mockLogisticsSnapshot?.quotes) ? mockLogisticsSnapshot.quotes : []
  const currentIntegration = mockLogisticsSnapshot?.currentIntegration
  const hasDeliveryOrder = Boolean(mockLogisticsSnapshot?.hasDeliveryOrder)
  const hasDropoffAddress = Boolean(mockLogisticsSnapshot?.dropoffAddressParts)
  const deliveryPeople = mockLogisticsSnapshot?.delivery?.deliveryPeople || null
  const deliveryStatus = mockLogisticsSnapshot?.delivery?.status || ''
  const labels = [
    ...quotes.map(quote => quote?.providerLabel || quote?.providerKey || quote?.app || 'Cotacao'),
    currentIntegration?.providerLabel || currentIntegration?.providerKey || currentIntegration?.app || null,
  ].filter(Boolean)

  if (quotes.length === 0 && !hasDeliveryOrder) {
    return React.createElement(
      'order-logistics-quotes-list',
      null,
      React.createElement('empty-state-title', null, 'Nenhuma cotacao ainda'),
      React.createElement(
        'empty-state-text',
        null,
        hasDropoffAddress
          ? 'Solicite cotações para exibir as opções vinculadas.'
          : 'Informe um endereço de entrega válido para solicitar cotações.',
      ),
    )
  }

  return React.createElement(
    'order-logistics-quotes-list',
    null,
    labels.map((label, index) => React.createElement('quote-item', {key: `${label}-${index}`}, label)),
    deliveryPeople?.name
      ? React.createElement('delivery-name', {key: 'delivery-name'}, deliveryPeople.name)
      : null,
    deliveryPeople?.phone
      ? React.createElement('delivery-phone', {key: 'delivery-phone'}, deliveryPeople.phone)
      : null,
    deliveryStatus
      ? React.createElement('delivery-status', {key: 'delivery-status'}, deliveryStatus)
      : null,
  )
})

jest.mock('@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderStackedTopBar', () => props => {
  global.__orderStackedTopBarProps = props
  return React.createElement('order-stacked-top-bar', null, props.children)
})

jest.mock('react-native-vector-icons/MaterialIcons', () => 'material-icons')
jest.mock(
  '@expo/vector-icons',
  () => ({
    MaterialCommunityIcons: 'material-community-icons',
  }),
  {virtual: true},
)

const OrderLogisticsPage =
  require('../../../../../react/pages/orders/sales/OrderLogisticsPage').default
const {
  buildOrderLogisticsSnapshotSource,
} = require('../../../../../react/pages/orders/sales/OrderLogisticsPage')

describe('OrderLogisticsPage', () => {
  it('keeps the delivery order as the snapshot source when logistics payload also sends order data', () => {
    const deliveryOrder = {
      id: 72532,
      orderType: 'delivery',
      addressOrigin: {
        id: 63,
      },
      addressDestination: {
        id: 12790,
      },
    }
    const logisticsPayload = {
      order: {
        id: 71134,
        orderType: 'sale',
        addressOrigin: null,
        addressDestination: null,
      },
      route: {
        pickupAddress: null,
        dropoffAddress: null,
      },
      management: {
        mode: 'quote',
        managedByStore: true,
      },
    }

    expect(
      buildOrderLogisticsSnapshotSource(deliveryOrder, logisticsPayload),
    ).toEqual(
      expect.objectContaining({
        order: deliveryOrder,
        route: logisticsPayload.route,
        management: logisticsPayload.management,
      }),
    )
  })

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
        quoteStateLabel: 'Entrega definida',
        trackingUrl: 'https://tracking.ifood.com/quote/801',
        selected: true,
        status: {
          status: 'closed',
        },
      },
      dropoffAddressParts: {
        primary: 'Rua Cliente, 321',
        secondary: 'Bairro • Sao Paulo / SP',
        postalCode: '09876543',
        complement: '',
      },
      dropoffContact: {
        name: 'CAROLINE',
        phone: '+55 (11) 98888-8888',
        email: '',
      },
      delivery: {
        deliveryPeopleId: 321,
        deliveryPeople: {
          name: 'PAULO VINICIUS CLEMENTINO DIAS',
          phone: '11950751998',
          email: '',
        },
        trackingUrl: 'https://tracking.99food.com/delivery/321',
        requestedAt: '2026-05-17 10:00:00',
        status: 'Fechado',
        currentIntegrationKey: 'food99',
      },
      hasDeliveryOrder: true,
      management: {
        managedByStore: true,
        label: 'Cotacoes da loja',
        mode: 'quote',
        source: 'POS',
      },
      pickupAddressParts: {
        primary: 'Rua Teste, 123',
        secondary: 'Centro • Sao Paulo / SP',
        postalCode: '01234567',
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
          quoteStateLabel: 'Entrega definida',
          requestable: false,
          selected: true,
          trackingUrl: 'https://tracking.ifood.com/quote/801',
          status: {
            status: 'closed',
          },
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
      order: {
        client: {
          id: 88,
          '@id': '/people/88',
          name: 'CAROLINE',
          phone: '+55 (11) 98888-8888',
          email: 'caroline@email.com',
        },
        addressOrigin: {
          id: 11,
          latitude: -23.55052,
          longitude: -46.633308,
          number: 123,
          nickname: 'Loja Teste',
          street: {
            street: 'Rua Teste',
            district: {
              district: 'Centro',
              city: {
                city: 'Sao Paulo',
                state: {
                  uf: 'SP',
                  state: 'Sao Paulo',
                },
              },
            },
            cep: {
              cep: '01234567',
            },
          },
        },
        addressDestination: {
          id: 12,
          latitude: -23.563987,
          longitude: -46.654321,
          number: 321,
          nickname: 'Destino Teste',
          street: {
            street: 'Rua Cliente',
            district: {
              district: 'Bairro',
              city: {
                city: 'Sao Paulo',
                state: {
                  uf: 'SP',
                  state: 'Sao Paulo',
                },
              },
            },
            cep: {
              cep: '09876543',
            },
          },
        },
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

    expect(markup).toContain('Entrega')
    expect(markup).toContain('Cliente')
    expect(markup).toContain('Cliente vinculado')
    expect(markup).toContain('Trocar cliente')
    expect(markup).toContain('Alterar endereco')
    expect(markup).toContain('caroline@email.com')
    expect(markup).toContain('Atualizar tela')
    expect(markup).toContain('Coleta')
    expect(markup).toContain('Entrega')
    expect(markup).not.toContain('Posição atual')
    expect(markup).toContain('Mapa da entrega')
    expect(markup).toContain('Detalhes da entrega')
    expect(markup).toContain('01234567')
    expect(markup).toContain('09876543')
    expect(markup).toContain('CAROLINE')
    expect(markup).toContain('PAULO VINICIUS CLEMENTINO DIAS')
    expect(markup).toContain('11950751998')
    expect(markup).toContain('iFood')
    expect(markup).toContain('Uber')
    expect(markup).toContain('R$ 14,66')
    expect(markup).toContain('Fechado')
    expect(markup).not.toContain('Aceitar corrida')
    expect(markup).not.toContain('Cancelar corrida')
    expect(markup).not.toContain('Aguardando cotacao')
    expect(markup).not.toContain('Atualizar cotações')
    expect(markup).not.toContain('Escolher cotacao')
  })

  it('shows the current delivery order data while awaiting acceptance', () => {
    mockLogisticsSnapshot = {
      canQuote: false,
      currentIntegration: null,
      delivery: {
        deliveryPeopleId: 321,
        deliveryPeople: {
          name: 'PAULO VINICIUS CLEMENTINO DIAS',
          phone: '11950751998',
          email: '',
        },
        trackingUrl: 'https://tracking.99food.com/delivery/321',
        requestedAt: '2026-05-17 10:00:00',
        status: 'Aguardando aceite',
        currentIntegrationKey: 'food99',
      },
      dropoffAddressParts: {
        primary: 'Rua Cliente, 321',
        secondary: 'Bairro • Sao Paulo / SP',
        postalCode: '09876543',
        complement: '',
      },
      dropoffContact: {
        name: 'CAROLINE',
        phone: '+55 (11) 98888-8888',
        email: '',
      },
      hasDeliveryOrder: true,
      isClosedOrder: false,
      management: {
        managedByStore: false,
        label: 'Entrega gerenciada pela integracao',
        mode: 'integration',
        source: 'Food99',
      },
      pickupAddressParts: {
        primary: 'Rua Teste, 123',
        secondary: 'Centro • Sao Paulo / SP',
        postalCode: '01234567',
        complement: 'Apto 10',
      },
      pickupContact: {
        name: 'Loja Teste',
        phone: '+55 (11) 99999-9999',
        email: '',
      },
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
      order: {
        displayId: '72532',
        mainOrder: {
          id: 71134,
          externalCode: '71134',
        },
        mainOrderId: 71134,
        client: {
          id: 88,
          '@id': '/people/88',
          name: 'CAROLINE',
          phone: '+55 (11) 98888-8888',
          email: 'caroline@email.com',
        },
        addressOrigin: {
          id: 11,
          latitude: -23.55052,
          longitude: -46.633308,
          number: 123,
          nickname: 'Loja Teste',
          street: {
            street: 'Rua Teste',
            district: {
              district: 'Centro',
              city: {
                city: 'Sao Paulo',
                state: {
                  uf: 'SP',
                  state: 'Sao Paulo',
                },
              },
            },
            cep: {
              cep: '01234567',
            },
          },
        },
        addressDestination: {
          id: 12,
          latitude: -23.563987,
          longitude: -46.654321,
          number: 321,
          nickname: 'Destino Teste',
          street: {
            street: 'Rua Cliente',
            district: {
              district: 'Bairro',
              city: {
                city: 'Sao Paulo',
                state: {
                  uf: 'SP',
                  state: 'Sao Paulo',
                },
              },
            },
            cep: {
              cep: '09876543',
            },
          },
        },
        status: {
          status: 'Aguardando aceite',
        },
      },
      route: {
        pickupAddress: null,
        dropoffAddress: null,
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
            order: mockLogisticsSnapshot.order,
          },
        },
      }),
    )

    expect(markup).toContain('Aguardando aceite')
    expect(markup).toContain('Aceitar corrida')
    expect(markup).toContain('Cancelar corrida')
    expect(markup).toContain('Pedido atual')
    expect(markup).toContain('#72532')
    expect(markup).not.toContain('#71134')
    expect(markup).toContain('01234567')
    expect(markup).toContain('09876543')
    expect(markup).not.toContain('iFood')
    expect(markup).not.toContain('Uber')
    expect(markup).not.toContain('Atualizar cotações')
    expect(markup).not.toContain('Nenhuma cotacao ainda')
    expect(markup).not.toContain('Trocar cliente')
    expect(markup).not.toContain('Vincular cliente')
    expect(markup).not.toContain('Alterar endereco')
    expect(markup).not.toContain('Cadastro rapido de cliente')
    expect(markup).not.toContain('Selecionar endereco de entrega')
  })

  it('shows the empty state and hides quote request when delivery address is missing', () => {
    mockLogisticsSnapshot = {
      canQuote: true,
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
      providers: [
        {
          key: 'ifood',
          label: 'iFood',
          connected: true,
          online: false,
        },
        {
          key: 'food99',
          label: '99 Food',
          connected: true,
          online: false,
        },
      ],
      quoteStatus: {
        providers: 2,
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

    expect(markup).toContain('Entrega')
    expect(markup).toContain('Vincular cliente')
    expect(markup).toContain('Nenhuma cotacao ainda')
    expect(markup).toContain('Informe um endereço de entrega válido')
    expect(markup).not.toContain('iFood')
    expect(markup).not.toContain('99 Food')
    expect(markup).not.toContain('Solicitar cotações')
  })

  it('hides the integration hero on closed orders while keeping quote history visible', () => {
    mockLogisticsSnapshot = {
      canQuote: false,
      currentIntegration: null,
      delivery: {
        deliveryPeopleId: 321,
        deliveryPeople: {
          name: 'PAULO VINICIUS CLEMENTINO DIAS',
          phone: '11950751998',
          email: '',
        },
        trackingUrl: 'https://tracking.99food.com/delivery/321',
        requestedAt: '2026-05-17 10:00:00',
        status: 'Entrega definida',
        currentIntegrationKey: 'food99',
      },
      isClosedOrder: true,
      dropoffAddressParts: null,
      dropoffContact: null,
      hasDeliveryOrder: true,
      management: {
        managedByStore: false,
        label: 'Entrega gerenciada pela integracao',
        mode: 'integration',
        source: 'Food99',
      },
      pickupAddressParts: null,
      pickupContact: null,
      providers: [
        {
          key: 'food99',
          label: '99 Food',
          connected: true,
          online: true,
        },
      ],
      quoteStatus: {
        providers: 1,
        quotes: 1,
        ready: 0,
        pending: 0,
        selected: 1,
        unavailable: 0,
        error: 0,
      },
      quotes: [
        {
          id: 901,
          providerKey: 'food99',
          providerLabel: '99 Food',
          quoteState: 'selected',
          quoteStateLabel: 'Entrega definida',
          requestable: false,
          selected: true,
          trackingUrl: 'https://tracking.99food.com/delivery/321',
          status: {
            status: 'closed',
          },
        },
      ],
      route: {
        courierContact: {
          name: 'PAULO VINICIUS CLEMENTINO DIAS',
          phone: '11950751998',
          email: '',
        },
      },
      selection: {
        quoteOrderId: 901,
        providerKey: 'food99',
        price: null,
        trackingUrl: 'https://tracking.99food.com/delivery/321',
        selectedAt: '2026-05-17 10:00:00',
      },
      showIntegrationSection: false,
      showQuotesSection: true,
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

    expect(markup).toContain('Entrega')
    expect(markup).toContain('PAULO VINICIUS CLEMENTINO DIAS')
    expect(markup).toContain('11950751998')
    expect(markup).toContain('99 Food')
    expect(markup).toContain('Fechado')
    expect(markup).not.toContain('Atualizar cotações')
    expect(markup).not.toContain('Escolher cotacao')
  })

})
