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
  const order = route.params.order;
  const {getters, actions} = getStore('orders');
  const {getters: invoiceGetters, actions: invoiceActions} =
    getStore('invoice');
  const {item, isLoading, error} = getters;
  const {styles, globalStyles} = css();

  useFocusEffect(
    useCallback(() => {
      if (order && order['@id'])
        invoiceActions.getItems({'order.order': order['@id']});
    }, [order]),
  );

  return (
    <SafeAreaView style={[{paddingBottom: 0}, styles.container]}>
      <StateStore store="orders" />
      {!isLoading && item && !error && (
        <View>
          <OrderHeader key={item.id} order={item} />
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity
              style={[
                globalStyles.button,
                
                {marginRight: 5},
              ]}>
              <Icon name="add-circle" size={24} color="#fff" />
              <Text style={{color: '#fff', marginLeft: 8}}>Emitir NF</Text>
            </TouchableOpacity>
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
