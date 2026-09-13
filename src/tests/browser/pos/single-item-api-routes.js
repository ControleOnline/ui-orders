const {
  API_ORIGIN,
  APP_VERSION,
  CORS_HEADERS,
  buildOrderProduct,
  collection,
  jsonHeaders,
  textHeaders,
} = require('./single-item-fixtures');

const registerSingleItemApiRoutes = async (page, state) => {
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
        const productId = Number(
          String(item?.product || item?.productId || '')
            .replace(/\D+/g, ''),
        );
        const product = state.products.find(current => Number(current.id) === productId);
        if (!product) {
          return null;
        }
        const quantity = Math.max(1, Number(item?.quantity || 1));
        const isLoyaltyGift =
          String(item?.comment || '').trim() === 'Brinde fidelidade';
        return {
          ...buildOrderProduct(product, quantity),
          comment: isLoyaltyGift ? 'Brinde fidelidade' : item?.comment || null,
          price: isLoyaltyGift ? 0 : Number(product.price || 0),
          total: isLoyaltyGift ? 0 : Number(product.price || 0) * quantity,
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
    if (pathname === 'people' && method === 'GET') {
      return fulfillJson(route, collection(state.peopleSearchResults));
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
    const fidelitySnapshotMatch = pathname.match(/^orders\/fidelityById\/(\d+)$/);
    if (fidelitySnapshotMatch && method === 'GET') {
      const clientId = fidelitySnapshotMatch[1];
      const snapshot = state.fidelitySnapshots[clientId];
      const cards = Array.isArray(snapshot?.member)
        ? snapshot.member
        : Array.isArray(snapshot)
          ? snapshot
          : [];
      return fulfillJson(route, {
        ...collection(cards),
        summary:
          snapshot && typeof snapshot.summary === 'object'
            ? snapshot.summary
            : {},
      });
    }
    const orderItemMatch = pathname.match(/^orders\/(\d+)$/);
    if (orderItemMatch && method === 'GET') {
      if (state.orderItemIncludesProducts) {
        return fulfillJson(route, state.order);
      }
      const {orderProducts: _orderProducts, ...orderWithoutProducts} = state.order;
      return fulfillJson(route, orderWithoutProducts);
    }
    const orderDeliveredMatch = pathname.match(/^orders\/(\d+)\/delivered$/);
    if (orderDeliveredMatch && method === 'POST') {
      const targetOrderId = Number(orderDeliveredMatch[1]);
      if (targetOrderId === Number(state.order?.id)) {
        state.order = {
          ...state.order,
          status: {
            '@id': '/statuses/901',
            id: 901,
            status: 'closed',
            realStatus: 'closed',
          },
        };
        state.orders = [state.order];
      }
      return fulfillJson(route, {
        action: 'delivered',
        result: {
          errno: 0,
          errmsg: 'ok',
        },
        capabilities: {
          can_cancel: false,
          can_confirm: false,
          can_delivered: false,
          can_ready: false,
          is_delivering: false,
          is_terminal: true,
          realStatus: 'closed',
        },
      });
    }
    if (pathname === 'orders' && method === 'POST') {
      const body = postBody(request);
      state.orderCreatePayloads.push(body);
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
    if (pathname === 'order_products' && method === 'GET') {
      state.orderProductRequests.push(
        Object.fromEntries(url.searchParams.entries()),
      );
      if (state.orderProductsDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, state.orderProductsDelayMs));
      }
      return fulfillJson(route, collection(state.order.orderProducts || []));
    }
    const addProductsMatch = pathname.match(/^orders\/(\d+)\/add-products$/);
    if (addProductsMatch && method === 'PUT') {
      const body = postBody(request);
      const addedProducts = resolveProductsByIds(body);
      state.lastAddProductsPayload = body;
      const nextOrderProducts = [...(state.order.orderProducts || [])];
      addedProducts.forEach((addedProduct, index) => {
        const incomingItem = Array.isArray(body) ? body[index] : body;
        const incomingComment = String(incomingItem?.comment || '').trim();
        const equivalentIndex = nextOrderProducts.findIndex(
          item =>
            Number(item?.product?.id) === Number(addedProduct?.product?.id) &&
            String(item?.comment || '').trim() === incomingComment,
        );
        if (equivalentIndex >= 0) {
          const equivalentItem = nextOrderProducts[equivalentIndex];
          const nextQuantity =
            Number(equivalentItem?.quantity || 0) +
            Number(addedProduct?.quantity || 0);
          nextOrderProducts[equivalentIndex] = {
            ...equivalentItem,
            quantity: nextQuantity,
            total: Number(equivalentItem?.price || 0) * nextQuantity,
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
        if (state.orderStatusDelayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, state.orderStatusDelayMs));
        }
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
};

module.exports = {registerSingleItemApiRoutes};
