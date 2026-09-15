/* global jest */

jest.mock('react-native', () => ({
  Dimensions: {get: () => ({height: 800, width: 1280})},
  PixelRatio: {get: () => 1},
}));

const {
  buildPosOperationInfo,
  resolvePosOperationModuleId,
} = require('../../../react/utils/posOperationInfo');

const {describe, expect, it} = global;

describe('posOperationInfo', () => {
  it('resolves the operation section by internal menu identity, not its label', () => {
    const menus = [
      {id: 100, label: 'Operação', menus: [{menuKey: 'products'}]},
      {id: 333, label: 'Qualquer tradução', menus: [{menuKey: 'orders'}]},
    ];

    expect(resolvePosOperationModuleId(menus)).toBe(333);
  });

  it('builds read-only display rows from the effective device configuration', () => {
    expect(
      buildPosOperationInfo({
        currentCompany: {id: 3, alias: 'GYROS'},
        deviceConfig: {
          device: {id: 403, alias: 'PDV Salão', device: 'terminal-403'},
          configs: JSON.stringify({
            'pos-operation-mode': 'waiter',
            'check-order-type': 'table',
            'android-kiosk-enabled': '1',
            'pos-gateway': 'infinite-pay',
            'printer-enabled': '0',
          }),
        },
      }),
    ).toEqual([
      {key: 'company', label: 'Empresa', value: 'GYROS'},
      {key: 'device', label: 'Device', value: 'PDV Salão (terminal-403)'},
      {key: 'operation-mode', label: 'Modo de operação', value: 'Garçom (waiter)'},
      {key: 'check-order-type', label: 'Vínculo', value: 'Mesa (table)'},
      {key: 'kiosk', label: 'Kiosk', value: 'Ativo'},
      {key: 'gateway', label: 'Gateway', value: 'Infinite Pay (infinite-pay)'},
      {key: 'printer', label: 'Impressora', value: 'Inativa'},
    ]);
  });

  it('uses the shared effective printer default and never invents a gateway', () => {
    const rows = buildPosOperationInfo({currentCompany: {}, deviceConfig: {configs: {}}});
    const values = Object.fromEntries(rows.map(row => [row.key, row.value]));

    expect(values.gateway).toBe('Não configurado');
    expect(values.printer).toBe('Ativa');
    expect(values.company).toBe('Não configurado');
  });
});
