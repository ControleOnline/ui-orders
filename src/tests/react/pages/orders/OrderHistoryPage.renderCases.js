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
          params: {},
        },
      }),
    );

    expect(typeof context.mockDefaultTableProps?.renderCard).toBe('function');
  });

  it('adds order cancellation actions and the reason registry shortcut to the table', () => {
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
          params: {},
        },
      }),
    );

    expect(context.mockDefaultTableProps?.showRowActions).toBe(true);
    expect(typeof context.mockDefaultTableProps?.rowActionsComponent).toBe('function');
    expect(context.mockDefaultTableProps?.toolbarActions).toEqual([
      expect.objectContaining({
        key: 'order-cancellation-reasons',
        icon: 'tag',
        hidden: false,
      }),
    ]);

    expect(
      ReactDOMServer.renderToStaticMarkup(
        context.mockDefaultTableProps.rowActionsComponent({
          openRow: jest.fn(),
          row: {
            id: 1,
            status: {realStatus: 'open', status: 'Open'},
          },
        }),
      ),
    ).toContain('name="trash-2"');
    expect(
      ReactDOMServer.renderToStaticMarkup(
        context.mockDefaultTableProps.rowActionsComponent({
          openRow: jest.fn(),
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
    context.mockStores.people.getters.currentCompany = {
      id: 1,
      theme: {
        colors: {},
      },
    };
    context.mockStores.status.getters.items = [
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

    expect(context.mockDefaultTableProps?.getOptionsForColumn({name: 'status'})).toEqual([
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
    context.mockAppType = 'POS';
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
    context.mockStores.device_config.getters.item = {
      configs: {
        'pos-order-visibility': 'device',
      },
    };
    context.mockStores.device.getters.item = {
      id: 'a74273dc8b44000e',
    };
    context.mockStores.orders.getters.columns = [
      {
        name: 'app', compactLabel: 'Canal',
        label: 'channel',
        externalFilter: false, compactFilter: false,
        emptyOptionLabel: 'All',
      },
      {
        name: 'status', compactLabel: 'Status', compactStatusColors: true,
        label: 'status',
        externalFilter: false, compactFilter: false,
        emptyOptionLabel: 'All',
        list: 'status/getItems',
      },
      {
        name: 'orderDate', compactLabel: 'Compra',
        label: 'orderDate',
        externalFilter: false, compactFilter: false,
        inputType: 'date-range',
        show: true,
        type: 'range-date',
      },
      {
        name: 'alterDate', compactLabel: 'Atualização',
        label: 'period',
        externalFilter: false, compactFilter: false,
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

    expect(context.mockDefaultTableProps?.showToolbar).toBe(false);
    expect(context.mockDefaultTableProps?.showRowActions).toBe(false);
    expect(context.mockDefaultTableProps?.requestParams).toMatchObject({
      provider: '/people/1',
      'device.device': 'a74273dc8b44000e',
      'status.realStatus': 'open',
    });
    expect(context.mockDefaultTableProps?.requestParams).not.toHaveProperty('report');
    expect(context.mockDefaultExternalFiltersProps?.columns).toBeUndefined();
  });

  it('requests the report summary in the main history query for sale orders', () => {
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
    context.mockStores.orders.getters.summary = {
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

    expect(context.mockDefaultTableProps?.requestParams).toMatchObject({
      provider: '/people/1',
      report: 1,
    });
    expect(context.mockDefaultExternalFiltersProps?.columns).toBeUndefined();
    expect(context.mockDefaultTableProps?.getOptionsForColumn({name: 'app'})).toBeUndefined();
    expect(context.mockStores.orders.getters.columns.find(column => column.key === 'app' || column.name === 'app')).toMatchObject({externalFilter: true, label: 'channel'});
    expect(context.mockDefaultTableProps?.requestParams?.orderType).toEqual([
      'sale',
      'cart',
      'online',
      'manual',
    ]);
  });


};
