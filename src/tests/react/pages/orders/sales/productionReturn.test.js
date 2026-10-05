const React = require('react');
const renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const mockPost = jest.fn();
jest.mock('@controleonline/ui-common/src/api', () => ({api: {post: (...args) => mockPost(...args)}}));
jest.mock('@appType', () => ({app_type: 'POS'}));
const usePrimaryActions = require('../../../../../react/pages/orders/sales/orderDetails/useOrderDetailsPrimaryActions').default;
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
beforeEach(() => mockPost.mockReset());
afterEach(async () => {if (tree) await renderer.act(async () => tree.unmount()); tree = null;});
it('returns the waiter to POS Orders after the server accepts and items are flushed', async () => {
 const {navigation, events} = await mount();
 mockPost.mockImplementation(async () => {events.push('confirm'); return {errno: 0};});
 await renderer.act(async () => actions.handlePrimaryAction());
 expect(events).toEqual(['flush', 'confirm', 'refresh', 'success']);
 expect(mockPost).toHaveBeenCalledWith('/orders/123/confirm', {});
 expect(navigation.navigate).toHaveBeenCalledWith('OrderHistoryPage', {interactionMode: 'pdv'});
});
it.each([{errno: 11, errmsg: 'denied'}, null, undefined, {}, [], {result: null}, {result: {}}])('does not leave the launch for an unconfirmed server response %p', async response => {
 const {navigation, showError} = await mount();
 mockPost.mockResolvedValue(response);
 await renderer.act(async () => actions.handlePrimaryAction());
 expect(navigation.navigate).not.toHaveBeenCalled();
 expect(showError).toHaveBeenCalled();
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
 expect(navigation.navigate).toHaveBeenCalledWith('OrderHistoryPage', {interactionMode: 'pdv'});
});
