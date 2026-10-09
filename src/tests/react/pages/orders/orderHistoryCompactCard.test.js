const React = require('react');
const renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('@appType', () => ({app_type: 'MANAGER'}));
jest.mock('@store', () => ({useStore: () => ({getters: {colors: {cardText: '#123456', textSecondary: '#345678'}}})}));
jest.mock('react-native', () => {
  const React = require('react');
  return {View: p => React.createElement('View', p, p.children), Text: p => React.createElement('Text', p, p.children),
    TouchableOpacity: p => React.createElement('Button', p, p.children), StyleSheet: {create: v => v}};
});
const Card = require('../../../../react/pages/orders/OrderHistoryCard').default;
it('keeps the database status color, amount, date and open action in the card', () => {
  global.t = {t: (_scope, _kind, key) => key === 'paid' ? 'Pago' : 'Venda'};
  const onOpen = jest.fn();let tree;
  renderer.act(() => {tree = renderer.create(React.createElement(Card, {order: {id: 9, app: 'Pos', orderType: 'sale', price: 92.9, orderDate: '2026-10-08T12:00:00', status: {status: 'paid', color: '#cc0077'}}, openRow: onOpen}));});
  const status = tree.root.findAllByType('Text').find(t => t.props.children === 'Pago');
  expect(status.props.style.flat().some(s => s?.color === '#cc0077')).toBe(true);
  const text = tree.root.findAllByType('Text').map(t => String(t.props.children)).join(' ');
  expect(text).toContain('92,90');expect(text).toContain('08/10/2026');
  renderer.act(() => tree.root.findByType('Button').props.onPress());expect(onOpen).toHaveBeenCalled();
  renderer.act(() => tree.unmount());
});
it('preserves operational tab identity and the internal order id', () => {
  global.t = {t: (_scope, _kind, key) => key === 'tab' ? 'Comanda' : key};
  let tree;
  renderer.act(() => {tree = renderer.create(React.createElement(Card, {order: {id: 72979, app: 'POS', orderType: 'tab', externalCode: '1', price: 92.9}}));});
  const text = tree.root.findAllByType('Text').map(t => String(t.props.children)).join(' ');
  expect(text).toContain('Comanda #1');
  expect(text).toContain('#72979');
  renderer.act(() => tree.unmount());
});

it('uses configured colors in table and cards with no fixed status fallback', () => {
  const {configureOrderHistoryColumns} = require('../../../../react/pages/orders/orderHistoryHelpers');
  const {resolveOrderHistoryStatusColor} = require('../../../../react/pages/orders/orderHistoryStatusColor');
  const [column] = configureOrderHistoryColumns({columns: [{name: 'status'}], showAdvancedFilters: true, orderTypeFilter: 'sale'});
  for (const status of [{status: 'preparing', color: ''}, {status: 'open', color: ''}]) {
    let tree;
    global.t = {t: (_scope, _kind, key) => key};
    renderer.act(() => {tree = renderer.create(React.createElement(Card, {order: {id: 1, status}}));});
    const pillText = tree.root.findAllByType('Text').find(t => t.props.children === status.status);
    expect(pillText.props.style.flat().some(s => s?.color === column.compactStatusColor({status}, {textSecondary: '#345678'}))).toBe(true);
    expect(status.color).toBe('');
    renderer.act(() => tree.unmount());
  }
  expect(resolveOrderHistoryStatusColor({status: 'preparing'})).toBeUndefined();
  expect(column.compactStatusColor({status: {status: 'paid', color: '#00bb00'}})).toBe('#00bb00');
  const theme = {orderStatusClosed: '#123abc', orderStatusPaid: '#119933', textMuted: '#778899'};
  expect(resolveOrderHistoryStatusColor({status: 'closed', color: '#00bb00'}, theme)).toBe('#123abc');
  expect(resolveOrderHistoryStatusColor({status: 'paid'}, theme)).toBe('#119933');
  theme.orderStatusClosed = '#aabbcc';
  expect(column.compactStatusColor({status: {status: 'closed'}}, theme)).toBe('#aabbcc');
  expect(resolveOrderHistoryStatusColor({status: 'unknown'}, theme)).toBe('#778899');
});
