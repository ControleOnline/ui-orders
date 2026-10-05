const React = require('react');
const renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const mockPost = jest.fn();
jest.mock('@controleonline/ui-common/src/api', () => ({api: {post: (...args) => mockPost(...args)}}));
const mockStores = {people: {getters: {currentCompany: {id: 3}}}, device: {getters: {item: {id: 403}}}, orders: {getters: {}, actions: {setItem: jest.fn(), rememberConfirmedWaiterLaunch: jest.fn().mockResolvedValue(null)}}};
jest.mock('@store', () => ({useStore: name => mockStores[name]}));
jest.mock('@appType', () => ({app_type: 'POS'}));
const usePrimaryActions = require('../../../../../react/pages/orders/sales/orderDetails/useOrderDetailsPrimaryActions').default;
const {setActivePosOrderContext, getActivePosOrderContext, clearActivePosOrderContexts} = require('../../../../../react/hooks/posCartSession/activePosOrderContext');
let tree, actions;
const mount = async (isWaiterMode = true) => {
 const navigation = {navigate: jest.fn()};
 const showError = jest.fn();
 const events = [];
 const props = {canMutateOrderProducts: true, item: {id: 123, app: 'POS', orderType: 'cart'}, route: {params: {interactionMode: 'pdv'}}, navigation, isWaiterMode, isLocallyTerminalOrder: false, flushPendingOrderProductChanges: async () => events.push('flush'), ordersGetters: {}, refreshCurrentOrder: async () => events.push('refresh'), showError, showSuccess: () => events.push('success')};
 const Probe = () => {actions = usePrimaryActions(props); return null;};
 await renderer.act(async () => {tree = renderer.create(React.createElement(Probe));});
 return {navigation, showError, events};
};
beforeEach(() => {mockPost.mockReset(); mockStores.orders.getters.item = {id: 123}; mockStores.orders.actions.setItem.mockReset(); mockStores.orders.actions.rememberConfirmedWaiterLaunch.mockClear(); clearActivePosOrderContexts(); global.localStorage = {getItem: jest.fn(() => '123'), removeItem: jest.fn()}; setActivePosOrderContext({companyId: 3, deviceId: 403, order: {id: 123}});});
afterEach(async () => {if (tree) await renderer.act(async () => tree.unmount()); tree = null; delete global.localStorage; clearActivePosOrderContexts();});
it('returns the waiter Home after the server accepts and items are flushed', async () => {
 const {navigation, events} = await mount();
 mockPost.mockImplementation(async () => {events.push('confirm'); return {errno: 0};});
 await renderer.act(async () => actions.handlePrimaryAction());
 expect(events).toEqual(['flush', 'confirm', 'success']);
 expect(mockPost).toHaveBeenCalledWith('/orders/123/confirm', {});
 expect(navigation.navigate).toHaveBeenCalledWith('HomePage');
});
it.each([{errno: 11, errmsg: 'denied'}, null, undefined, {}, [], {result: null}, {result: {}}])('does not leave the launch for an unconfirmed server response %p', async response => {
 const {navigation, showError} = await mount();
 mockPost.mockResolvedValue(response);
 await renderer.act(async () => actions.handlePrimaryAction());
 expect(navigation.navigate).not.toHaveBeenCalled();
 expect(showError).toHaveBeenCalled();
 expect(getActivePosOrderContext({companyId: 3, deviceId: 403})).toMatchObject({id: 123});
 expect(global.localStorage.removeItem).not.toHaveBeenCalled();
 expect(mockStores.orders.actions.setItem).not.toHaveBeenCalled();
});
it('retains checkout in non-waiter POS mode', async () => {
 const {navigation} = await mount(false);
 await renderer.act(async () => actions.handlePrimaryAction());
 expect(mockPost).not.toHaveBeenCalled();
 expect(navigation.navigate.mock.calls[0][0]).toBe('Checkout');
});

