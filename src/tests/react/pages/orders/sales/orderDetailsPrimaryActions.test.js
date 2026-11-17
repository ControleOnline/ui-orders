const React = require('react')
const renderer = require('react-test-renderer')
global.IS_REACT_ACT_ENVIRONMENT = true
const mockStores = {people: {getters: {currentCompany: {id: 3}}}, device: {getters: {item: {id: 403}}}}
jest.mock('@store', () => ({useStore: name => mockStores[name]}))
jest.mock('@appType', () => ({app_type: 'POS'}))
jest.mock('@controleonline/ui-common/src/api', () => ({api: {post: jest.fn()}}))
const useActions = require('../../../../../react/pages/orders/sales/orderDetails/useOrderDetailsPrimaryActions').default
const {clearActivePosOrderContexts, consumeConfirmedPosOrderContext} = require('../../../../../react/hooks/posCartSession/activePosOrderContext')
let tree, actions
const order = {id: 70, app: 'POS', orderType: 'cart', provider: '/people/3', status: {realStatus: 'open'},
  price: 83, orderProducts: [{id: 10, hierarchyComplete: true, quantity: 1, total: 73},
    {id: 11, hierarchyComplete: true, quantity: 1, total: 10}]}
const fixture = async overrides => {
  const params = {canMutateOrderProducts: true, isWaiterMode: true, item: order, routeOrderId: 70,
    route: {params: {interactionMode: 'pdv'}}, ordersGetters: {item: order, loadedAt: Date.now(), loadedKey: '70'},
    navigation: {navigate: jest.fn()}, flushPendingOrderProductChanges: jest.fn().mockResolvedValue(),
    showError: jest.fn(), ...overrides}
  const Probe = () => {actions = useActions(params); return null}
  await renderer.act(async () => {tree = renderer.create(React.createElement(Probe))})
  return params
}
afterEach(async () => {if(tree) await renderer.act(async () => tree.unmount()); tree = null; clearActivePosOrderContexts()})
it('hands the recently confirmed reviewed order to the existing catalog session once', async () => {
  const params = await fixture()
  await renderer.act(async () => actions.handleAddProduct())
  expect(consumeConfirmedPosOrderContext({companyId: 3, deviceId: 403, orderId: 70})).toMatchObject({id: 70, price: 83})
  expect(params.navigation.navigate).toHaveBeenCalledWith('AddProductScreen', expect.objectContaining({id: '70', resumeExistingOrder: true}))
  expect(consumeConfirmedPosOrderContext({companyId: 3, deviceId: 403, orderId: 70})).toBeNull()
})
it('waits for pending quantity writes before navigating', async () => {
  let release
  const params = await fixture({flushPendingOrderProductChanges: () => new Promise(resolve => {release = resolve})})
  let pending
  await renderer.act(async () => {pending = actions.handleAddProduct()})
  expect(params.navigation.navigate).not.toHaveBeenCalled()
  await renderer.act(async () => {release(); await pending})
  expect(params.navigation.navigate).toHaveBeenCalledTimes(1)
})
it.each([
  {loadedAt: Date.now() - 31000, loadedKey: '70', item: order},
  {loadedAt: Date.now(), loadedKey: '71', item: order},
  {loadedAt: Date.now(), loadedKey: '70', item: {...order, orderProducts: [{id: 10}]}},
  {loadedAt: Date.now(), loadedKey: '70', item: order, error: 'Failed mutation'},
  {loadedAt: Date.now() + 60000, loadedKey: '70', item: order},
  {loadedAt: Date.now(), loadedKey: '70', item: {...order, provider: '/people/4'}},
  {loadedAt: Date.now(), loadedKey: '70', item: order, isSaving: true},
])('keeps the server-read path when the reviewed snapshot cannot be trusted (%#)', async getters => {
  await fixture({item: getters.item, ordersGetters: getters})
  await renderer.act(async () => actions.handleAddProduct())
  expect(consumeConfirmedPosOrderContext({companyId: 3, deviceId: 403, orderId: 70})).toBeNull()
})
it('does not navigate after a pending write fails', async () => {
  const params = await fixture({flushPendingOrderProductChanges: jest.fn().mockRejectedValue(new Error('Failed quantity'))})
  await renderer.act(async () => actions.handleAddProduct())
  expect(params.navigation.navigate).not.toHaveBeenCalled()
  expect(params.showError).toHaveBeenCalled()
})

it('uses the store updated by the completed quantity write', async () => {
 const getters = {loadedAt: Date.now(), loadedKey: '70', item: order}
 await fixture({ordersGetters: getters, flushPendingOrderProductChanges: async () => {
  getters.item = {...order, price: 88}
 }})
 await renderer.act(async () => actions.handleAddProduct())
 expect(consumeConfirmedPosOrderContext({companyId: 3, deviceId: 403, orderId: 70})).toMatchObject({price: 88})
})
