import {normalizeEntityId} from '../../utils/orderState';

// Count only saved top-level sale lines in the current launch, not combo components.
export const getConfirmedCatalogQuantity = (order, product) => {
  const productId = normalizeEntityId(product);
  if (!productId) return 0;
  return (Array.isArray(order?.orderProducts) ? order.orderProducts : []).reduce((quantity, line) => {
    if (line.__localPendingSelection || line.productGroup || line.parentProduct ||
        normalizeEntityId(line.orderProduct || line.order_product) ||
        normalizeEntityId(line.product) !== productId) return quantity;
    return quantity + Math.max(0, Number(line.quantity) || 0);
  }, 0);
};
