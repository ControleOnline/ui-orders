const React = require('react')
const renderer = require('react-test-renderer')
const {jest} = require('@jest/globals')
global.IS_REACT_ACT_ENVIRONMENT = true
let mockRevision = 0
const mockListeners = new Set()
const mockStores = {}
let mockFocusCallbacks = []
const mockEnsure = jest.fn()
jest.mock('@store', () => ({useStore: name => {
  const React = require('react')
  React.useSyncExternalStore(cb => {mockListeners.add(cb); return () => mockListeners.delete(cb)}, () => mockRevision)
  return mockStores[name]
}}))
jest.mock('@react-navigation/native', () => ({useFocusEffect: callback => {
  const React = require('react')
  React.useEffect(() => {
    mockFocusCallbacks.push(callback)
    const cleanup = callback()
    return () => {mockFocusCallbacks = mockFocusCallbacks.filter(x => x !== callback); cleanup?.()}
  }, [callback])
}}))
jest.mock('@controleonline/ui-orders/src/react/hooks/usePosCartSession', () => ({__esModule: true,
  default: () => ({ensureActiveOrder: (...args) => mockEnsure(...args)})}))
jest.mock('react-native', () => {
  const React = require('react')
  const component = name => props => React.createElement(name, props, props.children)
  return {ActivityIndicator: component('ActivityIndicator'), RefreshControl: component('RefreshControl'),
    ScrollView: ({refreshControl, ...props}) => React.createElement('ScrollView', props, refreshControl, props.children), Text: component('Text'), TouchableOpacity: component('TouchableOpacity'),
    View: component('View'), Image: component('Image'), StyleSheet: {create: value => value}, Platform: {OS: 'android'}, Alert: {alert: jest.fn()}}
})
jest.mock('react-native-safe-area-context', () => ({SafeAreaView: 'SafeAreaView'}))
jest.mock('@expo/vector-icons', () => ({MaterialCommunityIcons: 'Icon'}), {virtual: true})
jest.mock('@controleonline/../../src/styles/branding', () => ({
  withOpacity: color => color,
  resolveThemePalette: () => ({background: '#fff', cardBackground: '#fff', primary: '#0090aa', textPrimary: '#111', textMuted: '#666'}),
}))
jest.mock('@controleonline/ui-common/src/react/utils/fileUrl', () => ({resolveFileImageUrl: file => file?.['@id'] || file || ''}))
jest.mock('@controleonline/ui-common/src/utils/formatter', () => ({__esModule: true, default: {
  formatMoney: x => `R$ ${Number(x).toFixed(2)}`, formatDateYmdTodmY: x => x,
}}))
jest.mock('@controleonline/ui-common/src/api', () => ({api: {fetch: jest.fn(), getToken: jest.fn()}}))
const {api} = require('@controleonline/ui-common/src/api')
const invoiceModule = require('@controleonline/ui-financial/src/store/invoice').default
const invoiceContext = {getters: invoiceModule.state}
const dispatchInvoice = (name, params) => {
 expect(name).toBe('invoice/fetchPage')
 return invoiceModule.actions.fetchPage(invoiceContext, params)
}
const {Alert} = require('react-native')
const {loadTabDraftDetails} = require('../../../../store/orders/tabConsultationDetails')
const {loadTabConsultation, closeTabConsultation} = require('../../../../store/orders/tabConsultation')
const Page = require('../../../../react/pages/checkout/WaiterTabConsultationPage').default
const root = {id: 1, orderType: 'tab', externalCode: 'Jorge', provider: '/people/3', price: 80, chargeCapability: {enabled: false, local: false, remote: false}, status: {realStatus: 'open'}}
const water = {id: 10, quantity: 2, total: 10, product: {id: 50, product: 'Água', productFiles: [{file: '/files/agua'}]}}
const combo = {id: 20, quantity: 1, total: 70, product: {id: 60, type: 'custom', product: 'Combo', productFiles: [{file: '/files/combo'}]}}
const fries = {id: 21, orderProduct: '/order_products/20', quantity: 1, showInParentQueue: false,
  productGroup: {id: 8, productGroup: 'Escolha sua batata'}, product: {id: 61, type: 'custom', product: 'Batata', productFiles: [{file: '/files/batata'}]}}
const salt = {id: 22, orderProduct: '/order_products/21', quantity: 1, showInParentQueue: true,
  productGroup: {id: 9, productGroup: 'Tempero'}, product: {id: 62, product: 'Sal'}}
