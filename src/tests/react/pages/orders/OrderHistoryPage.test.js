const React = require('react');
const ReactDOMServer = require('react-dom/server');

const {beforeEach, describe, expect, it} = global;

let mockStores = {};
let mockDefaultTableProps = null;
let mockDefaultExternalFiltersProps = null;
let mockAppType = 'MANAGER';

global.localStorage = global.localStorage || {
  clear: jest.fn(),
  getItem: jest.fn(() => null),
  removeItem: jest.fn(),
  setItem: jest.fn(),
};

jest.mock('@store', () => ({
  useStore: jest.fn(name => mockStores[name] || {actions: {}, getters: {}}),
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(() => false),
}));

jest.mock('react-native', () => {
  const React = require('react');

  return {
    Modal: props => React.createElement('modal', null, props.visible ? props.children : null),
    SafeAreaView: props => React.createElement('safe-area-view', null, props.children),
    ScrollView: props => React.createElement('scroll-view', null, props.children),
    StyleSheet: {
      create: styles => styles,
    },
    Text: props => React.createElement('text', null, props.children),
    TextInput: props => React.createElement('text-input', null, props.value),
    TouchableOpacity: props => React.createElement('touchable-opacity', null, props.children),
    TouchableWithoutFeedback: props => React.createElement('touchable-without-feedback', null, props.children),
    View: props => React.createElement('view', null, props.children),
  };
});

jest.mock('react-native-vector-icons/Feather', () => {
  const React = require('react');
  return props => React.createElement('icon', {name: props.name});
});

jest.mock('@controleonline/ui-common/src/react/components/MessageService', () => ({
  useMessage: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: props => {
    const React = require('react');
    return React.createElement('safe-area-view', null, props.children);
  },
}));

jest.mock('@controleonline/ui-common/src/react/components/StateStore', () => props => {
  const React = require('react');
  return React.createElement('state-store', {mode: props.mode || ''}, props.loading || props.children);
});

jest.mock('@controleonline/ui-default/src/react/components/table/DefaultTable', () => props => {
  const React = require('react');
  mockDefaultTableProps = props;
  return React.createElement('default-table');
});

jest.mock('@controleonline/ui-default/src/react/components/filters/DefaultExternalFilters', () => props => {
  const React = require('react');
  mockDefaultExternalFiltersProps = props;
  return React.createElement('default-external-filters');
});

jest.mock('@controleonline/ui-orders/src/react/components/OrderHeader', () => () => {
  const React = require('react');
  return React.createElement('order-header');
});

jest.mock('@controleonline/ui-orders/src/react/hooks/usePosCartSession', () => () => ({
  resolveCounterStartDestination: jest.fn(),
}));

jest.mock('@controleonline/ui-orders/src/react/utils/counterOrderFlow', () => ({
  shouldResumeCounterOrderFlow: jest.fn(() => false),
}));

jest.mock('@appType', () => ({
  get app_type() {
    return mockAppType;
  },
  app_type_base: 'ADMIN',
}));

const OrderHistoryPageModule =
  require('../../../../react/pages/orders/OrderHistoryPage');
const OrderHistoryPage = OrderHistoryPageModule.default;
const {buildHistoryRequestParams} = OrderHistoryPageModule;
const ordersStoreConfig = require('../../../../store/orders').default;
const {
  formatStoreColumnValue,
} = require('@controleonline/ui-common/src/react/utils/storeColumns');
const {
  DEFAULT_TABLE_PREFERENCES_STORAGE_KEY,
} = require('@controleonline/ui-default/src/react/utils/tableVisibleColumnsPreferences');

const createLocalStorageMock = () => {
  let storage = {};

  return {
    clear: () => {
      storage = {};
    },
    getItem: key => (key in storage ? storage[key] : null),
    removeItem: key => {
      delete storage[key];
    },
    setItem: (key, value) => {
      storage[key] = String(value);
    },
  };
};

