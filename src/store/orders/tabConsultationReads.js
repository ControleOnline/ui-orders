import {normalizeEntityId} from '../../utils/orderState'
import {isTerminalOrder, isPendingCartOrder} from '../../react/pages/checkout/pendingCartHelpers'

const members = response => Array.isArray(response) ? response
  : response?.member || response?.['hydra:member'] || []
const parentTypes = ['tab', 'table', 'stamp']

// Keep pagination metadata at the store boundary. Default getItems returns
// only one page and replaces the shared generic-table collection.
export async function readAllPages(fetch, resource, query) {
  const result = new Map()
  for (let page = 1; ; page++) {
    const response = await fetch(resource, {params: {...query, page, itemsPerPage: 50}})
    const rows = members(response)
    const before = result.size
    rows.forEach(row => result.set(normalizeEntityId(row), row))
    const total = response?.totalItems ?? response?.['hydra:totalItems']
    const next = response?.view?.next || response?.['hydra:view']?.['hydra:next']
    if (!next && (total !== undefined ? result.size >= Number(total) : rows.length < 50)) break
    if (result.size === before) throw new Error('Não foi possível carregar todos os lançamentos. Tente atualizar.')
  }
  return [...result.values()]
}

export function assertCompany(order, companyId) {
  if (normalizeEntityId(order?.provider) !== String(companyId)) {
    throw new Error('A comanda não pertence à empresa selecionada.')
  }
}

export async function readTabTree(fetch, {rootOrderId, companyId, onSnapshot, onDetail, readKnownProducts, previousSnapshot, deferDrafts = false, metadataOnly = false}, fetchInvoicePage) {
  const rootOrder = await fetch(`orders/${rootOrderId}`)
  assertCompany(rootOrder, companyId)
  if (rootOrder?.orderType !== 'tab') throw new Error('Esta consulta é exclusiva de comanda.')
  // Independent financial reads use the existing store while launches hydrate.
  // Capture rejection immediately if a detail fails before this read completes.
  const financialRead = readAllPages((_resource, {params}) => fetchInvoicePage(params), null,
    {'order.order': `/orders/${rootOrderId}`}).then(invoices => ({invoices}), error => ({error}))
  const descendants = []
  const seen = new Set([String(rootOrderId)])
  let parents = [String(rootOrderId)]
  for (let depth = 1; parents.length; depth++) {
    const rows = await readAllPages(fetch, 'orders', {
      app: 'POS', provider: `/people/${companyId}`,
      mainOrderId: parents.length === 1 ? parents[0] : parents,
      'order[id]': 'ASC',
    })
    const allowedParents = new Set(parents)
    parents = []
    for (const row of rows) {
      const id = normalizeEntityId(row)
      if (!allowedParents.has(normalizeEntityId(row.mainOrderId || row.mainOrder))) {
        throw new Error('O servidor retornou um lançamento fora desta comanda.')
      }
      assertCompany(row, companyId)
      if (!id || seen.has(id)) continue
      seen.add(id)
      descendants.push({...row, __treeDepth: depth})
      // Match financial traversal: a canceled grouping order excludes its subtree.
      const canceledParent = parentTypes.includes(row.orderType) &&
        ['canceled', 'cancelled'].includes(String(row.status?.realStatus || '').trim().toLowerCase())
      if (!canceledParent && parentTypes.includes(row.orderType)) parents.push(id)
    }
  }
  // Publish server-verified metadata before slower product hydration. Cached
  // hierarchy never replaces current prices, links, types or payment capability.
  for (let index = 0; index < descendants.length; index++) {
    const row = descendants[index]
    const old = previousSnapshot?.descendants?.find(order => normalizeEntityId(order) === normalizeEntityId(row) &&
      normalizeEntityId(order.mainOrderId || order.mainOrder) === normalizeEntityId(row.mainOrderId || row.mainOrder))
    const known = await readKnownProducts?.(row) || old?.orderProducts
    descendants[index] = {...row, orderProducts: known, __productsPending: !Array.isArray(known)}
  }
  const financial = await financialRead
  if (financial.error) throw financial.error
  const publish = () => ({rootOrder, descendants: [...descendants], invoices: financial.invoices})
  onSnapshot?.(publish())
  if (metadataOnly) return publish()
  // alterDate is not a reliable product revision. Revalidate visible details
  // in the background, preserving the cached hierarchy until each is complete.
  let nextIndex = 0
  await Promise.all(Array.from({length: Math.min(4, descendants.length)}, async () => {
    while (nextIndex < descendants.length) {
      const index = nextIndex++
      const row = descendants[index]
      if (parentTypes.includes(row.orderType) || (row.orderType === 'cart' && isTerminalOrder(row)) ||
          (deferDrafts && isPendingCartOrder(row))) continue
      const detail = await fetch(`orders/${normalizeEntityId(row)}`)
      assertCompany(detail, companyId)
      if (normalizeEntityId(detail) !== normalizeEntityId(row) ||
          normalizeEntityId(detail.mainOrderId || detail.mainOrder) !== normalizeEntityId(row.mainOrderId || row.mainOrder) ||
          !Array.isArray(detail.orderProducts)) {
        throw new Error('Não foi possível carregar os produtos completos do lançamento.')
      }
      descendants[index] = {...detail, __treeDepth: row.__treeDepth, __productsPending: false}
      onDetail?.(descendants[index])
      onSnapshot?.(publish())
    }
  }))
  return publish()
}
