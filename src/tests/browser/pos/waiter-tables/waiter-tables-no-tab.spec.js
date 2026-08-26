/**
 * fluxo: pedido-criacao
 * flowchartIds: [1]
 * flowKey: sales-production
 *
 * Smoke E2E #604 — garçom + mesas (sem comanda).
 * Prints: PDV waiter, mesa aberta, item lançado, settlement, produção/ready, entrega mesa.
 */
const {expect, test} = require('playwright/test')
const {
  WAITER_TABLES_SMOKE_MANIFEST,
  assertWaiterTableDeviceContract,
  parseDeviceConfigs,
} = require('../../helpers/flowchartAdminPosHelpers')
const {API_ORIGIN, createWaiterTablesApiMock} = require('./apiMock')
const {
  bindBrowserDiagnostics,
  bootstrapPosBrowser,
  browserApi,
  captureStep,
  describeManifest,
} = require('./helpers')
const {createOpenOrder} = require('./fixtures')

test.describe('Smoke E2E: garçom + mesas (sem comanda)', () => {
  test('declares flowchart 1 manifesto for playground/QA', () => {
    expect(WAITER_TABLES_SMOKE_MANIFEST).toMatchObject({
      flowchartIds: [1],
      fluxo: 'pedido-criacao',
      flowKey: 'sales-production',
    })
    expect(WAITER_TABLES_SMOKE_MANIFEST.flowchartLinks).toEqual([
      'https://admin.controleonline.com/admin/flowcharts/1',
    ])
    expect(WAITER_TABLES_SMOKE_MANIFEST.steps).toEqual([
      'pdv-waiter',
      'mesa-aberta',
      'item-lancado',
      'settlement',
      'producao-ready',
      'entrega-mesa',
    ])
    expect(describeManifest()).toContain('fluxo: pedido-criacao')
  })

  test('PDV waiter opens a table, launches item, produces, then handoff without charge', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page)
    const state = await createWaiterTablesApiMock(page)
    await bootstrapPosBrowser(page)

    const contract = assertWaiterTableDeviceContract(state.deviceConfig)
    expect(contract).toEqual({
      isWaiter: true,
      isTable: true,
      isNotTab: true,
      chargeDisabled: true,
    })
    expect(parseDeviceConfigs(state.deviceConfig)['check-order-type']).toBe('table')
    await expect(page.getByText('Pedidos', {exact: true}).first()).toBeVisible()
    await captureStep(page, 'pdv-waiter')

    await page.goto('/add-product-screen?store=categories')
    await expect(page.getByRole('dialog')).toBeVisible({timeout: 15000})
    await expect(page.getByPlaceholder(/Linked Order Code|code|código/i)).toBeVisible()
    await page.getByPlaceholder(/Linked Order Code|code|código/i).fill('MESA-12')
    await page.getByText('Confirm', {exact: true}).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await expect.poll(() =>
      state.orders.find(
        order => order.orderType === 'table' && order.externalCode === 'MESA-12',
      ),
    ).toBeTruthy()
    const tableRoot = state.orders.find(
      order => order.orderType === 'table' && order.externalCode === 'MESA-12',
    )
    expect(tableRoot.orderType).not.toBe('tab')
    await expect.poll(() =>
      state.orders.find(
        order =>
          Number(order.mainOrderId) === Number(tableRoot.id) &&
          order.orderType === 'cart',
      ),
    ).toBeTruthy()
    await captureStep(page, 'mesa-aberta')

    const cart = state.orders.find(
      order =>
        Number(order.mainOrderId) === Number(tableRoot.id) &&
        order.orderType === 'cart',
    )
    const addResponse = await browserApi(page, `orders/${cart.id}/add-products`, {
      method: 'PUT',
      body: [{product: '101', quantity: 1}],
      apiOrigin: API_ORIGIN,
    })
    expect(addResponse).toMatchObject({ok: true, status: 200})
    expect(state.order.orderProducts).toHaveLength(1)
    expect(state.order.price).toBe(12.5)
    expect(state.invoices).toHaveLength(0)
    await page.goto('/add-product-screen?store=categories')
    await captureStep(page, 'item-lancado')

    await page.goto(`/linked-order-settlement-page?rootOrderId=${tableRoot.id}`)
    await expect(page.getByText(/settlement|liquid|mesa|table/i).first()).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText(/Charge not authorized/i).first()).toBeVisible({
      timeout: 15000,
    })
    await captureStep(page, 'settlement')

    const earlyHandoff = await browserApi(page, `orders/${cart.id}/handoff`, {
      method: 'POST',
      body: {},
      apiOrigin: API_ORIGIN,
    })
    expect(earlyHandoff.status).toBe(409)

    const confirmResponse = await browserApi(page, `orders/${cart.id}/confirm`, {
      method: 'POST',
      body: {},
      apiOrigin: API_ORIGIN,
    })
    expect(confirmResponse).toMatchObject({ok: true, status: 200})
    expect(state.order.orderType).toBe('sale')
    expect(state.order.status).toMatchObject({status: 'preparing'})
    expect(state.queues[0].status.status).toBe('working')

    const readyTooSoon = await browserApi(page, `orders/${cart.id}/handoff`, {
      method: 'POST',
      body: {},
      apiOrigin: API_ORIGIN,
    })
    expect(readyTooSoon.status).toBe(409)

    const readyResponse = await browserApi(page, `orders/${cart.id}/ready`, {
      method: 'POST',
      body: {},
      apiOrigin: API_ORIGIN,
    })
    expect(readyResponse).toMatchObject({ok: true, status: 200})
    expect(state.order.status).toMatchObject({status: 'ready'})
    expect(state.queues[0].status.status).toBe('produced')
    await captureStep(page, 'producao-ready')

    const handoffResponse = await browserApi(page, `orders/${cart.id}/handoff`, {
      method: 'POST',
      body: {},
      apiOrigin: API_ORIGIN,
    })
    expect(handoffResponse).toMatchObject({ok: true, status: 200})
    expect(state.lastHandoff).toMatchObject({
      charged: false,
      invoices: 0,
      destination: 'table',
    })
    expect(state.invoices).toHaveLength(0)
    await page.goto(`/linked-order-settlement-page?rootOrderId=${tableRoot.id}`)
    await expect(page.getByText(/Charge not authorized/i).first()).toBeVisible()
    await captureStep(page, 'entrega-mesa')
  })

  test('does not create a tab when the PDV is configured for tables', async ({page}) => {
    const tableRoot = createOpenOrder({
      id: 501,
      orderType: 'table',
      externalCode: 'MESA-12',
    })
    const cart = createOpenOrder({
      id: 502,
      orderType: 'cart',
      externalCode: 'MESA-12',
      mainOrderId: 501,
    })
    const state = await createWaiterTablesApiMock(page, {
      order: cart,
      orders: [tableRoot, cart],
    })
    await bootstrapPosBrowser(page)

    expect(state.orders.some(order => order.orderType === 'tab')).toBe(false)
    expect(state.orders.filter(order => order.orderType === 'table')).toHaveLength(1)
    expect(parseDeviceConfigs(state.deviceConfig)['check-order-type']).toBe('table')
  })
})
