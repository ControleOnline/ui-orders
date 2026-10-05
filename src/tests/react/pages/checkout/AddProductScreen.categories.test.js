jest.mock('@controleonline/ui-common/src/api', () => ({api: {getToken: async () => null}}));
const React = require('react');
const renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
let mockGetItems;
let mockStores;
const mockNavigation = {setParams: jest.fn(), addListener: jest.fn(), canGoBack: () => false};
const mockRoute = {params: {interactionMode: 'pdv'}};
jest.mock('react-native', () => ({ActivityIndicator: 'ActivityIndicator', Text: 'Text', TouchableOpacity: 'TouchableOpacity', View: 'View'}));
jest.mock('@store', () => ({useStore: name => mockStores[name]}));
jest.mock('@react-navigation/native', () => ({useRoute: () => mockRoute, useIsFocused: () => true, useFocusEffect: () => {}}));
jest.mock('@controleonline/ui-common/src/react/components/MessageService', () => ({useMessage: () => ({showError: jest.fn()})}));
jest.mock('@controleonline/ui-common/src/react/config/deviceConfigBootstrap', () => ({POS_OPERATION_MODE_WAITER: 'waiter', resolvePosOperationMode: () => 'counter', isPosCashRegisterClosed: () => false, isPosTotemMode: () => false, isPosSingleItemMode: () => false, shouldUsePosCashRegisterLifecycle: () => false}));
jest.mock('@controleonline/ui-orders/src/react/hooks/usePosCartSession', () => ({__esModule: true, default: () => ({activeOrder: {id: 123}, usesLinkedCheckOrders: false}), isLinkedOrderCodeRequiredError: () => false, isPosOrderCreationCancelledError: () => false}));
jest.mock('@controleonline/ui-orders/src/react/components/LinkedOrderEntrySheet', () => 'LinkedOrderEntrySheet');
jest.mock('@controleonline/ui-products/src/react/pages/Categories', () => 'Categories');
jest.mock('@controleonline/ui-products/src/react/pages/Products', () => 'Products');
const AddProductScreen = require('../../../../react/pages/checkout/AddProductScreen').default;
let tree;
beforeEach(() => {
 mockGetItems = jest.fn();
 mockStores = {orders: {actions: {initQueue: jest.fn()}, getters: {}}, people: {getters: {currentCompany: {id: 1}}}, device: {getters: {item: {id: 9}}}, device_config: {getters: {item: {configs: {}}}}, categories: {actions: {getItems: (...args) => mockGetItems(...args)}, getters: {items: [], isLoading: false}}};
});
afterEach(async () => {if (tree) await renderer.act(async () => tree.unmount()); tree = null;});
const openCatalog = async () => {await renderer.act(async () => {tree = renderer.create(React.createElement(AddProductScreen, {navigation: mockNavigation, route: mockRoute}));});};
const messages = () => tree.root.findAllByType('Text').map(node => node.props.children).join(' ');
it('does not open products after a malformed category response and allows retry', async () => {
 mockGetItems.mockResolvedValueOnce(undefined).mockResolvedValueOnce([]);
 await openCatalog();
 expect(messages()).toContain('Não foi possível carregar as categorias');
 expect(tree.root.findAllByType('Products')).toHaveLength(0);
 await renderer.act(async () => tree.root.findByType('TouchableOpacity').props.onPress());
 expect(mockGetItems).toHaveBeenCalledTimes(2);
 expect(tree.root.findAllByType('Products')).toHaveLength(1);
});
it('keeps a network error separate from a confirmed empty catalog', async () => {
 mockGetItems.mockRejectedValue(new Error('offline'));
 await openCatalog();
 expect(messages()).toContain('Tentar novamente');
 expect(tree.root.findAllByType('Products')).toHaveLength(0);
});
it('opens all products only after a successful empty collection', async () => {
 mockGetItems.mockResolvedValue([]);
 await openCatalog();
 expect(tree.root.findByType('Products').props.route.params.categoryId).toBe('__all_products__');
 expect(tree.root.findByType('Products').props.activeOrderId).toBe(123);
});
