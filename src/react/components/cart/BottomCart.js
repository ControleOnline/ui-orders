import React, {useCallback, useEffect} from 'react';
import {Text, View, TouchableOpacity, ActivityIndicator} from 'react-native';
import {getStore} from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import PayableToolbar from '@controleonline/ui-orders/src/react/components/PayableToolbar';
import OrderTotalToolbar from '@controleonline/ui-orders/src/react/components/OrderTotalToolbar';

const BottomCart = ({navigation}) => {
  const {getters, actions: cartActions} = getStore('cart');
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {getters: orderProductsGetters, actions: orderProductsActions} =
    getStore('order_products');
  const {items: orderProducts, isSaving} = orderProductsGetters;

  const {getters: invoiceGetters} = getStore('invoice');
  const {isLoading: invoiceIsLoading} = invoiceGetters;
  const {item: order, reload, isLoading: ordersIsloading} = ordersGetters;
  const {item, isLoading, payable} = getters;
  const {styles, globalStyles} = css();

  useEffect(() => {
    cartActions.setItem(order);
  }, [order]);

  useEffect(() => {
    console.log('Testar bem, mas acredito que não precise mais....');
    /*
      if (!order || Object.entries(order).length === 0 || !orderProducts) return;
      let price = 0;
      let o = {...order};
      orderProducts.forEach(op => {
        price += (op.price || 0) * (op.quantity || 0);
      });
      o.price = price;
      o.orderProducts = {...orderProducts};
      //ordersActions.setItem(o);
    */
  }, [orderProducts]);

  const handlePay = item => {
    navigation.navigate('Checkout', {orderId: item.id});
  };

  return (
    <>
      <PayableToolbar />
      {payable < 0 && (
        <View style={[styles.toolbar, {flexDirection: 'row'}]}>
          <OrderTotalToolbar />
          <TouchableOpacity
            onPress={() => handlePay(item)}
            style={[
              globalStyles.button,
              {flex: 1, justifyContent: 'center', alignItems: 'center'},
            ]}>
            <Text style={styles.textWhite}>PAGAR</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

export default BottomCart;
