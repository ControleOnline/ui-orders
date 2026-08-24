import {api} from '@controleonline/ui-common/src/api'
import {normalizeEntityId} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'

export const normalizeText = value => String(value ?? '').trim()
export const normalizeStatusKey = value => normalizeText(value).toLowerCase()

export const extractCollectionItems = response => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.member)) return response.member
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member']
  return []
}

export const buildStatusIriFromId = value => {
  const normalizedId = String(value || '').replace(/\D/g, '')
  return normalizedId ? `/statuses/${normalizedId}` : null
}

export const toEntityIri = (value, resourceName) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    if (value.startsWith('/')) {
      return value
    }

    const normalizedId = value.replace(/\D/g, '').trim()
    return normalizedId ? `/${resourceName}/${normalizedId}` : null
  }

  if (typeof value === 'number') {
    return value > 0 ? `/${resourceName}/${value}` : null
  }

  if (typeof value === 'object') {
    return (
      value?.['@id'] ||
      toEntityIri(value?.id, resourceName) ||
      null
    )
  }

  return null
}

export const formatHumanLabel = value =>
  normalizeText(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())

export const translateOrderStatus = value => {
  const normalizedStatus = normalizeStatusKey(value)
  if (!normalizedStatus) {
    return ''
  }

  return global.t?.t('orders', 'status', normalizedStatus) || formatHumanLabel(value)
}

export const isTerminalOrder = order => {
  const realStatus = normalizeStatusKey(order?.status?.realStatus)
  return ['closed', 'canceled', 'cancelled'].includes(realStatus)
}

export const resolveInvoiceStatusLabel = invoice =>
  global.t?.t('orders', 'status', normalizeStatusKey(invoice?.status?.status)) ||
  translateOrderStatus(invoice?.status?.status || invoice?.status?.realStatus)

export const resolveInvoicePaymentLabel = invoice =>
  normalizeText(
    invoice?.paymentType?.paymentType ||
      invoice?.paymentType?.payment ||
      invoice?.paymentType?.name,
  ) ||
  (global.t?.t('orders', 'label', 'paymentMethod') || 'Payment')

export const summarizeInvoices = invoices => {
  const safeInvoices = Array.isArray(invoices) ? invoices : []

  const paidAmount = safeInvoices.reduce((total, invoice) => {
    if (normalizeStatusKey(invoice?.status?.realStatus) !== 'closed') {
      return total
    }

    return total + Number(invoice?.price || 0)
  }, 0)

  return {
    count: safeInvoices.length,
    paidAmount,
  }
}

export const collectOrderDescendants = (rootOrderId, orders) => {
  const childrenByParentId = new Map()

  ;(Array.isArray(orders) ? orders : []).forEach(order => {
    const parentId = normalizeEntityId(order?.mainOrderId || order?.mainOrder)
    const orderId = normalizeEntityId(order)

    if (!parentId || !orderId) {
      return
    }

    if (!childrenByParentId.has(parentId)) {
      childrenByParentId.set(parentId, [])
    }

    childrenByParentId.get(parentId).push(order)
  })

  const descendants = []
  const visited = new Set()

  const walk = (parentId, depth) => {
    const children = childrenByParentId.get(parentId) || []

    children
      .slice()
      .sort((left, right) => Number(left?.id || 0) - Number(right?.id || 0))
      .forEach(child => {
        const childId = normalizeEntityId(child)

        if (!childId || visited.has(childId)) {
          return
        }

        visited.add(childId)
        descendants.push({
          ...child,
          __treeDepth: depth,
        })
        walk(childId, depth + 1)
      })
  }

  walk(rootOrderId, 1)
  return descendants
}

let linkedOrderOpenStatusIriCache = null

export const resolveOpenOrderStatusIri = async fallbackStatusId => {
  if (linkedOrderOpenStatusIriCache) {
    return linkedOrderOpenStatusIriCache
  }

  const fallbackIri = buildStatusIriFromId(fallbackStatusId)

  try {
    const response = await api.fetch('statuses', {
      params: {
        context: 'order',
        realStatus: 'open',
        status: 'open',
      },
    })
    const items = extractCollectionItems(response)
    const matchedStatus =
      items.find(
        item =>
          normalizeStatusKey(item?.realStatus) === 'open' &&
          normalizeStatusKey(item?.status) === 'open',
      ) || items[0]
    const resolvedIri =
      matchedStatus?.['@id'] ||
      buildStatusIriFromId(matchedStatus?.id) ||
      fallbackIri

    if (resolvedIri) {
      linkedOrderOpenStatusIriCache = resolvedIri
    }

    return resolvedIri
  } catch {
    return fallbackIri
  }
}


export const SETTLEMENT_ORDER_COLUMNS = [
  { name: 'id', label: 'id', isIdentity: true, sortable: true, format: v => (v != null ? '#' + v : '') },
  { name: 'externalCode', label: 'code', sortable: true, format: v => v || '' },
  { name: 'statusLabel', label: 'status', sortable: true, format: v => v || '' },
  { name: 'price', label: 'price', sortable: true, align: 'right', format: v => v },
]

export const SETTLEMENT_INVOICE_COLUMNS = [
  { name: 'id', label: 'id', isIdentity: true, sortable: true, format: v => (v != null ? '#' + v : '') },
  { name: 'paymentLabel', label: 'payment', sortable: true, format: v => v || '' },
  { name: 'statusLabel', label: 'status', sortable: true, format: v => v || '' },
  { name: 'price', label: 'price', sortable: true, align: 'right', format: v => v },
]

export {
  isPendingCartOrder,
  listPendingCartOrders,
  partitionTreeRounds,
} from './pendingCartHelpers'
