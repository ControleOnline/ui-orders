import {
  canManagePosCheckOrders,
  isPosChargeEntryEnabled,
  resolvePosCheckOrderType,
  resolvePosOperationMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {findOpenSettlementOrder} from '../../hooks/posCartSession/linkedOrders';
import {getLinkedOrderContext, normalizeEntityId} from '../../utils/linkedOrderContext';
import {setActivePosOrderContext} from '../../hooks/posCartSession/activePosOrderContext';
import {isOpenPosCartOrder} from '../../hooks/posCartSession/status';
import {buildAddProductsRouteParams, buildManagerPdvRouteParams} from '../../utils/orderRoute';

export const isWaiterTabHome = (appType, configs) =>
  String(appType || '').toUpperCase() === 'POS' &&
  resolvePosOperationMode(configs) === 'waiter' &&
  resolvePosCheckOrderType(configs) === 'tab';

export const normalizeTabIdentifier = value => String(value ?? '').trim();

// Keep lookup and cart materialization in the existing POS services. Consultation
// and payment entry must never create a tab or a cart.
export async function resolveWaiterTabDestination({
  action, externalCode, companyId, deviceId, configs, cartActions, ensureActiveOrder, signal,
}) {
  const code = normalizeTabIdentifier(externalCode);
  if (!code) throw new Error('Digite a identificação da comanda.');
  if (!companyId) throw new Error('Selecione a empresa para continuar.');
  if (!['launch', 'consult', 'charge'].includes(action)) throw new Error('Ação inválida.');
  if (action === 'charge' && !isPosChargeEntryEnabled(configs)) {
    throw new Error('Este device não está autorizado a cobrar.');
  }
  const settlementOrder = await findOpenSettlementOrder({
    cartActions, companyId, externalCode: code, linkedOrderType: 'tab',
  });
  if (signal?.aborted) return null;
  if (!settlementOrder && (action !== 'launch' || !canManagePosCheckOrders(configs))) {
    throw new Error(`A comanda ${code} ainda não está aberta. Peça ao caixa para abri-la.`);
  }
  if (action === 'launch') {
    const order = await ensureActiveOrder(null, {
      forceNew: true, signal,
      linkedOrderInput: {externalCode: code, inputType: 'manual', settlementOrder},
    });
    if (signal?.aborted) return null;
    const orderId = normalizeEntityId(order);
    if (!orderId) throw new Error('Não foi possível preparar o lançamento.');
    // Reuse only a complete acknowledgment of this newly created empty cart.
    if (deviceId && isWaiterTabHome('POS', configs) &&
        isOpenPosCartOrder(order, {usesLinkedCheckOrders: true}) &&
        getLinkedOrderContext(order).mainOrderId &&
        (!settlementOrder || getLinkedOrderContext(order).mainOrderId === normalizeEntityId(settlementOrder)) &&
        Array.isArray(order.orderProducts) && order.orderProducts.length === 0 &&
        Number(order.price) === 0 && order.price !== null && order.price !== undefined) {
      setActivePosOrderContext({companyId, deviceId, order, confirmed: true});
    }
    return {
      screen: 'PdvPage',
      params: buildAddProductsRouteParams(orderId, buildManagerPdvRouteParams({
        catalogResetKey: `launch:${orderId}`,
      })),
    };
  }
  const rootOrderId = normalizeEntityId(settlementOrder);
  if (!rootOrderId) throw new Error('Não foi possível identificar a comanda.');
  // Both actions show the existing summary first. Checkout and closing remain
  // explicit actions in LinkedOrderSettlementPage, with their current guards.
  return {
    screen: 'LinkedOrderSettlementPage',
    params: buildManagerPdvRouteParams({rootOrderId, orderType: 'tab', showBottomCart: false}),
  };
}
