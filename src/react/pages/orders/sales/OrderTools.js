import React, {useEffect, useState} from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import {getStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import OrderInvoices from './OrderInvoices';
import css from '@controleonline/ui-orders/src/react/css/orders';

import PayableToolbar from '@controleonline/ui-orders/src/react/components/PayableToolbar';

const OrderDetails = ({route}) => {
  const order = route.params.order;
  const {getters, actions} = getStore('orders');
  const {getters: cartGetters} = getStore('cart');
  const {item, isLoading, error} = getters;
  const {styles, globalStyles} = css();

  return (
    <SafeAreaView style={[{paddingBottom: 180}, styles.container]}>
      <StateStore store="orders" />
      {!isLoading && item && !error && (
        <View>
          <OrderHeader key={item.id} order={item} />
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity
              style={[
                globalStyles.button,
                globalStyles.btnAdd,
                {marginRight: 5},
              ]}>
              <Icon name="add-circle" size={24} color="#fff" />
              <Text style={{color: '#fff', marginLeft: 8}}>Emitir NF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                globalStyles.button,
                globalStyles.btnAdd,
                {marginLeft: 5},
              ]}>
              <Icon name="print" size={24} color="#fff" />
              <Text style={{color: '#fff', marginLeft: 8}}>Imprimir</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.orderContainer}>
              <OrderInvoices />
            </View>
          </ScrollView>
        </View>
      )}

      <PayableToolbar />
    </SafeAreaView>
  );
};

export default OrderDetails;
