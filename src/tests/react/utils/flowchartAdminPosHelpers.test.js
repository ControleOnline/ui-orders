const {
  WAITER_TABLES_SMOKE_MANIFEST,
  assertWaiterTableDeviceContract,
  buildAdminSession,
  buildFlowchartLinks,
  buildWaiterTableDeviceConfigs,
  parseDeviceConfigs,
} = require('../../browser/helpers/flowchartAdminPosHelpers')

describe('flowchartAdminPosHelpers waiter+tables contract', () => {
  it('exposes flowchart 1 manifesto for pedido-criacao', () => {
    expect(WAITER_TABLES_SMOKE_MANIFEST.flowchartIds).toEqual([1])
    expect(WAITER_TABLES_SMOKE_MANIFEST.fluxo).toBe('pedido-criacao')
    expect(WAITER_TABLES_SMOKE_MANIFEST.steps).toContain('mesa-aberta')
    expect(WAITER_TABLES_SMOKE_MANIFEST.steps).not.toContain('comanda')
    expect(buildFlowchartLinks([1])).toEqual([
      'https://admin.controleonline.com/admin/flowcharts/1',
    ])
  })

  it('builds a waiter/table PDV without tab or local charge', () => {
    const configs = buildWaiterTableDeviceConfigs({appVersion: '1.8.1'})
    expect(configs['pos-operation-mode']).toBe('waiter')
    expect(configs['check-order-type']).toBe('table')
    expect(configs['check-order-type']).not.toBe('tab')
    expect(configs['pos-local-charge-enabled']).toBe(false)
    expect(configs['config-version']).toBe('1.8.1')

    const deviceConfig = {configs: JSON.stringify(configs)}
    expect(parseDeviceConfigs(deviceConfig)['check-order-type']).toBe('table')
    expect(assertWaiterTableDeviceContract(deviceConfig)).toEqual({
      isWaiter: true,
      isTable: true,
      isNotTab: true,
      chargeDisabled: true,
    })
  })

  it('creates an ADMIN session without embedding secrets', () => {
    const session = buildAdminSession({companyId: 9, userId: 4})
    expect(session.roles).toContain('ROLE_ADMIN')
    expect(session.mycompany).toBe(9)
    expect(session.people).toBe('/people/4')
    expect(JSON.stringify(session)).not.toMatch(/password|secret/i)
  })
})
