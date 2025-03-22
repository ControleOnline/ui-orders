import React, {useCallback} from 'react';
import {Text, View, TouchableOpacity, ActivityIndicator} from 'react-native';
import {getStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import PayableToolbar from '@controleonline/ui-orders/src/react/components/PayableToolbar';

const ButtonCart = ({navigation}) => {
  const {getters, actions: cartActions} = getStore('cart');
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {getters: invoiceGetters} = getStore('invoice');
  const {isLoading: invoiceIsLoading} = invoiceGetters;
  const {item: order, isLoading: ordersIsloading} = ordersGetters;
  const {item, reload, isLoading, payable} = getters;
  const {styles, globalStyles} = css();

  useFocusEffect(
    useCallback(() => {
      if (item && item['@id'] && reload === true && !isLoading) {
        cartActions.setReload(false);
        ordersActions.get(item['@id']);
      }
    }, [reload]),
  );

  useFocusEffect(
    useCallback(() => {
      cartActions.setItem(order);
    }, [order]),
  );

  const handlePay = item => {
    navigation.navigate('Checkout', {orderId: item.id});
  };

  return (
    <>
      <PayableToolbar />
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
              styles.btnPay,
              {flex: 1, justifyContent: 'center', alignItems: 'center'},
            ]}>
            <Text style={styles.textWhite}>PAGAR</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

export default ButtonCart;
