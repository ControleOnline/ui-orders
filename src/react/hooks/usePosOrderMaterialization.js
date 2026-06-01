import {useCallback} from 'react';
import {useStore} from '@store';
import usePosCartSession from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';
import {
  clearPendingAddProducts,
  listPendingAddProducts,
  resolvePendingAddProductId,
} from '@controleonline/ui-orders/src/react/utils/addProductSession';
import {
  buildManagerPdvRouteParams,
  buildOrderDetailsRouteParams,
  isPdvRouteContext,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import {getLinkedOrderContext} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext';

const normalizeOrderId = order =>
  String(order?.id || order?.['@id'] || '')
    .replace(/\D+/g, '')
    .trim();
const normalizeRouteOrderId = value =>
  String(value || '')
    .replace(/\D+/g, '')
    .trim();

const mergeProducts = products => {
  const mergedProducts = new Map();

  (Array.isArray(products) ? products : []).forEach(item => {
    const productId = resolvePendingAddProductId(item?.productId || item?.product);
    const quantity = Math.max(0, Number(item?.quantity || 0));

    if (!productId || quantity <= 0) {
      return;
    }

    mergedProducts.set(productId, (mergedProducts.get(productId) || 0) + quantity);
  });

  return Array.from(mergedProducts.entries()).map(([product, quantity]) => ({
    product,
    quantity,
  }));
};

export default function usePosOrderMaterialization({
  interactionParams = {},
  navigation = null,
} = {}) {
  const ordersStore = useStore('orders');
  const ordersActions = ordersStore.actions;
  const {item: order} = ordersStore.getters;

  const peopleStore = useStore('people');
  const {currentCompany, defaultCompany} = peopleStore.getters;

  const deviceStore = useStore('device');
  const {item: storagedDevice} = deviceStore.getters;

  const {ensureActiveOrder} = usePosCartSession({
    companyId: currentCompany?.id,
    deviceId: storagedDevice?.id,
    defaultStatusId: defaultCompany?.configs?.['pos-default-status'],
    allowLinkedOrderManagement:
      typeof interactionParams?.allowLinkedOrderManagement === 'boolean'
        ? interactionParams.allowLinkedOrderManagement
        : null,
  });

  const materializeOrderWithProducts = useCallback(
    async ({products = []} = {}) => {
      let targetOrder = order;

      if (!targetOrder?.id && !targetOrder?.['@id']) {
        const routeOrderId = normalizeRouteOrderId(interactionParams?.id);
        const shouldResumeExistingOrder =
          interactionParams?.resumeExistingOrder === true || !!routeOrderId;

        if (shouldResumeExistingOrder && routeOrderId) {
          try {
            const resumedOrder = await ordersActions.get(routeOrderId);
            const linkedOrderContext = getLinkedOrderContext(resumedOrder);

            if (linkedOrderContext?.isLinkedParent && linkedOrderContext?.externalCode) {
              targetOrder = await ensureActiveOrder(undefined, {
                linkedOrderInput: {
                  externalCode: linkedOrderContext.externalCode,
                  inputType: linkedOrderContext.inputType || 'manual',
                  settlementOrder: resumedOrder,
                },
              });
            } else {
              targetOrder = resumedOrder;
              ordersActions.syncOrder?.(resumedOrder);
            }
          } catch {
            targetOrder = null;
          }
        }
      }

      if (!targetOrder?.id && !targetOrder?.['@id']) {
        targetOrder = await ensureActiveOrder();
      }

      if (!targetOrder?.id && !targetOrder?.['@id']) {
        return null;
      }

      const payload = mergeProducts([
        ...listPendingAddProducts(),
        ...(Array.isArray(products) ? products : []),
      ]);

      if (payload.length === 0) {
        return targetOrder;
      }

      const orderId = normalizeOrderId(targetOrder);

      if (!orderId) {
        return targetOrder;
      }

      const updatedOrder = await ordersActions.addProducts(orderId, payload);
      clearPendingAddProducts();

      return updatedOrder || targetOrder;
    },
    [ensureActiveOrder, interactionParams?.id, interactionParams?.resumeExistingOrder, order, ordersActions],
  );

  const openOrderDetails = useCallback(
    orderItem => {
      if (!navigation || !orderItem) {
        return orderItem;
      }

      const shouldKeepPdvMode = isPdvRouteContext(interactionParams);

      navigation.navigate(
        'OrderDetails',
        buildOrderDetailsRouteParams(
          orderItem,
          shouldKeepPdvMode
            ? buildManagerPdvRouteParams({
                showBottomCart: false,
              })
            : {},
        ),
      );

      return orderItem;
    },
    [interactionParams, navigation],
  );

  return {
    materializeOrderWithProducts,
    openOrderDetails,
  };
}