let tree, navigation, drafts, rootValue
const notify = () => {mockRevision++; mockListeners.forEach(cb => cb())}
const button = label => tree.root.findAllByType('TouchableOpacity').find(x => x.props.accessibilityLabel === label)
const text = () => JSON.stringify(tree.toJSON())
beforeEach(() => {
 jest.clearAllMocks(); mockFocusCallbacks = []; drafts = true; rootValue = root
 mockEnsure.mockResolvedValue({id: 20, mainOrderId: 1, orderType: 'cart', price: 0, status: {realStatus: 'open', status: 'open'}, orderProducts: []})
 mockStores.people = {getters: {currentCompany: {id: 3}, mainCompany: {configs: {'pos-default-status': 10}}}}
 mockStores.device = {getters: {item: {id: 403}}}
 mockStores.device_config = {getters: {item: {configs: {'pos-operation-mode': 'waiter', 'check-order-type': 'tab',
  'check-order-management-mode': 'existing-only', 'pos-local-charge-enabled': false, 'pos-gateway': 'cielo'}}}}
 mockStores.theme = {getters: {colors: {}}}
 mockStores.cart = {actions: {getItems: jest.fn(async () => [rootValue])}}
 const context = {dispatch: dispatchInvoice, getters: {tabConsultation: null, item: {id: 999}}, commit: (_type, state) => {context.getters.tabConsultation = state; notify()}}
 mockStores.orders = {getters: context.getters, actions: {
  loadTabConsultation: args => loadTabConsultation(context, args), loadTabDraftDetails: args => loadTabDraftDetails(context, args), closeTabConsultation: args => closeTabConsultation(context, args)}}
 api.getToken.mockResolvedValue('fake-session')
 api.fetch.mockImplementation(async (uri, options = {}) => {
  if (options.method === 'POST') return {result: {errno: 0}}
  if (uri === 'orders/1') return rootValue
  if (uri === 'invoices') return {member: [{id: 9, price: 15, status: {realStatus: 'closed'}}], totalItems: 1}
  if (uri === 'orders') return {member: options.params.mainOrderId === '1' ? [
    {id: 2, mainOrderId: 1, provider: '/people/3', orderType: 'sale'},
    ...(drafts ? [{id: 3, mainOrderId: 1, provider: '/people/3', orderType: 'cart'}] : []),
  ] : [], totalItems: options.params.mainOrderId === '1' ? (drafts ? 2 : 1) : 0}
  const id = Number(uri.split('/')[1])
  return {id, mainOrderId: 1, provider: '/people/3', orderType: id === 2 ? 'sale' : 'cart', price: id === 2 ? 80 : 5,
    status: {realStatus: 'open', status: id === 2 ? 'preparing' : 'open'}, orderProducts: id === 2 ? [water, combo, fries, salt] : [water]}
 })
 navigation = {navigate: jest.fn(), setOptions: jest.fn()}
})
afterEach(async () => {if (tree) await renderer.act(async () => tree.unmount()); tree = null})
async function mount(params = {}) {await renderer.act(async () => {
 tree = renderer.create(React.createElement(Page, {navigation, route: {params: {rootOrderId: 1, ...params}}}))
})}
it('shows actual round products, nested photos and drafts separately without active cart mutation', async () => {
 await mount()
 for (const label of ['Comanda ', 'Jorge', 'Lançamentos enviados (', 'Rascunhos (1)', 'Água', 'Batata', 'Sal']) expect(text()).toContain(label)
 expect(tree.root.findAllByType('Image').map(x => x.props.source.uri)).toEqual(['/files/agua', '/files/combo', '/files/batata'])
 expect(text()).toContain('R$ 80.00'); expect(text()).toContain('R$ 15.00'); expect(text()).toContain('R$ 65.00')
 expect(button('Cobrar comanda')).toBeUndefined()
 expect(mockStores.orders.getters.item.id).toBe(999)
 await renderer.act(async () => button('Rascunhos (1)').props.onPress())
 await renderer.act(async () => button('Revisar rascunho').props.onPress())
 expect(navigation.navigate).toHaveBeenCalledWith('OrderDetails', expect.objectContaining({id: '3', showBottomCart: false}))
})
it('starts an empty launch for the same named tab through the existing session flow', async () => {
 await mount()
 await renderer.act(async () => button('Novo lançamento').props.onPress())
 expect(mockEnsure).toHaveBeenCalledWith(null, expect.objectContaining({forceNew: true,
  linkedOrderInput: expect.objectContaining({externalCode: 'Jorge', settlementOrder: root})}))
 expect(navigation.navigate).toHaveBeenCalledWith('PdvPage', expect.objectContaining({id: '20', catalogResetKey: 'launch:20'}))
})
it('uses authorized existing checkout, refreshes on return and blocks payment after a read failure', async () => {
 rootValue = {...root, chargeCapability: {enabled: true, local: true, remote: true}}
 await mount()
 await renderer.act(async () => button('Fechar comanda').props.onPress())
 await renderer.act(async () => Alert.alert.mock.calls.at(-1)[2][1].onPress())
 expect(navigation.navigate).toHaveBeenCalledWith('Checkout', expect.objectContaining({id: '1', showBottomCart: false}))
 rootValue = {...rootValue, price: 100}
 await renderer.act(async () => {mockFocusCallbacks.forEach(callback => callback())})
 expect(text()).toContain('R$ 100.00'); expect(text()).toContain('R$ 85.00')
 api.fetch.mockRejectedValue(new Error('Conexão indisponível'))
 await renderer.act(async () => tree.root.findByType('RefreshControl').props.onRefresh())
 expect(text()).toContain('R$ 100.00')
 expect(button('Fechar comanda').props.disabled).toBe(true)
 expect(button('Novo lançamento').props.disabled).toBe(true)
})
it('permits closure only with authorized management, no balance and no drafts', async () => {
 const config = mockStores.device_config.getters.item.configs
 config['pos-local-charge-enabled'] = true; config['check-order-management-mode'] = 'manage'
 rootValue = {...root, price: 15, chargeCapability: {enabled: true, local: true, remote: true}}
 await mount()
 expect(button('Fechar comanda').props.disabled).toBe(false)
 drafts = false
 await renderer.act(async () => tree.root.findByType('RefreshControl').props.onRefresh())
 expect(button('Fechar comanda').props.disabled).toBe(false)
 await renderer.act(async () => button('Fechar comanda').props.onPress())
 await renderer.act(async () => Alert.alert.mock.calls[0][2][1].onPress())
 expect(api.fetch.mock.calls.filter(([, options]) => options?.method === 'POST').map(([uri]) => uri)).toEqual(['orders/2/delivered', 'orders/1/delivered'])
 expect(navigation.navigate).toHaveBeenCalledWith('HomePage')
})

