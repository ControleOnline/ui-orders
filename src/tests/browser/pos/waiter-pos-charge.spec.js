const {expect, test} = require('playwright/test')
const {
  WAITER_POS_CHARGE_SMOKE,
  isPosChargeSurface,
  isTableStillOpen,
} = require('../../react/pages/checkout/waiterPosChargeSmoke')
const {
  bootstrapPosBrowser,
  captureStep,
  createWaiterPosChargeMock,
} = require('./waiter-pos-charge-api-mock')

const confirmBrowserDialogs = page => {
  page.on('dialog', async dialog => {
    await dialog.accept()
  })
}

test.describe('waiter POS charge after Ready (#606)', () => {
  test('fluxo: financeiro-cobranca charges on POS and closes the table', async ({
    page,
  }) => {
    confirmBrowserDialogs(page)
    const state = await createWaiterPosChargeMock(page)
    await bootstrapPosBrowser(page)

    expect(WAITER_POS_CHARGE_SMOKE.fluxo).toBe('financeiro-cobranca')
    expect(WAITER_POS_CHARGE_SMOKE.flowchartIds).toEqual([1])

    await page.goto('/linked-order-settlement-page?rootOrderId=501')
    await expect(page.getByText(/Mesa-12|table settlement|Settlement/i).first()).toBeVisible({
      timeout: 20000,
    })
    await expect(page.getByText(/ready/i).first()).toBeVisible({timeout: 15000})
    await captureStep(page, 'ready')

    await expect(page.getByText('Close settlement').first()).toBeVisible()
    await captureStep(page, 'close-table-action')

    const chargeButton = page.getByText('Charge balance').first()
    await expect(chargeButton).toBeVisible()
    await chargeButton.click()

    await expect(page).toHaveURL(/checkout/i, {timeout: 15000})
    const appType = await page.evaluate(() => localStorage.getItem('app-type'))
    expect(isPosChargeSurface(appType, page.url())).toBe(true)
    await expect(page.getByText('Dinheiro', {exact: true}).first()).toBeVisible({
      timeout: 15000,
    })
    await captureStep(page, 'pos-charge-screen')

    await page.getByText('Receber em dinheiro', {exact: true}).click()
    await page.getByPlaceholder('Ex.: 50,00').fill('36,90')
    await page.getByText('Confirmar', {exact: true}).click()
    await expect.poll(() => state.invoices.length).toBe(1)
    expect(state.invoices[0]).toMatchObject({price: 36.9})
    await captureStep(page, 'payment')

    await page.goto('/linked-order-settlement-page?rootOrderId=501')
    await expect(page.getByText('Close settlement').first()).toBeVisible({
      timeout: 15000,
    })
    await page.getByText('Close settlement').first().click()
    const confirmButton = page.getByText(/^Confirm$/i).first()
    if (await confirmButton.count()) {
      await confirmButton.click()
    }

    await expect.poll(() => state.deliveredOrderIds.length).toBeGreaterThan(0)
    expect(isTableStillOpen(state.orders, 501)).toBe(false)
    await expect(page.getByText(/closed successfully|No open table/i).first()).toBeVisible({
      timeout: 15000,
    })
    await captureStep(page, 'closed')
  })

  test('does not use the ON CHECKOUT app for waiterPosCharge', async ({page}) => {
    await createWaiterPosChargeMock(page)
    await bootstrapPosBrowser(page)
    await page.goto('/linked-order-settlement-page?rootOrderId=501')
    await expect(page.getByText('Charge balance').first()).toBeVisible({
      timeout: 20000,
    })
    await page.getByText('Charge balance').first().click()
    await expect(page).toHaveURL(/\/checkout/i)
    expect(page.url()).not.toMatch(/checkout\.controleonline\.com/i)
    const appType = await page.evaluate(() => localStorage.getItem('app-type'))
    expect(appType).toBe('POS')
  })
})
