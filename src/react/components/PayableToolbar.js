import React, {useEffect, useState} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
export default PayableToolbar = ({route}) => {
  const {styles, globalStyles} = css();
  const {getters, actions} = getStore('cart');
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {getters: invoiceGetters, actions: invoiceActions} =
    getStore('invoice');
  const {items: invoices, isLoading} = invoiceGetters;
  const {item: order, payable} = getters;
  const {items: orders} = ordersGetters;

  useEffect(() => {
    const paid = invoices.reduce(
      (sum, invoice) => sum + parseFloat(invoice.price),
      0,
    );
    actions.setPayable(parseFloat(paid) - parseFloat(order.price));
  }, [invoices]);

  useEffect(() => {
    invoiceActions.getItems({'order.order': order['@id']});
  }, [order]);

  useEffect(() => {
    if (payable >= 0) {
      const updatedOrders = orders.filter(item => item['@id'] !== order['@id']);
      ordersActions.setItems(updatedOrders);
    }
  }, [payable]);

  return (
    <View style={[styles.payable.toolbar]}>
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={styles.primary?.color || '#000'}
          style={{flex: 1}}
        />
      ) : (
        <>
          {payable < 0 && (
            <Text style={{color: 'red', fontSize: 18, textAlign: 'center'}}>
              Saldo Devedor: {Formatter.formatMoney(payable)}
            </Text>
          )}
          {payable >= 0 && (
            <Text style={{color: 'green', fontSize: 18, textAlign: 'center'}}>
              Pago: {Formatter.formatMoney(payable + parseFloat(order.price))}
            </Text>
          )}
        </>
      )}
    </View>
  );
};
