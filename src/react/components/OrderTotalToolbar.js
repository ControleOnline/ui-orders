import React, {useCallback, useState, useRef} from 'react';
import {Text, ActivityIndicator} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {useStores} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useFocusEffect} from '@react-navigation/native';

import eventBus from '@controleonline/ui-common/src/react/components/EventBus';

const OrderTotalToolbar = () => {
  const ordersStore = useStores(state => state.orders);
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;

  const {item: order} = ordersGetters;
  const {styles} = css();
  const [price, setPrice] = useState(0);
  const timeoutId = useRef(null);
  let products = [];

  const persistProducts = currentProducts => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }

    timeoutId.current = setTimeout(() => {
      const currentOrder = {...order};
      console.log(currentProducts);
      addProducts(currentOrder, currentProducts);
      timeoutId.current = null;
    }, 200);
  };

  const addProducts = useCallback((currentOrder, currentProducts) => {
    if (currentProducts.length > 0 && currentOrder && currentOrder['@id']) {
      ordersActions.addProducts(
        currentOrder['@id'].replace(/\D/g, ''),
        currentProducts,
      );
    }
    products = [];
  }, []);

  const handleAddProduct = data => {
    products.push(data);
    persistProducts(products);
  };

  useFocusEffect(
    useCallback(() => {
      eventBus.on('add-product', handleAddProduct);
      return () => eventBus.off('add-product', handleAddProduct);
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (order && order.price > 0 && price != order.price) {
        setPrice(order.price);
      }
    }, [order]),
  );

  useFocusEffect(
    useCallback(() => {
      const listener = p => {
        let value = price + p;
        setPrice(value > 0 ? value : 0);
        eventBus.emit('total', value);
      };

      eventBus.on('price', listener);
      return () => eventBus.off('price', listener);
    }, [price]),
  );

  return !order ? (
    <ActivityIndicator
      size="small"
      color={styles.primary?.color || '#000'}
      style={{flex: 1}}
    />
  ) : (
    <Text style={[styles.primary, {flex: 1, textAlign: 'center'}]}>
      {Formatter.formatMoney(price)}
    </Text>
  );
};

export default OrderTotalToolbar;
