import React, {useEffect, useState} from 'react';
import {Text, View, TouchableOpacity, ActivityIndicator} from 'react-native';
import {getStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import css from '@controleonline/ui-orders/src/react/css/orders';

const ButtonCart = ({navigation}) => {
  const {getters, actions} = getStore('cart');
  const {getters: ordersGetters} = getStore('orders');
  const {item: order} = ordersGetters;
  const {item, reload, isLoading} = getters;
  const {styles, globalStyles} = css();

  useEffect(() => {
    if (item && item['@id'] && reload === true && !isLoading) {
      console.log('ReloadCart');
      actions.setReload(false);
      actions.get(item['@id']);
    }
  }, [reload]);

  useEffect(() => {
    actions.setItem(order);
  }, [order]);

  const handlePay = item => {
    navigation.navigate('Checkout', {orderId: item.id});
  };

  return (
    <View style={[styles.toolbar, {flexDirection: 'row'}]}>
      {isLoading ? (
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
        <Text style={styles.textWhite}>FINALIZAR</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ButtonCart;
