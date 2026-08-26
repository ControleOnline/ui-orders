/**
 * Shared smoke helpers for flowchart 1 (sales-production) POS journeys.
 * #604 consumes the waiter+tables contract; #602 can reuse the session/device builders.
 */

const FLOWCHART_ADMIN_BASE = 'https://admin.controleonline.com/admin/flowcharts'

const parseJsonObject = value => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }
  if (typeof value !== 'string' || !value.trim()) {
    return {}
  }
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {}
  } catch {
    return {}
  }
}

const buildFlowchartLinks = flowchartIds =>
  (Array.isArray(flowchartIds) ? flowchartIds : [])
    .map(id => Number(id))
    .filter(id => Number.isFinite(id) && id > 0)
    .map(id => `${FLOWCHART_ADMIN_BASE}/${id}`)

const WAITER_TABLES_SMOKE_MANIFEST = {
  flowchartIds: [1],
  flowchartLinks: buildFlowchartLinks([1]),
  flowKey: 'sales-production',
  fluxo: 'pedido-criacao',
  steps: [
    'pdv-waiter',
    'mesa-aberta',
    'item-lancado',
    'settlement',
    'producao-ready',
    'entrega-mesa',
  ],
}

const buildWaiterTableDeviceConfigs = (overrides = {}) => ({
  'config-version': overrides.appVersion || '1.0.0',
  'pos-operation-mode': 'waiter',
  'check-order-type': 'table',
  'check-order-management-mode': 'manage',
  'pos-local-charge-enabled': false,
  'order-charge-enabled': false,
  'pos-gateway': 'none',
  'pos-type': 'simple',
  'pos-default-status': 901,
  'pos-paid-status': 902,
  ...(overrides.extra || {}),
})

const parseDeviceConfigs = deviceConfig =>
  parseJsonObject(deviceConfig?.configs ?? deviceConfig ?? {})

const assertWaiterTableDeviceContract = deviceConfig => {
  const configs = parseDeviceConfigs(deviceConfig)
  return {
    isWaiter: configs['pos-operation-mode'] === 'waiter',
    isTable: configs['check-order-type'] === 'table',
    isNotTab: configs['check-order-type'] !== 'tab',
    chargeDisabled:
      configs['pos-local-charge-enabled'] === false &&
      configs['order-charge-enabled'] === false,
  }
}

const buildAdminSession = ({
  userId = 7,
  companyId = 3,
  apiKey = 'test-api-key',
  deviceId = 'web-7',
} = {}) => ({
  id: userId,
  people: `/people/${userId}`,
  api_key: apiKey,
  token: apiKey,
  active: 1,
  mycompany: companyId,
  deviceId,
  roles: ['ROLE_ADMIN'],
})

module.exports = {
  FLOWCHART_ADMIN_BASE,
  WAITER_TABLES_SMOKE_MANIFEST,
  assertWaiterTableDeviceContract,
  buildAdminSession,
  buildFlowchartLinks,
  buildWaiterTableDeviceConfigs,
  parseDeviceConfigs,
}
