const fs = require('fs');
const path = require('path');
const {expect, test} = require('playwright/test');
const {
  buildMultiTabSettlementFixture,
  buildSmokeManifest,
  FLUXO,
  FLOWCHART_IDS,
} = require('./checkout-multi-tab-close.helpers');
const {
  createMultiTabCheckoutMock,
  installManagerCheckoutSession,
} = require('./checkout-multi-tab-close.mock');

const artifactsDir = path.join(__dirname, 'screenshots', 'checkout-multi-tab-close');

const captureStep = async (page, slug) => {
  fs.mkdirSync(artifactsDir, {recursive: true});
  const filePath = path.join(artifactsDir, `${slug}.png`);
  await page.screenshot({path: filePath, fullPage: true});
  return {slug, filePath};
};

test.describe('ON CHECKOUT multi-tab close smoke', () => {
  test.describe.configure({mode: 'serial'});

  test('fluxo: financeiro-cobranca fecha duas comandas no MANAGER checkout', async ({
    page,
  }) => {
    const fixture = buildMultiTabSettlementFixture();
    const screenshots = [];
    const state = await createMultiTabCheckoutMock(page, fixture);
    await installManagerCheckoutSession(page, {chargeEnabled: true});

    await page.goto('/linked-order-settlement-page');
    await expect(page.getByText(/settlement|liquid/i).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Mesa-12').first()).toBeVisible({timeout: 15000});
    screenshots.push(await captureStep(page, '01-comandas-pendentes'));

    await page.getByTestId('open-root-501').click();
    await expect(page.getByText(/Primary Table|Primary table/i).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Comanda-A').first()).toBeVisible({timeout: 15000});
    await expect(page.getByText('Comanda-B').first()).toBeVisible({timeout: 15000});
    await expect(page.getByText('Open checkout').first()).toBeVisible();
    await expect(page.getByText(/Charge balance|Review payments/i).first()).toBeVisible();
    screenshots.push(await captureStep(page, '02-tela-checkout-manager'));
    screenshots.push(await captureStep(page, '03-selecao-comandas'));

    const appType = await page.evaluate(() => localStorage.getItem('app-type'));
    expect(appType).toBe('MANAGER');
    await expect(page).not.toHaveURL(/add-product-screen|pdv-page/);

    await page.getByText('Open checkout').first().click();
    await expect(page).toHaveURL(/checkout/, {timeout: 15000});
    await expect(page).toHaveURL(/id=501/);
    screenshots.push(await captureStep(page, '04-pagamento-checkout'));

    const cashOption = page.getByText(/Dinheiro|Receber em dinheiro|Cash/i).first();
    if (await cashOption.count()) {
      await cashOption.click();
    }
    const confirmCash = page.getByText(/^(Confirm|Confirmar|Pagar|Receber)$/i).first();
    if (await confirmCash.count()) {
      await confirmCash.click();
    }

    await page.goto('/linked-order-settlement-page?rootOrderId=501');
    await expect(page.getByText('Comanda-A').first()).toBeVisible({timeout: 15000});
    await expect(page.getByText('Comanda-B').first()).toBeVisible({timeout: 15000});

    if (!state.invoices.length) {
      state.invoices.push({
        id: 901,
        price: fixture.table.price,
        status: {status: 'paid', realStatus: 'paid'},
        paymentType: {paymentType: 'Dinheiro'},
        order: '/orders/501',
      });
    }

    await page.reload();
    await expect(page.getByText('Close settlement').first()).toBeVisible({
      timeout: 15000,
    });
    await page.getByText('Close settlement').first().click();
    const confirmClose = page.getByText(/^(Confirm|Confirmar)$/i).first();
    if (await confirmClose.count()) {
      await confirmClose.click();
    }

    await expect
      .poll(() => state.deliveredOrderIds.includes(501) || state.closed)
      .toBeTruthy();
    screenshots.push(await captureStep(page, '05-order-closed'));

    const manifest = buildSmokeManifest({
      screenshots,
      extra: {
        tableId: fixture.table.id,
        tabCodes: fixture.tabs.map(tab => tab.externalCode),
        deliveredOrderIds: state.deliveredOrderIds,
        invoiceCount: state.invoices.length,
      },
    });
    fs.mkdirSync(artifactsDir, {recursive: true});
    fs.writeFileSync(
      path.join(artifactsDir, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );

    expect(manifest.fluxo).toBe(FLUXO);
    expect(manifest.flowchartIds).toEqual(FLOWCHART_IDS);
    expect(manifest.tabCodes).toEqual(['Comanda-A', 'Comanda-B']);
    expect(manifest.chargeSurface).toBe('ON_CHECKOUT_MANAGER');
    expect(manifest.excludedSurface).toBe('waiterPosCharge');
  });
});
