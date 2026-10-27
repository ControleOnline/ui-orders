jest.mock('react-native',()=>({Platform:{OS:'web'}}));
jest.mock('@appType',()=>({app_type:'POS'}));
import {buildHistoryRequestParams} from '@controleonline/ui-orders/src/react/pages/orders/orderHistoryHelpers';
it('excludes paid only for the explicit Single Item operational history',()=>{
 const base={appType:'POS',singleItemMode:true,canViewCompanyOrders:false,currentCompanyId:3,currentDeviceId:403,filters:{search:'old'},orderTypeFilter:'sale',showAdvancedFilters:false};
 expect(buildHistoryRequestParams(base)).toMatchObject({pendingPaymentOnly:'1','status.realStatus':'open','device.device':403,provider:'/people/3'});
 expect(buildHistoryRequestParams({...base,appType:'MANAGER'})).not.toHaveProperty('pendingPaymentOnly');
 expect(buildHistoryRequestParams({...base,singleItemMode:false})).not.toHaveProperty('pendingPaymentOnly');
});
