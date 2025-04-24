import React, {useCallback} from 'react';
import {Text, View, TouchableOpacity, ActivityIndicator} from 'react-native';
import {getStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import PayableToolbar from '@controleonline/ui-orders/src/react/components/PayableToolbar';

const BottomCart = ({navigation}) => {
  const {getters, actions: cartActions} = getStore('cart');
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {getters: orderProductGetters, actions: orderProductsActions} =
    getStore('order_products');
  const {items: orderProducts, isSaving} = orderProductGetters;

  const {getters: invoiceGetters} = getStore('invoice');
  const {isLoading: invoiceIsLoading} = invoiceGetters;
  const {item: order, reload, isLoading: ordersIsloading} = ordersGetters;
  const {item, isLoading, payable} = getters;
  const {styles, globalStyles} = css();

  useFocusEffect(
    useCallback(() => {
      cartActions.setItem(order);
    }, [order]),
  );

  useFocusEffect(
    useCallback(() => {
      let price = 0;
      let o = {...order};
      orderProducts.forEach(op => {
        price += (op.price || 0) * (op.quantity || 0);
      });
      o.price = price;
      o.orderProducts = orderProducts;
      ordersActions.setItem(o);
    }, [orderProducts]),
  );

  const handlePay = item => {
    navigation.navigate('Checkout', {orderId: item.id});
  };

  return (
    <>
      <PayableToolbar order={order} />
      {payable != undefined && payable != 0 && (
        <View style={[styles.toolbar, {flexDirection: 'row'}]}>
          {isLoading || invoiceIsLoading || isLoading || ordersIsloading ? (
            <ActivityIndicator
              size="small"
              color={styles.primary?.color || '#000'}
              style={{flex: 1}}
            />
          ) : (
            <Text style={[styles.primary, {flex: 1, textAlign: 'center'}]}>
              {Formatter.formatMoney(item.price)}
            </Text>
          )}

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
