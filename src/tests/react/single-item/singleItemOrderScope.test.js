const React = require('react');
const renderer = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const mockFetch = jest.fn();
const mockStores = {};
jest.mock('react-native',()=>({Dimensions:{get:()=>({width:390,height:844})},PixelRatio:{get:()=>1},Platform:{OS:'web'}}));
jest.mock('@controleonline/ui-common/src/api',()=>({api:{fetch:(...args)=>mockFetch(...args)}}));
jest.mock('@store',()=>({useStore:name=>mockStores[name]}));
jest.mock('@controleonline/ui-common/src/react/components/MessageService',()=>({useMessage:()=>({showPrompt:jest.fn()})}));
jest.mock('@controleonline/ui-orders/src/react/hooks/posCartSession/linkedOrderInput',()=>({requestPosLinkedOrderCode:jest.fn()}));
jest.mock('@controleonline/ui-orders/src/react/hooks/posCartSession/usePosDraftOrderStorage',()=>()=>({
 clearStoredDraftOrderId:jest.fn(),rememberDraftOrderId:jest.fn(),readStoredDraftOrderId:()=>null,
}));
const useSession=require('@controleonline/ui-orders/src/react/hooks/usePosCartSession').default;
const {setActivePosOrderContext,clearActivePosOrderContexts}=require('@controleonline/ui-orders/src/react/hooks/posCartSession/activePosOrderContext');
let tree,session;
const order={id:70,app:'POS',orderType:'sale',mainOrderId:51,status:{status:'open',realStatus:'open'},total:224,orderProducts:[{id:10,total:224}]};
beforeEach(()=>{
 mockFetch.mockReset();
 mockStores.orders={getters:{item:order},actions:{syncOrder:jest.fn(value=>{mockStores.orders.getters.item=value;}),setItem:jest.fn(),syncOrderProducts:jest.fn()}};
 mockStores.order_products={getters:{items:order.orderProducts},actions:{setItems:jest.fn()}};
 mockStores.cart={getters:{},actions:{}};
 mockStores.device_config={getters:{item:{configs:{'check-order-type':'tab','pos-operation-mode':'waiter'}}},actions:{}};
});
afterEach(async()=>{if(tree)await renderer.act(async()=>tree.unmount());tree=null;clearActivePosOrderContexts();});
const Probe=()=>{session=useSession({companyId:3,deviceId:403});return null;};
it('refuses to normalize or save an order belonging to another company',async()=>{
 mockStores.orders.actions.save=jest.fn();
 mockFetch.mockImplementation(resource=>Promise.resolve(resource==='orders/70'?{...order,provider:{id:2}}:{member:order.orderProducts}));
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe));});
 await renderer.act(async()=>expect(session.refreshActiveOrder(70)).rejects.toThrow('outra empresa'));
 expect(mockStores.orders.actions.save).not.toHaveBeenCalled();
});
