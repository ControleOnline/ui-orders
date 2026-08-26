const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  FLOW_ID,
  FLOWCHART_ID,
  REQUIRED_PRINT_STEPS,
  assertCompleteEvidence,
  createEvidenceSession,
} = require('../../browser/pos/flowchart-1-evidence');
const {
  markOrderProductsChecked,
} = require('../../browser/pos/flowchart-1-prepaid-helpers');

describe('flowchart 1 prepaid evidence manifesto', () => {
  it('declares compra-fluxo, flowchart 1 and required prints', () => {
    expect(FLOW_ID).toBe('compra-fluxo');
    expect(FLOWCHART_ID).toBe(1);
    expect(REQUIRED_PRINT_STEPS).toEqual([
      'login',
      'device',
      'pos',
      'produto-no-pedido',
      'checkout-pago',
      'fila-production-ou-conference',
      'ready',
    ]);
  });

  it('writes manifesto with production steps and fails when a print is missing', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowchart-1-'));
    const session = createEvidenceSession(outputDir);
    session.steps.push(
      {id: 'login', title: 'Login', file: '01-login.png', url: '/sign-in-page'},
      {id: 'device', title: 'Device', file: '02-device.png', url: '/devices-index'},
    );
    const written = session.writeManifest({orderId: 123, result: 'incomplete'});
    expect(written.manifest.fluxo).toBe('compra-fluxo');
    expect(written.manifest.flowchartIds).toEqual([1]);
    expect(written.manifest.flowchartLinks[0]).toContain('/flowcharts/1');
    expect(written.manifest.productionSteps.length).toBeGreaterThan(0);
    expect(written.missingPrints).toContain('ready');
    expect(() => assertCompleteEvidence(written.missingPrints)).toThrow(/missing required prints/);
  });

  it('marks order products as conferido so Ready can complete', () => {
    const checked = markOrderProductsChecked({
      id: 123,
      orderType: 'cart',
      status: {status: 'open', realStatus: 'open'},
      orderProducts: [{id: 1010, product: {sku: 'CX-101'}}],
    });
    expect(checked.orderType).toBe('sale');
    expect(checked.orderProducts[0].status.realStatus).toBe('checked');
  });
});
