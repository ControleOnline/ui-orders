import {View} from 'react-native';
import React, {useState, useCallback} from 'react';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

import CieloCheckout from '@controleonline/ui-orders/src/react/services/Cielo/Checkout';
import InfinitePay from '@controleonline/ui-orders/src/react/services/InfinitePay/Checkout';
import Formatter from '@controleonline/ui-common/src/utils/formatter';

import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';

export default Checkout = ({route}) => {
  const {styles, globalStyles} = css();
  const {getters: deviceConfigGetters} = getStore('device_config');
  const {actions: categoryActions} = getStore('categories');
  const {item: device} = deviceConfigGetters;
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {getters: invoiceGetters, actions: invoiceActions} =
    getStore('invoice');
  const {getters: peopleGetters} = getStore('people');
  const {currentCompany, defaultCompany} = peopleGetters;
  const {item: order, payable} = ordersGetters;
  const {items: invoices} = invoiceGetters;

  const navigation = useNavigation();
  const cancelOperation = () => {};

  useFocusEffect(
    useCallback(() => {
      console.log('Deveria Gravar');
      ordersActions.initQueue();
      categoryActions.setItems(null);
    }, []),
  );

  const createInvoice = (selectedPayment, total) => {
    const payload = {
      dueDate: Formatter.getCurrentDate(),
      status: '/statuses/' + defaultCompany?.configs['pos-paid-status'],
      destinationWallet: selectedPayment.wallet['@id'],
      paymentType: selectedPayment.paymentType['@id'],
      price: total,
      receiver: '/people/' + currentCompany.id,
      order: order['@id'],
    };

    invoiceActions.save(payload).then(data => {
      if (device.configs['pos-type'] == 'simple') {
        let p = payable + data.price;
        if (p < 0) {
          let i = [...invoices];
          i.push(data);
          invoiceActions.setItems(i);
          ordersActions.setPayable(p);
          navigation.navigate('OrderTools');
        } else {
          ordersActions.setItem(null);
          invoiceActions.setItems([]);
          ordersActions.setPayable(0);
          navigation.navigate('SalesOrderIndex');
        }
      } else {
        let i = [...invoices];
        i.push(data);
        invoiceActions.setItems(i);
        navigation.navigate('OrderTools');
      }
    });
  };

  return (
    <View style={{flex: 1}}>
      {device.configs['pos-gateway'] == 'cielo' && (
        <CieloCheckout
          cancelOperation={cancelOperation}
          createInvoice={createInvoice}
          remoteCheckoutMode={false}
        />
      )}
      {device.configs['pos-gateway'] == 'infinite-pay' && (
        <InfinitePay
          cancelOperation={cancelOperation}
          createInvoice={createInvoice}
          remoteCheckoutMode={false}
        />
      )}
    </View>
  );
};
