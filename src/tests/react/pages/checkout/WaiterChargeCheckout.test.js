const React = require('react')
const renderer = require('react-test-renderer')
const {jest} = require('@jest/globals')
global.IS_REACT_ACT_ENVIRONMENT = true
jest.mock('react-native', () => ({Platform: {OS: 'web'}, StyleSheet: {create: x => x}}))
jest.mock('@react-navigation/native', () => ({useFocusEffect: callback => require('react').useEffect(callback, [callback])}))
jest.mock('@controleonline/ui-common/src/react/utils/screenMetrics', () => ({appendScreenMetrics: x => x, hasScreenMetricsChanges: () => false}))
jest.mock('@controleonline/ui-common/src/utils/formatter', () => ({__esModule: true, default: {getCurrentDate: () => '2026-10-05'}}))
jest.mock('@controleonline/ui-common/src/api', () => ({api: {fetch: jest.fn()}}))
jest.mock('@controleonline/ui-common/src/react/services/paymentGatewayExecution', () => ({
  runConfiguredGatewayPayment: jest.fn(), normalizeGatewayPaymentError: (error, fallback) => error?.message || fallback,
}))
const {api} = require('@controleonline/ui-common/src/api')
const {runConfiguredGatewayPayment} = require('@controleonline/ui-common/src/react/services/paymentGatewayExecution')
const useRunners = require('../../../../react/pages/checkout/useCheckoutPaymentRunners').default
const useRemoteResult = require('../../../../react/pages/checkout/useRemotePaymentResult').default
const useContext = require('../../../../react/pages/checkout/useCheckoutContextState').default
const useOptions = require('../../../../react/pages/checkout/useCheckoutPaymentOptionsLoader').default
const {getWaiterChargeChannels, filterWaiterPaymentReceivers} = require('../../../../react/pages/checkout/waiterChargeCapability')
const cash = {id: 11, paymentCode: 'DINHEIRO', wallet: {'@id': '/wallets/1', wallet: 'Dinheiro'}, paymentType: {'@id': '/payment_types/1', paymentType: 'Dinheiro'}}
const card = {id: 12, paymentCode: 'CREDITO', wallet: {'@id': '/wallets/2', wallet: 'Infinite Pay'}, paymentType: {'@id': '/payment_types/2', paymentType: 'Crédito'}}
const root = {id: 1, '@id': '/orders/1', orderType: 'tab', price: 80, provider: '/people/3', chargeCapability: {enabled: true, local: true, remote: true}}
const configs = {'pos-operation-mode': 'waiter', 'check-order-type': 'tab', 'order-charge-enabled': true, 'pos-gateway': 'infinite-pay', 'payment-type-ids': [11, 12]}
let tree, result, props
function RunnersHarness({value}) {result = useRunners(value); return null}
function RemoteHarness({value}) {useRemoteResult(value); return null}
function ContextHarness({value}) {result = useContext(value); return null}
function OptionsHarness({value}) {useOptions(value); return null}
async function mount(Component, value) {await renderer.act(async () => {tree = renderer.create(React.createElement(Component, {value}))})}
beforeEach(() => {
  jest.clearAllMocks()
  api.fetch.mockResolvedValue({member: [{id: 9, status: 'paid', realStatus: 'closed'}]})
  props = {
    appendInvoiceToStore: jest.fn(), appendOrderInvoiceToStore: jest.fn(), buildOrderDetailsNavigationParams: x => ({id: x.id}),
    cashPaymentContext: 'local', cashReceivedValue: '20,00', checkoutPaymentOrder: root,
    currentCompany: {id: 3}, mainCompany: {configs: {'pos-paid-status': 9}}, device: {type: 'PDV', configs},
    effectiveRemainingAmount: 80, invoiceActions: {save: jest.fn(async body => ({...body, id: 99})), setError: jest.fn(), setMessage: jest.fn()},
    localGateway: 'infinite-pay', navigation: {navigate: jest.fn()}, order: root, orderProducts: [],
    ordersActions: {setPayable: jest.fn(), syncOrder: jest.fn(), get: jest.fn(async () => root)},
    resolveNextPayableAfterPayment: amount => amount - 80, routeOrderId: '1', selectedPayment: cash,
    selectedRemoteDevice: {deviceId: 'terminal-1', alias: 'Caixa'}, setAmountEntryModalMode: jest.fn(), setCashReceivedValue: jest.fn(),
    setPendingRemotePaymentRequest: jest.fn(), setSubmittingPayment: jest.fn(), storagedDevice: {id: 'web-10'},
    syncLoyaltySelectionToOrder: jest.fn(async x => x), websocketActions: {send: jest.fn()},
    waiterTabReturn: jest.fn(), resetCompletedOrderState: jest.fn(), resetToOrderHistory: jest.fn(),
    verifyChargeChannel: jest.fn(async () => true),
  }
})
afterEach(async () => {if (tree) await renderer.act(async () => tree.unmount()); tree = null})

