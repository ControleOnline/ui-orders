import React, {useEffect, useState} from 'react';
import {Text, View, TouchableOpacity} from 'react-native';
import {getStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import css from '@controleonline/ui-orders/src/react/css/orders';

const ButtonCart = ({navigation}) => {
  const {getters, actions} = getStore('orders');
  const {item, reload} = getters;
  const {styles, globalStyles} = css();

  useEffect(() => {
    console.log(item['@id'], reload);

    if (item && item['@id'] && reload !== false)
      console.log('aqwui');
      //actions.get(item['@id']).finally(() => {                actions.setReload(false);      });
  }, [reload]);

  const handlePay = item => {
    navigation.navigate('Checkout', {orderId: item.id});
  };

  return (
    <View style={[styles.toolbar, {flexDirection: 'row'}]}>
      <Text style={[styles.primary, {flex: 1, textAlign: 'center'}]}>
        {Formatter.formatMoney(item.price)}
      </Text>

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
