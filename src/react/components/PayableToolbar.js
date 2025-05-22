import React, {useCallback, useEffect} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

export default PayableToolbar = ({route}) => {
  const {styles, globalStyles} = css();
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {getters: invoiceGetters, actions: invoiceActions} =
    getStore('invoice');
  const {isLoading} = invoiceGetters;
  const {items: orders, item: order, payable} = ordersGetters;

  useFocusEffect(
    useCallback(() => {
      if (order && order['@id'] && !order.invoices && !isLoading) {
        invoiceActions
          .getItems({'order.order': order['@id']})
          .then(invoices => {
            let o = {...order};
            o.invoices = invoices;
            ordersActions.setItem(o);
          });
      }
    }, [order]),
  );

  useEffect(() => {
    //console.log('Order Price', order?.price);

    if (order?.price == undefined) return;
    const paid =
      order.invoices && order.invoices.length > 0
        ? order.invoices.reduce(
            (sum, invoice) => sum + parseFloat(invoice.price),
            0,
          )
        : 0;
    //console.log('payable', paid, parseFloat(paid) - parseFloat(order.price));
    ordersActions.setPayable(parseFloat(paid) - parseFloat(order.price));
  }, [order]);

  useEffect(() => {
    if (payable >= 0 && order && order['@id'] && order.price > 0) {
      const updatedOrders = orders.filter(item => item['@id'] !== order['@id']);
      ordersActions.setItems(updatedOrders);
    }
  }, [payable]);

  return (
    order?.price > 0 && (
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
                Pago:{' '}
                {Formatter.formatMoney(payable + parseFloat(order?.price || 0))}
              </Text>
            )}
          </>
        )}
      </View>
    )
  );
};
