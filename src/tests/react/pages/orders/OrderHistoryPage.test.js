const React = require('react');
const ReactDOMServer = require('react-dom/server');

const {beforeEach, describe, expect, it} = global;

let mockStores = {};
let mockDefaultTableProps = null;
let mockDefaultExternalFiltersProps = null;

jest.mock('@store', () => ({
  useStore: jest.fn(name => mockStores[name] || {actions: {}, getters: {}}),
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(() => false),
}));

jest.mock('react-native', () => {
  const React = require('react');

  return {
    SafeAreaView: props => React.createElement('safe-area-view', null, props.children),
    StyleSheet: {
      create: styles => styles,
    },
    Text: props => React.createElement('text', null, props.children),
    TouchableOpacity: props => React.createElement('touchable-opacity', null, props.children),
    View: props => React.createElement('view', null, props.children),
  };
});

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
  app_type: 'MANAGER',
  app_type_base: 'ADMIN',
}));

const OrderHistoryPage =
  require('../../../../react/pages/orders/OrderHistoryPage').default;

describe('OrderHistoryPage', () => {
  beforeEach(() => {
    mockDefaultTableProps = null;
    mockDefaultExternalFiltersProps = null;
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
              name: 'alterDate',
              label: 'period',
              externalFilter: true,
              inputType: 'date-range',
              type: 'range-date',
            },
          ],
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
});
