import React, {useCallback} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

export default OrderTotalToolbar = ({route}) => {
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {getters: invoiceGetters} = getStore('invoice');
  const {isLoading: invoiceIsLoading} = invoiceGetters;
  const {item: order, isLoading, reload, isLoading: ordersIsloading} = ordersGetters;
  const {styles, globalStyles} = css();

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
