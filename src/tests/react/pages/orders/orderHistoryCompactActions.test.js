const React = require('react'); const renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('@appType', () => ({app_type: 'MANAGER'}));
jest.mock('react-native', () => {
  const React = require('react'); const c = name => p => React.createElement(name, p, p.children);
  return {View: c('View'), Text: c('Text'), TouchableOpacity: c('Button'), StyleSheet: {create: v => v}};
});
jest.mock('react-native-vector-icons/Feather', () => () => null);
const Actions = require('../../../../react/pages/orders/OrderHistoryRowActions').default;
let tree;
afterEach(() => renderer.act(() => tree.unmount()));
it('opens the existing cancellation flow directly and prevents row navigation', () => {
  const cancel = jest.fn(), stop = jest.fn(), row = {id: 9, status: {status: 'preparing', realStatus: 'open'}};
  renderer.act(() => {tree = renderer.create(React.createElement(Actions, {row, themeColors: {}, onCancelOrder: cancel}));});
  const buttons = tree.root.findAllByType('Button');
  expect(buttons.some(b => b.props.accessibilityLabel === 'Mais ações')).toBe(false);
  renderer.act(() => buttons.find(b => b.props.accessibilityLabel === 'Excluir pedido').props.onPress({stopPropagation: stop}));
  expect(cancel).toHaveBeenCalledWith(row); expect(stop).toHaveBeenCalled();
});
it('keeps terminal-state restrictions and exposes cancellation details directly', () => {
  const details = jest.fn(), row = {id: 9, status: {realStatus: 'canceled'}};
  renderer.act(() => {tree = renderer.create(React.createElement(Actions, {row, themeColors: {}, onCancelOrder: jest.fn(), onViewCancellation: details}));});
  const buttons = tree.root.findAllByType('Button');
  expect(buttons.some(b => ['Excluir pedido','Pagar'].includes(b.props.accessibilityLabel))).toBe(false);
  renderer.act(() => buttons.find(b => b.props.accessibilityLabel === 'Ver cancelamento').props.onPress());
  expect(details).toHaveBeenCalledWith(row);
});

it('uses configured danger colors and theme error tokens when overrides are absent', () => {
  const row = {status: {realStatus: 'open'}};
  const colors = {tableActionDangerBackground: '#123abc', tableActionDangerBorder: '#456def', inputErrorBackground: '#fedcba', inputErrorBorder: '#abcdef'};
  const render = () => React.createElement(Actions, {row, themeColors: colors, onCancelOrder: jest.fn()});
  renderer.act(() => {tree = renderer.create(render());});
  const style = () => tree.root.findAllByType('Button').find(b => b.props.accessibilityLabel === 'Excluir pedido').props.style[1];
  expect(style()).toMatchObject({backgroundColor: '#123abc', borderColor: '#456def'});
  delete colors.tableActionDangerBackground; delete colors.tableActionDangerBorder;
  renderer.act(() => tree.update(render()));
  expect(style()).toMatchObject({backgroundColor: '#fedcba', borderColor: '#abcdef'});
});
