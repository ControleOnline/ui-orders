import React, {useCallback, useMemo, useState} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useStore} from '@store';
import {
  buildCheckoutRouteParams,
  buildManagerPdvRouteParams,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import {normalizeEntityId} from '@controleonline/ui-orders/src/utils/orderState';
import {fetchCompleteOrderProductsFromStore} from '@controleonline/ui-orders/src/utils/orderProductsCollection';

const styles = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: 16,
    fontSize: 16,
  },
  button: {
    padding: 8,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
};

const getTopLevelOrderProducts = orderProducts =>
  (Array.isArray(orderProducts) ? orderProducts : []).filter(
    orderProduct => !normalizeEntityId(orderProduct?.orderProduct),
  );

const ProductTotem = ({
  product,
  palette = {},
  singleItemMode = false,
  orderId = '',
  children,
  containerStyle,
  accessibilityLabel,
}) => {
  const navigation = useNavigation();
  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const orderProductsStore = useStore('order_products');
  const orderProductsActions = orderProductsStore.actions;
  const orderProductsGetters = orderProductsStore.getters;
  const {items: storedOrderProducts = []} = orderProductsGetters;
  const {item: order} = ordersGetters;
  const [isSavingSelection, setIsSavingSelection] = useState(false);

  const productId = useMemo(
    () => normalizeEntityId(product),
    [product],
  );
  const currentOrderProducts = useMemo(
    () =>
      getTopLevelOrderProducts(
        Array.isArray(order?.orderProducts) && order.orderProducts.length > 0
          ? order.orderProducts
          : storedOrderProducts,
      ),
    [order?.orderProducts, storedOrderProducts],
  );
  const resolvedOrderId = useMemo(
    () => normalizeEntityId(orderId) || normalizeEntityId(order),
    [order, orderId],
  );
  const isSelected = useMemo(
    () =>
      !!productId &&
      currentOrderProducts.some(
        orderProduct =>
          normalizeEntityId(orderProduct?.product) === productId,
      ),
    [currentOrderProducts, productId],
  );
  const resolvedPalette = useMemo(
    () => ({
      radioBorder: palette.radioBorder,
      radioSelectedBorder: palette.radioSelectedBorder,
      radioSelectedDot: palette.radioSelectedDot,
      radioText: palette.radioText,
    }),
    [palette],
  );

  const runQueuedOrderMutation = useCallback(
    mutation => {
      if (!resolvedOrderId || typeof mutation !== 'function') {
        return Promise.resolve(null);
      }

      if (typeof ordersActions.executeQueue === 'function') {
        return new Promise((resolve, reject) => {
          ordersActions.executeQueue(() =>
            Promise.resolve()
              .then(() => mutation())
              .then(result => {
                resolve(result);
                return result;
              })
              .catch(error => {
                reject(error);
                throw error;
              }),
          );
        });
      }

      if (
        typeof ordersActions.addToQueue === 'function' &&
        typeof ordersActions.initQueue === 'function'
      ) {
        return new Promise((resolve, reject) => {
          ordersActions.addToQueue(() =>
            Promise.resolve()
              .then(() => mutation())
              .then(result => {
                resolve(result);
                return result;
              })
              .catch(error => {
                reject(error);
                throw error;
              }),
          );
          ordersActions.initQueue();
        });
      }

      return Promise.resolve(mutation());
    },
    [resolvedOrderId, ordersActions],
  );

  const refreshOrderProducts = useCallback(
    async fallbackOrder => {
      if (!resolvedOrderId || typeof orderProductsActions?.getItems !== 'function') {
        return fallbackOrder;
      }

      try {
        const orderProducts = await fetchCompleteOrderProductsFromStore({
          actions: orderProductsActions,
          getters: orderProductsGetters,
          params: {'order.id': Number(resolvedOrderId)},
        });

        if (typeof ordersActions.syncOrderProducts === 'function') {
          return (
            ordersActions.syncOrderProducts({
              orderId: Number(resolvedOrderId),
              orderProducts: Array.isArray(orderProducts) ? orderProducts : [],
            }) || fallbackOrder
          );
        }
      } catch {
        return fallbackOrder;
      }

      return fallbackOrder;
    },
    [orderProductsActions, orderProductsGetters, ordersActions, resolvedOrderId],
  );

  const replaceCurrentProduct = useCallback(async () => {
    if (!resolvedOrderId || !productId || isSavingSelection) {
      return;
    }

    setIsSavingSelection(true);

    try {
      const nextProducts = isSelected
        ? []
        : [{product: productId, quantity: 1}];

      const updatedOrder = await runQueuedOrderMutation(() =>
        ordersActions.replaceProducts(resolvedOrderId, nextProducts),
      );

      if (updatedOrder && typeof ordersActions.syncOrder === 'function') {
        ordersActions.syncOrder(updatedOrder);
      }

      const materializedOrder = await refreshOrderProducts(
        updatedOrder || order || {id: resolvedOrderId},
      );
      const checkoutOrderId =
        materializedOrder?.id ||
        materializedOrder?.['@id'] ||
        updatedOrder?.id ||
        updatedOrder?.['@id'] ||
        resolvedOrderId;

      if (!isSelected && singleItemMode === true) {
        navigation.navigate(
          'Checkout',
          buildCheckoutRouteParams(
            checkoutOrderId,
            buildManagerPdvRouteParams({showBottomCart: false}),
          ),
        );
      }
    } finally {
      setIsSavingSelection(false);
    }
  }, [
    isSavingSelection,
    isSelected,
    resolvedOrderId,
    ordersActions,
    navigation,
    productId,
    order,
    singleItemMode,
    runQueuedOrderMutation,
    refreshOrderProducts,
  ]);

  return (
    <TouchableOpacity
      aria-checked={children ? isSelected : undefined}
      aria-disabled={children ? isSavingSelection : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={children ? 'radio' : 'button'}
      accessibilityState={children ? {checked: isSelected, disabled: isSavingSelection} : undefined}
      activeOpacity={children ? 0.88 : 0.7}
      style={children ? containerStyle : [styles.container, containerStyle]}
      disabled={isSavingSelection || !productId || !resolvedOrderId}
      onPress={replaceCurrentProduct}>
      {typeof children === 'function' ? (
        children({isSavingSelection, isSelected})
      ) : (
        <>
          <View style={styles.button}>
            <View
              style={[
                styles.radioOuter,
                {
                  borderColor: isSelected
                    ? resolvedPalette.radioSelectedBorder
                    : resolvedPalette.radioBorder,
                },
              ]}>
              {isSelected ? (
                <View
                  style={[
                    styles.radioDot,
                    {backgroundColor: resolvedPalette.radioSelectedDot},
                  ]}
                />
              ) : null}
            </View>
          </View>

          <Text style={[styles.quantityText, {color: resolvedPalette.radioText}]}>
            {isSavingSelection
              ? 'Salvando'
              : isSelected
                ? 'Selecionado'
                : 'Selecionar'}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export default ProductTotem;
