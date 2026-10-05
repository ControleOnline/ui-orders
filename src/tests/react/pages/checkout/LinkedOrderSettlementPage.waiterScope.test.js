const React = require('react')
const renderer = require('react-test-renderer')
const {jest} = require('@jest/globals')
global.IS_REACT_ACT_ENVIRONMENT = true
let mockConfigs
jest.mock('@store', () => ({useStore: () => ({getters: {item: {configs: mockConfigs}}})}))
jest.mock('@appType', () => ({app_type: 'POS'}))
jest.mock('react-native', () => ({ActivityIndicator: 'Loading', RefreshControl: 'Refresh',
 ScrollView: 'ScrollView', Text: 'Text', TouchableOpacity: 'Button', View: 'View', StyleSheet: {create: x => x},
 Platform: {select: values => values.web || values.default || {}}}))
jest.mock('react-native-safe-area-context', () => ({SafeAreaView: 'SafeAreaView'}))
jest.mock('react-native-vector-icons/Feather', () => 'Icon')
jest.mock('@controleonline/ui-common/src/api', () => ({api: {}}))
jest.mock('@controleonline/../../src/styles/branding', () => ({withOpacity: x => x}))
jest.mock('@controleonline/ui-common/src/utils/formatter', () => ({__esModule: true, default: {formatMoney: x => x}}))
jest.mock('@controleonline/ui-orders/src/react/components/LinkedOrderEntrySheet', () => 'EntrySheet')
jest.mock('../../../../react/pages/checkout/SettlementSectionTable', () => ({SettlementOrdersTable: 'Orders', SettlementInvoicesTable: 'Invoices'}))
jest.mock('../../../../react/pages/checkout/WaiterTabConsultationPage', () => ({__esModule: true, default: 'WaiterConsultation'}))
jest.mock('../../../../react/pages/checkout/useLinkedOrderSettlement', () => ({useLinkedOrderSettlement: () => ({
 palette: {background: '#fff'}, currentCompany: null,
})}))
const Page = require('../../../../react/pages/checkout/LinkedOrderSettlementPage').default
it.each([
 ['waiter', 'tab', true], ['counter', 'tab', false],
 ['waiter', 'table', false], ['waiter', ['table', 'tab'], false], ['single-item', 'stamp', false],
])('limits the new consultation to %s / %j', (mode, type, waiter) => {
 mockConfigs = {'pos-operation-mode': mode, 'check-order-type': type}
 let tree
 renderer.act(() => {tree = renderer.create(React.createElement(Page, {}))})
 expect(tree.root.findAllByType('WaiterConsultation')).toHaveLength(waiter ? 1 : 0)
 if (!waiter) expect(JSON.stringify(tree.toJSON())).toContain('Select a company')
 renderer.act(() => tree.unmount())
})
