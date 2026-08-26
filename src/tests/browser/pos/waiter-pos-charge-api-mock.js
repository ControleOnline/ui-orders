const {
  APP_VERSION,
  CORS_HEADERS,
  collection,
  createCompany,
  createFakeSession,
  createPaymentOption,
  createPosMenus,
  jsonHeaders,
  textHeaders,
} = require('./single-item-fixtures')
const {
  applyPosPayment,
  buildReadyTableTree,
  closeSettlementTree,
} = require('../../react/pages/checkout/waiterPosChargeSmoke')

const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin')

const buildWaiterDeviceConfig = (deviceId = 'web-7') => ({
  id: 1,
  device: {id: 1, device: deviceId},
  people: {id: 3},
  type: 'PDV',
  configs: JSON.stringify({
    'config-version': APP_VERSION,
    'pos-operation-mode': 'waiter',
    'check-order-type': 'table',
    'check-order-management-mode': 'manage',
    'pos-local-charge-enabled': true,
    'order-charge-enabled': true,
    manage_pos_check_orders: true,
    'pos-gateway': 'cielo',
    'pos-type': 'simple',
    'payment-type-ids': [1, 2],
    'cash-wallet-closed-id': 0,
    'pos-default-status': 901,
    'pos-paid-status': 902,
  }),
})

const createWaiterPosChargeMock = async (page, overrides = {}) => {
  const tree = buildReadyTableTree(overrides.tree)
  const state = {
    company: createCompany(3, {
      name: 'Restaurante Centro',
      alias: 'Centro',
      configs: {
        'pos-cash-wallet': 101,
        'pos-cielo-wallet': 102,
      },
    }),
    defaultCompany: createCompany(3, {
      name: 'Restaurante Centro',
      alias: 'Centro',
      configs: {
        'pos-default-status': 901,
        'pos-paid-status': 902,
      },
    }),
    user: {
      id: 7,
      name: 'Garcom POS',
      alias: 'Garcom POS',
      api_key: 'test-api-key',
      active: 1,
    },
    deviceId: 'web-7',
    menus: createPosMenus(),
    deviceConfig: buildWaiterDeviceConfig('web-7'),
    orders: tree.orders,
    invoices: [],
    nextInvoiceId: 7001,
    lastInvoicePayload: null,
    deliveredOrderIds: [],
    paymentOptions: [
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
  }

  const findOrder = id =>
    state.orders.find(order => Number(order.id) === Number(id)) || state.orders[0]

  const fulfillJson = async (route, body, status = 200) =>
    route.fulfill({
      status,
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    })

  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname.replace(/^\/+/, '')
    const method = request.method().toUpperCase()
    let body = {}
    try {
      body = request.postDataJSON() || {}
    } catch {
      body = {}
    }

    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''})
    }
    if (pathname === 'themes-colors.css') {
      return route.fulfill({
        status: 200,
        headers: textHeaders(),
        body: ':root { --primary: #0ea5e9; }',
      })
    }
    if (pathname === 'runtime/ip') {
      return fulfillJson(route, {ip: '127.0.0.1', member: [{ip: '127.0.0.1'}]})
    }
    if (pathname === 'people/companies/my' || pathname === 'people/company/default') {
      return fulfillJson(
        route,
        pathname.includes('default') ? state.defaultCompany : [state.company],
      )
    }
    if (pathname === 'device_configs' && method === 'GET') {
      return fulfillJson(route, collection([state.deviceConfig]))
    }
    if (pathname.includes('device_configs') || pathname.includes('configs/discovery')) {
      return fulfillJson(route, {ok: true})
    }
    if (pathname === 'wallet_payment_types') {
      return fulfillJson(route, collection(state.paymentOptions))
    }
    if (pathname === 'devices') {
      return fulfillJson(route, collection([{id: 1, device: 'web-7'}]))
    }
    if (pathname === 'menus-people') {
      return fulfillJson(route, state.menus)
    }
    if (pathname === 'invoices' && method === 'GET') {
      return fulfillJson(route, collection(state.invoices))
    }
    if (pathname === 'invoices' && method === 'POST') {
      const invoiceId = state.nextInvoiceId++
      const invoice = {
        '@id': `/invoices/${invoiceId}`,
        id: invoiceId,
        order: body.order || `/orders/${tree.table.id}`,
        price: Number(body.price || tree.table.price),
        status: '/statuses/902',
        destinationWallet: body.destinationWallet || '/wallets/101',
        paymentType: body.paymentType || '/payment_types/1',
      }
      state.lastInvoicePayload = body
      state.invoices.push(invoice)
      state.orders = applyPosPayment(state.orders, invoice.price)
      return fulfillJson(route, invoice)
    }
    const deliveredMatch = pathname.match(/^orders\/(\d+)\/delivered$/)
    if (deliveredMatch && method === 'POST') {
      const orderId = Number(deliveredMatch[1])
      state.deliveredOrderIds.push(orderId)
      state.orders = closeSettlementTree(state.orders)
      return fulfillJson(route, {
        action: 'delivered',
        result: {errno: 0, errmsg: 'ok'},
        capabilities: {is_terminal: true, realStatus: 'closed'},
      })
    }
    const orderItemMatch = pathname.match(/^orders\/(\d+)$/)
    if (orderItemMatch && method === 'GET') {
      return fulfillJson(route, findOrder(orderItemMatch[1]))
    }
    if (pathname === 'orders' && method === 'GET') {
      const openOnly = url.searchParams.get('status.realStatus') === 'open'
      const orders = openOnly
        ? state.orders.filter(
            order => String(order.status?.realStatus || '').toLowerCase() === 'open',
          )
        : state.orders
      return fulfillJson(route, collection(orders))
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
      session: createFakeSession({companyId: 3, deviceId: 'web-7'}),
      device: {
        id: 'web-7',
        device: 'web-7',
        type: 'WEB',
        appVersion: APP_VERSION,
        buildNumber: APP_VERSION,
        configs: {
          'pos-operation-mode': 'waiter',
          'check-order-type': 'table',
          'check-order-management-mode': 'manage',
          'pos-local-charge-enabled': true,
          'order-charge-enabled': true,
          manage_pos_check_orders: true,
        },
      },
    },
  )

  return state
}

const bootstrapPosBrowser = async page => {
  await page.goto('/')
  await page.waitForTimeout(400)
}

const captureStep = async (page, name) => {
  await page.screenshot({
    path: require('path').join(
      __dirname,
      'screenshots',
      'waiter-pos-charge',
      `${name}.png`,
    ),
    fullPage: true,
  })
}

module.exports = {
  bootstrapPosBrowser,
  captureStep,
  createWaiterPosChargeMock,
}
