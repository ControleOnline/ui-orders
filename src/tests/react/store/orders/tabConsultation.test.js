const {jest} = require('@jest/globals')
jest.mock('@controleonline/ui-common/src/api', () => ({api: {fetch: jest.fn(), getToken: jest.fn()}}))
const {api} = require('@controleonline/ui-common/src/api')
const invoiceModule = require('@controleonline/ui-financial/src/store/invoice').default
const invoiceContext = {getters: invoiceModule.state}
const dispatchInvoice = (name, params) => {
 expect(name).toBe('invoice/fetchPage')
 return invoiceModule.actions.fetchPage(invoiceContext, params)
}
const {loadTabConsultation, closeTabConsultation, discardTabDraft} = require('../../../../store/orders/tabConsultation')
const {readAllPages} = require('../../../../store/orders/tabConsultationReads')
const root = {id: 1, orderType: 'tab', externalCode: 'Jorge', provider: '/people/3', price: 80, chargeCapability: {enabled: true, local: true, remote: true}, status: {realStatus: 'open'}}
const sale = id => ({id, mainOrderId: 1, provider: '/people/3', orderType: 'sale', price: 5, status: {realStatus: 'open'}})
const args = {rootOrderId: 1, companyId: 3, deviceId: 403}

it('does not expose or close active descendants of a canceled linked tab', async () => {
  const canceledTab = {id: 2, mainOrderId: 1, provider: '/people/3', orderType: 'tab', status: {realStatus: 'canceled'}}
  const hiddenSale = {...sale(3), mainOrderId: 2, orderProducts: []}
  api.fetch.mockImplementation(async (uri, {params} = {}) => {
    if (uri === 'orders/1') return {...root, price: 0}
    if (uri === 'orders/3') return hiddenSale
    if (uri === 'invoices') return {member: [], totalItems: 0}
    if (uri === 'orders') return {member: String(params.mainOrderId) === '1' ? [canceledTab]
      : String(params.mainOrderId) === '2' ? [hiddenSale] : [], totalItems: String(params.mainOrderId) === '1' || String(params.mainOrderId) === '2' ? 1 : 0}
    throw new Error(`Unexpected read: ${uri}`)
  })
  const snapshot = await loadTabConsultation(context, args)
  expect(snapshot.descendants.map(order => order.id)).toEqual([2])
  expect(api.fetch.mock.calls.some(([uri, options]) => uri === 'orders' && String(options.params.mainOrderId) === '2')).toBe(false)
})
let context
beforeEach(() => {
 jest.clearAllMocks()
 api.getToken.mockResolvedValue('session-a')
 context = {dispatch: dispatchInvoice, getters: {tabConsultation: null}, commit: jest.fn((_type, value) => {context.getters.tabConsultation = value})}
 api.fetch.mockImplementation(async (uri, options = {}) => {
  if (uri === 'orders/1') return root
  if (uri === 'invoices') return {member: [], totalItems: 0}
  if (uri === 'orders') return {member: [], totalItems: 0}
  if (uri.startsWith('orders/')) return {...sale(Number(uri.split('/')[1])), orderProducts: []}
  throw new Error('Unexpected request')
 })
})
it('reads every page, nested launches and closed sales without replacing active cart or generic lists', async () => {
 const children = Array.from({length: 51}, (_, i) => sale(i + 2))
 children[0].orderType = 'tab'
 api.fetch.mockImplementation(async (uri, {params} = {}) => {
  if (uri === 'orders/1') return root
  if (uri === 'invoices') return {member: [], totalItems: 0}
  if (uri === 'orders') {
   expect(params.provider).toBe('/people/3')
   expect(params['status.realStatus']).toBeUndefined()
   if (params.mainOrderId === '1') return {'hydra:member': children.slice((params.page - 1) * 50, params.page * 50), 'hydra:totalItems': 51}
   if (params.mainOrderId === '2' || Array.isArray(params.mainOrderId) && params.mainOrderId.includes('2')) return {member: [{...sale(99), mainOrderId: 2, status: {realStatus: 'closed'}}], totalItems: 1}
   return {member: [], totalItems: 0}
  }
  const id = Number(uri.split('/')[1]); const value = id === 99 ? {...sale(99), mainOrderId: 2, status: {realStatus: 'closed'}} : children.find(x => x.id === id)
  return {...value, orderProducts: [{id: id * 100, quantity: 1, product: {product: 'Água'}}]}
 })
 const result = await loadTabConsultation(context, args)
 expect(result.descendants).toHaveLength(52)
 expect(result.descendants.find(x => x.id === 99).orderProducts[0].product.product).toBe('Água')
 expect(api.fetch.mock.calls.some(([uri, options]) => uri === 'orders' && options.params.page === 2)).toBe(true)
 expect(context.commit.mock.calls.every(([type]) => type === 'setTabConsultation')).toBe(true)
 expect(result.rootOrder.price).toBe(80)
})
it('keeps the complete previous snapshot on failure, marks it stale, and never commits partial products', async () => {
 await loadTabConsultation(context, args)
 api.fetch.mockRejectedValueOnce(new Error('Sem conexão'))
 await expect(loadTabConsultation(context, args)).rejects.toThrow('Sem conexão')
 expect(context.getters.tabConsultation.snapshot.rootOrder).toEqual(root)
 expect(context.getters.tabConsultation.fresh).toBe(false)
})
it('rejects another company or a table root and clears snapshots from another session', async () => {
 await loadTabConsultation(context, args)
 api.getToken.mockResolvedValue('session-b')
 api.fetch.mockResolvedValueOnce({...root, provider: '/people/9'})
 await expect(loadTabConsultation(context, args)).rejects.toThrow('empresa')
 expect(context.getters.tabConsultation.snapshot).toBeNull()
 api.fetch.mockResolvedValueOnce({...root, orderType: 'table'})
 await expect(loadTabConsultation(context, args)).rejects.toThrow('comanda')
})
it('does not allow an older overlapping refresh to overwrite the newer result', async () => {
 let resolveFirst
 api.fetch.mockImplementationOnce(() => new Promise(resolve => {resolveFirst = resolve}))
 const first = loadTabConsultation(context, args)
 await Promise.resolve(); await Promise.resolve()
 await loadTabConsultation(context, {...args, deviceId: 404})
 resolveFirst({...root, price: 999})
 await first
 expect(context.getters.tabConsultation.snapshot.rootOrder.price).toBe(80)
})
it('refuses closing without permissions, with balance or with a draft, before any commercial write', async () => {
 await expect(closeTabConsultation(context, {...args, canCharge: false, canManage: true})).rejects.toThrow('autorizado')
 await expect(closeTabConsultation(context, {...args, canCharge: true, canManage: true})).rejects.toThrow('saldo')
 api.fetch.mockImplementation(async (uri, {params} = {}) => {
  if (uri === 'orders/1') return {...root, price: 0}
  if (uri === 'invoices') return {member: [], totalItems: 0}
  if (uri === 'orders') return {member: params.mainOrderId === '1' ? [{...sale(4), orderType: 'cart'}] : [], totalItems: params.mainOrderId === '1' ? 1 : 0}
  return {...sale(4), orderType: 'cart', orderProducts: []}
 })
 await expect(closeTabConsultation(context, {...args, canCharge: true, canManage: true})).rejects.toThrow('rascunhos')
 expect(api.fetch.mock.calls.every(([, options]) => options?.method !== 'POST')).toBe(true)
})
it('closes deepest first through the existing delivered action and honors server refusal', async () => {
 api.fetch.mockImplementation(async (uri, options) => {
  if (options?.method === 'POST') return {result: {errno: 5, errmsg: 'Servidor recusou'}}
  if (uri === 'orders/1') return {...root, price: 0}
  if (uri === 'invoices') return {member: [], totalItems: 0}
  if (uri === 'orders') return {member: options.params.mainOrderId === '1' ? [sale(4)] : [], totalItems: options.params.mainOrderId === '1' ? 1 : 0}
  return {...sale(4), orderProducts: []}
 })
 await expect(closeTabConsultation(context, {...args, canCharge: true, canManage: true})).rejects.toThrow('Servidor recusou')
 expect(api.fetch.mock.calls.filter(([, o]) => o?.method === 'POST').map(([uri]) => uri)).toEqual(['orders/4/delivered'])
 expect(context.getters.tabConsultation.fresh).toBe(false)
})
it('reads all invoice pages and rejects a server that repeats a page', async () => {
 const fetch = jest.fn(async (_resource, {params}) => ({member: [{id: params.page}], totalItems: 2}))
 expect(await readAllPages(fetch, 'invoices', {'order.order': '/orders/1'})).toEqual([{id: 1}, {id: 2}])
 expect(fetch).toHaveBeenCalledTimes(2)
 await expect(readAllPages(async () => ({member: [{id: 1}], totalItems: 2}), 'orders', {})).rejects.toThrow('todos os lançamentos')
})
it('refreshes product details even when the order alteration timestamp is unchanged', async () => {
 let name = 'Primeira escolha'
 api.fetch.mockImplementation(async (uri, {params} = {}) => {
  if (uri === 'orders/1') return root
  if (uri === 'invoices') return {member: [], totalItems: 0}
  if (uri === 'orders') return {member: params.mainOrderId === '1' ? [{...sale(4), alterDate: 'same'}] : [], totalItems: params.mainOrderId === '1' ? 1 : 0}
  return {...sale(4), alterDate: 'same', orderProducts: [{id: 400, product: {product: name}}]}
 })
 await loadTabConsultation(context, args)
 name = 'Escolha atualizada'
 const result = await loadTabConsultation(context, args)
 expect(result.descendants[0].orderProducts[0].product.product).toBe(name)
})
it('never publishes incomplete products or records from another tab', async () => {
 await loadTabConsultation(context, args)
 api.fetch.mockImplementation(async uri => {
  if (uri === 'orders/1') return root
  if (uri === 'orders') return {member: [{...sale(4), mainOrderId: 9}], totalItems: 1}
  return {member: [], totalItems: 0}
 })
 await expect(loadTabConsultation(context, args)).rejects.toThrow('fora desta comanda')
 expect(context.getters.tabConsultation.snapshot.descendants).toEqual([])
 expect(context.getters.tabConsultation.fresh).toBe(false)
})

