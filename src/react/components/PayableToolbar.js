import React, {useCallback} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

export default PayableToolbar = ({route}) => {
  const {styles, globalStyles} = css();
  const {getters, actions: cartActions} = getStore('cart');
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {getters: invoiceGetters, actions: invoiceActions} =
    getStore('invoice');
  const {items: invoices, isLoading} = invoiceGetters;
  const {item: order, reload, payable} = getters;
  const {items: orders} = ordersGetters;

  useFocusEffect(
    useCallback(() => {
      if (order?.price == undefined) return;
      const paid = invoices.reduce(
        (sum, invoice) => sum + parseFloat(invoice.price),
        0,
      );

      cartActions.setPayable(parseFloat(paid) - parseFloat(order.price));
    }, [invoices, order]),
  );

  useFocusEffect(
    useCallback(() => {
      if (payable >= 0 && order['@id'] && order.price > 0) {
        const updatedOrders = orders.filter(
          item => item['@id'] !== order['@id'],
        );
        ordersActions.setItems(updatedOrders);
      }
    }, [payable]),
  );

  return (
    <View
      style={[
        styles.payable.toolbar,
        payable != undefined && payable == 0 ? {bottom: 0} : null,
      ]}>
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={styles.primary?.color || '#000'}
          style={{flex: 1}}
        />
      ) : (
        <>
          {payable < 0 ? (
            <Text style={{color: 'red', fontSize: 18, textAlign: 'center'}}>
              Saldo Devedor: {Formatter.formatMoney(payable)}
            </Text>
          ) : (
            <Text style={{color: 'green', fontSize: 18, textAlign: 'center'}}>
              Pago: {Formatter.formatMoney(payable + parseFloat(order.price))}
            </Text>
          )}
        </>
      )}
    </View>
  );
};
