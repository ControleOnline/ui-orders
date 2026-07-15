const {expect, test} = require('playwright/test');
const packageJson = require('../../../../../../../package.json');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'API-TOKEN, APP-DOMAIN, DEVICE, ACCEPT, CONTENT-TYPE, X-Requested-With',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

const APP_VERSION = packageJson?.version || '1.0.0';

const jsonHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'application/ld+json; charset=utf-8',
});

const textHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'text/css; charset=utf-8',
});

const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  summary: {},
});

const createFakeSession = ({
  userId = 7,
  companyId = 3,
  apiKey = 'test-api-key',
  deviceId = 'web-7',
} = {}) => ({
  id: userId,
  people: `/people/${userId}`,
  api_key: apiKey,
  token: apiKey,
  active: 1,
  mycompany: companyId,
  deviceId,
});

const createCompany = (id, overrides = {}) => ({
  id,
  name: overrides.name || `Empresa ${id}`,
  alias: overrides.alias || `Empresa ${id}`,
  panel_enabled: overrides.panel_enabled !== undefined ? overrides.panel_enabled : true,
  enabled: overrides.enabled !== undefined ? overrides.enabled : true,
  commercial_enabled:
    overrides.commercial_enabled !== undefined ? overrides.commercial_enabled : true,
  theme:
    overrides.theme || {
      colors: {
        primary: '#0EA5E9',
        secondary: '#F97316',
      },
    },
  configs: overrides.configs || {},
});

const createProduct = (id, overrides = {}) => ({
  '@id': `/products/${id}`,
  id,
  product: overrides.product || `Produto ${id}`,
  description: overrides.description || '',
  type: overrides.type || 'product',
  price: Number(overrides.price ?? 0),
  quantity: Number(overrides.quantity ?? 0),
  sku: overrides.sku || `SKU-${id}`,
  active: overrides.active !== undefined ? overrides.active : 1,
});

const buildOrderProduct = (product, quantity = 1) => ({
  id: Number(product.id) * 10,
  '@id': `/order_products/${Number(product.id) * 10}`,
  product: { ...product },
  quantity,
  price: Number(product.price || 0),
  total: Number(product.price || 0) * Number(quantity || 0),
  order: '/orders/123',
});

const createOpenOrder = ({id = 123, products = [], price = 0}) => ({
  '@id': `/orders/${id}`,
  id,
  app: 'POS',
  orderType: 'cart',
  provider: '/people/3',
  people: '/people/3',
  status: {
    '@id': '/statuses/901',
    id: 901,
    status: 'open',
    realStatus: 'open',
  },
  price: Number(price || 0),
  payable: Number(price || 0),
  orderProducts: products.map(product => buildOrderProduct(product, 1)),
});

const createPosMenus = () => ({
  modules: {
    home: {
      id: 'pos-home',
      label: 'Operacao',
      icon: 'shopping-bag',
      menus: [
        {
          id: 'pos-home-orders',
          menuKey: 'orders',
          menuType: 'home',
          label: 'Pedidos',
          route: 'OrderHistoryPage',
          icon: 'shopping-bag',
          color: '#0EA5E9',
          sortOrder: 10,
        },
        {
          id: 'pos-home-cash',
          menuKey: 'cash_register',
          menuType: 'home',
          label: 'Caixa',
          route: 'CashRegisterIndex',
          icon: 'credit-card',
          color: '#4682B4',
          sortOrder: 20,
        },
      ],
    },
    toolbar: {
      id: 'pos-toolbar',
      label: 'Navegacao',
      icon: 'menu',
      menus: [
        {
          id: 'pos-toolbar-home',
          menuKey: 'home',
          menuType: 'toolbar',
          label: 'Home',
          route: 'HomePage',
          icon: 'home',
          color: '#0EA5E9',
          sortOrder: 10,
        },
        {
          id: 'pos-toolbar-orders',
          menuKey: 'orders',
          menuType: 'toolbar',
          label: 'Pedidos',
          route: 'OrderHistoryPage',
          icon: 'shopping-bag',
          color: '#0EA5E9',
          sortOrder: 20,
        },
        {
          id: 'pos-toolbar-cash',
          menuKey: 'cash_register',
          menuType: 'toolbar',
          label: 'Caixa',
          route: 'CashRegisterIndex',
          icon: 'credit-card',
          color: '#4682B4',
          sortOrder: 30,
        },
        {
          id: 'pos-toolbar-profile',
          menuKey: 'profile',
          menuType: 'toolbar',
          label: 'Perfil',
          route: 'ProfilePage',
          icon: 'user',
          color: '#64748B',
          sortOrder: 40,
        },
      ],
    },
  },
});

