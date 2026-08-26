const packageJson = require('../../../../../../../package.json');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');
const {buildMultiTabSettlementFixture} = require('./checkout-multi-tab-close.helpers');

const APP_VERSION = packageJson?.version || '1.0.0';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'API-TOKEN, APP-DOMAIN, DEVICE, ACCEPT, CONTENT-TYPE, X-Requested-With',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

const jsonHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'application/ld+json; charset=utf-8',
});

const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
});

const parsePath = url => {
  try {
    return new URL(url).pathname.replace(/\/+$/, '');
  } catch {
    return String(url || '');
  }
};

const installManagerCheckoutSession = async (page, {chargeEnabled = true} = {}) => {
  await page.addInitScript(
    ({appVersion, chargeEnabled: localCharge}) => {
      const set = (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          /* ignore quota */
        }
      };
      set(
        'session',
        JSON.stringify({
          id: 7,
          people: '/people/7',
          api_key: 'test-api-key',
          token: 'test-api-key',
          active: 1,
          mycompany: 3,
          roles: ['ROLE_ADMIN'],
        }),
      );
      set('config', JSON.stringify({language: 'pt-br'}));
      set('app-type', 'MANAGER');
      set(
        'device',
        JSON.stringify({
          id: 'web-checkout',
          device: 'web-checkout',
          type: 'PDV',
          appVersion,
          buildNumber: appVersion,
          configs: {
            'check-order-type': 'table',
            'check-type': 'manual',
            'pos-local-charge-enabled': localCharge,
            'order-charge-enabled': localCharge,
            manage_pos_check_orders: true,
            'pos-check-order-management-mode': 'manage',
          },
        }),
      );
    },
    {appVersion: APP_VERSION, chargeEnabled},
  );
};

const createMultiTabCheckoutMock = async (page, fixture = buildMultiTabSettlementFixture()) => {
  const state = {
    fixture,
    invoices: [],
    lastInvoicePayload: null,
    deliveredOrderIds: [],
    closed: false,
  };

  const company = {
    id: 3,
    name: 'Restaurante Centro',
    alias: 'Centro',
    enabled: true,
    panel_enabled: true,
    configs: {
      'check-order-type': 'table',
    },
    theme: {colors: {primary: '#0EA5E9', secondary: '#F97316'}},
  };

  const findOrder = orderId =>
    state.fixture.orders.find(order => String(order.id) === String(orderId));

  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = request.url();
    const pathname = parsePath(url);

    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
    }

    if (url.includes('/people/companies/my') || url.includes('/people/company/default')) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([company])),
      });
    }

    if (pathname.endsWith('/people/3') || pathname.endsWith('/people/7')) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({
          ...company,
          id: pathname.endsWith('/people/7') ? 7 : 3,
          '@id': pathname,
        }),
      });
    }

    if (url.includes('/device_configs')) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(
          collection([
            {
              id: 1,
              type: 'PDV',
              people: {id: 3},
              device: {id: 1, device: 'web-checkout'},
              configs: JSON.stringify({
                'config-version': APP_VERSION,
                'check-order-type': 'table',
                'check-type': 'manual',
                'pos-local-charge-enabled': true,
                'order-charge-enabled': true,
                manage_pos_check_orders: true,
              }),
            },
          ]),
        ),
      });
    }

    if (url.includes('/wallet_payment_types')) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([state.fixture.paymentOption])),
      });
    }

    const deliveredMatch = pathname.match(/\/orders\/(\d+)\/delivered$/);
    if (deliveredMatch && method === 'POST') {
      const orderId = Number(deliveredMatch[1]);
      state.deliveredOrderIds.push(orderId);
      const order = findOrder(orderId);
      if (order) {
        order.status = {status: 'closed', realStatus: 'closed'};
      }
      if (orderId === state.fixture.table.id) {
        state.closed = true;
      }
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(order || {id: orderId, status: {status: 'closed'}}),
      });
    }

    const orderMatch = pathname.match(/\/orders\/(\d+)$/);
    if (orderMatch && method === 'GET') {
      const order = findOrder(orderMatch[1]);
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(order || {id: Number(orderMatch[1])}),
      });
    }

    if (url.includes('/orders') && method === 'GET') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(state.fixture.orders)),
      });
    }

    if (url.includes('/invoices') && method === 'POST') {
      const payload = request.postDataJSON() || {};
      state.lastInvoicePayload = payload;
      const invoice = {
        id: 900 + state.invoices.length + 1,
        '@id': `/invoices/${900 + state.invoices.length + 1}`,
        price: Number(payload.price || state.fixture.table.price),
        status: {status: 'paid', realStatus: 'paid'},
        paymentType: {id: 1, paymentType: 'Dinheiro', name: 'Dinheiro'},
        order: `/orders/${state.fixture.table.id}`,
      };
      state.invoices.push(invoice);
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(invoice),
      });
    }

    if (url.includes('/invoices') && method === 'GET') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(state.invoices)),
      });
    }

    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(collection([])),
    });
  });

  return state;
};

module.exports = {
  APP_VERSION,
  createMultiTabCheckoutMock,
  installManagerCheckoutSession,
};
