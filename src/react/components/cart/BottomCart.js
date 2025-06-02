import React, {useCallback, useEffect} from 'react';
import {Text, View, TouchableOpacity} from 'react-native';
import {getStore} from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import PayableToolbar from '@controleonline/ui-orders/src/react/components/PayableToolbar';
import OrderTotalToolbar from '@controleonline/ui-orders/src/react/components/OrderTotalToolbar';

const BottomCart = ({}) => {
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {item: order, payable} = ordersGetters;
  const {styles, globalStyles} = css();
  const navigation = useNavigation();

  const handlePay = item => {
    navigation.navigate('Checkout', {orderId: item.id});
  };

  return (
    <>
      <PayableToolbar />
      <View style={[styles.toolbar, {flexDirection: 'row'}]}>
        <OrderTotalToolbar />
        <TouchableOpacity
          onPress={() => handlePay(order)}
          style={[
            globalStyles.button,
            {flex: 1, justifyContent: 'center', alignItems: 'center'},
          ]}>
          <Text style={styles.textWhite}>FECHAR</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

export default BottomCart;
