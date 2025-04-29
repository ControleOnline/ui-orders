import React, {useState, useCallback} from 'react';
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
import OrderInvoices from './OrderInvoices';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

const OrderDetails = ({route}) => {
  const {getters, actions} = getStore('orders');
  const {getters: invoiceGetters, actions: invoiceActions} =
    getStore('invoice');
  const {items: invoices} = invoiceGetters;
  const {item, isLoading, error} = getters;
  const {styles, globalStyles} = css();



  return (
    <SafeAreaView style={[{paddingBottom: 0}, styles.container]}>
      <StateStore store="orders" />
      {!isLoading && item && !error && (
        <View>
          <OrderHeader key={item.id} order={item} />
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <PrintButton printType={'order'} store={'orders'} />
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={[styles.orderContainer, {paddingBottom: 100}]}>
              <OrderInvoices />
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

export default OrderDetails;
