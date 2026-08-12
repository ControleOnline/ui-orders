const {
  APP_VERSION,
  createCompany,
  createFakeSession,
  createOpenOrder,
  createPaymentOption,
  createPosMenus,
  createProduct,
} = require('./single-item-fixtures');
const {registerSingleItemApiRoutes} = require('./single-item-api-routes');

const createPosApiMock = async (page, initialState = {}) => {
  const productOne = initialState.productOne || createProduct(101, {
    product: 'Coxinha',
    description: 'Produto unico do modo single-item',
    type: 'product',
    price: 12.5,
    quantity: 1,
    sku: 'CX-101',
  });
  const productTwo = initialState.productTwo || createProduct(102, {
    product: 'Suco',
    description: 'Segundo item para validar replace',
    type: 'service',
    price: 8.9,
    quantity: 1,
    sku: 'SC-102',
  });
  const productGift = initialState.productGift || createProduct(103, {
    product: 'Brinde fidelidade',
    description: 'Brinde do cartao fidelidade',
    type: 'product',
    price: 5.0,
    quantity: 1,
    sku: 'BG-103',
  });
  const state = {
    company: initialState.company || createCompany(3, {
      name: 'Restaurante Centro',
      alias: 'Centro',
      configs: {
        'pos-cash-wallet': 101,
        'pos-cielo-wallet': 102,
      },
    }),
    defaultCompany: initialState.defaultCompany || createCompany(3, {
      name: 'Restaurante Centro',
      alias: 'Centro',
      configs: {
        'pos-default-status': 901,
        'pos-paid-status': 902,
      },
    }),
    user: initialState.user || {
      id: 7,
      name: 'Operador POS',
      alias: 'Operador POS',
      api_key: 'test-api-key',
      active: 1,
    },
    deviceId: initialState.deviceId || 'web-7',
    menus: initialState.menus || createPosMenus(),
    deviceConfig: initialState.deviceConfig || {
      id: 1,
      device: {
        id: 1,
        device: initialState.deviceId || 'web-7',
      },
      people: {
        id: 3,
      },
      type: 'PDV',
      configs: JSON.stringify({
        'config-version': APP_VERSION,
        'pos-operation-mode': 'single-item',
        'pos-gateway': 'cielo',
        'pos-type': 'simple',
        'payment-type-ids': [1, 2],
        'cash-wallet-closed-id': 0,
        'pos-default-status': 901,
        'pos-paid-status': 902,
      }),
    },
    remoteDeviceConfig:
      initialState.remoteDeviceConfig || {
        id: 2,
        device: {
          id: 2,
          device: 'cielo-1',
          alias: 'Cielo Principal',
        },
        people: {
          id: 3,
        },
        type: 'PDV',
      configs: JSON.stringify({
        'config-version': APP_VERSION,
        'pos-gateway': 'cielo',
        'pos-type': 'simple',
        'payment-type-ids': [1, 2],
        'cash-wallet-closed-id': 0,
      }),
    },
    runtimeConfigs: initialState.runtimeConfigs || {
      'pos-cash-wallet': 101,
      'pos-cielo-wallet': 102,
    },
    products: Array.isArray(initialState.products)
      ? initialState.products
      : [productOne, productTwo, productGift],
    order: initialState.order || createOpenOrder({
      id: 123,
      products: [productOne],
      price: productOne.price,
    }),
    orders: Array.isArray(initialState.orders)
      ? initialState.orders
      : [],
    paymentOptions: Array.isArray(initialState.paymentOptions)
      ? initialState.paymentOptions
      : [
          createPaymentOption({
            id: 1,
            walletId: 101,
            walletLabel: 'Caixa',
            paymentTypeLabel: 'Dinheiro',
          }),
          createPaymentOption({
            id: 2,
            walletId: 102,
            walletLabel: 'Cielo',
            paymentTypeLabel: 'Crédito Cielo',
            paymentCode: 'cielo-credit',
          }),
        ],
    openStatus: {
      '@id': '/statuses/901',
      id: 901,
      status: 'open',
      realStatus: 'open',
    },
    paidStatus: {
      '@id': '/statuses/902',
      id: 902,
      status: 'paid',
      realStatus: 'closed',
    },
    invoices: [],
    nextInvoiceId: 5001,
    orderCreatePayloads: [],
    orderItemIncludesProducts:
      initialState.orderItemIncludesProducts !== false,
    orderProductRequests: [],
    orderProductsDelayMs: Number(initialState.orderProductsDelayMs || 0),
    orderStatusDelayMs: Number(initialState.orderStatusDelayMs || 0),
    lastAddProductsPayload: null,
    lastReplaceProductsPayload: null,
    lastInvoicePayload: null,
    peopleSearchResults: Array.isArray(initialState.peopleSearchResults)
      ? initialState.peopleSearchResults
      : [],
    fidelitySnapshots:
      initialState.fidelitySnapshots &&
      typeof initialState.fidelitySnapshots === 'object'
        ? initialState.fidelitySnapshots
        : {},
  };

  state.deviceConfigs = Array.isArray(initialState.deviceConfigs)
    ? initialState.deviceConfigs
    : [state.deviceConfig, state.remoteDeviceConfig];

  state.orders = state.orders.length > 0 ? state.orders : [state.order];

  await registerSingleItemApiRoutes(page, state);

  await page.addInitScript(
    ({ session, config, device, appType }) => {
      const setLocalStorageItem = (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Some initial documents (like about:blank) do not expose storage.
        }
      };

      setLocalStorageItem('session', JSON.stringify(session));
      setLocalStorageItem('config', JSON.stringify(config));
      setLocalStorageItem('device', JSON.stringify(device));
      setLocalStorageItem('app-type', appType);
      setLocalStorageItem('pdv-active-order:3:web-7', '123');
    },
    {
      appType: 'POS',
      session: createFakeSession({
        companyId: 3,
        deviceId: 'web-7',
      }),
      config: { language: 'pt-br' },
      device: {
        id: 'web-7',
        device: 'web-7',
        type: 'WEB',
        appName: 'Browser POS',
        appVersion: APP_VERSION,
        buildNumber: APP_VERSION,
        systemName: 'web',
        systemVersion: 'web',
        deviceType: 'web',
        metadata: {},
      },
    },
  );

  return state;
};