it('registers one partial cash payment on the tab, without calling the gateway, then returns to consultation', async () => {
  await mount(RunnersHarness, props)
  await renderer.act(async () => result.handleConfirmCashAmountEntry())
  expect(props.verifyChargeChannel).toHaveBeenCalledWith('local', 20)
  expect(props.invoiceActions.save).toHaveBeenCalledTimes(1)
  expect(props.invoiceActions.save).toHaveBeenCalledWith(expect.objectContaining({order: '/orders/1', price: 20, status: '/statuses/9'}))
  expect(runConfiguredGatewayPayment).not.toHaveBeenCalled()
  expect(props.appendOrderInvoiceToStore).toHaveBeenCalledWith(expect.objectContaining({id: 99}), 20)
  expect(props.ordersActions.setPayable).toHaveBeenCalledWith(-60)
  expect(props.waiterTabReturn).toHaveBeenCalledTimes(1)
  expect(props.navigation.navigate).not.toHaveBeenCalled()
})
it('applies only the amount owed and returns to consultation even for a legacy simple POS', async () => {
  props.device.configs = {...configs, 'pos-type': 'simple'}
  await mount(RunnersHarness, props)
  await renderer.act(async () => result.handleConfirmCashAmountEntry(100))
  expect(props.invoiceActions.save).toHaveBeenCalledWith(expect.objectContaining({price: 80}))
  expect(props.waiterTabReturn).toHaveBeenCalledTimes(1)
  expect(props.resetToOrderHistory).not.toHaveBeenCalled()
})
it('refuses disabled or newly revoked local charge before payment or invoice', async () => {
  props.canUseLocalOperationalPayment = false
  await mount(RunnersHarness, props)
  await renderer.act(async () => result.runLocalPayment({payment: cash, total: 20}))
  expect(props.invoiceActions.save).not.toHaveBeenCalled()
  await renderer.act(async () => tree.update(React.createElement(RunnersHarness, {value: {...props, canUseLocalOperationalPayment: true,
    verifyChargeChannel: jest.fn(async () => {throw new Error('Permissão revogada')})}})))
  await renderer.act(async () => result.runLocalPayment({payment: cash, total: 20}))
  expect(props.invoiceActions.save).not.toHaveBeenCalled()
  expect(props.invoiceActions.setError).toHaveBeenLastCalledWith('Permissão revogada')
  expect(props.waiterTabReturn).not.toHaveBeenCalled()
})
it('keeps gateway failure in checkout and does not register an unpaid invoice', async () => {
  runConfiguredGatewayPayment.mockRejectedValue(new Error('Pagamento cancelado'))
  await mount(RunnersHarness, props)
  await renderer.act(async () => result.runLocalPayment({payment: card, total: 80}))
  expect(props.invoiceActions.save).not.toHaveBeenCalled()
  expect(props.waiterTabReturn).not.toHaveBeenCalled()
  expect(props.setSubmittingPayment).toHaveBeenLastCalledWith(false)
})
it('sends the existing remote request and never creates a second invoice on the sender', async () => {
  props.canUseLocalOperationalPayment = false
  await mount(RunnersHarness, props)
  await renderer.act(async () => result.dispatchRemotePayment({payment: card, total: 80}))
  expect(props.verifyChargeChannel).toHaveBeenCalledWith('remote', 80)
  expect(props.websocketActions.send).toHaveBeenCalledWith(expect.objectContaining({destination: 'terminal-1', order: 1, total: 80, store: 'invoice', action: 'pay', 'master-device': 'web-10'}))
  expect(props.invoiceActions.save).not.toHaveBeenCalled()
  expect(props.waiterTabReturn).not.toHaveBeenCalled()
})
it('does not dispatch unauthorized remote charge or leave checkout busy after a sending failure', async () => {
  props.canUseRemoteOperationalPayment = false
  await mount(RunnersHarness, props)
  await renderer.act(async () => result.dispatchRemotePayment({payment: card, total: 80}))
  expect(props.websocketActions.send).not.toHaveBeenCalled()
  await renderer.act(async () => tree.update(React.createElement(RunnersHarness, {value: {...props, canUseRemoteOperationalPayment: true}})))
  props.websocketActions.send.mockRejectedValue(new Error('Sem conexão'))
  await renderer.act(async () => result.dispatchRemotePayment({payment: card, total: 80}))
  expect(props.setPendingRemotePaymentRequest).toHaveBeenLastCalledWith(null)
  expect(props.setSubmittingPayment).toHaveBeenLastCalledWith(false)
})
it('consumes a matching remote result once, refreshes the order and returns without another invoice save', async () => {
  let finish
  props.ordersActions.get.mockImplementation(() => new Promise(resolve => {finish = resolve}))
  const value = {...props, pendingRemotePaymentRequest: {requestKey: 'request-1'}, invoiceMessage: {
    store: 'invoice', action: 'pay-result', status: 'success', requestKey: 'request-1', paidAmount: 80, invoice: {id: 99, price: 80},
  }}
  await mount(RemoteHarness, value)
  await renderer.act(async () => tree.update(React.createElement(RemoteHarness, {value: {...value, order: {...root}}})))
  expect(props.ordersActions.get).toHaveBeenCalledTimes(1)
  await renderer.act(async () => finish(root))
  expect(props.appendInvoiceToStore).toHaveBeenCalledTimes(1)
  expect(props.invoiceActions.save).not.toHaveBeenCalled()
  expect(props.waiterTabReturn).toHaveBeenCalledTimes(1)
  expect(props.setSubmittingPayment).toHaveBeenLastCalledWith(false)
})
it.each(['canceled', 'error'])('keeps a remote %s in checkout and leaves balance and invoices unchanged', async status => {
  await mount(RemoteHarness, {...props, pendingRemotePaymentRequest: {requestKey: 'request-1'}, invoiceMessage: {
    store: 'invoice', action: 'pay-result', status, requestKey: 'request-1', error: 'Falha no terminal',
  }})
  expect(props.appendInvoiceToStore).not.toHaveBeenCalled()
  expect(props.ordersActions.setPayable).not.toHaveBeenCalled()
  expect(props.waiterTabReturn).not.toHaveBeenCalled()
  expect(props.setSubmittingPayment).toHaveBeenLastCalledWith(false)
})
it('preserves the existing navigation for a checkout outside this consultation', async () => {
  props.waiterTabReturn = null
  await mount(RunnersHarness, props)
  await renderer.act(async () => result.runLocalPayment({payment: cash, total: 20}))
  expect(props.navigation.navigate).toHaveBeenCalledWith('OrderDetails', {id: 1})
})
it('uses server channels and the existing remote destination priority only for waiter consultation', async () => {
  const receivers = [{id: 4, people: '/people/3', device: {device: 'terminal-1'}, type: 'PDV', configs},
    {id: 5, people: '/people/3', device: {device: 'terminal-2'}, type: 'PDV', configs}]
  const value = {companyConfigs: {}, companyDeviceConfigs: receivers, currentCompany: {id: 3, configs: {'order-payment-devices': ['terminal-2']}},
    device: {type: 'PDV', device: {device: 'web-10'}, configs}, mainCompany: {}, order: {...root, chargeCapability: {enabled: true, remote: true, local: false}},
    route: {params: {id: '1', waiterTabConsultationRootId: 1, interactionMode: 'pdv'}}, storeStatus: {}}
  await mount(ContextHarness, value)
  expect(result.waiterConsultationCheckout).toBe(true)
  expect(result.canUseLocalOperationalPayment).toBe(false)
  expect(result.remotePaymentDevices.map(x => x.deviceId)).toEqual(['terminal-2'])
  await renderer.act(async () => tree.update(React.createElement(ContextHarness, {value: {...value, order: {...root, chargeCapability: {enabled: false}}}})))
  expect(result.remotePaymentDevices).toEqual([])
  await renderer.act(async () => tree.update(React.createElement(ContextHarness, {value: {...value, route: {params: {id: '1', interactionMode: 'pdv'}}}})))
  expect(result.waiterConsultationCheckout).toBe(false)
  expect(result.canUseLocalOperationalPayment).toBe(true)
})
it('fails closed without a read projection and excludes disabled or Manager receivers', () => {
  expect(getWaiterChargeChannels({})).toEqual({enabled: false, local: false, remote: false})
  expect(filterWaiterPaymentReceivers([
    {device: {device: 'a'}, type: 'PDV', configs},
    {device: {device: 'a'}, type: 'MANAGER', configs},
    {device: {device: 'b'}, type: 'PDV', configs: {...configs, 'order-charge-enabled': false}},
    {device: {device: 'c'}, type: 'PDV', configs},
  ]).map(x => x.device.device)).toEqual(['c'])
})
it('offers cash on web, hides native local cards and loads the company registry from its existing cache', async () => {
  api.fetch.mockImplementation(async resource => resource === 'wallet_payment_types' ? {member: [cash, card]} : {})
  const value = {currentCompany: {id: 3, configs: {}}, device: {configs}, waiterConsultationCheckout: true,
    canUseLocalOperationalPayment: true, canUseRemoteOperationalPayment: false, isLocalPaymentDevice: false,
    deviceConfigActions: {ensureCompanyDeviceConfigsLoaded: jest.fn(async () => []), getItems: jest.fn()},
    remotePaymentDevices: [], allPaymentOptions: [], setCompanyDeviceConfigs: jest.fn(), setSelectedRemoteDeviceId: jest.fn(),
    setLoadingPaymentOptions: jest.fn(), setLocalPaymentOptions: jest.fn(), setRemotePaymentOptions: jest.fn(), setPaymentOptionsError: jest.fn(), setSelectedPaymentOption: jest.fn()}
  await mount(OptionsHarness, value)
  expect(value.deviceConfigActions.ensureCompanyDeviceConfigsLoaded).toHaveBeenCalledWith({people: '/people/3'})
  expect(value.deviceConfigActions.getItems).not.toHaveBeenCalled()
  expect(value.setLocalPaymentOptions).toHaveBeenLastCalledWith([expect.objectContaining({channel: 'local', payment: cash})])
  expect(value.setRemotePaymentOptions).toHaveBeenLastCalledWith([])
})