describe('OrderHistoryPage', () => {
  beforeEach(() => {
    mockDefaultTableProps = null;
    mockDefaultExternalFiltersProps = null;
    mockAppType = 'MANAGER';
    global.localStorage = createLocalStorageMock();
    global.t = {
      t: jest.fn((store, type, key) => {
        if (store === 'orders' && type === 'label' && key === 'loading') {
          return 'Carregando pedidos...';
        }

        return '';
      }),
    };

    mockStores = {
      people: {
        actions: {
          get: jest.fn(),
          getItems: jest.fn(),
        },
        getters: {
          currentCompany: undefined,
          defaultCompany: {
            configs: {},
          },
        },
      },
      status: {
        actions: {
          getItems: jest.fn(),
        },
        getters: {
          items: [],
        },
      },
      theme: {
        getters: {
          colors: {},
        },
      },
      device_config: {
        getters: {
          configs: {},
        },
      },
      device: {
        getters: {
          item: {},
        },
      },
      orders: {
        actions: {
          getItems: jest.fn(),
          getHistorySummaryApps: jest.fn(),
          getCancelReasons: jest.fn(),
          cancelOrder: jest.fn(),
          setColumns: jest.fn(),
          syncOrder: jest.fn(),
        },
        getters: {
          items: [],
          isLoading: false,
          isLoadingList: false,
          reload: false,
          summary: {},
          columns: [
            {
              name: 'app',
              label: 'channel',
              externalFilter: true,
              emptyOptionLabel: 'All',
              list: [
                {value: 'POS', label: 'POS'},
                {value: 'Food99', label: 'Food99'},
                {value: 'iFood', label: 'iFood'},
                {value: 'SHOP', label: 'SHOP'},
              ],
            },
            {
              name: 'status',
              label: 'status',
              externalFilter: true,
              emptyOptionLabel: 'All',
              list: 'status/getItems',
            },
            {
              name: 'orderDate',
              label: 'orderDate',
              externalFilter: true,
              inputType: 'date-range',
              type: 'range-date',
            },
            {
              name: 'alterDate',
              label: 'period',
              externalFilter: true,
              inputType: 'date-range',
              type: 'range-date',
            },
          ],
        },
      },
      auth: {
        getters: {
          user: {
            people: {
              alias: 'Operador',
            },
          },
        },
      },
    };
  });

  it('renders the orders loading preset while the company context is missing', () => {
    const navigation = {
      setOptions: jest.fn(),
      navigate: jest.fn(),
    };

    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHistoryPage, {
        navigation,
        route: {
          params: {},
        },
      }),
    );

    expect(markup).toContain('state-store');
    expect(markup).toContain('mode="display"');
    expect(markup).toContain('Carregando pedidos...');
  });

  it('passes a custom card renderer to the order history table', () => {
    const navigation = {
      setOptions: jest.fn(),
      navigate: jest.fn(),
    };

    mockStores.people.getters.currentCompany = {
      id: 1,
      theme: {
        colors: {},
      },
    };

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHistoryPage, {
        navigation,
        route: {
          params: {},
        },
      }),
    );

    expect(typeof mockDefaultTableProps?.renderCard).toBe('function');
  });

  it('adds order cancellation actions and the reason registry shortcut to the table', () => {
    const navigation = {
      setOptions: jest.fn(),
      navigate: jest.fn(),
    };

    mockStores.people.getters.currentCompany = {
      id: 1,
      theme: {
        colors: {},
      },
    };

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHistoryPage, {
        navigation,
        route: {
          params: {},
        },
      }),
    );

    expect(mockDefaultTableProps?.showRowActions).toBe(true);
    expect(typeof mockDefaultTableProps?.rowActionsComponent).toBe('function');
    expect(mockDefaultTableProps?.toolbarActions).toEqual([
      expect.objectContaining({
        key: 'order-cancellation-reasons',
        icon: 'tag',
        hidden: false,
      }),
    ]);

    expect(
      ReactDOMServer.renderToStaticMarkup(
        mockDefaultTableProps.rowActionsComponent({
          row: {
            id: 1,
            status: {realStatus: 'open', status: 'Open'},
          },
        }),
      ),
    ).toContain('name="x-circle"');
    expect(
      ReactDOMServer.renderToStaticMarkup(
        mockDefaultTableProps.rowActionsComponent({
          row: {
            id: 2,
            cancellationReason: {name: 'Desistencia'},
            canceledBy: {name: 'Operador'},
            status: {realStatus: 'canceled', status: 'Canceled'},
          },
        }),
      ),
    ).toContain('name="eye"');
  });

  it('formats table status values with normalized status translations', () => {
    global.t.t = jest.fn((store, type, key) => {
      if (store === 'orders' && type === 'status' && key === 'open') {
        return 'Aberto';
      }

      if (store === 'orders' && type === 'status' && key === 'canceled') {
        return 'Cancelado';
      }

      return '';
    });

    const columns = ordersStoreConfig.state.columns;

    expect(
      formatStoreColumnValue({
        columns,
        fieldName: 'status',
        row: {
          status: {realStatus: 'open', status: 'Open'},
        },
        storeName: 'orders',
        value: {realStatus: 'open', status: 'Open'},
      }),
    ).toBe('Aberto');

    expect(
      formatStoreColumnValue({
        columns,
        fieldName: 'status',
        row: {
          status: {realStatus: 'canceled', status: 'Canceled'},
        },
        storeName: 'orders',
        value: {realStatus: 'canceled', status: 'Canceled'},
      }),
    ).toBe('Cancelado');
    expect(global.t.t).not.toHaveBeenCalledWith('orders', 'span', 'Aberto');
  });

  it('normalizes status filter labels before translating them', () => {
    const navigation = {
      setOptions: jest.fn(),
      navigate: jest.fn(),
    };

    global.t.t = jest.fn((store, type, key) => {
      if (store === 'orders' && type === 'status' && key === 'open') {
        return 'Aberto';
      }

      if (store === 'orders' && type === 'status' && key === 'canceled') {
        return 'Cancelado';
      }

      return '';
    });
    mockStores.people.getters.currentCompany = {
      id: 1,
      theme: {
        colors: {},
      },
    };
    mockStores.status.getters.items = [
      {
        '@id': '/statuses/1',
        context: 'order',
        status: 'Open',
      },
      {
        '@id': '/statuses/2',
        context: 'order',
        status: 'Canceled',
      },
    ];

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHistoryPage, {
        navigation,
        route: {
          params: {},
        },
      }),
    );

    expect(mockDefaultExternalFiltersProps?.getOptionsForColumn({name: 'status'})).toEqual([
      expect.objectContaining({
        '@id': '/statuses/1',
        context: 'order',
        label: 'Aberto',
        status: 'Open',
        value: '/statuses/1',
      }),
      expect.objectContaining({
        '@id': '/statuses/2',
        context: 'order',
        label: 'Cancelado',
        status: 'Canceled',
        value: '/statuses/2',
      }),
    ]);
  });

  it('configures POS device-only history without toolbar, row actions, or company orders', () => {
    mockAppType = 'POS';
    const navigation = {
      setOptions: jest.fn(),
      navigate: jest.fn(),
    };

    mockStores.people.getters.currentCompany = {
      id: 1,
      theme: {
        colors: {},
      },
    };
    mockStores.device_config.getters.item = {
      configs: {
        'pos-order-visibility': 'device',
      },
    };
    mockStores.device.getters.item = {
      id: 'a74273dc8b44000e',
    };
    mockStores.orders.getters.columns = [
      {
        name: 'app',
        label: 'channel',
        externalFilter: false,
        emptyOptionLabel: 'All',
      },
      {
        name: 'status',
        label: 'status',
        externalFilter: false,
        emptyOptionLabel: 'All',
        list: 'status/getItems',
      },
      {
        name: 'orderDate',
        label: 'orderDate',
        externalFilter: false,
        inputType: 'date-range',
        show: true,
        type: 'range-date',
      },
      {
        name: 'alterDate',
        label: 'period',
        externalFilter: false,
        inputType: 'date-range',
        type: 'range-date',
      },
    ];

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHistoryPage, {
        navigation,
        route: {
          params: {
            orderTypeFilter: 'sale',
          },
        },
      }),
    );

    expect(mockDefaultTableProps?.showToolbar).toBe(false);
    expect(mockDefaultTableProps?.showRowActions).toBe(false);
    expect(mockDefaultTableProps?.requestParams).toMatchObject({
      provider: '/people/1',
      'device.device': 'a74273dc8b44000e',
      'status.realStatus': 'open',
    });
    expect(mockDefaultTableProps?.requestParams).not.toHaveProperty('report');
    expect(mockDefaultExternalFiltersProps?.columns).toBeUndefined();
  });

  it('requests the report summary in the main history query for sale orders', () => {
    const navigation = {
      setOptions: jest.fn(),
      navigate: jest.fn(),
    };

    mockStores.people.getters.currentCompany = {
      id: 1,
      theme: {
        colors: {},
      },
    };
    mockStores.orders.getters.summary = {
      report: {
        apps: [
          {
            key: 'iFood',
            label: 'iFood',
            orders: 3,
            units: 4,
          },
        ],
      },
    };

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHistoryPage, {
        navigation,
        route: {
          params: {
            orderTypeFilter: 'sale',
          },
        },
      }),
    );

    expect(mockDefaultTableProps?.requestParams).toMatchObject({
      provider: '/people/1',
      report: 1,
    });
    expect(mockDefaultExternalFiltersProps?.columns).toBeUndefined();
    expect(mockDefaultExternalFiltersProps?.getOptionsForColumn({name: 'app'})).toEqual([]);
    expect(mockDefaultTableProps?.requestParams?.orderType).toEqual([
      'sale',
      'cart',
      'online',
      'manual',
    ]);
  });

  it('uses today as the default period when no saved table filter exists', () => {
    const navigation = {
      setOptions: jest.fn(),
      navigate: jest.fn(),
    };

    mockStores.people.getters.currentCompany = {
      id: 1,
      theme: {
        colors: {},
      },
    };

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHistoryPage, {
        navigation,
        route: {
          params: {
            orderTypeFilter: 'sale',
          },
        },
      }),
    );

    expect(mockDefaultExternalFiltersProps?.filters).toMatchObject({
      alterDate: {
        shortcut: 'today',
      },
    });
    expect(mockDefaultTableProps?.requestParams).toEqual(
      expect.objectContaining({
        'alterDate[after]': expect.any(String),
        'alterDate[before]': expect.any(String),
      }),
    );
  });

  it('hydrates an empty saved period filter instead of resetting it to today', () => {
    const navigation = {
      setOptions: jest.fn(),
      navigate: jest.fn(),
    };

    global.localStorage.setItem(
      DEFAULT_TABLE_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        orders: {
          'order-history-page': {
            filters: {},
          },
        },
      }),
    );
    mockStores.people.getters.currentCompany = {
      id: 1,
      theme: {
        colors: {},
      },
    };

    ReactDOMServer.renderToStaticMarkup(
      React.createElement(OrderHistoryPage, {
        navigation,
        route: {
          params: {
            orderTypeFilter: 'sale',
          },
        },
      }),
    );

    expect(mockDefaultExternalFiltersProps?.filters).toEqual({});
    expect(mockDefaultTableProps?.filters).toEqual({});
    expect(mockDefaultTableProps?.requestParams).not.toHaveProperty('alterDate[after]');
    expect(mockDefaultTableProps?.requestParams).not.toHaveProperty('alterDate[before]');
  });

  it('includes an orderDate range in the history query when the filter is filled', () => {
    expect(
      buildHistoryRequestParams({
        appType: 'MANAGER',
        canViewCompanyOrders: true,
        currentCompanyId: 1,
        currentDeviceId: null,
        filters: {
          orderDate: {
            shortcut: 'custom',
            customRange: {
              from: '2026-07-01',
              to: '2026-07-10',
            },
          },
        },
        orderTypeFilter: 'sale',
        showAdvancedFilters: true,
      }),
    ).toMatchObject({
      provider: '/people/1',
      report: 1,
      'orderDate[after]': '2026-07-01 00:00:00',
      'orderDate[before]': '2026-07-10 23:59:59',
    });
  });
});
