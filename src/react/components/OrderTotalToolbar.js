import React, {useCallback, useState, useEffect, useRef} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {
  useNavigation,
  useFocusEffect,
  useNavigationState,
} from '@react-navigation/native';

import eventBus from '@controleonline/ui-common/src/react/components/EventBus';

export default OrderTotalToolbar = ({route}) => {
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const routes = useNavigationState(state => state.routes);
  const currentRoute = routes[routes.length - 1];
  const {item: order} = ordersGetters;
  const {styles, globalStyles} = css();
  const [price, setPrice] = useState(0);
  const [productBuffer, setProductBuffer] = useState([]);
  const timeoutId = useRef(null);

  const persistProducts = useCallback(() => {
    console.log(currentRoute?.name, productBuffer.length);
    if (
      order &&
      order['@id'] &&
      productBuffer.length > 0 &&
      currentRoute?.name &&
      currentRoute?.name != 'ProductsPage'
    ) {
      if (timeoutId.current) clearTimeout(timeoutId.current);

      timeoutId.current = setTimeout(() => {
        const currentOrder = {...order};
        const currentProducts = [...productBuffer];
        console.log(currentProducts);
        addProducts(currentOrder, currentProducts);
        setProductBuffer([]); //Aqui deveria zerar (E zera, mas depois volta)
        timeoutId.current = null;
      }, 300);
    }
  }, [currentRoute, productBuffer, order, setProductBuffer]);

  const addProducts = useCallback(
    (currentOrder, currentProducts) => {
      if (currentProducts.length > 0 && currentOrder && currentOrder['@id'])
        ordersActions.addProducts(
          currentOrder['@id'].replace(/\D/g, ''),
          currentProducts,
        );
    },
    [productBuffer, setProductBuffer],
  );

  useEffect(() => {
    const handleAddProduct = data => {
      console.log('Adicionando no Buffer (Não adiciona novamente)');
      setProductBuffer(prev => [...prev, data]);
      persistProducts();
    };
    eventBus.on('add-product', handleAddProduct);
    return () => eventBus.off('add-product', handleAddProduct);
  }, [setProductBuffer]);

  useFocusEffect(
    useCallback(() => {
      if (order && order.price > 0 && price != order.price)
        setPrice(order.price);
    }, [order]),
  );

  useFocusEffect(
    useCallback(() => {
      const listener = p => {
        let value = price + p;
        setPrice(value > 0 ? value : 0);
      };

      eventBus.on('price', listener);
      return () => eventBus.off('price', listener);
    }, [price, setPrice]),
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
