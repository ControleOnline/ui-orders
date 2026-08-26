const packageJson = require('../../../../../../../package.json')
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin')
const {
  PRODUCT_A,
  PRODUCT_B,
  createTwoTabTree,
  createWaiterTableDeviceConfig,
  withReadySales,
} = require('./flowchart1WaiterTabs.fixtures')

const APP_VERSION = packageJson?.version || '1.0.0'

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

const collection = member => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
})

const installWaiterSession = async page => {
  const deviceConfig = createWaiterTableDeviceConfig(APP_VERSION)
  await page.addInitScript(
    ({appVersion, deviceConfig: config}) => {
      const set = (key, value) => {
        try {
          localStorage.setItem(key, value)
        } catch {}
      }
      set(
        'session',
        JSON.stringify({
          id: 7,
          people: '/people/7',
          api_key: 'test',
          token: 'test',
          active: 1,
          mycompany: 3,
          roles: ['ROLE_ADMIN'],
        }),
      )
      set('config', JSON.stringify({language: 'pt-br'}))
      set('app-type', 'POS')
      set(
        'device',
        JSON.stringify({
          id: 'web-7',
          device: 'web-7',
          type: 'PDV',
          appVersion,
          buildNumber: appVersion,
          configs: config.configs,
        }),
      )
    },
    {appVersion: APP_VERSION, deviceConfig},
  )
}

const createWaiterTabsApiMock = async (page, {orders} = {}) => {
  const state = {
    orders: orders || withReadySales(createTwoTabTree()),
    deviceConfig: createWaiterTableDeviceConfig(APP_VERSION),
    products: [PRODUCT_A, PRODUCT_B],
  }

  await page.route(`${API_ORIGIN}/**`, async route => {
    const method = route.request().method().toUpperCase()
    const url = route.request().url()
    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''})
    }

    const fulfill = body =>
      route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(body),
      })

    const orderIdMatch = url.match(/\/orders\/(\d+)(?:\?|$)/)
    if (orderIdMatch && method === 'GET') {
      const order = state.orders.find(
        item => Number(item.id) === Number(orderIdMatch[1]),
      )
      return fulfill(order || collection([]))
    }

    if (url.includes('/orders') && method === 'GET') {
      return fulfill(collection(state.orders))
    }

    if (url.includes('/device_configs')) {
      return fulfill(collection([state.deviceConfig]))
    }

    if (url.includes('/devices')) {
      return fulfill(
        collection([
          {
            id: 1,
            device: 'web-7',
            alias: 'PDV garcom',
            type: 'PDV',
          },
        ]),
      )
    }

    if (url.includes('/products')) {
      return fulfill(collection(state.products))
    }

    if (url.includes('/invoices')) {
      return fulfill(collection([]))
    }

    if (url.includes('/people') || url.includes('/companies')) {
      return fulfill(
        collection([
          {
            id: 3,
            name: 'Restaurante Centro',
            alias: 'Centro',
            panel_enabled: true,
            enabled: true,
            commercial_enabled: true,
          },
        ]),
      )
    }

    return fulfill(collection([]))
  })

  return state
}

const bindBrowserDiagnostics = page => {
  page.on('console', message => {
    if (message.type() === 'error') {
      console.log('[browser console error]', message.text())
    }
  })
  page.on('pageerror', error => {
    console.log('[browser pageerror]', error?.stack || error?.message || String(error))
  })
}

module.exports = {
  bindBrowserDiagnostics,
  createWaiterTabsApiMock,
  installWaiterSession,
}
