import React, {useEffect, useState} from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import ProductsList from '@controleonline/ui-orders/src/react/components/cart/ProductList';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import {getStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import css from '@controleonline/ui-orders/src/react/css/orders';
const OrderDetails = ({route, navigation}) => {
  const order = route.params.order;
  const {getters, actions} = getStore('orders');
  const {item, isLoading, error} = getters;
  const {styles, globalStyles} = css();

  useEffect(() => {
    if (!item || item['@id'] != order['@id']) {
      actions.get(order['@id']);
    }
  }, [order]);

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="orders" />
      {!isLoading && item && !error && (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.orderContainer}>
              <OrderHeader key={item.id} order={item} />
              <View style={styles.itemsSection}>
                <ProductsList />
              </View>
            </View>
          </ScrollView>
          </>
      )}
    </SafeAreaView>
  );
};

export default OrderDetails;