it('keeps the configured cash wallet when its display name differs from Dinheiro', async () => {
  const configuredCash = {...cash, paymentCode: '', wallet: {'@id': '/wallets/1', wallet: 'Caixa'}}
  const unconfiguredCash = {...cash, id: 13, wallet: {'@id': '/wallets/3', wallet: 'Dinheiro'}}
  api.fetch.mockImplementation(async resource => resource === 'wallet_payment_types' ? {member: [configuredCash, card, unconfiguredCash]} : {})
  const value = {currentCompany: {id: 3, configs: {'pos-cash-wallet': 1, 'pos-infinite-pay-wallet': 2}}, device: {configs},
    canUseLocalOperationalPayment: true, canUseRemoteOperationalPayment: true,
    selectedRemoteDevice: {deviceId: 'terminal-1', config: {configs}},
    deviceConfigActions: {getItems: jest.fn(async () => [])},
    remotePaymentDevices: [], allPaymentOptions: [], setCompanyDeviceConfigs: jest.fn(), setSelectedRemoteDeviceId: jest.fn(),
    setLoadingPaymentOptions: jest.fn(), setLocalPaymentOptions: jest.fn(), setRemotePaymentOptions: jest.fn(), setPaymentOptionsError: jest.fn(), setSelectedPaymentOption: jest.fn()}
  await mount(OptionsHarness, value)
  expect(value.setLocalPaymentOptions).toHaveBeenLastCalledWith([
    expect.objectContaining({channel: 'local', payment: configuredCash}),
    expect.objectContaining({channel: 'local', payment: card}),
  ])
  expect(value.setRemotePaymentOptions).toHaveBeenLastCalledWith([expect.objectContaining({channel: 'remote', payment: card})])
})

