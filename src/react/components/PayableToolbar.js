import React, {useState, useEffect} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import {useStores} from '@store';

const PayableToolbar = ({route}) => {
  const {styles} = css();
  const ordersStore = useStores(state => state.orders);
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const invoiceStore = useStores(state => state.invoice);
  const invoiceGetters = invoiceStore.getters;
  const {isLoading} = invoiceGetters;
  const {items: orders, item: order, payable} = ordersGetters;
  const [price, setPrice] = useState(0);
  const [paid, setPaid] = useState(0);

  useEffect(() => {
    const listener = value => {
      setPrice(value);
    };
    eventBus.on('total', listener);
    return () => eventBus.off('total', listener);
  }, []);

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
