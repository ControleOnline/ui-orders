import React, {useCallback, useMemo, useState} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {useStore} from '@store';
import {
  buildCheckoutRouteParams,
  buildManagerPdvRouteParams,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import {normalizeEntityId} from '@controleonline/ui-orders/src/utils/orderState';

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
}) => {
  const navigation = useNavigation();
  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const orderProductsStore = useStore('order_products');
  const orderProductsActions = orderProductsStore.actions;
  const {item: order} = ordersGetters;
  const [isSavingSelection, setIsSavingSelection] = useState(false);

  const productId = useMemo(
    () => normalizeEntityId(product),
    [product],
  );
  const currentOrderProducts = useMemo(
    () => getTopLevelOrderProducts(order?.orderProducts),
    [order?.orderProducts],
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
      iconDisabled: palette.iconDisabled,
      iconSuccess: palette.iconSuccess,
      textMuted: palette.textMuted,
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
        const orderProducts = await orderProductsActions.getItems({
          'order.id': Number(resolvedOrderId),
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
    [orderProductsActions, ordersActions, resolvedOrderId],
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

      if (!isSelected && singleItemMode === true) {
        navigation.navigate(
          'Checkout',
          buildCheckoutRouteParams(
            materializedOrder || updatedOrder || resolvedOrderId,
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
      style={styles.container}
      disabled={isSavingSelection || !productId || !resolvedOrderId}
      onPress={replaceCurrentProduct}>
      <View style={styles.button}>
        <Icon
          name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
          size={24}
          color={isSelected ? resolvedPalette.iconSuccess : resolvedPalette.iconDisabled}
        />
      </View>

      <Text style={[styles.quantityText, {color: resolvedPalette.textMuted}]}>
        {isSavingSelection
          ? 'Salvando'
          : isSelected
            ? 'Selecionado'
            : 'Selecionar'}
      </Text>
    </TouchableOpacity>
  );
};

export default ProductTotem;
