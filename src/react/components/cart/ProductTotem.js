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

const ProductTotem = ({product, singleItemMode = false}) => {
  const navigation = useNavigation();
  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
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
  const isSelected = useMemo(
    () =>
      !!productId &&
      currentOrderProducts.some(
        orderProduct =>
          normalizeEntityId(orderProduct?.product) === productId,
      ),
    [currentOrderProducts, productId],
  );
  const orderId = useMemo(() => normalizeEntityId(order), [order]);

  const runQueuedOrderMutation = useCallback(
    mutation => {
      if (!orderId || typeof mutation !== 'function') {
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
    [orderId, ordersActions],
  );

  const replaceCurrentProduct = useCallback(async () => {
    if (!orderId || !productId || isSavingSelection) {
      return;
    }

    setIsSavingSelection(true);

    try {
      const nextProducts = isSelected
        ? []
        : [{product: productId, quantity: 1}];

      const updatedOrder = await runQueuedOrderMutation(() =>
        ordersActions.replaceProducts(orderId, nextProducts),
      );

      if (updatedOrder && typeof ordersActions.syncOrder === 'function') {
        ordersActions.syncOrder(updatedOrder);
      }

      if (!isSelected && singleItemMode === true) {
        navigation.navigate(
          'Checkout',
          buildCheckoutRouteParams(
            updatedOrder || orderId,
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
    orderId,
    ordersActions,
    navigation,
    productId,
    singleItemMode,
    runQueuedOrderMutation,
  ]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        disabled={isSavingSelection || !productId || !orderId}
        onPress={replaceCurrentProduct}>
        <Icon
          name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
          size={24}
          color={isSelected ? '#16A34A' : 'red'}
        />
      </TouchableOpacity>

      <Text style={[styles.quantityText, {color: '#666'}]}>
        {isSavingSelection
          ? 'Salvando'
          : isSelected
            ? 'Selecionado'
            : 'Selecionar'}
      </Text>
    </View>
  );
};

export default ProductTotem;
