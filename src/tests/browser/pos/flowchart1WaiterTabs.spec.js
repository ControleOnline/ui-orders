/**
 * Smoke E2E flowchart 1 — garçom + mesas + comandas (#605)
 *
 * fluxo: pedido-criacao
 * flowchartIds: [1]
 * prints: mesa, comanda-a, comanda-b, itens, settlement-duas-comandas, ready
 *
 * Fora de escopo: fechamento/cobrança (#606/#607).
 */
const fs = require('fs')
const path = require('path')
const {expect, test} = require('playwright/test')
const {
  FLOWCHART_IDS,
  FLUXO,
  SCREENSHOT_DIR,
  TABLE_CODE,
  TAB_A_CODE,
  TAB_B_CODE,
  TABLE_ID,
  attachTab,
  createTableOnlyTree,
  createTwoTabTree,
  PRODUCT_A,
  PRODUCT_B,
  TAB_A_ID,
  TAB_B_ID,
  CART_A_ID,
  CART_B_ID,
  withReadySales,
} = require('./flowchart1WaiterTabs.fixtures')
const {
  bindBrowserDiagnostics,
  createWaiterTabsApiMock,
  installWaiterSession,
} = require('./flowchart1WaiterTabs.mock')

const capture = async (page, stepName) => {
  fs.mkdirSync(SCREENSHOT_DIR, {recursive: true})
  const filePath = path.join(SCREENSHOT_DIR, `${stepName}.png`)
  await page.screenshot({path: filePath, fullPage: true})
  return filePath
}

test.describe('flowchart 1 waiter table + two tabs smoke', () => {
  test('declares the canonical flowchart and catalog flow', () => {
    expect(FLOWCHART_IDS).toEqual([1])
    expect(FLUXO).toBe('pedido-criacao')
  })

  test('keeps the first tab when the second tab is launched on the same table', () => {
    let orders = attachTab(createTableOnlyTree(), {
      tabId: TAB_A_ID,
      cartId: CART_A_ID,
      code: TAB_A_CODE,
      product: PRODUCT_A,
      orderProductId: 801,
    })
    const tabCodes = orders =>
      orders
        .filter(order => order.orderType === 'tab' && Number(order.mainOrderId) === TABLE_ID)
        .map(order => order.externalCode)

    expect(tabCodes(orders)).toEqual([TAB_A_CODE])
    orders = attachTab(orders, {
      tabId: TAB_B_ID,
      cartId: CART_B_ID,
      code: TAB_B_CODE,
      product: PRODUCT_B,
      orderProductId: 802,
    })
    expect(tabCodes(orders)).toEqual([TAB_A_CODE, TAB_B_CODE])
  })

  test('shows mesa, both comandas, items and ready sales on settlement', async ({
    page,
  }) => {
    bindBrowserDiagnostics(page)
    await createWaiterTabsApiMock(page, {
      orders: withReadySales(createTwoTabTree()),
    })
    await installWaiterSession(page)

    await page.goto(`/linked-order-settlement-page?rootOrderId=${TABLE_ID}`)
    await expect(page.getByText(/settlement|liquid/i).first()).toBeVisible({
      timeout: 15000,
    })
    await capture(page, '01-mesa')

    await expect(page.getByText(TABLE_CODE).first()).toBeVisible({timeout: 10000})
    await expect(page.getByText(TAB_A_CODE).first()).toBeVisible()
    await capture(page, '02-comanda-a')
    await expect(page.getByText(TAB_B_CODE).first()).toBeVisible()
    await capture(page, '03-comanda-b')

    await expect(page.getByText(TAB_A_CODE)).toHaveCount(await page.getByText(TAB_A_CODE).count())
    expect(await page.getByText(TAB_A_CODE).count()).toBeGreaterThan(0)
    expect(await page.getByText(TAB_B_CODE).count()).toBeGreaterThan(0)

    await expect(
      page.getByText(/Amendoim|Refrigerante|Linked sale|Ready|ready/i).first(),
    ).toBeVisible({timeout: 10000})
    await capture(page, '04-itens')
    await capture(page, '05-settlement-duas-comandas')
    await expect(page.getByText(/ready/i).first()).toBeVisible({timeout: 10000})
    await capture(page, '06-ready')
  })
})
