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
const useSession=require('../../../../react/hooks/usePosCartSession').default;
const {setActivePosOrderContext,clearActivePosOrderContexts}=require('../../../../react/hooks/posCartSession/activePosOrderContext');
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
it('returns using the acknowledged order once, then uses normal server refreshes',async()=>{
 setActivePosOrderContext({companyId:3,deviceId:403,order,confirmed:true});
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe));});
 await renderer.act(async()=>expect(await session.refreshActiveOrder(70)).toMatchObject({id:70,total:224}));
 expect(mockFetch).not.toHaveBeenCalled();
 expect(session.activeOrder.total).toBe(224);
 mockFetch.mockImplementation(resource=>Promise.resolve(resource==='orders/70'?order:{member:order.orderProducts}));
 await renderer.act(async()=>session.refreshActiveOrder(70));
 expect(mockFetch).toHaveBeenCalledTimes(2);
});
it('retains the confirmed total and items after a later refresh fails',async()=>{
 setActivePosOrderContext({companyId:3,deviceId:403,order,confirmed:true});
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe));await Promise.resolve();});
 await renderer.act(async()=>session.refreshActiveOrder(70));
 mockFetch.mockRejectedValue(new Error('database disconnected'));
 await renderer.act(async()=>expect(session.refreshActiveOrder(70)).rejects.toThrow('database disconnected'));
 expect(session.activeOrder.total).toBe(224);
 expect(mockStores.orders.actions.setItem).not.toHaveBeenCalledWith({});
});

it('reuses the home creation acknowledgment when the catalog opens, then resumes normal reads', async () => {
 const {resolveWaiterTabDestination}=require('../../../../react/pages/home/waiterTabHomeActions');
 const fresh={...order,orderType:'cart',price:0,total:0,orderProducts:[]};
 mockStores.cart.actions.getItems=jest.fn().mockResolvedValue([{id:51,orderType:'tab',externalCode:'1'}]);
 mockStores.orders.actions.save=jest.fn().mockResolvedValueOnce({...fresh, mainOrderId:null}).mockResolvedValueOnce(fresh);
 mockFetch.mockResolvedValue({member:[{'@id':'/statuses/901',status:'open',realStatus:'open'}]});
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe));});
 let destination;
 await renderer.act(async()=>{destination=await resolveWaiterTabDestination({action:'launch',externalCode:'1',companyId:3,deviceId:403,
  configs:{'pos-operation-mode':'waiter','check-order-type':'tab','check-order-management-mode':'manage'},
  cartActions:mockStores.cart.actions,ensureActiveOrder:session.ensureActiveOrder});});
 expect(destination.params).toMatchObject({id:'70',resumeExistingOrder:true});
 mockFetch.mockClear();
 await renderer.act(async()=>expect(await session.refreshActiveOrder(70)).toMatchObject({id:70,price:0,orderProducts:[]}));
 expect(mockFetch).not.toHaveBeenCalled();
 expect(mockStores.orders.actions.save).toHaveBeenCalledTimes(2);
 expect(mockStores.orders.actions.save.mock.calls[1][0]).toMatchObject({id:70, mainOrderId:51});
 mockFetch.mockImplementation(resource=>Promise.resolve(resource==='orders/70'?fresh:{member:[]}));
 await renderer.act(async()=>session.refreshActiveOrder(70));
 expect(mockFetch).toHaveBeenCalledTimes(2);
});
