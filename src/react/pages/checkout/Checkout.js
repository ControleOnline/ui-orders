import {View} from 'react-native';
import React, {useState, useCallback} from 'react';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

import CieloCheckout from '@controleonline/ui-orders/src/react/services/Cielo/Checkout';
import InfinitePay from '@controleonline/ui-orders/src/react/services/InfinitePay/Checkout';

import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';

export default Checkout = ({route}) => {
  const {styles, globalStyles} = css();
  const {getters: configsGetters, actions: configActions} = getStore('configs');
  const {item: config, items: companyConfigs, isSaving} = configsGetters;
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {item: order} = ordersGetters;

  useFocusEffect(
    useCallback(() => {
      if (order) ordersActions.get(order['@id'].replace(/\D/g, ''));
    }, []),
  );
  return (
    <View style={{flex: 1}}>
      {config['pos-gateway'] == 'cielo' && <CieloCheckout />}
      {config['pos-gateway'] == 'infinite-pay' && <InfinitePay />}
    </View>
  );
};