const bootstrapPosBrowser = async page => {
  const bootstrapResponses = [
    page.waitForResponse(
      response =>
        response.request().method() === 'GET' &&
        response.url().includes('/runtime/ip'),
    ),
    page.waitForResponse(
      response =>
        response.request().method() === 'GET' &&
        response.url().includes('/people/companies/my'),
    ),
    page.waitForResponse(
      response =>
        response.request().method() === 'GET' &&
        response.url().includes('/people/company/default'),
    ),
    page.waitForResponse(
      response =>
        response.request().method() === 'GET' &&
        response.url().includes('/device_configs'),
    ),
    page.waitForResponse(
      response =>
        response.request().method() === 'POST' &&
        response.url().includes('/device_configs/add-configs'),
    ),
    page.waitForResponse(
      response =>
        response.request().method() === 'POST' &&
        response.url().includes('/configs/discovery-configs'),
    ),
    page.waitForResponse(
      response =>
        response.request().method() === 'GET' &&
        response.url().includes('/wallet_payment_types'),
    ),
    page.waitForResponse(
      response =>
        response.request().method() === 'GET' &&
        response.url().includes('/devices?'),
    ),
  ];

  await page.goto('/');
  await Promise.all(bootstrapResponses);
  await page.waitForTimeout(500);
};

const bindBrowserDiagnostics = page => {
  page.on('console', message => {
    if (message.type() === 'error') {
      console.log('[browser console error]', message.text());
    }
  });
  page.on('pageerror', error => {
    console.log('[browser pageerror]', error?.stack || error?.message || String(error));
  });
};

module.exports = {
  bindBrowserDiagnostics,
  bootstrapPosBrowser,
  createPosApiMock,
};
