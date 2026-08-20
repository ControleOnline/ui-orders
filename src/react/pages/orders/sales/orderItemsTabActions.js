/**
 * Compose per-item actions for OrderItemsTab / OrderProducts.
 * Keeps free-mutation actions (when provided) and audited adjustment when mutation is off.
 */
import React from 'react';
import OrderProductAdjustmentButton from '@controleonline/ui-orders/src/react/components/adjustment/OrderProductAdjustmentButton';

/**
 * @param {object} options
 * @param {function|null} options.renderOrderProductActions
 * @param {object} options.currentOrder
 * @param {string|number|null} options.deviceId
 * @param {string|null} options.appType
 * @param {boolean} options.isClientContext
 * @param {function|null} options.onOrderProductAdjusted
 */
export function createOrderItemsRenderActions({
  renderOrderProductActions = null,
  currentOrder = null,
  deviceId = null,
  appType = null,
  isClientContext = false,
  onOrderProductAdjusted = null,
} = {}) {
  return actionArgs => {
    const existing =
      typeof renderOrderProductActions === 'function'
        ? renderOrderProductActions(actionArgs)
        : null;

    const rootProduct =
      actionArgs?.orderProduct ||
      actionArgs?.entry?.orderProduct ||
      actionArgs?.card?.rootItem ||
      null;

    const isRoot = actionArgs?.entryType === 'root' || actionArgs?.entryType == null;

    // When free mutation UI is active, skip audited adjust (cart still editable).
    const adjustBtn =
      isRoot && rootProduct && !renderOrderProductActions ? (
        <OrderProductAdjustmentButton
          key={`adj-${rootProduct?.id || rootProduct?.['@id'] || 'x'}`}
          orderProduct={rootProduct}
          order={currentOrder}
          deviceId={deviceId}
          appType={appType}
          isClientContext={isClientContext}
          onCommitted={onOrderProductAdjusted}
        />
      ) : null;

    if (!existing && !adjustBtn) return null;

    return (
      <>
        {existing}
        {adjustBtn}
      </>
    );
  };
}

export default createOrderItemsRenderActions;
