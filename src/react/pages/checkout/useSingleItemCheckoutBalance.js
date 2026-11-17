import {useCallback, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {readAllPages} from '../../../store/orders/tabConsultationReads';
import {normalizeCheckoutEntityId, resolvePaidAmountForOrder} from '../../utils/checkoutInvoices';

// Use the allocation to this order, never the full price of a shared invoice.
export async function readSingleItemCheckoutBalance({orderId, companyId, ordersActions, orderInvoicesActions}) {
  const order = await ordersActions.get({id:orderId,__storeMeta:{preserveItem:true}});
  if (normalizeCheckoutEntityId(order) !== String(orderId) ||
      normalizeCheckoutEntityId(order?.provider) !== String(companyId)) {
    throw new Error('Não foi possível confirmar a empresa e o saldo desta venda.');
  }
  const rows = await readAllPages((_resource,{params}) => orderInvoicesActions.getItems(params),
    'order_invoices',{order:`/orders/${orderId}`});
  const paidRows = rows.filter(row => String(row?.invoice?.status?.realStatus || '').trim().toLowerCase() === 'closed');
  if (rows.some(row => row.invoice && (typeof row.invoice !== 'object' ||
      !row.invoice?.status?.realStatus || !Number.isFinite(Number(row.realPrice ?? row.real_price))))) {
    throw new Error('Não foi possível confirmar os recebimentos desta venda.');
  }
  const paidAmount = resolvePaidAmountForOrder({order,orderInvoices:paidRows});
  const pendingAmount = Math.max(Math.round((Number(order.price || 0)-paidAmount)*100)/100,0);
  return {order,rows,paidAmount,pendingAmount};
}

export default function useSingleItemCheckoutBalance({enabled,orderId,companyId,ordersActions,orderInvoicesActions}) {
  const [balance,setBalance] = useState(null);
  const [revision,setRevision] = useState(0);
  const owner = useRef(null);
  const key = `${companyId}:${orderId}`;
  const args = {orderId,companyId,ordersActions,orderInvoicesActions};
  useFocusEffect(useCallback(() => {
    if (!enabled || !orderId || !companyId) return;
    const request = {};
    owner.current=request;
    setBalance(null);
    readSingleItemCheckoutBalance({orderId,companyId,ordersActions,orderInvoicesActions})
      .then(result=>{if(owner.current===request){orderInvoicesActions.setItems(result.rows);ordersActions.setPayable(-result.pendingAmount);setBalance({...result,key});}})
      .catch(error=>{if(owner.current===request)setBalance({key,error:/failed to fetch|network/i.test(error.message || '') ? 'Não foi possível consultar o saldo. Confira a conexão e tente novamente.' : error.message});});
    return ()=>{owner.current=null;};
  },[enabled,orderId,companyId,ordersActions,orderInvoicesActions,key,revision]));
  async function verifyChargeChannel(_channel,amount) {
    const request=owner.current;
    const latest=await readSingleItemCheckoutBalance(args);
    if(!request || owner.current!==request)throw new Error('A empresa ou a venda mudou. Reabra o pagamento.');
    orderInvoicesActions.setItems(latest.rows);
    ordersActions.setPayable(-latest.pendingAmount);
    setBalance({...latest,key});
    if(!Number.isFinite(amount) || amount<=0 || amount-latest.pendingAmount>0.009)
      throw new Error('O saldo da venda mudou. Confira o valor restante antes de cobrar.');
    return true;
  }
  const current=balance?.key===key?balance:null;
  return {pendingAmount:current?.pendingAmount??null,ready:!enabled||!!current&&!current.error,
    error:enabled?current?.error:null,retry:()=>setRevision(value=>value+1),
    verifyChargeChannel:enabled?verifyChargeChannel:null};
}
