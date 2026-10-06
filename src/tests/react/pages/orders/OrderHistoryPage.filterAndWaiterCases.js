const React = require('react');
const ReactDOMServer = require('react-dom/server');
const {describe, expect, it} = global;

module.exports = context => {
  const {
    OrderHistoryPage,
    buildHistoryRequestParams,
    ordersStoreConfig,
    formatStoreColumnValue,
    DEFAULT_TABLE_PREFERENCES_STORAGE_KEY,
  } = context;

  it('uses today as the default period when no saved table filter exists', () => {
    const navigation = {
      setOptions: jest.fn(),
      navigate: jest.fn(),
    };

    context.mockStores.people.getters.currentCompany = {
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

    expect(context.mockDefaultExternalFiltersProps?.filters).toMatchObject({
      alterDate: {
        shortcut: 'today',
      },
    });
    expect(context.mockDefaultTableProps?.requestParams).toEqual(
      expect.objectContaining({
        'alterDate[after]': expect.any(String),
        'alterDate[before]': expect.any(String),
      }),
    );
  });

  it('accepts an empty saved period filter from shared table hydration instead of resetting it to today', async () => {
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
    context.mockStores.people.getters.currentCompany = {
      id: 1,
      theme: {
        colors: {},
      },
    };

    const renderer = require('react-test-renderer');
    global.IS_REACT_ACT_ENVIRONMENT = true;
    let tree;
    await renderer.act(async () => {
      tree = renderer.create(React.createElement(OrderHistoryPage, {
        navigation,
        route: {
          params: {
            orderTypeFilter: 'sale',
          },
        },
      }));
    });
    // DefaultTable owns persisted preferences and emits them through this callback.
    await renderer.act(async () => context.mockDefaultTableProps.onFilterChange({}));

    expect(context.mockDefaultExternalFiltersProps?.filters).toEqual({});
    expect(context.mockDefaultTableProps?.filters).toEqual({});
    expect(context.mockDefaultTableProps?.requestParams).not.toHaveProperty('alterDate[after]');
    expect(context.mockDefaultTableProps?.requestParams).not.toHaveProperty('alterDate[before]');
    await renderer.act(async () => tree.unmount());
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

describe('OrderHistoryPage Device waiter toolbar controls', () => {
  it.each([
    ['POS', 'waiter', 'company', false, false],
    ['POS', 'waiter', 'device', false, false],
    ['POS', 'cashier', 'company', true, true],
    ['POS', 'cashier', 'device', false, true],
    ['POS', 'totem', 'company', true, true],
    ['POS', 'single-item', 'company', true, true],
    ['MANAGER', 'waiter', 'company', true, true],
  ])('preserves data visibility and add for %s/%s/%s', (appType, operationMode, visibility, showToolbar, showCount) => {
    context.mockAppType = appType;
    context.mockStores.people.getters.currentCompany = {id: 1};
    context.mockStores.device.getters.item = {id: 'device-912'};
    context.mockStores.device_config.getters.item = {configs: {
      'pos-operation-mode': operationMode,
      'pos-order-visibility': visibility,
    }};
    const restrictToDevice = appType === 'POS' && visibility === 'device';
    context.mockStores.orders.getters.columns = context.mockStores.orders.getters.columns.map(column => ({
      ...column, externalFilter: !restrictToDevice,
      ...(column.name === 'orderDate' ? {show: true} : {}),
    }));
    const navigation = {setOptions: jest.fn(), navigate: jest.fn()};
    ReactDOMServer.renderToStaticMarkup(React.createElement(OrderHistoryPage, {
      navigation, route: {params: {orderTypeFilter: 'sale'}},
    }));
    expect(context.mockDefaultTableProps.showToolbar).toBe(showToolbar);
    expect(context.mockDefaultTableProps.showTotalItemsInFooter !== false).toBe(showCount);
    const isWaiter = appType === 'POS' && operationMode === 'waiter';
    expect(context.mockDefaultTableProps.toolbarActions).toHaveLength(isWaiter ? 0 : 1);
    expect(context.mockDefaultTableProps.showRowActions).toBe(appType !== 'POS');
    expect(context.mockDefaultTableProps.add).toBeNull();
    context.mockDefaultTableProps.onAdd();
    expect(navigation.navigate).toHaveBeenCalledWith('PdvPage', {startNewOrder: true});
    if (restrictToDevice) {
      expect(context.mockDefaultTableProps.requestParams['device.device']).toBe('device-912');
      expect(context.mockDefaultTableProps.requestParams).not.toHaveProperty('report');
    } else {
      expect(context.mockDefaultTableProps.requestParams).not.toHaveProperty('device.device');
      expect(context.mockDefaultTableProps.requestParams.report).toBe(1);
    }
  });
});

};