it('permits remote-only checkout using server capability without requiring local charge', async () => {
 rootValue = {...root, chargeCapability: {enabled: true, local: false, remote: true}}
 await mount()
 expect(button('Cobrar comanda')).toBeUndefined()
 await renderer.act(async () => button('Fechar comanda').props.onPress())
 await renderer.act(async () => Alert.alert.mock.calls.at(-1)[2][1].onPress())
 expect(navigation.navigate).toHaveBeenCalledWith('Checkout', expect.objectContaining({id: '1', waiterTabConsultationRootId: 1, waiterTabCloseRequested: true, waiterTabDiscardDraftIds: [3]}))
})
it('asks for confirmation before discarding a draft and never puts discard on a sent sale', async () => {
 mockStores.orders.actions.discardTabDraft = jest.fn()
 await mount()
 expect(button('Descartar rascunho')).toBeUndefined()
 await renderer.act(async () => button('Rascunhos (1)').props.onPress())
 expect(tree.root.findAllByType('TouchableOpacity').filter(x => x.props.accessibilityLabel === 'Descartar rascunho')).toHaveLength(1)
 await renderer.act(async () => button('Descartar rascunho').props.onPress())
 expect(mockStores.orders.actions.discardTabDraft).not.toHaveBeenCalled()
 await renderer.act(async () => Alert.alert.mock.calls[0][2][1].onPress())
 expect(mockStores.orders.actions.discardTabDraft).toHaveBeenCalledWith(expect.objectContaining({companyId: 3, rootOrderId: 1, draftOrderId: 3}))
})


it('returns after partial payment without canceling drafts or closing the tab', async () => {
 mockStores.device_config.getters.item.configs['check-order-management-mode'] = 'manage'
 rootValue = {...root, chargeCapability: {enabled: true, local: true, remote: true}}
 await mount({waiterTabFinalize: true, waiterTabDiscardDraftIds: [3]})
 expect(text()).toContain('Pagamento parcial registrado')
 expect(text()).toContain('Rascunhos (1)')
 expect(api.fetch.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false)
 expect(navigation.navigate).not.toHaveBeenCalled()
})
it('completes an already-paid return once without opening checkout again', async () => {
 mockStores.device_config.getters.item.configs['check-order-management-mode'] = 'manage'
 drafts = false
 rootValue = {...root, price: 15, chargeCapability: {enabled: true, local: false, remote: true}}
 await mount({waiterTabFinalize: true, waiterTabDiscardDraftIds: []})
 expect(navigation.navigate).toHaveBeenCalledWith('HomePage')
 expect(navigation.navigate.mock.calls.some(([screen]) => screen === 'Checkout')).toBe(false)
 expect(api.fetch.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(2)
})
it('keeps paid closure failures retryable without charging again', async () => {
 mockStores.device_config.getters.item.configs['check-order-management-mode'] = 'manage'
 drafts = false
 rootValue = {...root, price: 15, chargeCapability: {enabled: true, local: true, remote: true}}
 const closeAction = mockStores.orders.actions.closeTabConsultation
 mockStores.orders.actions.closeTabConsultation = jest.fn().mockRejectedValueOnce(new Error('Falha no encerramento')).mockImplementation(closeAction)
 await mount({waiterTabFinalize: true, waiterTabDiscardDraftIds: []})
 expect(text()).toContain('O pagamento está registrado')
 expect(button('Fechar comanda').props.disabled).toBe(false)
 await renderer.act(async () => button('Fechar comanda').props.onPress())
 await renderer.act(async () => Alert.alert.mock.calls.at(-1)[2][1].onPress())
 expect(navigation.navigate).toHaveBeenCalledWith('HomePage')
 expect(navigation.navigate.mock.calls.some(([screen]) => screen === 'Checkout')).toBe(false)
})