const {readWaiterTabCheckoutBalance, default: useWaiterBalance} = require('../../../../react/pages/checkout/useWaiterTabCheckoutBalance')
function BalanceHarness({value}) {result = useWaiterBalance(value); return null}
it('reads all financial pages to collect only the remaining tab balance, including after reopening', async () => {
 const invoiceActions = {fetchPage: jest.fn(async ({page}) => ({member: page === 1 ? [{id: 1, price: 20, status: {realStatus: 'closed'}}] : [{id: 2, price: 10, status: {realStatus: 'closed'}}], totalItems: 2}))}
 const value = await readWaiterTabCheckoutBalance({rootOrderId: '1', companyId: 3, ordersActions: props.ordersActions, invoiceActions})
 expect(value.pendingAmount).toBe(50)
 expect(invoiceActions.fetchPage).toHaveBeenCalledTimes(2)
 expect(props.ordersActions.get).toHaveBeenCalledWith({id: '1', __storeMeta: {preserveItem: true}})
})
it('checks a concurrent payment before dispatch and rejects charging more than the updated balance', async () => {
 let paid = 0
 const invoiceActions = {setError: jest.fn(), fetchPage: jest.fn(async () => ({member: paid ? [{id: 1, price: paid, status: {realStatus: 'closed'}}] : [], totalItems: paid ? 1 : 0}))}
 await mount(BalanceHarness, {enabled: true, rootOrderId: '1', companyId: 3, ordersActions: props.ordersActions, invoiceActions})
 expect(result.pendingAmount).toBe(80)
 paid = 30
 await renderer.act(async () => {await expect(result.verifyChargeChannel('local', 80)).rejects.toThrow('saldo da comanda mudou')})
 expect(result.pendingAmount).toBe(50)
 await renderer.act(async () => expect(result.verifyChargeChannel('local', 20)).resolves.toBe(true))
})
it('fails closed for a balance read from another company or without permission', async () => {
 const invoiceActions = {fetchPage: jest.fn(async () => ({member: [], totalItems: 0}))}
 await expect(readWaiterTabCheckoutBalance({rootOrderId: '1', companyId: 9, ordersActions: props.ordersActions, invoiceActions})).rejects.toThrow('saldo desta comanda')
})

