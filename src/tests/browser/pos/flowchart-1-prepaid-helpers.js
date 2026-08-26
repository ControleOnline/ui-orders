const {createPosApiMock, bootstrapPosBrowser} = require('./single-item-api-mock');
const {
  API_ORIGIN,
  CORS_HEADERS,
  createFakeSession,
  jsonHeaders,
  collection,
} = require('./single-item-fixtures');

const mockPublicLoginApi = async page => {
  await page.route(`${API_ORIGIN}/**`, async route => {
    const method = route.request().method().toUpperCase();
    const pathname = new URL(route.request().url()).pathname.replace(/^\/+/, '');
    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
    }
    if (pathname === 'themes-colors.css') {
      return route.fulfill({
        status: 200,
        headers: {...CORS_HEADERS, 'content-type': 'text/css; charset=utf-8'},
        body: ':root { --primary: #0ea5e9; }',
      });
    }
    if (pathname === 'token' && method === 'POST') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({
          ...createFakeSession({userId: 7, companyId: 3, deviceId: 'web-7'}),
          username: ADMIN_LOGIN,
          name: 'Admin PDV',
          roles: ['ROLE_ADMIN'],
          active: 1,
          api_key: 'test-api-key',
        }),
      });
    }
    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(collection([])),
    });
  });
};

const ADMIN_LOGIN = 'admin@controle.local';
const ADMIN_PASSWORD = 'admin-test';

const markOrderProductsChecked = order => {
  const products = Array.isArray(order?.orderProducts) ? order.orderProducts : [];
  return {
    ...order,
    orderType: 'sale',
    status: {
      ...(order?.status || {}),
      status: 'production',
      realStatus: 'production',
    },
    orderProducts: products.map(item => ({
      ...item,
      status: {
        '@id': '/statuses/checked',
        id: 'checked',
        status: 'conferido',
        realStatus: 'checked',
        color: '#16A34A',
      },
    })),
  };
};

const registerFlowchart1ExtraRoutes = async (page, state) => {
  await page.route('**/token', async route => {
    if (route.request().method().toUpperCase() === 'OPTIONS') {
      return route.fulfill({status: 204, body: ''});
    }
    const session = createFakeSession({
      userId: 7,
      companyId: 3,
      deviceId: 'web-7',
    });
    state.lastTokenPayload = route.request().postDataJSON?.() || null;
    state.readyPosts = state.readyPosts || [];
    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify({
        ...session,
        username: ADMIN_LOGIN,
        name: 'Admin PDV',
        roles: ['ROLE_ADMIN'],
        active: 1,
        api_key: 'test-api-key',
      }),
    });
  });

  await page.route('**/orders/**/conference', async route => {
    const method = route.request().method().toUpperCase();
    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, body: ''});
    }
    const conferenceOrder = markOrderProductsChecked(state.order);
    state.conferenceOrder = conferenceOrder;
    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(conferenceOrder),
    });
  });

  await page.route('**/orders/**/ready', async route => {
    const method = route.request().method().toUpperCase();
    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, body: ''});
    }
    state.readyPosts = state.readyPosts || [];
    state.readyPosts.push(route.request().url());
    if (state.order) {
      state.order = {
        ...state.order,
        orderType: 'sale',
        status: {
          ...(state.order.status || {}),
          status: 'ready',
          realStatus: 'ready',
        },
      };
    }
    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(state.order),
    });
  });

  await page.route('**/order_products/**/check', async route => {
    if (route.request().method().toUpperCase() === 'OPTIONS') {
      return route.fulfill({status: 204, body: ''});
    }
    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify({ok: true}),
    });
  });

  await page.route('**/displays**', async route => {
    if (route.request().method().toUpperCase() === 'OPTIONS') {
      return route.fulfill({status: 204, body: ''});
    }
    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(
        collection([
          {id: 1, display: 'Cozinha', displayType: 'production'},
          {id: 2, display: 'Balcao', displayType: 'conference'},
        ]),
      ),
    });
  });
};

const bootstrapFlowchart1Smoke = async page => {
  const state = await createPosApiMock(page);
  state.readyPosts = [];
  await registerFlowchart1ExtraRoutes(page, state);
  await bootstrapPosBrowser(page);
  return state;
};

const openLoginPrint = async (page, expect) => {
  await page.goto('/sign-in-page');
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByPlaceholder('Senha')).toBeVisible();
  await expect(page.getByText('Entrar', {exact: true})).toBeVisible();
};

const openDevicesPrint = async (page, expect) => {
  await page.goto('/devices-index');
  await expect(page).toHaveURL(/devices-index/);
  await expect(
    page.getByText(/Dispositivos|Filtrar por tipo|PDV/i).first(),
  ).toBeVisible({timeout: 15000});
};

const openPosCatalogPrint = async (page, expect) => {
  await page.goto(
    '/add-product-screen?id=123&resumeExistingOrder=true&singleItemMode=true',
  );
  await expect(page).toHaveURL(/add-product-screen/);
  await expect(page.getByText('Coxinha', {exact: true})).toBeVisible();
};

const selectSingleProduct = async (page, expect) => {
  const replaceRequestPromise = page.waitForRequest(
    request =>
      request.url().includes('/orders/123/replace-products') &&
      request.method() === 'PUT',
  );
  await page.getByRole('radio', {name: 'Coxinha'}).click();
  await replaceRequestPromise;
  await expect(page).toHaveURL(/checkout/);
  await expect(page.getByText(/R\$\s*12,50/).last()).toBeVisible();
};

const payCashAndLeaveCheckout = async (page, expect) => {
  await expect(page.getByText('Receber em dinheiro', {exact: true})).toBeVisible();
  const invoiceRequestPromise = page.waitForRequest(
    request => request.url().endsWith('/invoices') && request.method() === 'POST',
  );
  await page.getByText('Receber em dinheiro', {exact: true}).click();
  await expect(page.getByPlaceholder('Ex.: 50,00')).toBeVisible();
  await page.getByPlaceholder('Ex.: 50,00').fill('12,50');
  await page.getByText('Confirmar', {exact: true}).click();
  await invoiceRequestPromise;
  await expect(page).toHaveURL(/order-history-page/);
};

const openConferencePrint = async (page, expect) => {
  await page.goto('/display-order-conference?orderId=123&id=123');
  await expect(page).toHaveURL(/display-order-conference/);
  await expect(page.getByText(/Conferencia/i).first()).toBeVisible({timeout: 15000});
  await expect(page.getByText(/Pedido pronto/i)).toBeVisible();
};

const markOrderReady = async (page, expect, state) => {
  const readyRequest = page.waitForRequest(
    request =>
      request.url().includes('/orders/123/ready') && request.method() === 'POST',
  );
  await page.getByText(/Pedido pronto/i).click();
  await readyRequest;
  expect(state.readyPosts.length).toBeGreaterThan(0);
};

module.exports = {
  ADMIN_LOGIN,
  ADMIN_PASSWORD,
  mockPublicLoginApi,
  bootstrapFlowchart1Smoke,
  markOrderProductsChecked,
  markOrderReady,
  openConferencePrint,
  openDevicesPrint,
  openLoginPrint,
  openPosCatalogPrint,
  payCashAndLeaveCheckout,
  registerFlowchart1ExtraRoutes,
  selectSingleProduct,
};
