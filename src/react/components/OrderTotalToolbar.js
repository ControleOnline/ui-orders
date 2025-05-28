import React, {useCallback, useState, useEffect} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';

export default OrderTotalToolbar = ({route}) => {
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {actions: orderProductsActions} = getStore('order_products');
  const {getters: invoiceGetters} = getStore('invoice');
  const {isLoading: invoiceIsLoading} = invoiceGetters;
  const {
    item: order,
    isLoading,
    payable,
    reload,
    isLoading: ordersIsloading,
  } = ordersGetters;
  const {styles, globalStyles} = css();
  const [price, setPrice] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (reload && order && order['@id'])
        ordersActions
          .get(order['@id'])
          .then(data => {
            //console.log('Atualizando');
            //orderProductsActions.setItems(data.orderProducts);
          })
          .finally(() => ordersActions.setReload(false));
    }, [reload]),
  );

  useFocusEffect(
    useCallback(() => {
      console.log('P', payable);
      if (
        order &&
        order['@id'] &&
        price == 0 &&
        order.price > 0 &&
        price != order.price
      )
        setPrice(order.price);
    }, [order]),
  );

  useEffect(() => {
    const listener = p => {
      console.log(price, p, price + p);
      let value = price + p;
      setPrice(value > 0 ? value : 0);
    };

    eventBus.on('price', listener);
    return () => eventBus.off('price', listener);
  }, [price, setPrice]);

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