it('uses the financial store resource and the backend collection route, including an unpaid comanda', async () => {
 expect(invoiceModule.state.resourceEndpoint).toBe('invoices')
 const result = await loadTabConsultation(context, args)
 expect(result.invoices).toEqual([])
 expect(api.fetch.mock.calls.some(([uri]) => uri === 'invoice')).toBe(false)
 expect(api.fetch).toHaveBeenCalledWith('invoices', {method: 'GET', params: {'order.order': '/orders/1', page: 1, itemsPerPage: 50}})
})

it('rechecks server permission before closing even when client config allows it', async () => {
 api.fetch.mockResolvedValueOnce({...root, price: 0, chargeCapability: {enabled: false}})
 await expect(closeTabConsultation(context, {...args, canCharge: true, canManage: true})).rejects.toThrow('autorizado')
 expect(api.fetch.mock.calls.every(([, options]) => options?.method !== 'POST')).toBe(true)
})
it('discards only a fresh linked cart through the existing audited cancel action', async () => {
 let discarded = false
 api.fetch.mockImplementation(async (uri, options = {}) => {
  if (uri === 'orders/1') return root
  if (uri === 'invoices') return {member: [], totalItems: 0}
  const draft = {...sale(4), orderType: 'cart', status: {realStatus: discarded ? 'canceled' : 'open'}, orderProducts: []}
  if (uri === 'orders') return {member: options.params.mainOrderId === '1' ? [draft] : [], totalItems: options.params.mainOrderId === '1' ? 1 : 0}
  return draft
 })
 context.dispatch = jest.fn(async (name, payload) => {
  if (name === 'invoice/fetchPage') return dispatchInvoice(name, payload)
  expect(name).toBe('cancelOrder'); expect(payload).toEqual(expect.objectContaining({id: 4, companyId: 3, draftOnly: true, expectedMainOrderId: 1}))
  discarded = true
 })
 await loadTabConsultation(context, args)
 api.fetch.mockClear()
 await discardTabDraft(context, {...args, draftOrderId: 4})
 expect(api.fetch.mock.calls.filter(([uri]) => uri === 'orders/1')).toHaveLength(1)
 expect(api.fetch.mock.calls.some(([uri]) => uri === 'orders/4')).toBe(false)
 expect(context.getters.tabConsultation.fresh).toBe(true)
 expect(context.getters.tabConsultation.snapshot.descendants[0].status.realStatus).toBe('canceled')
 await expect(discardTabDraft(context, {...args, draftOrderId: 4})).rejects.toThrow('alterado ou enviado')
 await expect(discardTabDraft(context, {...args, draftOrderId: 999})).rejects.toThrow('alterado ou enviado')
 expect(context.dispatch.mock.calls.filter(([name]) => name === 'cancelOrder')).toHaveLength(1)
})
it('does not discard a sent sale and preserves a stale snapshot after a server refusal', async () => {
 api.fetch.mockImplementation(async (uri, options = {}) => {
  if (uri === 'orders/1') return root
  if (uri === 'invoices') return {member: [], totalItems: 0}
  if (uri === 'orders') return {member: options.params.mainOrderId === '1' ? [sale(4)] : [], totalItems: options.params.mainOrderId === '1' ? 1 : 0}
  return {...sale(4), orderProducts: []}
 })
 await loadTabConsultation(context, args)
 await expect(discardTabDraft(context, {...args, draftOrderId: 4})).rejects.toThrow('alterado ou enviado')
 api.fetch.mockImplementation(async (uri, options = {}) => {
  if (uri === 'orders/1') return root
  if (uri === 'invoices') return {member: [], totalItems: 0}
  const draft = {...sale(4), orderType: 'cart', status: {realStatus: 'open'}, orderProducts: []}
  if (uri === 'orders') return {member: options.params.mainOrderId === '1' ? [draft] : [], totalItems: options.params.mainOrderId === '1' ? 1 : 0}
  return draft
 })
 await loadTabConsultation(context, args)
 context.dispatch = async (name, payload) => {
  if (name === 'invoice/fetchPage') return dispatchInvoice(name, payload)
  throw new Error('Rascunho enviado por outro garçom')
 }
 await expect(discardTabDraft(context, {...args, draftOrderId: 4})).rejects.toThrow('outro garçom')
 expect(context.getters.tabConsultation.fresh).toBe(false)
 expect(context.getters.tabConsultation.snapshot.descendants[0].id).toBe(4)
})


