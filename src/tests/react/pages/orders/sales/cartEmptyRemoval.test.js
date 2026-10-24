const React = require('react')
const renderer = require('react-test-renderer')
global.IS_REACT_ACT_ENVIRONMENT = true
const mockNode = name => props => React.createElement(name, props, props.children)
const mockStores = {}
const mockListeners = new Set()
const mockNotify = () => mockListeners.forEach(callback => callback())
let mockResult
jest.mock('@store', () => ({useStore: name => require('react').useSyncExternalStore(callback => {mockListeners.add(callback); return () => mockListeners.delete(callback)}, () => mockStores[name])}))
jest.mock('react-native', () => ({Text:mockNode('Text'), View:mockNode('View'), Image:mockNode('Image'), TouchableOpacity:mockNode('Button'), TextInput:mockNode('Input'), StyleSheet:{create:value=>value},ScrollView:mockNode('ScrollView'),ActivityIndicator:mockNode('ActivityIndicator'),useWindowDimensions:()=>({width:390,height:844})}))
jest.mock('@react-navigation/native', () => ({useFocusEffect: callback => require('react').useEffect(callback,[callback]),useNavigation:()=>mockNavigation,useRoute:()=>({params:{}})}))
jest.mock('@controleonline/ui-common/src/api', () => ({api:{fetch:jest.fn()}}))
jest.mock('@controleonline/ui-orders/src/react/hooks/usePosOrderMaterialization', () => () => ({}))
jest.mock('../../../../../react/pages/orders/sales/useOrderMarketplaceSummary', () => () => ({fallbackOrderProducts:[],hasMarketplaceIntegration:false}))
jest.mock('@controleonline/ui-orders/src/react/css/orders', () => () => ({styles:{itemsSection:{}}}))
jest.mock('../../../../../react/pages/orders/sales/useOrderDetailsVisuals', () => () => ({ppcColors:{},styles:{}}))
jest.mock('react-native-vector-icons/MaterialIcons', () => mockNode('Icon'))
jest.mock('@expo/vector-icons', () => ({MaterialCommunityIcons:mockNode('Icon')}))
jest.mock('@controleonline/../../src/styles/branding', () => ({withOpacity:()=>''}))
jest.mock('@controleonline/ui-common/src/react/utils/fileUrl', () => ({resolveFileImageUrl:()=>''}))
jest.mock('../../../../../react/components/adjustment/OrderProductAdjustmentButton', () => () => null)
const mockNavigation={setOptions:jest.fn(),navigate:jest.fn()}
jest.mock('@appType',()=>({app_type:'POS'}))
jest.mock('react-native-safe-area-context',()=>({SafeAreaView:mockNode('SafeAreaView')}))
jest.mock('react-native-vector-icons/Feather',()=>mockNode('Icon'))
jest.mock('@controleonline/ui-common/src/react/components/MessageService',()=>({useMessage:()=>({showError:jest.fn()})}))
jest.mock('@controleonline/ui-common/src/react/components/StateStore',()=>()=>null)
jest.mock('@controleonline/ui-orders/src/react/components/OrderHeader',()=>()=>null)
jest.mock('@controleonline/ui-orders/src/react/components/OrderIdentityLabel',()=>()=>null)
jest.mock('../../../../../react/pages/orders/sales/components/OrderMarketplaceOverlayHost',()=>()=>null)
jest.mock('../../../../../react/pages/orders/sales/components/OrderSummaryModal',()=>()=>null)
jest.mock('../../../../../react/pages/orders/sales/components/OrderFinancialDetailsModal',()=>()=>null)
jest.mock('../../../../../react/pages/orders/sales/components/OrderAttachmentManager',()=>()=>null)
jest.mock('../../../../../react/pages/orders/sales/OrderInvoices',()=>()=>null)
jest.mock('../../../../../react/pages/checkout/BarcodeInput',()=>()=>null)
jest.mock('../../../../../react/pages/orders/sales/orderDetails/OrderDetailsAssignmentModals',()=>()=>null)
jest.mock('../../../../../react/pages/orders/sales/orderDetails/useOrderDetailsParty',()=>()=>({orderHeaderActionProps:{}}))
jest.mock('../../../../../react/pages/orders/sales/orderDetails/useOrderDetailsBootstrap',()=>()=>{
 const {getters,actions}=require('@store').useStore('orders')
 return {appType:'POS',routeOrderId:'70',routeOrderIri:'/orders/70',item:getters.item,orderParam:getters.item,ordersActions:actions,ordersGetters:getters,orderInvoicesActions:mockInvoiceActions,storedOrderInvoiceItems:[],localOrderTypeKey:'cart',localRealStatusKey:'open',useUnifiedKdsLayout:true,isWaiterMode:true,shouldShowMobilePaymentBar:true,currentCompany:{id:3},mainCompany:{id:3},ppcColors:{},globalStyles:{},localStyles:{},viewportWidth:390,insets:{},showError:jest.fn(),showSuccess:jest.fn()}
})
const useSync = require('../../../../../react/pages/orders/sales/orderDetails/useOrderDetailsOrderSync').default
const useDisplay = require('../../../../../react/pages/orders/sales/orderDetails/useOrderDetailsProductDisplay').default
const Tab = require('../../../../../react/pages/orders/sales/OrderItemsTab').default
const initial = {id:70,price:73,orderType:'cart',orderProducts:[{id:10,quantity:1,value:73,product:{id:20,type:'custom',product:'Combo'},hierarchyComplete:true,orderProduct:null,parentProduct:null,productGroup:null}]}
const mockInvoiceActions = {setItems:jest.fn(),setError:jest.fn(),getItems:jest.fn().mockResolvedValue([])}
function Harness() {
 const {getters,actions} = require('@store').useStore('orders')
 const sync = useSync({item:getters.item,orderParam:getters.item,routeOrderId:'70',routeOrderIri:'/orders/70',route:{params:{}},ordersActions:actions,orderInvoicesActions:mockInvoiceActions,storedOrderInvoiceItems:[],localOrderTypeKey:'cart'})
 const display = useDisplay({item:getters.item,orderParam:getters.item,filteredStoredOrderProducts:sync.filteredStoredOrderProducts,marketplaceSummary:sync.marketplaceSummary})
 mockResult=sync
 return React.createElement(Tab,{order:display.resolvedDisplayOrder,orderProducts:display.resolvedDisplayOrderProductsWithProductDetails,routeOrderId:'70',canAddProductsToOrder:true,onAddProduct:()=>{},showProductSearch:false})
}
let tree
beforeEach(()=>{
 jest.useFakeTimers()
 mockStores.people={getters:{currentCompany:{id:3}}};mockStores.device={getters:{item:{id:403}}};mockStores.theme={getters:{colors:{}}};
 mockStores.orders={getters:{item:initial},actions:{syncOrder:jest.fn(order=>{mockStores.orders={...mockStores.orders,getters:{item:order}};mockNotify()})}}
 mockStores.order_products={getters:{items:initial.orderProducts},actions:{setItems:jest.fn(items=>{mockStores.order_products={...mockStores.order_products,getters:{items}};mockNotify()}),remove:jest.fn().mockResolvedValue(),save:jest.fn(),getItems:jest.fn().mockResolvedValue([])}}
})
afterEach(async()=>{if(tree)await renderer.act(async()=>tree.unmount());tree=null;jest.useRealTimers()})
it('keeps the cart mounted after removing its last customized root',async()=>{
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Harness))})
 await renderer.act(async()=>mockResult.scheduleQuantityChange(initial.orderProducts[0],0))
 expect(mockStores.orders.getters.item.orderProducts).toEqual([])
 expect(tree.toJSON()).not.toBeNull()
 await renderer.act(async()=>jest.advanceTimersByTime(1000))
 expect(mockStores.order_products.actions.remove).toHaveBeenCalledWith('10')
})