const createPaymentOption = ({
  id,
  walletId,
  walletLabel,
  paymentTypeLabel,
  paymentCode = '',
}) => ({
  '@id': `/wallet_payment_types/${id}`,
  id,
  wallet: {
    '@id': `/wallets/${walletId}`,
    id: walletId,
    wallet: walletLabel,
  },
  paymentType: {
    '@id': `/payment_types/${id}`,
    id,
    paymentType: paymentTypeLabel,
    name: paymentTypeLabel,
  },
  paymentCode,
});

const buildRemotePaymentResultMessage = ({
  invoiceId,
  orderId,
  paidAmount,
  payment,
  requestKey,
  targetDeviceId,
  targetDeviceLabel,
  targetGateway,
}) => ({
  destination: 'web-7',
  store: 'invoice',
  action: 'pay-result',
  requestKey,
  status: 'success',
  order: String(orderId || '').replace(/\D/g, ''),
  total: Number(paidAmount || 0),
  paidAmount: Number(paidAmount || 0),
  paymentLabel: payment?.paymentType?.paymentType || 'Pagamento',
  targetDeviceId,
  targetDeviceLabel,
  targetGateway,
  invoice: {
    '@id': `/invoices/${invoiceId}`,
    id: invoiceId,
    dueDate: '2026-06-11T00:00:00.000Z',
    status: '/statuses/902',
    destinationWallet: payment?.wallet?.['@id'] || '/wallets/102',
    paymentType: payment?.paymentType?.['@id'] || '/payment_types/2',
    price: Number(paidAmount || 0),
    receiver: '/people/3',
    order: `/orders/${String(orderId || '').replace(/\D/g, '')}`,
  },
});

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
      : [productOne, productTwo],
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
    lastReplaceProductsPayload: null,
    lastInvoicePayload: null,
  };

  state.deviceConfigs = Array.isArray(initialState.deviceConfigs)
    ? initialState.deviceConfigs
    : [state.deviceConfig, state.remoteDeviceConfig];

  state.orders = state.orders.length > 0 ? state.orders : [state.order];

  const fulfillJson = async (route, body, status = 200) =>
    route.fulfill({
      status,
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    });

  const fulfillText = async (route, body, status = 200) =>
    route.fulfill({
      status,
      headers: textHeaders(),
      body,
    });

  const postBody = request => {
    try {
      return request.postDataJSON();
    } catch {
      try {
        return JSON.parse(request.postData() || '{}');
      } catch {
        return {};
      }
    }
  };

  const resolveProductsByIds = items =>
    (Array.isArray(items) ? items : [])
      .map(item => {
        const productId = Number(item?.product || item?.productId || 0);
        const product = state.products.find(current => Number(current.id) === productId);

        if (!product) {
          return null;
        }

        const quantity = Math.max(1, Number(item?.quantity || 1));

        return buildOrderProduct(product, quantity);
      })
      .filter(Boolean);

  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/+/, '');
    const method = request.method().toUpperCase();

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: CORS_HEADERS,
        body: '',
      });
    }

    if (pathname === 'themes-colors.css') {
      return fulfillText(
        route,
        ':root { --primary: #0ea5e9; --secondary: #f97316; --accent: #14b8a6; }',
      );
    }

    if (pathname === 'runtime/ip') {
      return fulfillJson(route, {
        ip: '127.0.0.1',
        member: [{ ip: '127.0.0.1' }],
      });
    }

    if (pathname === 'people/companies/my') {
      return fulfillJson(route, collection([state.company]));
    }

    if (pathname === 'people/company/default') {
      return fulfillJson(route, state.defaultCompany);
    }

    if (pathname === 'people/7') {
      return fulfillJson(route, state.user);
    }

    if (pathname === 'menus-people') {
      return fulfillJson(route, state.menus);
    }

    if (pathname.startsWith('translates')) {
      return fulfillJson(route, collection([]));
    }

    if (pathname === 'configs/discovery-configs' && method === 'POST') {
      return fulfillJson(route, {
        configs: state.runtimeConfigs,
      });
    }

    if (pathname === 'devices' && method === 'GET') {
      const deviceId = String(url.searchParams.get('device') || state.deviceId || '').trim();

      return fulfillJson(
        route,
        collection(
          deviceId
            ? [
                {
                  id: 1,
                  device: deviceId,
                  alias: 'Browser Device',
                  type: 'WEB',
                  metadata: {
                    app: {
                      version: APP_VERSION,
                    },
                  },
                },
              ]
            : [],
        ),
      );
    }

    if (pathname === 'devices' && method === 'POST') {
      const body = postBody(request);
      const savedDevice = {
        id: 1,
        device: String(body?.device || state.deviceId || 'web-7'),
        alias: body?.alias || 'Browser Device',
        type: body?.type || 'WEB',
        metadata: body?.metadata || {
          app: {
            version: APP_VERSION,
          },
        },
      };

      return fulfillJson(route, savedDevice);
    }

    if (pathname === 'device_configs' && method === 'GET') {
      return fulfillJson(route, collection(state.deviceConfigs));
    }

    if (pathname === 'device_configs/add-configs' && method === 'POST') {
      const body = postBody(request);
      const nextConfigs =
        typeof body?.configs === 'string'
          ? body.configs
          : JSON.stringify(body?.configs || {});

      state.deviceConfig = {
        ...state.deviceConfig,
        device: {
          id: 1,
          device: String(body?.device || state.deviceId || 'web-7'),
        },
        people: body?.people ? { id: Number(String(body.people).replace(/\D+/g, '')) } : { id: 3 },
        type: body?.type || state.deviceConfig.type || 'PDV',
        configs: nextConfigs,
      };

      state.deviceConfigs = (Array.isArray(state.deviceConfigs) ? state.deviceConfigs : [])
        .map(deviceConfig =>
          String(deviceConfig?.device?.device || deviceConfig?.device || '') ===
          String(body?.device || state.deviceId || 'web-7')
            ? state.deviceConfig
            : deviceConfig,
        );

      if (
        !state.deviceConfigs.some(
          deviceConfig =>
            String(deviceConfig?.device?.device || deviceConfig?.device || '') ===
            String(body?.device || state.deviceId || 'web-7'),
        )
      ) {
        state.deviceConfigs.unshift(state.deviceConfig);
      }

      return fulfillJson(route, state.deviceConfig);
    }

    if (pathname === 'orders' && method === 'GET') {
      return fulfillJson(route, collection(state.orders));
    }

    const orderItemMatch = pathname.match(/^orders\/(\d+)$/);
    if (orderItemMatch && method === 'GET') {
      return fulfillJson(route, state.order);
    }

    if (pathname === 'orders' && method === 'POST') {
      const body = postBody(request);

      state.order = {
        ...state.order,
        ...body,
        id: state.order.id,
        '@id': state.order['@id'],
        orderProducts: Array.isArray(body?.orderProducts)
          ? body.orderProducts
          : state.order.orderProducts,
      };
      state.orders = [state.order];

      return fulfillJson(route, state.order);
    }

    const replaceProductsMatch = pathname.match(/^orders\/(\d+)\/replace-products$/);
    if (replaceProductsMatch && method === 'PUT') {
      const body = postBody(request);
      const nextOrderProducts = resolveProductsByIds(body);
      const nextPrice = nextOrderProducts.reduce(
        (sum, item) => sum + Number(item?.total || 0),
        0,
      );

      state.lastReplaceProductsPayload = body;
      state.order = {
        ...state.order,
        orderProducts: nextOrderProducts,
        price: nextPrice,
        payable: nextPrice,
      };
      state.orders = [state.order];

      return fulfillJson(route, state.order);
    }

    if (pathname === 'products' && method === 'GET') {
      return fulfillJson(route, collection(state.products));
    }

    if (pathname === 'wallet_payment_types' && method === 'GET') {
      const walletIds = [
        ...url.searchParams.getAll('wallet[]'),
        ...url.searchParams.getAll('wallet'),
        url.searchParams.get('wallet'),
      ]
        .map(value => String(value || '').trim())
        .filter(Boolean);

      const requestedWalletIds = new Set(walletIds);
      const filteredPaymentOptions = requestedWalletIds.size
        ? state.paymentOptions.filter(payment =>
            requestedWalletIds.has(String(payment?.wallet?.id || '').trim()),
          )
        : state.paymentOptions;

      return fulfillJson(route, collection(filteredPaymentOptions));
    }

    if (pathname === 'statuses' && method === 'GET') {
      const context = String(url.searchParams.get('context') || '').trim().toLowerCase();

      if (context === 'invoice') {
        return fulfillJson(route, collection([state.paidStatus]));
      }

      if (context === 'order') {
        return fulfillJson(route, collection([state.openStatus]));
      }

      return fulfillJson(route, collection([state.openStatus, state.paidStatus]));
    }

    if (pathname === 'invoices' && method === 'GET') {
      return fulfillJson(route, collection(state.invoices));
    }

    if (pathname === 'invoices' && method === 'POST') {
      const body = postBody(request);
      const invoiceId = state.nextInvoiceId++;
      const invoice = {
        '@id': `/invoices/${invoiceId}`,
        id: invoiceId,
        dueDate: body?.dueDate || '2026-06-11T00:00:00.000Z',
        status: body?.status || state.paidStatus['@id'],
        destinationWallet: body?.destinationWallet || '/wallets/101',
        paymentType: body?.paymentType || '/payment_types/1',
        price: Number(body?.price || 0),
        receiver: body?.receiver || '/people/3',
        order: body?.order || state.order['@id'],
      };

      state.lastInvoicePayload = body;
      state.invoices.push(invoice);

      return fulfillJson(route, invoice);
    }

    if (pathname === 'order_invoices' && method === 'GET') {
      return fulfillJson(route, collection([]));
    }

    if (pathname === 'websocket' && method === 'POST') {
      return fulfillJson(route, {});
    }

    return fulfillJson(route, collection([]));
  });

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