it('shares the same in-flight consultation without duplicating its tree or invoice reads', async () => {
 let resolveRoot
 api.fetch.mockImplementationOnce(() => new Promise(resolve => {resolveRoot = resolve}))
 const ready = jest.fn()
 const first = loadTabConsultation(context, args)
 await Promise.resolve(); await Promise.resolve()
 const second = loadTabConsultation(context, {...args, onScopeReady: ready})
 await Promise.resolve(); await Promise.resolve()
 expect(ready).toHaveBeenCalledTimes(1)
 expect(api.fetch.mock.calls.filter(([uri]) => uri === 'orders/1')).toHaveLength(1)
 resolveRoot(root)
 expect(await second).toBe(await first)
 expect(api.fetch.mock.calls.filter(([uri]) => uri === 'invoices')).toHaveLength(1)
})
it('keeps canceled cart metadata without downloading products hidden from the consultation', async () => {
 const canceled = {...sale(4), orderType: 'cart', status: {realStatus: 'canceled'}}
 api.fetch.mockImplementation(async (uri, options = {}) => {
  if (uri === 'orders/1') return root
  if (uri === 'orders') return {member: options.params.mainOrderId === '1' ? [canceled, sale(5)] : [], totalItems: options.params.mainOrderId === '1' ? 2 : 0}
  if (uri === 'orders/5') return {...sale(5), orderProducts: [{id: 50, product: {product: 'Água'}}]}
  if (uri === 'invoices') return {member: [], totalItems: 0}
  throw new Error('Unexpected hidden cart detail')
 })
 const result = await loadTabConsultation(context, args)
 expect(result.descendants[0]).toEqual(expect.objectContaining({id: 4, status: {realStatus: 'canceled'}}))
 expect(result.descendants[1].orderProducts).toHaveLength(1)
 expect(api.fetch.mock.calls.some(([uri]) => uri === 'orders/4')).toBe(false)
})
it('refuses a discard from a different session or stale consultation before any write', async () => {
 await loadTabConsultation(context, args)
 api.getToken.mockResolvedValue('another-session')
 context.dispatch = jest.fn()
 await expect(discardTabDraft(context, {...args, draftOrderId: 4})).rejects.toThrow('Atualize')
 expect(context.dispatch).not.toHaveBeenCalled()
})


