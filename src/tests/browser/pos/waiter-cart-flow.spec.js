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

const buildCustomizationSignature = (subProducts = [], rootQuantity = 1) => {
  const quantityDivisor = Number(rootQuantity || 0) > 0
    ? Number(rootQuantity)
    : 1;

  return (Array.isArray(subProducts) ? subProducts : [])
    .map(subProduct => ({
      product: Number(subProduct?.product?.id || subProduct?.product || 0),
      productGroup: Number(
        subProduct?.productGroup?.id || subProduct?.productGroup || 0,
      ),
      quantity: Number(subProduct?.quantity || 0) / quantityDivisor,
    }))
    .filter(subProduct => subProduct.product > 0 && subProduct.quantity > 0)
    .sort((left, right) =>
      left.productGroup - right.productGroup || left.product - right.product,
    );
};

const createOpenOrder = ({
  id = 123,
  products = [],
  price = 0,
  orderType = 'cart',
  externalCode = '',
  mainOrderId = null,
} = {}) => ({
  '@id': `/orders/${id}`,
  id,
  app: 'POS',
  orderType,
  ...(externalCode ? {externalCode} : {}),
  ...(mainOrderId ? {mainOrderId} : {}),
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
    product: 'Amendoim',
    description: 'Produto simples do atendimento',
    type: 'product',
    price: 12.5,
    quantity: 1,
    sku: 'CX-101',
  });
  const productTwo = initialState.productTwo || createProduct(102, {
    product: 'Refrigerante',
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
        'pos-operation-mode': 'waiter',
        'check-order-type': 'tab',
        'check-order-management-mode': 'manage',
        'pos-gateway': 'cielo',
        'pos-type': 'simple',
        'payment-type-ids': [1, 2, 3],
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
        'payment-type-ids': [1, 2, 3],
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
          createPaymentOption({
            id: 3,
            walletId: 102,
            walletLabel: 'Cielo',
            paymentTypeLabel: 'PIX Cielo',
            paymentCode: 'pix',
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
    preparingStatus: {
      '@id': '/statuses/903',
      id: 903,
      status: 'preparing',
      realStatus: 'open',
    },
    invoices: [],
    nextOrderId: Number(initialState.nextOrderId || 124),
    nextInvoiceId: 5001,
    lastReplaceProductsPayload: null,
    lastAddProductsPayload: null,
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

        return {
          ...buildOrderProduct(product, quantity),
          ...(Array.isArray(item?.sub_products)
            ? {subProducts: item.sub_products.map(subProduct => ({...subProduct}))}
            : {}),
        };
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
      const requestedOrderType = String(url.searchParams.get('orderType') || '').trim();
      const requestedExternalCode = String(url.searchParams.get('externalCode') || '').trim();
      const requestedMainOrderId = String(url.searchParams.get('mainOrderId') || '').trim();
      const filteredOrders = state.orders.filter(order => {
        if (requestedOrderType && String(order?.orderType) !== requestedOrderType) return false;
        if (requestedExternalCode && String(order?.externalCode) !== requestedExternalCode) return false;
        if (requestedMainOrderId && String(order?.mainOrderId || '') !== requestedMainOrderId) return false;
        return true;
      });
      return fulfillJson(route, collection(filteredOrders));
    }

    const orderItemMatch = pathname.match(/^orders\/(\d+)$/);
    if (orderItemMatch && method === 'GET') {
      const targetOrder = state.orders.find(order => Number(order?.id) === Number(orderItemMatch[1]));
      return fulfillJson(route, targetOrder || state.order);
    }

    if (pathname === 'orders' && method === 'POST') {
      const body = postBody(request);
      const orderId = state.nextOrderId++;
      const createdOrder = {
        ...createOpenOrder({id: orderId, products: [], price: 0}),
        ...body,
        id: orderId,
        '@id': `/orders/${orderId}`,
        orderProducts: Array.isArray(body?.orderProducts) ? body.orderProducts : [],
      };
      state.orders.push(createdOrder);
      state.order = createdOrder;

      return fulfillJson(route, createdOrder);
    }

    if (orderItemMatch && method === 'PUT') {
      const body = postBody(request);
      const targetId = Number(orderItemMatch[1]);
      const existingOrder = state.orders.find(order => Number(order?.id) === targetId) || state.order;
      const updatedOrder = {
        ...existingOrder,
        ...body,
        id: targetId,
        '@id': `/orders/${targetId}`,
      };
      state.orders = state.orders.map(order => Number(order?.id) === targetId ? updatedOrder : order);
      state.order = updatedOrder;

      return fulfillJson(route, updatedOrder);
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

    if (pathname === 'categories' && method === 'GET') {
      return fulfillJson(route, collection([
        {
          '@id': '/categories/10',
          id: 10,
          name: 'Lanches',
          context: 'products',
          company: '/people/3',
        },
      ]));
    }

    const addProductsMatch = pathname.match(/^orders\/(\d+)\/add-products$/);
    if (addProductsMatch && method === 'PUT') {
      if (String(state.order?.orderType || '').toLowerCase() !== 'cart') {
        return fulfillJson(route, {
          '@type': 'Error',
          'hydra:title': 'Order products are read-only',
          'hydra:description': 'Products can only be changed while the order is cart.',
        }, 409);
      }
      const body = postBody(request);
      const addedProducts = resolveProductsByIds(body);
      state.lastAddProductsPayload = body;
      const nextOrderProducts = [...(state.order.orderProducts || [])];
      addedProducts.forEach((addedProduct, index) => {
        const incomingItem = Array.isArray(body) ? body[index] : body;
        const incomingSignature = buildCustomizationSignature(
          incomingItem?.sub_products,
          incomingItem?.quantity,
        );
        const equivalentIndex = nextOrderProducts.findIndex(item =>
          Number(item?.product?.id) === Number(addedProduct?.product?.id) &&
          JSON.stringify(buildCustomizationSignature(
            item?.subProducts,
            item?.quantity,
          )) === JSON.stringify(incomingSignature),
        );

        if (equivalentIndex >= 0) {
          const equivalentItem = nextOrderProducts[equivalentIndex];
          const nextQuantity =
            Number(equivalentItem?.quantity || 0) + Number(addedProduct?.quantity || 0);
          nextOrderProducts[equivalentIndex] = {
            ...equivalentItem,
            quantity: nextQuantity,
            total: Number(equivalentItem?.price || 0) * nextQuantity,
            ...(Array.isArray(equivalentItem?.subProducts)
              ? {
                  subProducts: equivalentItem.subProducts.map(subProduct => {
                    const incomingSubProduct = (incomingItem?.sub_products || [])
                      .find(candidate =>
                        Number(candidate?.product) === Number(subProduct?.product) &&
                        Number(candidate?.productGroup || 0) ===
                          Number(subProduct?.productGroup || 0),
                      );

                    return incomingSubProduct
                      ? {
                          ...subProduct,
                          quantity: Number(subProduct?.quantity || 0) +
                            Number(incomingSubProduct?.quantity || 0),
                        }
                      : subProduct;
                  }),
                }
              : {}),
          };
          return;
        }

        nextOrderProducts.push(addedProduct);
      });
      state.order = {
        ...state.order,
        orderProducts: nextOrderProducts,
      };
      state.order.price = state.order.orderProducts.reduce(
        (sum, item) => sum + Number(item?.total || 0),
        0,
      );
      state.order.payable = state.order.price;
      state.orders = [state.order];
      return fulfillJson(route, state.order);
    }

    if (pathname === 'order_products' && method === 'GET') {
      return fulfillJson(route, collection(state.order.orderProducts || []));
    }

    const orderProductMatch = pathname.match(/^order_products\/(\d+)$/);
    if (orderProductMatch && method === 'PUT') {
      if (String(state.order?.orderType || '').toLowerCase() !== 'cart') {
        return fulfillJson(route, {
          '@type': 'Error',
          'hydra:title': 'Order products are read-only',
        }, 409);
      }

      const body = postBody(request);
      const targetId = Number(orderProductMatch[1]);
      state.order.orderProducts = (state.order.orderProducts || []).map(item =>
        Number(item?.id) === targetId
          ? {
              ...item,
              quantity: Number(body?.quantity || 0),
              total: Number(item?.price || 0) * Number(body?.quantity || 0),
            }
          : item,
      );
      const savedItem = state.order.orderProducts.find(item => Number(item?.id) === targetId);
      return fulfillJson(route, savedItem || {});
    }

    if (orderProductMatch && method === 'DELETE') {
      if (String(state.order?.orderType || '').toLowerCase() !== 'cart') {
        return fulfillJson(route, {
          '@type': 'Error',
          'hydra:title': 'Order products are read-only',
        }, 409);
      }

      const targetId = Number(orderProductMatch[1]);
      state.order.orderProducts = (state.order.orderProducts || []).filter(
        item =>
          Number(item?.id) !== targetId &&
          Number(item?.orderProduct?.id || item?.orderParentProductId || 0) !== targetId,
      );
      state.order.price = state.order.orderProducts.reduce(
        (sum, item) => sum + Number(item?.total || 0),
        0,
      );
      state.order.payable = state.order.price;
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
    }

    const confirmOrderMatch = pathname.match(/^orders\/(\d+)\/confirm$/);
    if (confirmOrderMatch && method === 'POST') {
      state.order = {
        ...state.order,
        orderType: 'sale',
        status: state.preparingStatus,
      };
      state.orders = [state.order];
      return fulfillJson(route, state.order);
    }

    if (pathname === 'product-showcases/catalog' && method === 'GET') {
      return fulfillJson(route, collection(state.products));
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
      const paidAmount = state.invoices
        .filter(current => String(current?.order) === String(state.order?.['@id']))
        .reduce((sum, current) => sum + Number(current?.price || 0), 0);
      state.order.payable = Math.max(0, Number(state.order?.price || 0) - paidAmount);
      if (state.order.payable <= 0.009) {
        state.order.status = state.paidStatus;
      }

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
      setLocalStorageItem('pdv-active-order:3:7', '123');
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

const browserApi = (page, path, {method = 'GET', body} = {}) =>
  page.evaluate(
    async ({apiOrigin, path: requestPath, method: requestMethod, body: requestBody}) => {
      const response = await fetch(`${apiOrigin}/${String(requestPath).replace(/^\/+/, '')}`, {
        method: requestMethod,
        headers: requestBody === undefined
          ? undefined
          : {'content-type': 'application/ld+json'},
        body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
      });
      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      return {data, ok: response.ok, status: response.status};
    },
    {apiOrigin: API_ORIGIN, path, method, body},
  );

test.describe('waiter cart browser flow', () => {
  test('boots in waiter mode without forcing the product catalog', async ({page}) => {
    bindBrowserDiagnostics(page);
    await createPosApiMock(page);

    await bootstrapPosBrowser(page);

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Pedidos', {exact: true}).first()).toBeVisible();
    await expect(page).not.toHaveURL(/add-product-screen/);
  });

  test('keeps the waiter device contract configured for tab management', async ({page}) => {
    const state = await createPosApiMock(page);
    await bootstrapPosBrowser(page);

    const configs =
      typeof state.deviceConfig.configs === 'string'
        ? JSON.parse(state.deviceConfig.configs)
        : state.deviceConfig.configs;

    expect(configs).toMatchObject({
      'pos-operation-mode': 'waiter',
      'check-order-type': 'tab',
      'check-order-management-mode': 'manage',
    });
  });

  test('requires a tab code before materializing a waiter order', async ({page}) => {
    bindBrowserDiagnostics(page);
    await createPosApiMock(page, {
      order: createOpenOrder({id: 123, products: [], price: 0}),
    });
    await bootstrapPosBrowser(page);

    await page.goto('/add-product-screen?store=categories');

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByPlaceholder('Linked Order Code')).toBeVisible();
    await expect(page.getByText('Confirm', {exact: true})).toBeVisible();
  });

  test('allows canceling tab identification without creating another order', async ({page}) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page, {
      order: createOpenOrder({id: 123, products: [], price: 0}),
    });
    const initialOrderCount = state.orders.length;
    await bootstrapPosBrowser(page);
    await page.goto('/add-product-screen?store=categories');

    await page.getByText('Cancel', {exact: true}).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(state.orders).toHaveLength(initialOrderCount);
  });

  test('creates a tab root and links the operational cart after code confirmation', async ({page}) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page, {
      order: createOpenOrder({id: 123, products: [], price: 0}),
    });
    await bootstrapPosBrowser(page);
    await page.goto('/add-product-screen?store=categories');

    await page.getByPlaceholder('Linked Order Code').fill('CMD-42');
    await page.getByText('Confirm', {exact: true}).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect.poll(() =>
      state.orders.find(
        order => order.orderType === 'tab' && order.externalCode === 'CMD-42',
      ),
    ).toBeTruthy();
    const root = state.orders.find(
      order => order.orderType === 'tab' && order.externalCode === 'CMD-42',
    );
    await expect.poll(() =>
      state.orders.find(
        order =>
          Number(order.mainOrderId) === Number(root?.id) &&
          order.orderType === 'cart' &&
          order.externalCode === 'CMD-42',
      ),
    ).toBeTruthy();
    const operational = state.orders.find(
      order =>
        Number(order.mainOrderId) === Number(root?.id) &&
        order.orderType === 'cart' &&
        order.externalCode === 'CMD-42',
    );
    expect(root).toBeTruthy();
    expect(operational).toMatchObject({
      orderType: 'cart',
      externalCode: 'CMD-42',
      mainOrderId: root.id,
    });
  });

  test('keeps the linked cart total when returning from products to categories', async ({page}) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page);
    const tabOrder = createOpenOrder({
      id: 122,
      orderType: 'tab',
      externalCode: 'CMD-42',
    });
    state.order = {
      ...state.order,
      externalCode: 'CMD-42',
      mainOrderId: tabOrder.id,
    };
    state.orders = [tabOrder, state.order];

    await bootstrapPosBrowser(page);
    await page.goto('/add-product-screen?store=categories');

    await expect(page).toHaveURL(/add-product-screen/);
    await expect(page.getByText('Lanches', {exact: true})).toBeVisible();
    await expect(page.getByText('R$ 12,50', {exact: true}).last()).toBeVisible();
    await expect(page.getByText('Conferir pedido', {exact: true})).toBeVisible();

    await page.getByText('Lanches', {exact: true}).click();

    await expect(page.getByText('Amendoim', {exact: true})).toBeVisible();
    await expect(page.getByText('R$ 12,50', {exact: true}).last()).toBeVisible();

    const productRow = page
      .getByText('Amendoim', {exact: true})
      .locator('..')
      .locator('..')
      .locator('..');
    await productRow.locator('[tabindex="0"]').last().click();
    await expect(page.getByText('R$ 25,00', {exact: true}).last()).toBeVisible();

    const persistedProductPromise = page.waitForResponse(response =>
      response.request().method() === 'PUT' &&
      response.url().includes('/orders/123/add-products'),
    );

    await page.goBack();
    const persistedProductResponse = await persistedProductPromise;

    expect(persistedProductResponse.ok()).toBe(true);
    await expect(page.getByText('Lanches', {exact: true})).toBeVisible();
    await expect(page.getByText('R$ 25,00', {exact: true})).toBeVisible();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(state.order.orderProducts).toHaveLength(1);
    expect(state.order.orderProducts[0]).toMatchObject({quantity: 2});
  });

  test('consolidates the same simple product into one line with quantity two', async ({page}) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page, {
      order: createOpenOrder({id: 123, products: [], price: 0}),
    });

    await bootstrapPosBrowser(page);

    const addSameProduct = async () => {
      const response = await page.evaluate(async apiOrigin => {
        const request = await fetch(`${apiOrigin}/orders/123/add-products`, {
          method: 'PUT',
          headers: {
            'content-type': 'application/ld+json',
          },
          body: JSON.stringify([{product: '101', quantity: 1}]),
        });

        return {ok: request.ok, status: request.status};
      }, API_ORIGIN);
      expect(response).toMatchObject({ok: true, status: 200});
    };

    await addSameProduct();
    await addSameProduct();

    const equivalentLines = state.order.orderProducts.filter(
      item => Number(item?.product?.id) === 101,
    );

    expect(equivalentLines).toHaveLength(1);
    expect(equivalentLines[0].quantity).toBe(2);
  });

  test('updates the quantity of a cart item without creating another line', async ({page}) => {
    const state = await createPosApiMock(page);
    await bootstrapPosBrowser(page);
    const targetItem = state.order.orderProducts[0];

    const response = await browserApi(page, `order_products/${targetItem.id}`, {
      method: 'PUT',
      body: {id: targetItem.id, quantity: 2},
    });

    expect(response).toMatchObject({ok: true, status: 200});
    expect(state.order.orderProducts).toHaveLength(1);
    expect(state.order.orderProducts[0]).toMatchObject({quantity: 2, total: 25});
  });

  test('removes the last simple item after decrementing from two', async ({page}) => {
    const product = createProduct(101, {product: 'Agua', price: 8});
    const order = createOpenOrder({id: 123, products: [product], price: 16});
    order.orderProducts[0] = buildOrderProduct(product, 2);
    const state = await createPosApiMock(page, {order});
    await bootstrapPosBrowser(page);
    const targetItem = order.orderProducts[0];

    const decrementResponse = await browserApi(
      page,
      `order_products/${targetItem.id}`,
      {method: 'PUT', body: {id: targetItem.id, quantity: 1}},
    );
    const deleteResponse = await browserApi(
      page,
      `order_products/${targetItem.id}`,
      {method: 'DELETE'},
    );

    expect([decrementResponse.status, deleteResponse.status]).toEqual([200, 204]);
    expect(state.order.orderProducts).toEqual([]);
    expect(state.order.price).toBe(0);
  });

  test('deletes a cart item and its customized component tree', async ({page}) => {
    const rootProduct = createProduct(101, {product: 'Amendoim customizado', price: 12.5});
    const childProduct = createProduct(102, {product: 'Adicional', price: 2});
    const rootItem = buildOrderProduct(rootProduct, 1);
    const childItem = {
      ...buildOrderProduct(childProduct, 1),
      id: 1011,
      '@id': '/order_products/1011',
      orderProduct: {id: rootItem.id, '@id': rootItem['@id']},
      orderParentProductId: rootItem.id,
    };
    const order = createOpenOrder({id: 123, products: [], price: 14.5});
    order.orderProducts = [rootItem, childItem];
    const state = await createPosApiMock(page, {order});
    await bootstrapPosBrowser(page);

    const response = await browserApi(page, `order_products/${rootItem.id}`, {
      method: 'DELETE',
    });

    expect(response).toMatchObject({ok: true, status: 204});
    expect(state.order.orderProducts).toEqual([]);
    expect(state.order.price).toBe(0);
  });

  test('promotes the waiter cart to sale/preparing when producing', async ({page}) => {
    const state = await createPosApiMock(page);
    await bootstrapPosBrowser(page);

    const response = await browserApi(page, 'orders/123/confirm', {
      method: 'POST',
      body: {},
    });

    expect(response).toMatchObject({ok: true, status: 200});
    expect(state.order.orderType).toBe('sale');
    expect(state.order.status).toMatchObject({status: 'preparing', realStatus: 'open'});
  });

  test('blocks product additions, quantity changes and deletion after sale', async ({page}) => {
    const state = await createPosApiMock(page);
    await bootstrapPosBrowser(page);
    const targetItem = state.order.orderProducts[0];
    await browserApi(page, 'orders/123/confirm', {method: 'POST', body: {}});

    const [addResponse, updateResponse, deleteResponse] = await Promise.all([
      browserApi(page, 'orders/123/add-products', {
        method: 'PUT',
        body: [{product: '101', quantity: 1}],
      }),
      browserApi(page, `order_products/${targetItem.id}`, {
        method: 'PUT',
        body: {quantity: 3},
      }),
      browserApi(page, `order_products/${targetItem.id}`, {method: 'DELETE'}),
    ]);

    expect([addResponse.status, updateResponse.status, deleteResponse.status]).toEqual([
      409,
      409,
      409,
    ]);
    expect(state.order.orderProducts).toHaveLength(1);
  });

  test('creates a paid invoice linked to the waiter order', async ({page}) => {
    const state = await createPosApiMock(page);
    await bootstrapPosBrowser(page);

    const response = await browserApi(page, 'invoices', {
      method: 'POST',
      body: {
        order: '/orders/123',
        receiver: '/people/3',
        destinationWallet: '/wallets/101',
        paymentType: '/payment_types/1',
        price: 12.5,
        status: '/statuses/902',
      },
    });

    expect(response).toMatchObject({ok: true, status: 200});
    expect(state.invoices).toHaveLength(1);
    expect(state.invoices[0]).toMatchObject({
      order: '/orders/123',
      price: 12.5,
      status: '/statuses/902',
    });
  });

  test('keeps the tab root and operational sale as distinct linked orders', async ({page}) => {
    const tabOrder = createOpenOrder({
      id: 200,
      orderType: 'tab',
      externalCode: 'CMD-42',
    });
    const saleOrder = createOpenOrder({
      id: 201,
      orderType: 'sale',
      externalCode: 'CMD-42',
      mainOrderId: 200,
    });
    const state = await createPosApiMock(page, {
      order: saleOrder,
      orders: [tabOrder, saleOrder],
    });
    await bootstrapPosBrowser(page);

    const root = state.orders.find(order => order.orderType === 'tab');
    const operational = state.orders.find(order => order.mainOrderId === root.id);

    expect(root).toMatchObject({id: 200, orderType: 'tab', externalCode: 'CMD-42'});
    expect(operational).toMatchObject({
      id: 201,
      orderType: 'sale',
      externalCode: 'CMD-42',
      mainOrderId: 200,
    });
  });

  test('keeps different customizations as separate order-product lines', async ({page}) => {
    const state = await createPosApiMock(page, {
      order: createOpenOrder({id: 123, products: [], price: 0}),
    });
    await bootstrapPosBrowser(page);

    await browserApi(page, 'orders/123/add-products', {
      method: 'PUT',
      body: [{product: '101', quantity: 1, sub_products: [{product: 102, quantity: 1}]}],
    });
    await browserApi(page, 'orders/123/add-products', {
      method: 'PUT',
      body: [{product: '101', quantity: 1, sub_products: []}],
    });

    expect(state.order.orderProducts).toHaveLength(2);
    expect(state.order.orderProducts.map(item => item.subProducts)).toEqual([
      [{product: 102, quantity: 1}],
      [],
    ]);
  });

  test('consolidates identical customizations into one line', async ({page}) => {
    const state = await createPosApiMock(page, {
      order: createOpenOrder({id: 123, products: [], price: 0}),
    });
    await bootstrapPosBrowser(page);
    const customizedItem = {
      product: '101',
      quantity: 1,
      sub_products: [{product: 102, productGroup: 50, quantity: 1}],
    };

    await browserApi(page, 'orders/123/add-products', {
      method: 'PUT',
      body: [customizedItem],
    });
    await browserApi(page, 'orders/123/add-products', {
      method: 'PUT',
      body: [customizedItem],
    });

    expect(state.order.orderProducts).toHaveLength(1);
    expect(state.order.orderProducts[0].quantity).toBe(2);
  });

  test('keeps a remaining balance after partial payment and reaches paid at zero', async ({page}) => {
    const state = await createPosApiMock(page);
    await bootstrapPosBrowser(page);
    const paymentPayload = {
      order: '/orders/123',
      receiver: '/people/3',
      destinationWallet: '/wallets/101',
      paymentType: '/payment_types/1',
      status: '/statuses/902',
    };

    await browserApi(page, 'invoices', {
      method: 'POST',
      body: {...paymentPayload, price: 5},
    });
    expect(state.order.payable).toBe(7.5);
    expect(state.order.status).toMatchObject({status: 'open', realStatus: 'open'});

    await browserApi(page, 'invoices', {
      method: 'POST',
      body: {...paymentPayload, price: 7.5},
    });
    expect(state.order.payable).toBe(0);
    expect(state.order.status).toMatchObject({status: 'paid', realStatus: 'closed'});
  });

  test('documents PIX cancellation returning to checkout without residual error', async ({page}) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page);
    await bootstrapPosBrowser(page);
    await page.goto('/checkout?id=123');

    await expect(page.getByText('PIX Cielo', {exact: true}).first()).toBeVisible();
    const websocketRequestPromise = page.waitForRequest(request =>
      request.url().endsWith('/websocket') && request.method() === 'POST',
    );

    await page.getByText('PIX Cielo', {exact: true}).last().click();
    await expect(page.getByText('Enviar para Cielo Principal', {exact: true})).toBeVisible();
    await page.getByText('Enviar para Cielo Principal', {exact: true}).first().click();
    await page.getByText('Continuar', {exact: true}).click();

    const websocketRequest = await websocketRequestPromise;
    const websocketPayload = websocketRequest.postDataJSON();
    await page.waitForFunction(
      () => typeof window.__codexInjectInvoiceMessage === 'function',
    );
    await page.evaluate(
      message => window.__codexInjectInvoiceMessage(message),
      {
        destination: 'web-7',
        store: 'invoice',
        action: 'pay-result',
        requestKey: websocketPayload.requestKey,
        status: 'error',
        error: 'Pagamento PIX cancelado pelo usuario.',
        order: '123',
      },
    );

    await expect(page).toHaveURL(/checkout/);
    await expect(page.getByText('PIX Cielo', {exact: true}).first()).toBeVisible();
    await expect(page.getByText('Falha ao montar o pagamento', {exact: true})).not.toBeVisible();
    await expect(page.getByText(/Pagamento PIX cancelado/i)).not.toBeVisible();
    expect(state.invoices).toEqual([]);
    expect(state.order.payable).toBe(12.5);

    await page.evaluate(
      message => window.__codexInjectInvoiceMessage(message),
      {
        destination: 'web-7',
        store: 'invoice',
        action: 'pay-result',
        requestKey: websocketPayload.requestKey,
        status: 'canceled',
        error: 'Pagamento PIX cancelado pelo usuario.',
        order: '123',
      },
    );

    await expect(page.getByText('PIX Cielo', {exact: true}).first()).toBeVisible();
    expect(state.invoices).toEqual([]);
    expect(state.order.payable).toBe(12.5);

    const retryRequestPromise = page.waitForRequest(request =>
      request.url().endsWith('/websocket') && request.method() === 'POST',
    );
    await page.getByText('PIX Cielo', {exact: true}).last().click();
    await page.getByText('Enviar para Cielo Principal', {exact: true}).first().click();
    await page.getByText('Continuar', {exact: true}).click();

    const retryPayload = (await retryRequestPromise).postDataJSON();
    expect(retryPayload.requestKey).not.toBe(websocketPayload.requestKey);
    await page.evaluate(
      message => window.__codexInjectInvoiceMessage(message),
      {
        destination: 'web-7',
        store: 'invoice',
        action: 'pay-result',
        requestKey: retryPayload.requestKey,
        status: 'canceled',
        order: '123',
      },
    );

    await expect(page.getByText('PIX Cielo', {exact: true}).first()).toBeVisible();
    expect(state.invoices).toEqual([]);
    expect(state.order.payable).toBe(12.5);
  });

  test('keeps a real remote PIX gateway failure visible', async ({page}) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page);
    await bootstrapPosBrowser(page);
    await page.goto('/checkout?id=123');

    const websocketRequestPromise = page.waitForRequest(request =>
      request.url().endsWith('/websocket') && request.method() === 'POST',
    );
    await page.getByText('PIX Cielo', {exact: true}).last().click();
    await page.getByText('Enviar para Cielo Principal', {exact: true}).first().click();
    await page.getByText('Continuar', {exact: true}).click();

    const websocketPayload = (await websocketRequestPromise).postDataJSON();
    await page.waitForFunction(
      () => typeof window.__codexInjectInvoiceMessage === 'function',
    );
    await page.evaluate(
      message => window.__codexInjectInvoiceMessage(message),
      {
        destination: 'web-7',
        store: 'invoice',
        action: 'pay-result',
        requestKey: websocketPayload.requestKey,
        status: 'error',
        error: 'Falha de comunicacao com o terminal.',
        order: '123',
      },
    );

    await expect(page.getByText('Falha ao montar o pagamento', {exact: true})).toBeVisible();
    await expect(
      page.getByText('Falha de comunicacao com o terminal.', {exact: true}).first(),
    ).toBeVisible();
    expect(state.invoices).toEqual([]);
    expect(state.order.payable).toBe(12.5);
  });

  test('resumes an existing linked waiter sale without asking for the tab again', async ({page}) => {
    bindBrowserDiagnostics(page);
    const root = createOpenOrder({
      id: 200,
      orderType: 'tab',
      externalCode: 'CMD-42',
    });
    const operational = createOpenOrder({
      id: 123,
      products: [createProduct(101, {product: 'Amendoim', price: 12.5})],
      price: 12.5,
      orderType: 'sale',
      externalCode: 'CMD-42',
      mainOrderId: 200,
    });
    await createPosApiMock(page, {order: operational, orders: [root, operational]});
    await bootstrapPosBrowser(page);

    await page.goto('/add-product-screen?store=categories');

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Lanches', {exact: true})).toBeVisible();
  });

  test('completes a waiter cash payment through the unified checkout', async ({page}) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page);
    await bootstrapPosBrowser(page);
    await page.goto('/checkout?id=123');

    await expect(page.getByText('Dinheiro', {exact: true}).first()).toBeVisible();
    await page.getByText('Receber em dinheiro', {exact: true}).click();
    await page.getByPlaceholder('Ex.: 50,00').fill('12,50');
    await page.getByText('Confirmar', {exact: true}).click();

    await expect.poll(() => state.invoices.length).toBe(1);
    expect(state.invoices[0]).toMatchObject({price: 12.5, order: '/orders/123'});
    await expect(page.getByText('Falha ao montar o pagamento', {exact: true})).not.toBeVisible();
  });

  test('completes a remote Cielo payment and returns to the waiter order', async ({page}) => {
    bindBrowserDiagnostics(page);
    const state = await createPosApiMock(page);
    await bootstrapPosBrowser(page);
    await page.goto('/checkout?id=123');
    const websocketRequestPromise = page.waitForRequest(request =>
      request.url().endsWith('/websocket') && request.method() === 'POST',
    );

    await page.getByText('Crédito Cielo', {exact: true}).last().click();
    await page.getByText('Enviar para Cielo Principal', {exact: true}).first().click();
    await page.getByText('Continuar', {exact: true}).click();

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

    await expect(page).toHaveURL(/order-details|order-display|orders-display/);
    await expect(page.getByText(/Pagamento PIX cancelado/i)).not.toBeVisible();
  });
});
