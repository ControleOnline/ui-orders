import React, {useCallback, useEffect} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

export default PayableToolbar = ({route, order}) => {
  const {styles, globalStyles} = css();
  const {getters, actions: cartActions} = getStore('cart');
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {getters: invoiceGetters, actions: invoiceActions} =
    getStore('invoice');
  const {items: invoices, isLoading} = invoiceGetters;
  const {item, reload, payable} = getters;
  const {items: orders} = ordersGetters;

  useEffect(() => {
    if (order && item && order['@id'] != item['@id'])
      invoiceActions.getItems({'order.order': order['@id']});
  }, [order, item]);
  useEffect(() => {
    if (item?.price == undefined) return;
    const paid = invoices.reduce(
      (sum, invoice) => sum + parseFloat(invoice.price),
      0,
    );

    cartActions.setPayable(parseFloat(paid) - parseFloat(item.price));
  }, [invoices, item]);

  useEffect(() => {
    if (payable >= 0 && item['@id'] && item.price > 0) {
      const updatedOrders = orders.filter(item => item['@id'] !== item['@id']);
      ordersActions.setItems(updatedOrders);
    }
  }, [payable]);

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
              Pago: {Formatter.formatMoney(payable + parseFloat(item.price))}
            </Text>
          )}
        </>
      )}
    </View>
  );
};