it('renders the full waiter cart when the last root is removed',async()=>{
 const Screen=require('../../../../../react/pages/orders/sales/orderDetails').default
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Screen,{navigation:mockNavigation,route:{params:{id:'70'}}}))})
 await renderer.act(async()=>{
   mockStores.order_products.actions.setItems([])
   mockStores.orders.actions.syncOrder({...initial,price:0,orderProducts:[]})
 })
 expect(tree.toJSON()).not.toBeNull()
})

it('shows removal confirmation safely while the previous quantity is saving',async()=>{
 const Actions=require('../../../../../react/pages/orders/sales/orderDetails/OrderDetailsProductActions').default
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Actions,{
   orderProduct:initial.orderProducts[0],canMutateOrderProducts:true,confirmRemoveItemId:'10',
   isOrderProductCommitting:()=>true,localStyles:{},ppcColors:{},
 }))})
 expect(JSON.stringify(tree.toJSON())).toContain('Remover?')
 expect(tree.root.findAllByType('Button').filter(button=>button.props.disabled)).toHaveLength(3)
})
it('cancels the removal confirmation without deleting the item',async()=>{
 const Screen=require('../../../../../react/pages/orders/sales/orderDetails').default
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Screen,{navigation:mockNavigation,route:{params:{id:'70'}}}))})
 const getActions=()=>tree.root.findByType(require('../../../../../react/pages/orders/sales/orderDetails/OrderDetailsProductActions').default)
 await renderer.act(async()=>getActions().props.handleDecreaseOpQuantity(initial.orderProducts[0]))
 expect(JSON.stringify(tree.toJSON())).toContain('Remover?')
 const cancel=tree.root.findAllByType('Button').find(button=>button.findAllByType('Icon').some(icon=>icon.props.name==='close'))
 await renderer.act(async()=>cancel.props.onPress())
 expect(JSON.stringify(tree.toJSON())).not.toContain('Remover?')
 expect(mockStores.orders.getters.item.orderProducts).toEqual(initial.orderProducts)
 expect(mockStores.order_products.actions.remove).not.toHaveBeenCalled()
})
it('handles 2 → 1 → removal confirmation during save → empty cart on the full waiter screen',async()=>{
 const Screen=require('../../../../../react/pages/orders/sales/orderDetails').default
 const Actions=require('../../../../../react/pages/orders/sales/orderDetails/OrderDetailsProductActions').default
 const BottomCart=require('../../../../../react/components/cart/BottomCart').default
 const actions=mockStores.order_products.actions
 let finishSave
 actions.save.mockImplementation(()=>new Promise(resolve=>{finishSave=resolve}))
 mockStores.orders.getters.item={...initial,price:146,orderProducts:[{...initial.orderProducts[0],quantity:2,total:146}]}
 mockStores.order_products.getters.items=mockStores.orders.getters.item.orderProducts
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Screen,{navigation:mockNavigation,route:{params:{id:'70'}}}))})
 const lineActions=()=>tree.root.findByType(Actions).props
 await renderer.act(async()=>lineActions().handleDecreaseOpQuantity(lineActions().orderProduct))
 await renderer.act(async()=>jest.advanceTimersByTime(1000))
 await renderer.act(async()=>lineActions().handleDecreaseOpQuantity(lineActions().orderProduct))
 expect(JSON.stringify(tree.toJSON())).toContain('Remover?')
 const confirmation=()=>tree.root.findAllByType('Button').find(button=>button.findAllByType('Icon').some(icon=>icon.props.name==='check') || button.findAllByType('Text').some(text=>text.props.children==='...'))
 expect(confirmation().props.disabled).toBe(true)
 await renderer.act(async()=>finishSave({...initial.orderProducts[0],quantity:1,total:73}))
 expect(confirmation().props.disabled).toBe(false)
 await renderer.act(async()=>confirmation().props.onPress())
 await renderer.act(async()=>jest.advanceTimersByTime(1000))
 expect(actions.remove).toHaveBeenCalledTimes(1)
 expect(actions.remove).toHaveBeenCalledWith('10')
 expect(mockStores.orders.getters.item.orderProducts).toEqual([])
 expect(tree.toJSON()).not.toBeNull()
 expect(tree.root.findByType(BottomCart).props.waiterOrderAmount).toBe(0)
 expect(tree.root.findByType(BottomCart).props.actionDisabled).toBe(true)
})
