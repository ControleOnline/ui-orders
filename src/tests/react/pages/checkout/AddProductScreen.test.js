const React = require('react');
const {act, create} = require('react-test-renderer');

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator', Text: 'Text', View: 'View',
}));
jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockRoute,
  useIsFocused: () => true,
  useFocusEffect: callback => require('react').useEffect(callback, [callback]),
}));
jest.mock('@store', () => ({useStore: name => mockStores[name]}));
jest.mock('@controleonline/ui-products/src/react/pages/Categories', () => 'Catalog');
jest.mock('@controleonline/ui-products/src/react/pages/Products', () => 'Catalog');
jest.mock('@controleonline/ui-orders/src/react/components/LinkedOrderEntrySheet', () => 'EntrySheet');
jest.mock('@controleonline/ui-common/src/react/config/deviceConfigBootstrap', () => ({
  isPosCashRegisterClosed: () => false,
  isPosTotemMode: () => false,
  isPosSingleItemMode: () => true,
  shouldUsePosCashRegisterLifecycle: () => false,
}));
jest.mock('@controleonline/ui-common/src/react/components/MessageService', () => ({
  useMessage: () => ({showError: mockShowError}),
}));
jest.mock('@controleonline/ui-orders/src/react/hooks/usePosCartSession', () => ({
  __esModule: true,
  default: options => { mockRequestInput = options.requestLinkedOrderInput; return mockSession; },
  isLinkedOrderCodeRequiredError: () => false,
  isPosOrderCreationCancelledError: error => error.message === 'cancelled',
}));
const Screen = require('../../../../react/pages/checkout/AddProductScreen').default;
const mockRoute = {params: {startNewOrder: true}};
const mockShowError = jest.fn();
const mockStores = {
  orders: {actions: {initQueue: jest.fn()}},
  people: {getters: {currentCompany: {id: 1}, mainCompany: {configs: {}}}},
  device: {getters: {item: {id: 2}}},
  device_config: {getters: {item: {configs: {}}}},
  categories: {getters: {items: []}, actions: {}},
};
let mockRequestInput;
let mockSession;
let tree;
let navigation;
const savedOrder = jest.fn();

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  navigation = {setParams: jest.fn(), canGoBack: () => true, goBack: jest.fn(), addListener: jest.fn()};
  mockSession = {
    activeOrder: null,
    usesLinkedCheckOrders: true,
    loadStoredDraftOrder: jest.fn(), refreshActiveOrder: jest.fn(),
    ensureActiveOrder: jest.fn(async () => {
      const input = await mockRequestInput({orderType: 'tab'});
      if (!input) throw new Error('cancelled');
      savedOrder(input);
      return {id: 3};
    }),
  };
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
const mount = async () => { await act(async () => { tree = create(<Screen navigation={navigation} />); }); };

it('keeps identification usable during preparation and releases catalog after confirmation', async () => {
  await mount();
  expect(tree.root.findByType('EntrySheet').props.visible).toBe(true);
  expect(tree.root.findAllByType('Catalog')).toHaveLength(0);
  await act(async () => tree.root.findByType('EntrySheet').props.onSubmit({code: '42'}));
  expect(savedOrder).toHaveBeenCalledWith({code: '42'});
  expect(tree.root.findAllByType('ActivityIndicator')).toHaveLength(0);
  expect(tree.root.findAllByType('Catalog')).toHaveLength(1);
});
it('cancels preparation without saving an order or leaving a spinner', async () => {
  await mount();
  await act(async () => tree.root.findByType('EntrySheet').props.onCancel());
  expect(savedOrder).not.toHaveBeenCalled();
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
  expect(mockShowError).not.toHaveBeenCalled();
  expect(tree.root.findAllByType('ActivityIndicator')).toHaveLength(0);
});
it('prepares the catalog without identification for ordinary orders', async () => {
  mockSession.usesLinkedCheckOrders = false;
  mockSession.ensureActiveOrder.mockResolvedValue({id: 4});
  await mount();
  expect(tree.root.findByType('EntrySheet').props.visible).toBe(false);
  expect(tree.root.findAllByType('Catalog')).toHaveLength(1);
});
