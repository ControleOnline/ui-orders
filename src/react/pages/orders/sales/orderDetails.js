import React, {useEffect, useState} from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import ProductsList from '@controleonline/ui-orders/src/react/components/cart';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import {getStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import css from '@controleonline/ui-orders/src/react/css/orders';
import BottomCart from '@controleonline/ui-orders/src/react/components/cart/BottomCart';
const OrderDetails = ({route, navigation}) => {
  const orderId = route.params.orderId;
  const {getters, actions} = getStore('orders');
  const {item, isLoading, error, columns} = getters;
  const {styles, globalStyles} = css();

  useEffect(() => {
    actions.get(orderId);
  }, [orderId]);

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="orders" />
      {!isLoading && item && !error && (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.orderContainer}>
              <OrderHeader key={item.id} order={item} />
              <View style={styles.itemsSection}>
                <ProductsList orderId={orderId} />
              </View>
            </View>
          </ScrollView>
          <BottomCart navigation={navigation} />
        </>
      )}
    </SafeAreaView>
  );
};

export default OrderDetails;
