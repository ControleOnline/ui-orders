import React, {useEffect, useState} from 'react';
import {View, Text} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
export default Checkout = ({route}) => {
  const {styles, globalStyles} = css();
  const {getters, actions} = getStore('cart');
  const {getters: invoiceGetters} = getStore('invoice');
  const {items: invoices} = invoiceGetters;
  const {item: order, payable} = getters;

  useEffect(() => {
    const paid = invoices.reduce(
      (sum, invoice) => sum + parseFloat(invoice.price),
      0,
    );
    actions.setPayable(parseFloat(paid) - parseFloat(order.price));
  }, [invoices]);

  return (
    <View style={[styles.payable.toolbar]}>
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
    </View>
  );
};
