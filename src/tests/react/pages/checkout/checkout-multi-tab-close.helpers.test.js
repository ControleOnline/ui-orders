const {
  buildMultiTabSettlementFixture,
  buildSmokeManifest,
  FLOWCHART_IDS,
  FLUXO,
} = require('../../../browser/manager/checkout-multi-tab-close.helpers');

describe('checkout multi-tab close smoke helpers', () => {
  test('builds two tabs under the same table with flowchart metadata', () => {
    const fixture = buildMultiTabSettlementFixture();

    expect(fixture.fluxo).toBe(FLUXO);
    expect(fixture.flowchartIds).toEqual(FLOWCHART_IDS);
    expect(fixture.tabs).toHaveLength(2);
    expect(fixture.tabs.map(tab => tab.externalCode)).toEqual([
      'Comanda-A',
      'Comanda-B',
    ]);
    expect(fixture.tabs.every(tab => tab.mainOrderId === fixture.table.id)).toBe(
      true,
    );
    expect(fixture.table.orderType).toBe('table');
    expect(fixture.tabs.every(tab => tab.orderType === 'tab')).toBe(true);
    expect(fixture.table.price).toBe(40);
  });

  test('manifest declares ON CHECKOUT rather than waiter POS charge', () => {
    const manifest = buildSmokeManifest({
      screenshots: [{slug: '01-comandas-pendentes'}],
    });

    expect(manifest.fluxo).toBe('financeiro-cobranca');
    expect(manifest.flowchartIds).toEqual([1]);
    expect(manifest.chargeSurface).toBe('ON_CHECKOUT_MANAGER');
    expect(manifest.excludedSurface).toBe('waiterPosCharge');
    expect(manifest.steps).toContain('pagamento');
    expect(manifest.screenshots).toHaveLength(1);
  });
});
