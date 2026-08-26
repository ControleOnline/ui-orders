const {API_ORIGIN} = require('../../../../../../../../src/tests/browser/apiOrigin')
const {
  buildAdminSession,
  buildWaiterTableDeviceConfigs,
} = require('../../helpers/flowchartAdminPosHelpers')
const {
  OPEN_STATUS,
  PREPARING_STATUS,
  READY_STATUS,
  buildOrderProduct,
  collection,
  createCompany,
  createOpenOrder,
  createPosMenus,
  createProduct,
} = require('./fixtures')

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'API-TOKEN, APP-DOMAIN, DEVICE, ACCEPT, CONTENT-TYPE, X-Requested-With',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
}

const jsonHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'application/ld+json; charset=utf-8',
})

const fulfillJson = (route, body, status = 200) =>
  route.fulfill({
    status,
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  })

const postBody = request => {
  try {
    return JSON.parse(request.postData() || '{}')
  } catch {
    return {}
  }
}

const createWaiterTablesApiMock = async (page, initialState = {}) => {
  const product = initialState.product || createProduct(101, {
    product: 'Amendoim',
    price: 12.5,
    sku: 'CX-101',
    queue: 1,
  })
  const company = initialState.company || createCompany(3, {name: 'Restaurante Centro'})
  const appVersion = initialState.appVersion || '1.0.0'
  const deviceConfigsPayload = buildWaiterTableDeviceConfigs({appVersion})
  const deviceConfig = initialState.deviceConfig || {
    id: 1,
    device: {id: 1, device: 'web-7'},
    people: {id: 3},
    type: 'PDV',
    configs: JSON.stringify(deviceConfigsPayload),
  }
  const cart = initialState.order || createOpenOrder({
    id: 123,
    products: [],
    price: 0,
    orderType: 'cart',
  })
  const state = {
    company,
    defaultCompany: company,
    user: {id: 7, name: 'Admin POS', api_key: 'test-api-key', active: 1},
    deviceId: 'web-7',
    menus: createPosMenus(),
    deviceConfig,
    deviceConfigs: [deviceConfig],
    products: [product],
    order: cart,
    orders: initialState.orders || [cart],
    nextOrderId: initialState.nextOrderId || 200,
    queues: [
      {
        id: 77,
        '@id': '/order_product_queues/77',
        status: {status: 'entry', realStatus: 'open'},
        order: '/orders/123',
        product: product['@id'],
      },
    ],
    invoices: [],
    lastHandoff: null,
    product,
  }

  const findOrder = id =>
    state.orders.find(order => Number(order?.id) === Number(id)) || state.order

  const syncOrder = updated => {
    state.orders = state.orders.map(order =>
      Number(order?.id) === Number(updated?.id) ? updated : order,
    )
    if (Number(state.order?.id) === Number(updated?.id)) {
      state.order = updated
    }
    if (!state.orders.some(order => Number(order?.id) === Number(updated?.id))) {
      state.orders.push(updated)
    }
  }

  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request()
    const method = request.method().toUpperCase()
    const url = new URL(request.url())
    const pathname = url.pathname.replace(/^\/+/, '')

    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''})
    }

    if (pathname === 'runtime/ip') {
      return fulfillJson(route, {ip: '127.0.0.1'})
    }
    if (pathname === 'people/companies/my' || pathname === 'people/company/default') {
      return fulfillJson(route, collection([company]))
    }
    if (pathname === 'people/7' || pathname === 'people/3') {
      return fulfillJson(route, state.user)
    }
    if (pathname === 'configs/discovery-configs' && method === 'POST') {
      return fulfillJson(route, {ok: true})
    }
    if (pathname === 'device_configs' && method === 'GET') {
      return fulfillJson(route, collection(state.deviceConfigs))
    }
    if (pathname === 'device_configs/add-configs' && method === 'POST') {
      return fulfillJson(route, state.deviceConfig)
    }
    if (pathname === 'devices' && method === 'GET') {
      return fulfillJson(route, collection([{id: 1, device: 'web-7', type: 'PDV'}]))
    }
    if (pathname === 'categories' && method === 'GET') {
      return fulfillJson(route, collection([
        {id: 10, '@id': '/categories/10', name: 'Lanches', context: 'products'},
      ]))
    }
    if (pathname === 'products' || pathname === 'product-showcases/catalog') {
      return fulfillJson(route, collection(state.products))
    }
    if (pathname === 'wallet_payment_types' || pathname === 'invoices') {
      return fulfillJson(route, collection(state.invoices))
    }
    if (pathname === 'statuses' && method === 'GET') {
      return fulfillJson(route, collection([OPEN_STATUS, PREPARING_STATUS, READY_STATUS]))
    }
    if (pathname === 'order_product_queues' && method === 'GET') {
      return fulfillJson(route, collection(state.queues))
    }
    if (pathname.startsWith('menus') || pathname === 'modules') {
      return fulfillJson(route, state.menus)
    }

    if (pathname === 'orders' && method === 'GET') {
      const orderType = String(url.searchParams.get('orderType') || '').trim()
      const externalCode = String(url.searchParams.get('externalCode') || '').trim()
      const filtered = state.orders.filter(order => {
        if (orderType && String(order?.orderType) !== orderType) return false
        if (externalCode && String(order?.externalCode) !== externalCode) return false
        return true
      })
      return fulfillJson(route, collection(filtered))
    }

    if (pathname === 'orders' && method === 'POST') {
      const body = postBody(request)
      const created = {
        ...createOpenOrder({id: state.nextOrderId++, products: [], price: 0}),
        ...body,
        id: state.nextOrderId - 1,
        '@id': `/orders/${state.nextOrderId - 1}`,
      }
      created.id = Number(String(created['@id']).replace(/\D/g, ''))
      state.orders.push(created)
      if (created.orderType === 'cart') {
        state.order = created
      }
      return fulfillJson(route, created)
    }

    const orderMatch = pathname.match(/^orders\/(\d+)$/)
    if (orderMatch && method === 'GET') {
      return fulfillJson(route, findOrder(orderMatch[1]))
    }
    if (orderMatch && method === 'PUT') {
      const updated = {...findOrder(orderMatch[1]), ...postBody(request), id: Number(orderMatch[1])}
      updated['@id'] = `/orders/${updated.id}`
      syncOrder(updated)
      return fulfillJson(route, updated)
    }

    const addMatch = pathname.match(/^orders\/(\d+)\/add-products$/)
    if (addMatch && method === 'PUT') {
      const target = findOrder(addMatch[1])
      if (String(target?.orderType || '').toLowerCase() !== 'cart') {
        return fulfillJson(route, {'hydra:title': 'Order products are read-only'}, 409)
      }
      const incoming = postBody(request)
      const rows = Array.isArray(incoming) ? incoming : [incoming]
      const nextProducts = [...(target.orderProducts || [])]
      rows.forEach(row => {
        const added = buildOrderProduct(state.product, Number(row?.quantity || 1))
        const existing = nextProducts.find(
          item => Number(item?.product?.id) === Number(state.product.id),
        )
        if (existing) {
          existing.quantity += added.quantity
          existing.total = existing.price * existing.quantity
          return
        }
        nextProducts.push(added)
      })
      const price = nextProducts.reduce((sum, item) => sum + Number(item.total || 0), 0)
      const updated = {...target, orderProducts: nextProducts, price, payable: price}
      syncOrder(updated)
      state.order = updated
      return fulfillJson(route, updated)
    }

    const confirmMatch = pathname.match(/^orders\/(\d+)\/confirm$/)
    if (confirmMatch && method === 'POST') {
      const target = findOrder(confirmMatch[1])
      const updated = {...target, orderType: 'sale', status: PREPARING_STATUS}
      syncOrder(updated)
      state.order = updated
      state.queues = state.queues.map(queue => ({
        ...queue,
        status: {status: 'working', realStatus: 'open'},
        order: updated['@id'],
      }))
      return fulfillJson(route, updated)
    }

    const readyMatch = pathname.match(/^orders\/(\d+)\/ready$/)
    if (readyMatch && method === 'POST') {
      const target = findOrder(readyMatch[1])
      if (String(target?.status?.status || '').toLowerCase() !== 'preparing') {
        return fulfillJson(
          route,
          {'hydra:description': 'Production must finish before ready/handoff.'},
          409,
        )
      }
      const updated = {...target, status: READY_STATUS}
      syncOrder(updated)
      state.order = updated
      state.queues = state.queues.map(queue => ({
        ...queue,
        status: {status: 'produced', realStatus: 'closed'},
      }))
      return fulfillJson(route, updated)
    }

    const handoffMatch = pathname.match(/^orders\/(\d+)\/handoff$/)
    if (handoffMatch && method === 'POST') {
      const target = findOrder(handoffMatch[1])
      if (String(target?.status?.status || '').toLowerCase() !== 'ready') {
        return fulfillJson(
          route,
          {'hydra:description': 'Handoff requires Ready after production.'},
          409,
        )
      }
      state.lastHandoff = {
        orderId: target.id,
        charged: false,
        invoices: state.invoices.length,
        destination: 'table',
        externalCode: target.externalCode || null,
      }
      return fulfillJson(route, {ok: true, charged: false, ...state.lastHandoff})
    }

    if (pathname === 'order_products' && method === 'GET') {
      return fulfillJson(route, collection(state.order.orderProducts || []))
    }
    if (pathname === 'websocket' && method === 'POST') {
      return fulfillJson(route, {})
    }

    return fulfillJson(route, collection([]))
  })

  await page.addInitScript(
    ({session, device, appType}) => {
      const setItem = (key, value) => {
        try {
          localStorage.setItem(key, value)
        } catch {
          // ignore
        }
      }
      setItem('session', JSON.stringify(session))
      setItem('config', JSON.stringify({language: 'pt-br'}))
      setItem('device', JSON.stringify(device))
      setItem('app-type', appType)
    },
    {
      appType: 'POS',
      session: buildAdminSession(),
      device: {
        id: 'web-7',
        device: 'web-7',
        type: 'WEB',
        appVersion,
        buildNumber: appVersion,
        configs: deviceConfigsPayload,
      },
    },
  )

  return state
}

module.exports = {
  API_ORIGIN,
  CORS_HEADERS,
  createWaiterTablesApiMock,
}
