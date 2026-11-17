import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import {
  ADD_PRODUCT_CONFIRMATION_EVENT,
  clearPendingAddProducts,
  listPendingAddProducts,
  resolvePendingAddProductId,
} from './addProductSession';
import {mergeOrderWithOrderProducts} from '../../utils/orderState';

const submissions = new Map();
const unresolvedOrders = new Set();
export const isConfirmingProducts = orderId => submissions.has(String(orderId));
export const hasUnresolvedProductConfirmation = orderId => unresolvedOrders.has(String(orderId));

export const awaitProductConfirmation = async order => {
  const orderId = String(order?.id || order?.['@id'] || '').replace(/\D+/g, '');
  if (submissions.has(orderId)) await submissions.get(orderId);
  if (unresolvedOrders.has(orderId) || listPendingAddProducts().length) {
    throw new Error('Confira os produtos do pedido antes de enviar para produção.');
  }
};

export const reportProductConfirmationError = (error, showError) => {
  if (!error?.productConfirmationReported && typeof showError === 'function') {
    showError(error?.message || 'Não foi possível confirmar os produtos. Confira o pedido.');
    error.productConfirmationReported = true;
  }
};

const refreshConfirmedOrder = async (orderId, ordersActions, orderProductsActions) => {
  const order = await ordersActions.get(orderId);
  const products = await orderProductsActions.getItems({'order.id': Number(orderId)});
  if (!Array.isArray(products)) throw new Error('Não foi possível conferir os itens do pedido.');
  const confirmed = {...order, orderProducts: products};
  ordersActions.syncOrder?.(confirmed);
  return confirmed;
};

// Catalog exit, cart review and production share the same request. Do not retry
// additive writes: a refusal is final and a lost response may have been persisted.
export const confirmPendingProducts = ({order, ordersActions, orderProductsActions, products = []}) => {
  const orderId = String(order?.id || order?.['@id'] || '').replace(/\D+/g, '');
  if (!orderId) return Promise.resolve(order);
  if (submissions.has(orderId)) {
    const pending = submissions.get(orderId);
    return products.length
      ? pending.then(confirmed => confirmPendingProducts({order: confirmed, ordersActions, orderProductsActions, products}))
      : pending;
  }
  const byProduct = new Map();
  [...listPendingAddProducts(), ...products].forEach(selection => {
    const productId = resolvePendingAddProductId(selection.productId || selection.product);
    const quantity = Math.max(0, Number(selection.quantity || 0));
    if (!productId || !quantity) return;
    const previous = byProduct.get(productId);
    byProduct.set(productId, {...selection, productId, quantity: quantity + (previous?.quantity || 0)});
  });
  const selections = [...byProduct.values()];
  if (!selections.length && !unresolvedOrders.has(orderId)) return Promise.resolve(order);

  const submit = async () => {
    eventBus.emit(ADD_PRODUCT_CONFIRMATION_EVENT);
    if (unresolvedOrders.has(orderId)) {
      await refreshConfirmedOrder(orderId, ordersActions, orderProductsActions);
      unresolvedOrders.delete(orderId);
      throw new Error('Pedido atualizado. Confira os itens antes de enviar para produção.');
    }
    clearPendingAddProducts();
    eventBus.emit(ADD_PRODUCT_CONFIRMATION_EVENT);
    const failures = [];
    let confirmedOrder = mergeOrderWithOrderProducts(
      order, (order?.orderProducts || []).filter(item => !item.__localPendingSelection),
    );
    let receivedAcknowledgment = false;
    // One product per request prevents a later refusal from resending products
    // already committed by the backend earlier in the batch.
    for (const selection of selections) {
      try {
        const response = await ordersActions.addProducts(orderId, [{
          product: selection.productId,
          quantity: selection.quantity,
        }], {silentError: true});
        receivedAcknowledgment = Boolean(response);
        confirmedOrder = response || confirmedOrder;
      } catch (error) {
        failures.push(error?.message || `Não foi possível adicionar ${selection.product?.product || 'o produto'}.`);
        // Unknown outcomes must be read back, never retried automatically.
        if (!/estoque insuficiente/i.test(error?.message || '')) break;
      }
    }
    // A complete aggregate acknowledgment is already the authoritative ERP state.
    const acknowledgedId = String(confirmedOrder?.id || confirmedOrder?.['@id'] || '').replace(/\D+/g, '');
    const hasAcknowledgment = receivedAcknowledgment && failures.length === 0 && acknowledgedId === orderId &&
      Array.isArray(confirmedOrder?.orderProducts) &&
      confirmedOrder.orderProducts.every(item => !item.__localPendingSelection);
    try {
      if (hasAcknowledgment) {
        orderProductsActions.setItems?.(confirmedOrder.orderProducts);
        ordersActions.syncOrder?.(confirmedOrder);
      } else {
        confirmedOrder = await refreshConfirmedOrder(orderId, ordersActions, orderProductsActions);
      }
    } catch (error) {
      unresolvedOrders.add(orderId);
      ordersActions.syncOrder?.(confirmedOrder);
      failures.push('Não foi possível conferir o pedido no servidor. Aguarde e tente conferir novamente antes de enviar.');
    }
    if (failures.length) throw new Error([...new Set(failures)].join('\n'));
    return confirmedOrder;
  };
  const pending = Promise.resolve().then(submit).finally(() => {
    submissions.delete(orderId);
    eventBus.emit(ADD_PRODUCT_CONFIRMATION_EVENT);
  });
  submissions.set(orderId, pending);
  return pending;
};
