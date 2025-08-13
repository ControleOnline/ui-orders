import React from 'react';
import {Text, View, TouchableOpacity} from 'react-native';
import {useStores} from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {useNavigation} from '@react-navigation/native';
import PayableToolbar from '@controleonline/ui-orders/src/react/components/PayableToolbar';
import OrderTotalToolbar from '@controleonline/ui-orders/src/react/components/OrderTotalToolbar';

const BottomCart = ({}) => {
  const ordersStore = useStores(state => state.orders);
  const ordersGetters = ordersStore.getters;

  const {item: order} = ordersGetters;
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
