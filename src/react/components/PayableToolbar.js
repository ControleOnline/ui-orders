import React, {useCallback, useState, useEffect} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useFocusEffect} from '@react-navigation/native';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';

const PayableToolbar = () => {
  const {styles} = css();
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {getters: invoiceGetters} = getStore('invoice');
  const {isLoading, items: invoices} = invoiceGetters;
  const {items: orders, item: order, payable} = ordersGetters;
  const [price, setPrice] = useState(0);
  const [paid, setPaid] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (order && price == 0 && order.price > 0 && price != order.price)
        setPrice(order.price);
    }, [order]),
  );

  useEffect(() => {
    const listener = p => {
      let value = price + p;
      setPrice(value > 0 ? value : 0);
    };
    eventBus.on('price', listener);
    return () => eventBus.off('price', listener);
  }, [price, setPrice]);

  useEffect(() => {
    if (invoices && invoices.length > 0) {
      const localPaid = invoices.reduce(
        (sum, invoice) => sum + parseFloat(invoice.price),
        0,
      );
      setPaid(localPaid);
    }
  }, [invoices]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let p = parseFloat(paid) - parseFloat(price);
      ordersActions.setPayable(p);
    }, 300);

    return () => clearTimeout(timeout);
  }, [price, paid]);

  useEffect(() => {
    if (payable >= 0 && order && order['@id'] && price > 0) {
      const updatedOrders = orders.filter(item => item['@id'] !== order['@id']);
      ordersActions.setItems(updatedOrders);
    }
  }, [payable]);

  return (
    price > 0 && (
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
                Pago: {Formatter.formatMoney(payable + parseFloat(price || 0))}
              </Text>
            )}
          </>
        )}
      </View>
    )
  );
};

export default PayableToolbar;