const useLifecycle = require('../../../../react/pages/checkout/useCheckoutOrderLifecycle').default
function LifecycleHarness({value}) {result = useLifecycle(value); return null}
it('hydrates the existing checkout with the financial pending balance and does not create another cart', async () => {
 api.fetch.mockResolvedValue({member: [], totalItems: 0})
 const value = {...props, waiterConsultationCheckout: true, waiterPendingAmount: 50, payable: -777,
   ensureActiveOrder: jest.fn(), clearStoredDraftOrderId: jest.fn(), setMaterializedCheckoutOrder: jest.fn(),
   orderInvoicesActions: {setItems: jest.fn()}, orderProductsActions: {setItems: jest.fn()},
   ordersGetters: {resourceEndpoint: 'orders'}, storedOrderInvoices: [], invoices: [],
   printActions: {setReload: jest.fn()}}
 await mount(LifecycleHarness, value)
 expect(result.remainingAmount).toBe(50)
 expect(result.effectiveRemainingAmount).toBe(50)
 expect(result.resolveNextPayableAfterPayment(20)).toBe(-30)
 await renderer.act(async () => result.resolveCheckoutOrderForPayment(root))
 expect(value.ensureActiveOrder).not.toHaveBeenCalled()
 expect(value.ordersActions.get).toHaveBeenCalledWith('1')
 await renderer.act(async () => tree.update(React.createElement(LifecycleHarness, {value: {...value, waiterConsultationCheckout: false}})))
 expect(result.remainingAmount).toBe(777)
})
