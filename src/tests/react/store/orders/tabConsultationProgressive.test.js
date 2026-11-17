const {jest} = require('@jest/globals')
jest.mock('@controleonline/ui-common/src/api', () => ({api: {fetch: jest.fn(), getToken: jest.fn()}}))
const mockRecords = new Map()
jest.mock('@controleonline/ui-common/src/api/localDB', () => ({__esModule: true, default: class {
 async get(id) {return mockRecords.get(id)}
 async saveItem(value) {mockRecords.set(value.id, JSON.parse(JSON.stringify(value)))}
}}))
const {api} = require('@controleonline/ui-common/src/api')
const {loadTabConsultation} = require('../../../../store/orders/tabConsultation')
const {readTabTree} = require('../../../../store/orders/tabConsultationReads')
const root = {id: 1, provider: '/people/3', orderType: 'tab', price: 98, status: {realStatus: 'open'}}
const sale = {id: 2, provider: '/people/3', mainOrderId: 1, orderType: 'sale', price: 98, status: {realStatus: 'open'}}
const draft = {...sale, id: 3, orderType: 'cart'}
const args = {companyId: 3, deviceId: 403, rootOrderId: 1}
const products = [{id: 20, product: {product: 'Combo'}, quantity: 1}]
const flush = async () => {for (let i = 0; i < 25; i++) await Promise.resolve()}
let context
beforeEach(() => {
 jest.clearAllMocks(); mockRecords.clear(); api.getToken.mockResolvedValue(`progress-${expect.getState().currentTestName}`)
 context = {getters: {tabConsultation: null}, commit: (_type, state) => {context.getters.tabConsultation = state},
  dispatch: async () => ({member: [], totalItems: 0})}
})
it('publishes current financial metadata and launch list before slow product details finish', async () => {
 let finishDetail
 api.fetch.mockImplementation(async (uri, options = {}) => {
  if (uri === 'orders/1') return root
  if (uri === 'orders') return {member: options.params.mainOrderId === '1' ? [sale, draft] : [], totalItems: options.params.mainOrderId === '1' ? 2 : 0}
  if (uri === 'orders/2') return new Promise(resolve => {finishDetail = resolve})
  if (uri === 'orders/3') throw new Error('Collapsed drafts must not delay consumption')
 })
 const loading = loadTabConsultation(context, args); loading.catch(() => {})
 await flush()
 expect(context.getters.tabConsultation.snapshot?.rootOrder.price).toBe(98)
 expect(context.getters.tabConsultation.snapshot?.descendants.map(x => x.id)).toEqual([2, 3])
 expect(context.getters.tabConsultation.loading).toBe(false)
 expect(context.getters.tabConsultation.fresh).toBe(true)
 expect(context.getters.tabConsultation.detailsLoading).toBe(true)
 finishDetail({...sale, orderProducts: products})
 await loading
 expect(context.getters.tabConsultation.snapshot.descendants[0].orderProducts).toEqual(products)
 expect(api.fetch.mock.calls.some(([uri]) => uri === 'orders/3')).toBe(false)
})
it('does not search for descendants of leaf sales and carts', async () => {
 const fetch = async (uri, options = {}) => uri === 'orders/1' ? root : uri === 'orders'
  ? {member: options.params.mainOrderId === '1' ? [sale] : [], totalItems: options.params.mainOrderId === '1' ? 1 : 0} : {...sale, orderProducts: products}
 const calls = []
 await readTabTree((...params) => {calls.push(params); return fetch(...params)}, args, async () => ({member: [], totalItems: 0}))
 expect(calls.filter(([uri]) => uri === 'orders')).toHaveLength(1)
})
it('restores the saved consultation after the store is recreated without awaiting the network', async () => {
 api.fetch.mockImplementation(async (uri, options = {}) => uri === 'orders/1' ? root : uri === 'orders'
  ? {member: options.params.mainOrderId === '1' ? [sale] : [], totalItems: options.params.mainOrderId === '1' ? 1 : 0} : {...sale, orderProducts: products})
 await loadTabConsultation(context, args); await flush()
 context.getters.tabConsultation = null
 let finishRoot
 api.fetch.mockImplementationOnce(() => new Promise(resolve => {finishRoot = resolve}))
 const loading = loadTabConsultation(context, args); loading.catch(() => {})
 await flush()
 expect(context.getters.tabConsultation.snapshot?.descendants[0].orderProducts).toEqual(products)
 expect(context.getters.tabConsultation.fresh).toBe(false)
 finishRoot(root); await loading
})
it('does not resurrect a discarded draft when an older sale detail finally arrives', async () => {
 const {discardTabDraft} = require('../../../../store/orders/tabConsultation')
 let canceled = false; let finishFirst; let first = true
 context.dispatch = async name => {
  if (name === 'cancelOrder') {canceled = true; return}
  return {member: [], totalItems: 0}
 }
 api.fetch.mockImplementation(async uri => {
  if (uri === 'orders/1') return root
  if (uri === 'orders') return {member: [sale, {...draft, status: {realStatus: canceled ? 'canceled' : 'open'}}], totalItems: 2}
  if (first) {first = false; return new Promise(resolve => {finishFirst = resolve})}
  return {...sale, orderProducts: products}
 })
 const original = loadTabConsultation(context, args); original.catch(() => {})
 await flush()
 await discardTabDraft(context, {...args, draftOrderId: 3})
 finishFirst({...sale, orderProducts: products}); await original
 expect(context.getters.tabConsultation.snapshot.descendants.find(x => x.id === 3).status.realStatus).toBe('canceled')
})
it('uses confirmed local hierarchy immediately but takes type, price and totals from current server metadata', async () => {
 const {rememberConfirmedWaiterLaunch} = require('../../../../store/orders/tabConsultationDetails')
 await rememberConfirmedWaiterLaunch(context, {...args, order: {...sale, orderType: 'cart', price: 999, orderProducts: products}})
 let finishDetail
 api.fetch.mockImplementation(async uri => uri === 'orders/1' ? root : uri === 'orders'
  ? {member: [sale], totalItems: 1} : new Promise(resolve => {finishDetail = resolve}))
 const loading = loadTabConsultation(context, args); await flush()
 const current = context.getters.tabConsultation.snapshot
 expect(current.descendants[0]).toMatchObject({orderType: 'sale', price: 98, orderProducts: products})
 expect(current.rootOrder.price).toBe(98)
 finishDetail({...sale, orderProducts: products}); await loading
})
it('fetches draft hierarchy only on expansion and shares the read for the same verified consultation', async () => {
 const {loadTabDraftDetails} = require('../../../../store/orders/tabConsultationDetails')
 api.fetch.mockImplementation(async uri => uri === 'orders/1' ? root : uri === 'orders'
  ? {member: [draft], totalItems: 1} : {...draft, orderProducts: products})
 await loadTabConsultation(context, args)
 expect(api.fetch.mock.calls.some(([uri]) => uri === 'orders/3')).toBe(false)
 await Promise.all([loadTabDraftDetails(context, args), loadTabDraftDetails(context, args)])
 expect(context.getters.tabConsultation.snapshot.descendants[0].orderProducts).toEqual(products)
 expect(api.fetch.mock.calls.filter(([uri]) => uri === 'orders/3')).toHaveLength(1)
 await loadTabDraftDetails(context, args)
 expect(api.fetch.mock.calls.filter(([uri]) => uri === 'orders/3')).toHaveLength(1)
})
it('does not expose saved consultation data to another session while its server read is pending', async () => {
 api.fetch.mockImplementation(async uri => uri === 'orders/1' ? root : uri === 'orders'
  ? {member: [sale], totalItems: 1} : {...sale, orderProducts: products})
 await loadTabConsultation(context, args)
 api.getToken.mockResolvedValue('different-session')
 let finishRoot
 api.fetch.mockImplementationOnce(() => new Promise(resolve => {finishRoot = resolve}))
 const loading = loadTabConsultation(context, args); await flush()
 expect(context.getters.tabConsultation.snapshot).toBeNull()
 finishRoot(root); await loading
})
it('keeps the known hierarchy visible during revalidation and replaces it when another waiter changed the products', async () => {
 let name = 'Combo antigo'; let finishDetail
 api.fetch.mockImplementation(async uri => uri === 'orders/1' ? root : uri === 'orders'
  ? {member: [sale], totalItems: 1} : {...sale, orderProducts: [{id: 20, product: {product: name}}]})
 await loadTabConsultation(context, args)
 name = 'Combo atualizado'
 api.fetch.mockImplementation(async uri => uri === 'orders/1' ? root : uri === 'orders'
  ? {member: [sale], totalItems: 1} : new Promise(resolve => {finishDetail = resolve}))
 const loading = loadTabConsultation(context, args); await flush()
 expect(context.getters.tabConsultation.snapshot.descendants[0].orderProducts[0].product.product).toBe('Combo antigo')
 finishDetail({...sale, orderProducts: [{id: 20, product: {product: name}}]}); await loading
 expect(context.getters.tabConsultation.snapshot.descendants[0].orderProducts[0].product.product).toBe(name)
})
it('does not let an obsolete detail response overwrite the persistent hierarchy of a newer refresh', async () => {
 let finishOld; let old = true
 api.fetch.mockImplementation(async uri => {
  if (uri === 'orders/1') return root
  if (uri === 'orders') return {member: [sale], totalItems: 1}
  if (old) {old = false; return new Promise(resolve => {finishOld = resolve})}
  return {...sale, orderProducts: [{id: 20, product: {product: 'Atual'}}]}
 })
 const first = loadTabConsultation(context, args); await flush()
 context.getters.tabConsultation.request = {}
 await loadTabConsultation(context, args)
 finishOld({...sale, orderProducts: [{id: 20, product: {product: 'Obsoleto'}}]}); await first
 let finishLatest
 api.fetch.mockImplementation(async uri => uri === 'orders/1' ? root : uri === 'orders'
  ? {member: [sale], totalItems: 1} : new Promise(resolve => {finishLatest = resolve}))
 const latest = loadTabConsultation(context, args); await flush()
 const name = context.getters.tabConsultation.snapshot.descendants[0].orderProducts[0].product.product
 finishLatest({...sale, orderProducts: products}); await latest
 expect(name).toBe('Atual')
})
it('revalidates financial metadata for closure without redownloading product hierarchy', async () => {
 const {closeTabConsultation} = require('../../../../store/orders/tabConsultation')
 api.fetch.mockImplementation(async (uri, options = {}) => {
  if (uri === 'orders/1') return {...root, price: 0, chargeCapability: {enabled: true, local: true}}
  if (uri === 'orders') return {member: [sale], totalItems: 1}
  if (options.method === 'POST') return {result: {errno: 0}}
  throw new Error('Closure must not depend on product detail reads')
 })
 await closeTabConsultation(context, {...args, canCharge: true, canManage: true})
 expect(api.fetch.mock.calls.filter(([, options]) => options?.method === 'POST').map(([uri]) => uri)).toEqual(['orders/2/delivered', 'orders/1/delivered'])
 expect(api.fetch.mock.calls.some(([uri]) => uri === 'orders/2')).toBe(false)
})
