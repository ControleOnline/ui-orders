import {api} from '@controleonline/ui-common/src/api'
import {
  buildLinkedOrderMetadata,
  getLinkedOrderContext,
  normalizeEntityId,
} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'
import {
  extractCollectionItems,
  normalizeText,
  normalizeStatusKey,
  toEntityIri,
  collectOrderDescendants,
  resolveOpenOrderStatusIri,
} from './linkedOrderSettlementHelpers'

export function buildSettlementPayload({
  baseOrder = null,
  externalCode = '',
  inputType = '',
  mainOrderId = null,
  statusIri = null,
  companyIri,
  linkedOrderType,
  preferredInputType,
} = {}) {
  const baseContext = getLinkedOrderContext(baseOrder)
  const resolvedProviderIri =
    toEntityIri(baseOrder?.provider, 'people') || companyIri
  const resolvedStatusIri =
    statusIri || toEntityIri(baseOrder?.status, 'statuses')
  const resolvedExternalCode = normalizeText(
    externalCode || baseContext.externalCode,
  )
  const payload = {
    app: baseOrder?.app || 'POS',
    orderType: linkedOrderType,
    ...(resolvedProviderIri ? {provider: resolvedProviderIri} : {}),
    ...(resolvedStatusIri ? {status: resolvedStatusIri} : {}),
    ...(resolvedExternalCode ? {externalCode: resolvedExternalCode} : {}),
    otherInformations: buildLinkedOrderMetadata({
      inputType: inputType || baseContext.inputType || preferredInputType,
      orderType: linkedOrderType,
    }),
  }
  const baseOrderId = normalizeEntityId(baseOrder)
  if (baseOrderId) {
    payload.id = Number(baseOrderId)
  }
  if (mainOrderId) {
    payload.mainOrderId = Number(mainOrderId)
  }
  return payload
}

export async function resolveSettlementRootOrder(order, ordersActions) {
  let resolvedOrder = order
  const visitedOrderIds = new Set()
  while (normalizeEntityId(resolvedOrder?.mainOrderId || resolvedOrder?.mainOrder)) {
    const nextOrderId = normalizeEntityId(
      resolvedOrder?.mainOrderId || resolvedOrder?.mainOrder,
    )
    if (!nextOrderId || visitedOrderIds.has(nextOrderId)) {
      break
    }
    visitedOrderIds.add(nextOrderId)
    const nextOrder = await ordersActions.get(nextOrderId).catch(() => null)
    if (!nextOrder) {
      break
    }
    resolvedOrder = nextOrder
  }
  return resolvedOrder
}

export async function loadSettlementTree({
  rootOrderId,
  companyIri,
  ordersActions,
  invoiceActions,
}) {
  const [rootOrder, companyOrders, invoices] = await Promise.all([
    ordersActions.get(rootOrderId),
    ordersActions.getItems({
      app: 'POS',
      provider: companyIri,
      'status.realStatus': 'open',
      'order[id]': 'DESC',
    }),
    invoiceActions.getItems({
      'order.order': `/orders/${rootOrderId}`,
    }),
  ])
  const descendants = collectOrderDescendants(
    rootOrderId,
    extractCollectionItems(companyOrders),
  )
  return {
    rootOrder,
    descendants,
    invoices: extractCollectionItems(invoices),
  }
}

export async function findSettlementOrderByCode({
  externalCode,
  companyIri,
  linkedOrderType,
  ordersActions,
}) {
  if (!companyIri || !linkedOrderType || !externalCode) {
    return null
  }
  const normalizedExternalCode = normalizeText(externalCode)
  const legacyQuery = {
    app: 'POS',
    orderType: linkedOrderType,
    provider: companyIri,
    'status.realStatus': 'open',
    'order[id]': 'DESC',
  }
  const query = {
    ...legacyQuery,
    externalCode: normalizedExternalCode,
  }
  const matchesCode = orderItem => {
    const orderContext = getLinkedOrderContext(orderItem)
    return (
      normalizeText(orderContext.externalCode) !== '' &&
      normalizeText(orderContext.externalCode).toLowerCase() ===
        normalizedExternalCode.toLowerCase()
    )
  }
  const exactSettlementOrders = await ordersActions.getItems(query)
  const exactMatch = extractCollectionItems(exactSettlementOrders).find(matchesCode)
  if (exactMatch) {
    return exactMatch
  }
  const settlementOrders = await ordersActions.getItems({...legacyQuery})
  return extractCollectionItems(settlementOrders).find(matchesCode) || null
}

