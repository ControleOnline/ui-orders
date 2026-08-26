const path = require('path');
const {expect, test} = require('playwright/test');
const {bindBrowserDiagnostics} = require('./single-item-api-mock');
const {
  FLOW_ID,
  FLOWCHART_ID,
  assertCompleteEvidence,
  createEvidenceSession,
} = require('./flowchart-1-evidence');
const {
  bootstrapFlowchart1Smoke,
  markOrderReady,
  mockPublicLoginApi,
  openConferencePrint,
  openDevicesPrint,
  openLoginPrint,
  openPosCatalogPrint,
  payCashAndLeaveCheckout,
  selectSingleProduct,
} = require('./flowchart-1-prepaid-helpers');

const defaultEvidenceDir = path.join(
  __dirname,
  'screenshots',
  'flowchart-1-single-product-prepaid',
);

test.describe('flowchart 1 single product prepaid until ready', () => {
  test('fluxo: compra-fluxo — login ADMIN, PDV balcão, checkout, conference e Ready', async ({
    page,
  }, testInfo) => {
    bindBrowserDiagnostics(page);
    const evidenceDir = process.env.PLAYWRIGHT_SMOKE_RESULTS_DIR
      ? path.join(
          process.env.PLAYWRIGHT_SMOKE_RESULTS_DIR,
          'flowchart-1-single-product-prepaid',
        )
      : path.join(testInfo.outputDir, 'flowchart-1-single-product-prepaid');
    const evidence = createEvidenceSession(evidenceDir);
    const persisted = createEvidenceSession(defaultEvidenceDir);

    const capture = async (stepId, title) => {
      await evidence.capture(page, stepId, title);
      await persisted.capture(page, stepId, title);
    };

    await mockPublicLoginApi(page);
    await openLoginPrint(page, expect);
    await capture('login', 'Login ADMIN');

    const state = await bootstrapFlowchart1Smoke(page);
    await openDevicesPrint(page, expect);
    await capture('device', 'Device PDV');

    await openPosCatalogPrint(page, expect);
    await capture('pos', 'POS modo balcão / prepaid / single-item');

    await selectSingleProduct(page, expect);
    await capture('produto-no-pedido', 'Produto único no pedido');

    await payCashAndLeaveCheckout(page, expect);
    await capture('checkout-pago', 'Checkout / invoice paga');

    await openConferencePrint(page, expect);
    await capture('fila-production-ou-conference', 'PPC conference / fila');

    await markOrderReady(page, expect, state);
    await capture('ready', 'Pedido Ready');

    const written = evidence.writeManifest({
      orderId: 123,
      result: 'ready',
    });
    persisted.writeManifest({
      orderId: 123,
      result: 'ready',
    });
    assertCompleteEvidence(written.missingPrints);
    expect(written.manifest.fluxo).toBe(FLOW_ID);
    expect(written.manifest.flowchartIds).toEqual([FLOWCHART_ID]);
    await testInfo.attach('flowchart-1-manifest', {
      path: written.manifestPath,
      contentType: 'application/json',
    });
  });
});