it('does not replace another consultation when a pending discard completes', async () => {
 api.fetch.mockImplementation(async (uri, options = {}) => {
  if (uri === 'orders/1') return root
  if (uri === 'invoices') return {member: [], totalItems: 0}
  const draft = {...sale(4), orderType: 'cart', status: {realStatus: 'open'}, orderProducts: []}
  if (uri === 'orders') return {member: options.params.mainOrderId === '1' ? [draft] : [], totalItems: options.params.mainOrderId === '1' ? 1 : 0}
  return draft
 })
 await loadTabConsultation(context, args)
 let finishCancel
 context.dispatch = (name, payload) => name === 'cancelOrder'
   ? new Promise(resolve => {finishCancel = resolve}) : dispatchInvoice(name, payload)
 const discard = discardTabDraft(context, {...args, draftOrderId: 4})
 await Promise.resolve(); await Promise.resolve()
 await loadTabConsultation(context, {...args, deviceId: 404})
 const otherState = context.getters.tabConsultation
 finishCancel()
 expect(await discard).toBeNull()
 expect(context.getters.tabConsultation).toBe(otherState)
})


it('cancels approved drafts only after full payment and retries only unfinished closure work', async () => {
 const canceled = new Set(); const closed = new Set(); let failCancel = true
 const draft = id => ({...sale(id), orderType: 'cart', status: {realStatus: canceled.has(id) ? 'canceled' : 'open'}})
 api.fetch.mockImplementation(async (uri, options = {}) => {
  if (uri === 'orders/1') return {...root, status: {realStatus: closed.has(1) ? 'closed' : 'open'}}
  if (uri === 'invoices') return {member: [{id: 9, price: 80, status: {realStatus: 'closed'}}], totalItems: 1}
  if (uri === 'orders') return {member: options.params.mainOrderId === '1' ? [draft(4), draft(5), sale(6)] : [], totalItems: options.params.mainOrderId === '1' ? 3 : 0}
  if (options.method === 'POST') {closed.add(Number(uri.split('/')[1])); return {result: {errno: 0}}}
  const id = Number(uri.split('/')[1]); return {...(id === 6 ? sale(6) : draft(id)), orderProducts: []}
 })
 context.dispatch = jest.fn(async (name, payload) => {
  if (name === 'invoice/fetchPage') return dispatchInvoice(name, payload)
  expect(name).toBe('cancelOrder');expect(payload.draftOnly).toBe(true)
  if (payload.id === 5 && failCancel) throw new Error('Cancelamento temporariamente indisponível')
  canceled.add(payload.id)
 })
 const closeArgs = {...args, canCharge: true, canManage: true, approvedDraftIds: [4, 5]}
 await expect(closeTabConsultation(context, closeArgs)).rejects.toThrow('temporariamente')
 expect([...canceled]).toEqual([4]);expect([...closed]).toEqual([])
 failCancel = false
 await closeTabConsultation(context, closeArgs)
 expect(context.dispatch.mock.calls.filter(([name, payload]) => name === 'cancelOrder' && payload.id === 4)).toHaveLength(1)
 expect([...closed]).toEqual([6, 1])
 expect(context.getters.tabConsultation).toBeNull()
 expect(api.fetch.mock.calls.some(([uri, options]) => uri === 'invoices' && options?.method === 'POST')).toBe(false)
})
it('does not discard a newly-created draft that was not included in the confirmation', async () => {
 api.fetch.mockImplementation(async (uri, options = {}) => {
  if (uri === 'orders/1') return {...root, price: 0}
  if (uri === 'invoices') return {member: [], totalItems: 0}
  const draft = {...sale(4), orderType: 'cart', orderProducts: []}
  if (uri === 'orders') return {member: options.params.mainOrderId === '1' ? [draft] : [], totalItems: options.params.mainOrderId === '1' ? 1 : 0}
  return draft
 })
 context.dispatch = jest.fn(dispatchInvoice)
 await expect(closeTabConsultation(context, {...args, canCharge: true, canManage: true, approvedDraftIds: []})).rejects.toThrow('rascunhos novos')
 expect(context.dispatch.mock.calls.some(([name]) => name === 'cancelOrder')).toBe(false)
 expect(api.fetch.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false)
})