export async function ensureSettlementOrder({
  linkedOrderInput,
  companyIri,
  preferredInputType,
  defaultCompany,
  ordersActions,
  linkedOrderType,
}) {
  const externalCode = normalizeText(linkedOrderInput?.externalCode)
  const inputType = normalizeText(linkedOrderInput?.inputType) || preferredInputType
  if (!externalCode || !companyIri) {
    return null
  }
  const existingOrder = await findSettlementOrderByCode({
    externalCode,
    companyIri,
    linkedOrderType,
    ordersActions,
  })
  if (existingOrder) {
    return existingOrder
  }
  const openOrderStatusIri = await resolveOpenOrderStatusIri(
    defaultCompany?.configs?.['pos-default-status'],
  )
  return ordersActions.save(
    buildSettlementPayload({
      externalCode,
      inputType,
      statusIri: openOrderStatusIri,
      companyIri,
      linkedOrderType,
      preferredInputType,
    }),
  )
}

export async function reopenSettlementOrderIfPaid({
  order,
  defaultCompany,
  ordersActions,
  companyIri,
  linkedOrderType,
  preferredInputType,
}) {
  if (
    normalizeStatusKey(order?.status?.realStatus) !== 'open' ||
    normalizeStatusKey(order?.status?.status) !== 'paid'
  ) {
    return order
  }
  const openOrderStatusIri = await resolveOpenOrderStatusIri(
    defaultCompany?.configs?.['pos-default-status'],
  )
  return ordersActions.save(
    buildSettlementPayload({
      baseOrder: order,
      externalCode: getLinkedOrderContext(order).externalCode,
      inputType: getLinkedOrderContext(order).inputType || preferredInputType,
      mainOrderId: normalizeEntityId(order?.mainOrderId || order?.mainOrder) || null,
      statusIri: openOrderStatusIri,
      companyIri,
      linkedOrderType,
      preferredInputType,
    }),
  )
}

export async function linkExistingInvoicesToPrimary({
  primaryOrderId,
  settlementOrder,
  invoiceActions,
}) {
  const settlementOrderId = normalizeEntityId(settlementOrder)
  if (!settlementOrderId || !primaryOrderId || settlementOrderId === primaryOrderId) {
    return
  }
  const invoices = await invoiceActions.getItems({
    'order.order': `/orders/${settlementOrderId}`,
  })
  for (const invoice of extractCollectionItems(invoices)) {
    const invoiceIri = toEntityIri(invoice, 'invoices')
    if (!invoiceIri) {
      continue
    }
    await api.post('/order_invoices', {
      invoice: invoiceIri,
      order: `/orders/${primaryOrderId}`,
      realPrice: Number(invoice?.price || 0),
    })
  }
}

export async function mergeSettlementOrderIntoPrimary({
  primaryRootOrder,
  secondaryRootOrder,
  linkedOrderInput,
  preferredInputType,
  companyIri,
  linkedOrderType,
  ordersActions,
  invoiceActions,
  defaultCompany,
}) {
  const primaryOrderId = normalizeEntityId(primaryRootOrder)
  const secondaryOrderId = normalizeEntityId(secondaryRootOrder)
  if (!primaryOrderId || !secondaryOrderId || primaryOrderId === secondaryOrderId) {
    return primaryRootOrder
  }
  const secondaryContext = getLinkedOrderContext(secondaryRootOrder)
  await ordersActions.save(
    buildSettlementPayload({
      baseOrder: secondaryRootOrder,
      externalCode:
        secondaryContext.externalCode || linkedOrderInput?.externalCode || '',
      inputType:
        secondaryContext.inputType ||
        linkedOrderInput?.inputType ||
        preferredInputType,
      mainOrderId: primaryOrderId,
      companyIri,
      linkedOrderType,
      preferredInputType,
    }),
  )
  await reopenSettlementOrderIfPaid({
    order: primaryRootOrder,
    defaultCompany,
    ordersActions,
    companyIri,
    linkedOrderType,
    preferredInputType,
  })
  await linkExistingInvoicesToPrimary({
    primaryOrderId,
    settlementOrder: secondaryRootOrder,
    invoiceActions,
  })
  return ordersActions.get(primaryOrderId).catch(() => primaryRootOrder)
}


export async function loadOpenLinkedRootOrders({
  companyIri,
  linkedOrderType,
  ordersActions,
}) {
  if (!companyIri || !linkedOrderType) {
    return []
  }
  const response = await ordersActions.getItems({
    app: 'POS',
    orderType: linkedOrderType,
    provider: companyIri,
    'status.realStatus': 'open',
    'order[id]': 'DESC',
  })
  return extractCollectionItems(response).filter(order => {
    const mainId = order?.mainOrderId || order?.mainOrder
    // Roots only: no mainOrder
    return !mainId
  })
}
