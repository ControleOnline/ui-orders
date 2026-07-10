const React = require('react');
const ReactDOMServer = require('react-dom/server');
const {jest} = require('@jest/globals');

const {beforeEach, describe, expect, it} = global;

let mockStores = {};
let defaultTableProps = null;

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

jest.mock('@controleonline/ui-layout/src/react/components/StateStore', () => props =>
  React.createElement('state-store', {mode: props.mode || ''}, props.loading || props.children),
);

jest.mock('@controleonline/ui-default/src/react/components/table/DefaultTable', () => props => {
  defaultTableProps = props;
  return React.createElement('default-table');
});

jest.mock('@controleonline/ui-default/src/react/components/filters/CompactFilterSelector', () => () =>
  React.createElement('compact-filter-selector'),
);

jest.mock('@controleonline/ui-default/src/react/components/filters/DateShortcutFilter', () => () =>
  React.createElement('date-shortcut-filter'),
);

jest.mock('@controleonline/ui-orders/src/react/components/OrderHeader', () => () =>
  React.createElement('order-header'),
);

jest.mock('@controleonline/ui-orders/src/react/hooks/usePosCartSession', () => () => ({
  resolveCounterStartDestination: jest.fn(),
}));

jest.mock('@controleonline/ui-orders/src/react/utils/counterOrderFlow', () => ({
  shouldResumeCounterOrderFlow: jest.fn(() => false),
}));

const OrderHistoryPage =
  require('../../../../react/pages/orders/OrderHistoryPage').default;

describe('OrderHistoryPage', () => {
  beforeEach(() => {
    defaultTableProps = null;
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
          syncOrder: jest.fn(),
        },
        getters: {
          items: [],
          isLoading: false,
          isLoadingList: false,
          reload: false,
          summary: {},
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
});
