import React, {useEffect, useState} from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import ProductsList from '@controleonline/ui-products/src/react/components/products/index';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import {getStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import css from '@controleonline/ui-orders/src/react/css/orders';
const OrderDetails = ({route, navigation}) => {
  const orderId = route.params.orderId;
  const {getters, actions} = getStore('orders');
  const {item, isLoading, error, columns} = getters;
  const {styles, globalStyles} = css();

  useEffect(() => {
    actions.get(orderId);
  }, [orderId]);

  const handlePay = orderId => {
    navigation.navigate('Checkout', {orderId: orderId});
  };
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
          <View style={styles.toolbar}>
            <TouchableOpacity
              onPress={() => handlePay(orderId)}
              style={[globalStyles.button, styles.btnPay]}>
              <Text style={styles.textWhite}>ADICIONAR ITENS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handlePay(orderId)}
              style={[globalStyles.button, styles.btnPay]}>
              <Text style={styles.textWhite}>FINALIZAR</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default OrderDetails;
