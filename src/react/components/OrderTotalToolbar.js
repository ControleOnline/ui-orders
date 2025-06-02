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

  useFocusEffect(
    useCallback(() => {
      console.log(currentRoute?.name, productBuffer.length);
      if (
        order &&
        order['@id'] &&
        productBuffer.length > 0 &&
        currentRoute?.name &&
        currentRoute?.name != 'ProductsPage'
      )
        persistProducts();
    }, [currentRoute, productBuffer, order]),
  );

  const persistProducts = () => {
    if (timeoutId.current) clearTimeout(timeoutId.current);

    timeoutId.current = setTimeout(() => {
      const currentOrder = {...order};
      const currentProducts = [...productBuffer];
      console.log(currentProducts);
      addProducts(currentOrder, currentProducts);
      timeoutId.current = null;
    }, 200);
  };

  const addProducts = useCallback((currentOrder, currentProducts) => {
    if (currentProducts.length > 0 && currentOrder && currentOrder['@id'])
      ordersActions.addProducts(
        currentOrder['@id'].replace(/\D/g, ''),
        currentProducts,
      );
    setProductBuffer([]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const handleAddProduct = data => {
        console.log('Adicionando ao buffer:', {
          atual: productBuffer,
          novo: data,
        });

        try {
          console.log(typeof setProductBuffer);
          setProductBuffer(prev => {
            console.log(prev);
            const updatedBuffer = [...prev, data];
            console.log('Buffer atualizado dentro do set:', updatedBuffer);
            return updatedBuffer;
          });
        } catch (error) {
          console.log('Error', error);
        }
        setTimeout(() => {
          console.log(
            'Estado após 100ms:',
            productBuffer,
            'Dados adicionados:',
            data,
          );
        }, 100);
      };
      eventBus.on('add-product', handleAddProduct);
      return () => eventBus.off('add-product', handleAddProduct);
    }, []),
  );

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
