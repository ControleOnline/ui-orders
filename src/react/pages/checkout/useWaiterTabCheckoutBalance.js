import {useCallback, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {normalizeEntityId} from '../../utils/linkedOrderContext';
import {readAllPages} from '../../../store/orders/tabConsultationReads';
import {summarizeInvoices} from './linkedOrderSettlementHelpers';
import {getWaiterChargeChannels} from './tabConsultationCharge';

export async function readWaiterTabCheckoutBalance({rootOrderId, companyId, ordersActions, invoiceActions}) {
  const [order, invoices] = await Promise.all([
    ordersActions.get({id: rootOrderId, __storeMeta: {preserveItem: true}}),
    readAllPages((_resource, {params}) => invoiceActions.fetchPage(params), 'invoices', {'order.order': `/orders/${rootOrderId}`}),
  ]);
  if (normalizeEntityId(order) !== normalizeEntityId(rootOrderId) || order?.orderType !== 'tab' ||
    normalizeEntityId(order?.provider) !== normalizeEntityId(companyId)) {
    throw new Error('Não foi possível confirmar o saldo desta comanda.');
  }
  return {order, pendingAmount: Math.max(Number(order.price || 0) - summarizeInvoices(invoices).paidAmount, 0)};
}

export default function useWaiterTabCheckoutBalance({enabled, rootOrderId, companyId, ordersActions, invoiceActions}) {
  const [balance, setBalance] = useState(null);
  const active = useRef(null);
  const args = {rootOrderId, companyId, ordersActions, invoiceActions};
  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    const request = {};
    active.current = request;
    setBalance(null);
    readWaiterTabCheckoutBalance({rootOrderId, companyId, ordersActions, invoiceActions})
      .then(result => {if (active.current === request) setBalance(result);})
      .catch(error => {if (active.current === request) invoiceActions.setError(error.message);});
    return () => {active.current = null;};
  }, [enabled, rootOrderId, companyId, ordersActions, invoiceActions]));

  async function verifyChargeChannel(channel, amount) {
    const request = active.current;
    const latest = await readWaiterTabCheckoutBalance(args);
    if (!request || active.current !== request) throw new Error('Volte à consulta para confirmar a cobrança.');
    setBalance(latest);
    if (!getWaiterChargeChannels(latest.order)[channel]) {
      throw new Error('Este device não está autorizado para esta cobrança. Atualize a consulta.');
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount - latest.pendingAmount > 0.009) {
      throw new Error('O saldo da comanda mudou. Atualize a consulta antes de cobrar.');
    }
    return true;
  }
  return {pendingAmount: balance?.pendingAmount ?? null, ready: !enabled || !!balance,
    verifyChargeChannel: enabled ? verifyChargeChannel : null};
}
