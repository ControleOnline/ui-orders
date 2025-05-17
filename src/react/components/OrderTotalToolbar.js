import React, {useCallback} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {useGetStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

export default OrderTotalToolbar = ({route}) => {
  const {getters, actions: cartActions} = useGetStore('cart');
  const {getters: ordersGetters, actions: ordersActions} = useGetStore('orders');
  const {getters: invoiceGetters} = useGetStore('invoice');
  const {isLoading: invoiceIsLoading} = invoiceGetters;
  const {item: order, reload, isLoading: ordersIsloading} = ordersGetters;
  const {item, isLoading, payable} = getters;
  const {styles, globalStyles} = css();

  return !item ||
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
      {Formatter.formatMoney(item.price)}
    </Text>
  );
};
