import {readSingleItemCheckoutBalance} from '@controleonline/ui-orders/src/react/pages/checkout/useSingleItemCheckoutBalance';
jest.mock('@react-navigation/native',()=>({useFocusEffect:jest.fn()}));
const order={id:10,provider:{id:3},price:5};
const row=(id,amount,status='closed',orderId=10)=>({id,order:`/orders/${orderId}`,realPrice:amount,invoice:{id,price:100,status:{realStatus:status}}});
function args(rows){return {orderId:10,companyId:3,ordersActions:{get:jest.fn().mockResolvedValue(order)},orderInvoicesActions:{getItems:jest.fn().mockResolvedValue(rows)}};}
it('restores the allocated partial payment, excluding unrelated, unpaid and canceled receipts',async()=>{
 const a=args([row(1,2),row(2,4,'canceled'),row(3,8,'open'),row(4,50,'closed',99)]);
 expect(await readSingleItemCheckoutBalance(a)).toMatchObject({paidAmount:2,pendingAmount:3});
 expect(a.orderInvoicesActions.getItems).toHaveBeenCalledWith(expect.objectContaining({order:'/orders/10'}));
});
it('does not charge again after a fully paid order',async()=>{
 expect(await readSingleItemCheckoutBalance(args([row(1,5)]))).toMatchObject({pendingAmount:0});
});
it('refuses a foreign company and failed financial reads',async()=>{
 const a=args([]);a.companyId=8;
 await expect(readSingleItemCheckoutBalance(a)).rejects.toThrow('empresa');
 const b=args([]);b.orderInvoicesActions.getItems.mockRejectedValue(new Error('Failed to fetch'));
 await expect(readSingleItemCheckoutBalance(b)).rejects.toThrow('Failed to fetch');
});
it('reads every receipt page before calculating the balance',async()=>{
 const a=args([]);a.orderInvoicesActions.getItems.mockResolvedValueOnce(Array.from({length:50},(_,i)=>row(i+1,0.01))).mockResolvedValueOnce([row(51,0.5)]);
 expect(await readSingleItemCheckoutBalance(a)).toMatchObject({paidAmount:1,pendingAmount:4});
 expect(a.orderInvoicesActions.getItems).toHaveBeenCalledTimes(2);
});

import React from 'react';
import renderer,{act} from 'react-test-renderer';
import {useFocusEffect} from '@react-navigation/native';
import useBalance from '@controleonline/ui-orders/src/react/pages/checkout/useSingleItemCheckoutBalance';
it('waits for persisted receipts and rejects an amount exceeding a newly changed balance',async()=>{
 global.IS_REACT_ACT_ENVIRONMENT=true;
 useFocusEffect.mockImplementation(callback=>React.useEffect(callback,[callback]));
 const a=args([row(1,2)]);a.ordersActions.setPayable=jest.fn();a.orderInvoicesActions.setItems=jest.fn();
 let latest,tree;
 function Probe(){latest=useBalance({...a,enabled:true});return null;}
 await act(async()=>{tree=renderer.create(<Probe/>);});
 expect(latest).toMatchObject({ready:true,pendingAmount:3});
 expect(a.ordersActions.setPayable).toHaveBeenLastCalledWith(-3);
 a.orderInvoicesActions.getItems.mockResolvedValue([row(1,2),row(2,1)]);
 await act(async()=>{await expect(latest.verifyChargeChannel('local',3)).rejects.toThrow('saldo da venda mudou');});
 expect(latest.pendingAmount).toBe(2);
 await act(async()=>{await expect(latest.verifyChargeChannel('local',2)).resolves.toBe(true);});
 await act(async()=>tree.unmount());
});
it('leaves payment unavailable on failed reads and supports retry',async()=>{
 global.IS_REACT_ACT_ENVIRONMENT=true;
 useFocusEffect.mockImplementation(callback=>React.useEffect(callback,[callback]));
 const a=args([]);a.ordersActions.setPayable=jest.fn();a.orderInvoicesActions.setItems=jest.fn();
 a.orderInvoicesActions.getItems.mockRejectedValueOnce(new Error('Failed to fetch'));
 let latest,tree;
 function Probe(){latest=useBalance({...a,enabled:true});return null;}
 await act(async()=>{tree=renderer.create(<Probe/>);});
 expect(latest.ready).toBe(false);expect(latest.error).toContain('conexão');
 await act(async()=>latest.retry());
 expect(latest).toMatchObject({ready:true,pendingAmount:5});
 await act(async()=>tree.unmount());
});
it('refuses incomplete financial status rather than assuming nothing was received',async()=>{
 const a=args([{id:1,order:'/orders/10',realPrice:2,invoice:{id:1}}]);
 await expect(readSingleItemCheckoutBalance(a)).rejects.toThrow('recebimentos');
});
