import React, {useEffect, useState} from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import {getStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import css from '@controleonline/ui-orders/src/react/css/orders';

const Orders = ({navigation}) => {
  const {getters, actions} = getStore('orders');
  const {items, isLoading, error, columns} = getters;
  const {styles, globalStyles} = css();

  useEffect(() => {
    actions.getItems({
      provider: '/people/4',
      //status: [6],
    });
  }, []);

  const handleEdit = orderId => {
    navigation.navigate('OrderDetails', {orderId: orderId});
  };

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="orders" />
      {!isLoading && items.length > 0 && !error && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View>
            {items.map(order => (
              <TouchableOpacity
                key={order.id}
                onPress={() => handleEdit(order.id)}
                style={[styles.itemsSection]}>
                <OrderHeader order={order} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
export default Orders;
