import {View, TouchableOpacity, Text} from 'react-native';
import React from 'react';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import CieloCheckout from '@controleonline/ui-orders/src/react/services/Cielo/Checkout';
import InfinitePay from '@controleonline/ui-orders/src/react/services/InfinitePay/Checkout';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useStores} from '@store';

const Checkout = () => {
  const device_configStore = useStores(state => state.device_config);
  const deviceConfigGetters = device_configStore.getters;
  const {item: device} = deviceConfigGetters;
  const ordersStore = useStores(state => state.orders);
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const invoiceStore = useStores(state => state.invoice);
  const invoiceGetters = invoiceStore.getters;
  const invoiceActions = invoiceStore.actions;
  const order_productsStore = useStores(state => state.order_products);
  const orderProductsGetters = order_productsStore.getters;
  const printStore = useStores(state => state.print);
  const printActions = printStore.actions;

  const peopleStore = useStores(state => state.people);
  const peopleGetters = peopleStore.getters;
  const {currentCompany, defaultCompany} = peopleGetters;
  const {
    item: order,
    payable,
    isLoading: orderIsloading,
    isSaving: orderIsSaving,
  } = ordersGetters;
  const {
    items: invoices,
    isLoading: invoiceIsloading,
    isSaving: invoiceIsSaving,
  } = invoiceGetters;
  const {isLoading: orderProductsIsloading, isSaving: orderProductsIsSaving} =
    orderProductsGetters;
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
          printActions.setReload(true); // Impressão local
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

  const handleEdit = order => {
    navigation.navigate('OrderDetails', {order: order});
  };

  return (
    <View style={{flex: 1}}>
      <View
        style={{
          height: 60,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          backgroundColor: '#fff',
          color: '#000',
          elevation: 4,
          padding: 20,
          marginBottom: 15,
        }}>
        {
          <TouchableOpacity
            onPress={() => handleEdit(order)}
            style={{marginRight: 16}}>
            <Icon name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        }
        <Text style={{fontSize: 18, color: '#000'}}>Order #{order?.id}</Text>
      </View>
      <StateStore store="invoice" />
      <StateStore store="orders" />
      <StateStore store="order_products" />

      {!orderIsloading &&
      !orderIsSaving &&
      !invoiceIsloading &&
      !orderProductsIsloading &&
      !invoiceIsSaving &&
      !orderProductsIsSaving ? (
        <>
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
        </>
      ) : null}
    </View>
  );
};

export default Checkout;
