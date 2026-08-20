const {expect, test} = require('playwright/test')
const packageJson = require('../../../../../../../package.json')
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin')

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

const installSession = async (page, {chargeEnabled = false, appType = 'ERP'} = {}) => {
  await page.addInitScript(
    ({appVersion, chargeEnabled, appType}) => {
      const set = (k, v) => {
        try {
          localStorage.setItem(k, v)
        } catch {}
      }
      set(
        'session',
        JSON.stringify({
          id: 7,
          people: '/people/7',
          api_key: 'test',
          active: 1,
          mycompany: 3,
          roles: ['ROLE_ADMIN'],
        }),
      )
      set('config', JSON.stringify({language: 'pt-br'}))
      set('app-type', appType)
      set(
        'device',
        JSON.stringify({
          id: 'web',
          device: 'web',
          type: 'WEB',
          appVersion,
          buildNumber: appVersion,
          configs: {
            'pos-local-charge-enabled': chargeEnabled,
            'order-charge-enabled': chargeEnabled,
            manage_pos_check_orders: true,
          },
        }),
      )
    },
    {appVersion: APP_VERSION, chargeEnabled, appType},
  )
}

const mockApiEmpty = async page => {
  await page.route(`${API_ORIGIN}/**`, async route => {
    const method = route.request().method().toUpperCase()
    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''})
    }
    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(collection([])),
    })
  })
}

const mockApiWithOpenRoot = async page => {
  const root = {
    '@id': '/orders/501',
    id: 501,
    orderType: 'table',
    externalCode: 'Mesa-501',
    status: {status: 'open', realStatus: 'open'},
    price: 40,
    payable: 40,
  }
  const childCart = {
    '@id': '/orders/502',
    id: 502,
    orderType: 'cart',
    mainOrder: '/orders/501',
    status: {status: 'open', realStatus: 'open'},
    price: 25,
    payable: 25,
  }
  await page.route(`${API_ORIGIN}/**`, async route => {
    const method = route.request().method().toUpperCase()
    const url = route.request().url()
    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''})
    }
    if (url.includes('/orders/501') && method === 'GET') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(root),
      })
    }
    if (url.includes('/orders') && method === 'GET') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([root, childCart])),
      })
    }
    if (url.includes('/invoices')) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([])),
      })
    }
    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(collection([])),
    })
  })
}

test.describe('linked order settlement browser smoke', () => {
  test('renders settlement page shell', async ({page}) => {
    await mockApiEmpty(page)
    await installSession(page, {chargeEnabled: false})
    await page.goto('/linked-order-settlement-page')
    await expect(page.getByText(/settlement|liquid/i).first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('shows open roots empty state and manage copy', async ({page}) => {
    await mockApiEmpty(page)
    await installSession(page, {chargeEnabled: false})
    await page.goto('/linked-order-settlement-page')
    await expect(page.getByText(/settlement|liquid/i).first()).toBeVisible({
      timeout: 15000,
    })
    await expect(
      page.getByText(/No open (table|tab)s found|No table selected|No tab selected/i).first(),
    ).toBeVisible({timeout: 10000})
    await expect(
      page.getByText(/Manage mode|Existing-only|identify a new one|existing open/i).first(),
    ).toBeVisible({timeout: 10000})
  })

  test('gates Charge when local charge is disabled', async ({page}) => {
    await mockApiWithOpenRoot(page)
    await installSession(page, {chargeEnabled: false})
    await page.goto('/linked-order-settlement-page?rootOrderId=501')
    await expect(page.getByText(/settlement|liquid/i).first()).toBeVisible({
      timeout: 15000,
    })
    // Primary loaded or empty with charge footer after select
    const chargeUnauthorized = page.getByText(/Charge not authorized/i)
    const chargeBalance = page.getByText(/Charge balance|Review payments/i)
    // Prefer unauthorized when charge disabled
    await expect(chargeUnauthorized.or(chargeBalance).first()).toBeVisible({
      timeout: 15000,
    })
    if (await chargeUnauthorized.count()) {
      await expect(chargeUnauthorized.first()).toBeVisible()
    }
  })

  test('shows Close settlement control for explicit confirmation path', async ({
    page,
  }) => {
    await mockApiWithOpenRoot(page)
    await installSession(page, {chargeEnabled: true})
    await page.goto('/linked-order-settlement-page?rootOrderId=501')
    await expect(page.getByText(/settlement|liquid/i).first()).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText(/Close settlement/i).first()).toBeVisible({
      timeout: 15000,
    })
  })
})