test.describe('single-item browser smoke', () => {
  test('does not request a linked order code for loyalty stamp before customer CPF identification', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    const company = createCompany(3, {
      name: 'Restaurante Centro',
      alias: 'Centro',
      configs: {
        'pos-cash-wallet': 101,
        'pos-cielo-wallet': 102,
        'shop-loyalty-coupons-enabled': '1',
      },
    });
    const deviceConfig = {
      id: 1,
      device: {
        id: 1,
        device: 'web-7',
      },
      people: {
        id: 3,
      },
      type: 'PDV',
      configs: JSON.stringify({
        'config-version': APP_VERSION,
        'pos-operation-mode': 'single-item',
        'check-order-type': 'stamp',
        'pos-gateway': 'cielo',
        'pos-type': 'simple',
        'payment-type-ids': [1, 2],
        'cash-wallet-closed-id': 0,
        'pos-default-status': 901,
        'pos-paid-status': 902,
      }),
    };

    await createPosApiMock(page, {
      company,
      deviceConfig,
      runtimeConfigs: {
        'pos-cash-wallet': 101,
        'pos-cielo-wallet': 102,
        'shop-loyalty-coupons-enabled': '1',
      },
    });
    await bootstrapPosBrowser(page);

    await page.goto('/add-product-screen');

    await expect(page.getByText('Suco', {exact: true})).toBeVisible();
    await expect(page.getByPlaceholder('Linked Order Code')).toBeHidden();

    const replaceRequestPromise = page.waitForRequest(request =>
      request.url().includes('/orders/123/replace-products') &&
      request.method() === 'PUT',
    );

    await page.getByText('Selecionar', {exact: true}).nth(1).click();

    const replaceRequest = await replaceRequestPromise;
    expect(replaceRequest.postDataJSON()).toEqual([{product: '102', quantity: 1}]);

    await expect(page).toHaveURL(/checkout/);
    await expect(page.getByText('Identificar cliente', {exact: true})).toBeVisible();
    await expect(page.getByPlaceholder('Digite o CPF')).toBeVisible();
    await expect(page.getByText('Dinheiro', {exact: true})).toBeHidden();
  });

  test('shows the runtime footer on the POS shell', async ({ page }) => {
    bindBrowserDiagnostics(page);
    await createPosApiMock(page);
    const menusPeopleRequests = [];
    page.on('request', request => {
      if (
        request.method().toUpperCase() === 'GET' &&
        request.url().includes('/menus-people')
      ) {
        menusPeopleRequests.push(request);
      }
    });

    await bootstrapPosBrowser(page);
    expect(menusPeopleRequests.length).toBeGreaterThanOrEqual(2);
    const bottomNavigation = page.getByTestId('bottom-navigation');
    await expect(bottomNavigation).toBeVisible();
    const bottomNavigationBox = await bottomNavigation.boundingBox();
    expect(bottomNavigationBox).toBeTruthy();
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    const bottomGap = viewport.height - (bottomNavigationBox.y + bottomNavigationBox.height);
    expect(bottomGap).toBeLessThanOrEqual(64);
    const leftGap = bottomNavigationBox.x;
    const rightGap = viewport.width - (bottomNavigationBox.x + bottomNavigationBox.width);
    expect(leftGap).toBeLessThanOrEqual(4);
    expect(rightGap).toBeLessThanOrEqual(4);
    const paddingBottom = await bottomNavigation.evaluate(node =>
      Number.parseFloat(window.getComputedStyle(node).paddingBottom || '0'),
    );
    expect(paddingBottom).toBeGreaterThan(0);

    const runtimeFooter = page.getByTestId('runtime-info-footer');
    await expect(runtimeFooter).toBeVisible();
    const runtimeFooterPaddingBottom = await runtimeFooter.evaluate(node =>
      Number.parseFloat(window.getComputedStyle(node).paddingBottom || '0'),
    );
    const runtimeFooterPaddingLeft = await runtimeFooter.evaluate(node =>
      Number.parseFloat(window.getComputedStyle(node).paddingLeft || '0'),
    );
    expect(runtimeFooterPaddingBottom).toBeGreaterThanOrEqual(16);
    expect(runtimeFooterPaddingLeft).toBeGreaterThanOrEqual(16);
  });

  test('opens checkout after selecting the single-item product', async ({ page }) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page);

    await bootstrapPosBrowser(page);

    await page.goto('/add-product-screen');

    await expect(page).toHaveURL(/add-product-screen/);
    await expect(page.getByText('Coxinha', { exact: true })).toBeVisible();
    await expect(page.getByText('Suco', { exact: true })).toBeVisible();
    await expect(page.getByText('Selecionar', { exact: true }).first()).toBeVisible();

    const replaceRequestPromise = page.waitForRequest(request =>
      request.url().includes('/orders/123/replace-products') &&
      request.method() === 'PUT',
    );

    await page.getByText('Selecionar', { exact: true }).first().click();

    const replaceRequest = await replaceRequestPromise;
    expect(replaceRequest.postDataJSON()).toEqual([{ product: '101', quantity: 1 }]);

    await expect(page).toHaveURL(/checkout/);
    await expect(page.getByText('Dinheiro', { exact: true })).toBeVisible();
    await expect(page.getByText('Crédito Cielo', { exact: true }).first()).toBeVisible();
    expect(state.lastReplaceProductsPayload).toEqual([{ product: '101', quantity: 1 }]);
  });

  test('shows cash and Cielo payment options and returns to the history list after payment', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page);

    await bootstrapPosBrowser(page);

    await page.goto('/checkout?id=123');

    await expect(page).toHaveURL(/checkout/);
    await expect(page.getByText('Dinheiro', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Crédito Cielo', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Receber em dinheiro', { exact: true })).toBeVisible();

    const invoiceRequestPromise = page.waitForRequest(request =>
      request.url().endsWith('/invoices') &&
      request.method() === 'POST',
    );

    await page.getByText('Receber em dinheiro', { exact: true }).click();
    await expect(page.getByPlaceholder('Ex.: 50,00')).toBeVisible();

    await page.getByPlaceholder('Ex.: 50,00').fill('12,50');
    await page.getByText('Confirmar', { exact: true }).click();

    const invoiceRequest = await invoiceRequestPromise;
    expect(invoiceRequest.postDataJSON().price).toBe(12.5);

    await expect(page).toHaveURL(/order-history-page/);
  });

  test('sends the Cielo payment to the remote machine and returns after the websocket callback', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page);

    await bootstrapPosBrowser(page);

    await page.goto('/checkout?id=123');

    await expect(page.getByText('Dinheiro', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Crédito Cielo', { exact: true }).first()).toBeVisible();

    const websocketRequestPromise = page.waitForRequest(request =>
      request.url().endsWith('/websocket') &&
      request.method() === 'POST',
    );

    await page.getByText('Crédito Cielo', { exact: true }).nth(1).click();
    await expect(page.getByText('Enviar para Cielo Principal', { exact: true })).toBeVisible();
    await page.getByText('Enviar para Cielo Principal', { exact: true }).first().click();
    await page.getByText('Continuar', { exact: true }).click();

    const websocketRequest = await websocketRequestPromise;
    const websocketPayload = websocketRequest.postDataJSON();

    await page.waitForFunction(
      () => typeof window.__codexInjectInvoiceMessage === 'function',
    );

    await page.evaluate(
      message => window.__codexInjectInvoiceMessage(message),
      buildRemotePaymentResultMessage({
        invoiceId: state.nextInvoiceId,
        orderId: 123,
        paidAmount: 12.5,
        payment: state.paymentOptions[1],
        requestKey: websocketPayload.requestKey,
        targetDeviceId: 'cielo-1',
        targetDeviceLabel: 'Cielo Principal',
        targetGateway: 'cielo',
      }),
    );

    await expect(page).toHaveURL(/order-history-page/);
  });

  test('opens the order history list and renders the existing order row', async ({ page }) => {
    bindBrowserDiagnostics(page);
    await createPosApiMock(page);

    await bootstrapPosBrowser(page);
    await page.goto('/order-history-page');

    await expect(page).toHaveURL(/order-history-page/);
    await expect(page.getByText(/Historico de pedidos/i)).toBeVisible();
    await expect(page.getByText('#123', { exact: true })).toBeVisible();
    await expect(page.getByText('cart', { exact: true })).toBeVisible();
  });
});
