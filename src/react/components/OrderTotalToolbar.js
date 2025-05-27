import React, {useCallback} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

export default OrderTotalToolbar = ({route}) => {
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {actions: orderProductsActions} = getStore('order_products');
  const {getters: invoiceGetters} = getStore('invoice');
  const {isLoading: invoiceIsLoading} = invoiceGetters;
  const {
    item: order,
    isLoading,
    reload,
    isLoading: ordersIsloading,
  } = ordersGetters;
  const {styles, globalStyles} = css();

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

  return !order ||
    isLoading ||
    invoiceIsLoading ||
    isLoading ||
    ordersIsloading ? (
    <ActivityIndicator
      size="small"
      color={styles.primary?.color || '#000'}
      style={{flex: 1}}
    />
  ) : (
    <Text style={[styles.primary, {flex: 1, textAlign: 'center'}]}>
      {Formatter.formatMoney(order.price)}
    </Text>
  );
};
