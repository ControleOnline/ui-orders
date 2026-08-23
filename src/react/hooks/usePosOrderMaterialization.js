import {useCallback} from 'react';
import {useStore} from '@store';
import usePosCartSession from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';
import {
  clearPendingAddProducts,
  listPendingAddProducts,
  resolvePendingAddProductId,
} from '@controleonline/ui-orders/src/react/utils/addProductSession';
import {
  buildCheckoutRouteParams,
  buildManagerPdvRouteParams,
  buildOrderDetailsRouteParams,
  isPdvRouteContext,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import {getLinkedOrderContext} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext';
import {isPosSingleItemMode} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';

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
  const orderProductsStore = useStore('order_products');
  const orderProductsActions = orderProductsStore.actions;

  const peopleStore = useStore('people');
  const {currentCompany, defaultCompany} = peopleStore.getters;

  const deviceStore = useStore('device');
  const {item: storagedDevice} = deviceStore.getters;
  const deviceConfigStore = useStore('device_config');
  const {item: runtimeDeviceConfig} = deviceConfigStore.getters;
  const isSingleItemOperationMode =
    interactionParams?.singleItemMode === true ||
    isPosSingleItemMode(runtimeDeviceConfig?.configs);

  const {ensureActiveOrder} = usePosCartSession({
    companyId: currentCompany?.id,
    deviceId: storagedDevice?.id,
    defaultStatusId: defaultCompany?.configs?.['pos-default-status'],
    companyConfigs: currentCompany?.configs,
    allowLinkedOrderManagement:
      typeof interactionParams?.allowLinkedOrderManagement === 'boolean'
        ? interactionParams.allowLinkedOrderManagement
        : null,
  });

  const refreshMaterializedOrderProducts = useCallback(
    async (orderId, fallbackOrder) => {
      if (!orderId || typeof orderProductsActions?.getItems !== 'function') {
        return fallbackOrder;
      }

      try {
        const refreshedOrderProducts = await orderProductsActions.getItems({
          'order.id': Number(orderId),
        });

        if (typeof ordersActions.syncOrderProducts === 'function') {
          return ordersActions.syncOrderProducts({
            orderId: Number(orderId),
            orderProducts: Array.isArray(refreshedOrderProducts)
              ? refreshedOrderProducts
              : [],
          }) || fallbackOrder;
        }

        return fallbackOrder;
      } catch {
        return fallbackOrder;
      }
    },
    [orderProductsActions, ordersActions],
  );

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

      const normalizedPayload = isSingleItemOperationMode
        ? payload.slice(-1).map(item => ({
            product: item.product,
            quantity: 1,
          }))
        : payload;

      if (normalizedPayload.length === 0) {
        return targetOrder;
      }

      const orderId = normalizeOrderId(targetOrder);

      if (!orderId) {
        return targetOrder;
      }

      const updatedOrder = isSingleItemOperationMode
        ? await ordersActions.replaceProducts(orderId, normalizedPayload)
        : await ordersActions.addProducts(orderId, normalizedPayload);
      clearPendingAddProducts();

      const materializedOrder = updatedOrder || targetOrder;

      return await refreshMaterializedOrderProducts(orderId, materializedOrder);
    },
    [
      ensureActiveOrder,
      interactionParams?.id,
      interactionParams?.resumeExistingOrder,
      interactionParams?.singleItemMode,
      isSingleItemOperationMode,
      order,
      ordersActions,
      refreshMaterializedOrderProducts,
    ],
  );

  const openOrderDetails = useCallback(
    orderItem => {
      if (!orderItem) {
        return orderItem;
      }

      const orderId = normalizeOrderId(orderItem);
      if (!orderId) {
        return orderItem;
      }

      // Ensure store reflects the order we are about to open (avoids blank screens).
      ordersActions.syncOrder?.(orderItem);

      if (!navigation?.navigate) {
        return orderItem;
      }

      const navigateTo = (routeName, params) => {
        try {
          navigation.navigate(routeName, params);
        } catch {
          // Fallback for nested navigators that reject bare navigate.
          try {
            navigation.navigate({name: routeName, params, merge: true});
          } catch {
            // Intentionally swallow — caller already showed materialize errors.
          }
        }
      };

      if (isSingleItemOperationMode) {
        const checkoutRoute = buildCheckoutRouteParams(
          orderItem,
          buildManagerPdvRouteParams({
            showBottomCart: false,
            singleItemMode: true,
            id: orderId,
          }),
        );

        navigateTo('Checkout', checkoutRoute);
        return orderItem;
      }

      const detailsParams = buildOrderDetailsRouteParams(
        orderItem,
        isPdvRouteContext(interactionParams)
          ? buildManagerPdvRouteParams({
              showBottomCart: false,
              id: orderId,
            })
          : {id: orderId},
      );

      navigateTo('OrderDetails', detailsParams);
      return orderItem;
    },
    [interactionParams, isSingleItemOperationMode, navigation, ordersActions],
  );

  return {
    materializeOrderWithProducts,
    openOrderDetails,
  };
}
