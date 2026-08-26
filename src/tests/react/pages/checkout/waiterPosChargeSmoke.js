/**
 * Smoke contract for app-community#606.
 * fluxo: financeiro-cobranca
 * flowchartIds: [1]
 * Nodes: Ready → waiterHandoff → waiterPosCharge → Checkout → handoffClosed → closed
 */

const WAITER_POS_CHARGE_SMOKE = {
  fluxo: 'financeiro-cobranca',
  flowchartIds: [1],
  chargeSurface: 'POS',
  forbiddenChargeSurface: 'CHECKOUT',
  prints: ['ready', 'close-table-action', 'pos-charge-screen', 'payment', 'closed'],
}

const READY_STATUS = {
  '@id': '/statuses/904',
  id: 904,
  status: 'ready',
  realStatus: 'open',
}

const CLOSED_STATUS = {
  '@id': '/statuses/905',
  id: 905,
  status: 'closed',
  realStatus: 'closed',
}

const PAID_STATUS = {
  '@id': '/statuses/902',
  id: 902,
  status: 'paid',
  realStatus: 'closed',
}

function buildReadyTableTree({
  tableId = 501,
  saleId = 502,
  tableCode = 'Mesa-12',
  price = 36.9,
} = {}) {
  const table = {
    '@id': `/orders/${tableId}`,
    id: tableId,
    app: 'POS',
    orderType: 'table',
    externalCode: tableCode,
    provider: '/people/3',
    people: '/people/3',
    status: READY_STATUS,
    price,
    payable: price,
    orderProducts: [],
  }
  const sale = {
    '@id': `/orders/${saleId}`,
    id: saleId,
    app: 'POS',
    orderType: 'sale',
    externalCode: tableCode,
    mainOrderId: tableId,
    mainOrder: `/orders/${tableId}`,
    provider: '/people/3',
    people: '/people/3',
    status: READY_STATUS,
    price,
    payable: price,
    orderProducts: [],
  }
  return {table, sale, orders: [table, sale]}
}

function applyPosPayment(orders, invoicePrice) {
  const paid = Number(invoicePrice || 0)
  return (Array.isArray(orders) ? orders : []).map(order => {
    const nextPayable = Math.max(0, Number(order.payable || 0) - paid)
    if (nextPayable > 0.009) {
      return {...order, payable: nextPayable}
    }
    return {
      ...order,
      payable: 0,
      status: PAID_STATUS,
    }
  })
}

function closeSettlementTree(orders) {
  return (Array.isArray(orders) ? orders : []).map(order => ({
    ...order,
    payable: 0,
    status: CLOSED_STATUS,
  }))
}

function isTableStillOpen(orders, tableId) {
  const table = (Array.isArray(orders) ? orders : []).find(
    order => Number(order.id) === Number(tableId),
  )
  if (!table) {
    return false
  }
  const realStatus = String(table.status?.realStatus || table.status?.status || '')
    .trim()
    .toLowerCase()
  return realStatus === 'open'
}

function isPosChargeSurface(appType, href) {
  const normalizedApp = String(appType || '')
    .trim()
    .toUpperCase()
  const normalizedHref = String(href || '')
  if (normalizedApp === 'CHECKOUT') {
    return false
  }
  if (/checkout\.controleonline\.com/i.test(normalizedHref)) {
    return false
  }
  return normalizedApp === 'POS'
}

module.exports = {
  CLOSED_STATUS,
  PAID_STATUS,
  READY_STATUS,
  WAITER_POS_CHARGE_SMOKE,
  applyPosPayment,
  buildReadyTableTree,
  closeSettlementTree,
  isPosChargeSurface,
  isTableStillOpen,
}
