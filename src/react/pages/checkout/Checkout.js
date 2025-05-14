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
  const {getters, actions: cartActions} = getStore('cart');
  const {item: device} = deviceConfigGetters;
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {getters: orderProductsGetters, actions: orderProductsActions} =
    getStore('order_products');
  const {getters: invoiceGetters, actions: invoiceActions} =
    getStore('invoice');
  const {getters: peopleGetters} = getStore('people');
  const {currentCompany, defaultCompany} = peopleGetters;
  const {item: order} = ordersGetters;
  const {items: invoices} = invoiceGetters;
  const {payable} = getters;

  const navigation = useNavigation();
  const cancelOperation = () => {};
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
      console.log(
        'Zerando de novo, porque ele insiste em não zerar no lugar correto.',
      );
      //categoryActions.setItems(null);

      if (device.configs['pos-type'] == 'simple') {
        let p = payable + data.price;
        if (p < 0) {
          let i = [...invoices];
          i.push(data);
          invoiceActions.setItems(i);
          cartActions.setPayable(p);
          navigation.navigate('OrderTools');
        } else {
          ordersActions.setItem(null);
          orderProductsActions.setItems([]);
          cartActions.setItem(null);
          invoiceActions.setItems([]);
          cartActions.setPayable(0);
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