it('accepts the confirm endpoint envelope', async () => {
 const {navigation} = await mount();
 mockPost.mockResolvedValue({action: 'confirm', result: {errno: 0, errmsg: 'ok'}});
 await renderer.act(async () => actions.handlePrimaryAction());
 expect(navigation.navigate).toHaveBeenCalledWith('HomePage');
});

it('clears only the acknowledged launch from the existing session and persisted draft', async () => {
 const {navigation} = await mount();
 mockPost.mockResolvedValue({result: {errno: 0}});
 await renderer.act(async () => actions.handlePrimaryAction());
 expect(getActivePosOrderContext({companyId: 3, deviceId: 403})).toBeNull();
 expect(global.localStorage.removeItem).toHaveBeenCalledWith('pdv-active-order:3:403');
 expect(mockStores.orders.actions.setItem).toHaveBeenCalledWith({});
 expect(navigation.navigate).toHaveBeenCalledWith('HomePage');
});
it('keeps the launch until the server acknowledges it', async () => {
 const {navigation} = await mount();
 let accept;
 mockPost.mockImplementation(() => new Promise(resolve => {accept = resolve;}));
 let pending;
 await renderer.act(async () => {pending = actions.handlePrimaryAction();});
 expect(navigation.navigate).not.toHaveBeenCalled();
 expect(getActivePosOrderContext({companyId: 3, deviceId: 403})).toMatchObject({id: 123});
 await renderer.act(async () => {accept({result: {errno: 0}}); await pending;});
 expect(navigation.navigate).toHaveBeenCalledWith('HomePage');
});
it('does not erase another active order or another device draft', async () => {
 const {navigation} = await mount();
 setActivePosOrderContext({companyId: 3, deviceId: 403, order: {id: 456}});
 mockStores.orders.getters.item = {id: 456};
 global.localStorage.getItem.mockReturnValue('456');
 mockPost.mockResolvedValue({result: {errno: 0}});
 await renderer.act(async () => actions.handlePrimaryAction());
 expect(getActivePosOrderContext({companyId: 3, deviceId: 403})).toMatchObject({id: 456});
 expect(global.localStorage.removeItem).not.toHaveBeenCalled();
 expect(mockStores.orders.actions.setItem).not.toHaveBeenCalled();
 expect(navigation.navigate).toHaveBeenCalledWith('HomePage');
});


it('preserves acknowledged products for consultation without publishing an unsent draft as a sale', async () => {
 const {navigation} = await mount();
 const order = {id: 123, mainOrderId: 1, provider: '/people/3', orderType: 'cart', orderProducts: [{id: 12, product: {product: 'Combo'}}]};
 mockStores.orders.getters.item = order;
 mockPost.mockResolvedValue({result: {errno: 5}});
 await renderer.act(async () => actions.handlePrimaryAction());
 expect(mockStores.orders.actions.rememberConfirmedWaiterLaunch).not.toHaveBeenCalled();
 mockPost.mockResolvedValue({result: {errno: 0}});
 await renderer.act(async () => actions.handlePrimaryAction());
 expect(mockStores.orders.actions.rememberConfirmedWaiterLaunch).toHaveBeenCalledWith({companyId: '3', deviceId: '403', order});
 expect(order.orderType).toBe('cart');
 expect(navigation.navigate).toHaveBeenCalledWith('HomePage');
});
it('uses the effective device identity for the consultation cache even when the device has a web identifier', async () => {
 const previous = mockStores.device.getters.item
 mockStores.device.getters.item = {id: 'web-7'}
 try {
  await mount()
  const order = {id: 123, provider: '/people/3', mainOrderId: 1, orderProducts: []}
  mockStores.orders.getters.item = order
  mockPost.mockResolvedValue({result: {errno: 0}})
  await renderer.act(async () => actions.handlePrimaryAction())
  expect(mockStores.orders.actions.rememberConfirmedWaiterLaunch).toHaveBeenCalledWith({companyId: '3', deviceId: 'web-7', order})
 } finally {mockStores.device.getters.item = previous}
})
