import React, {useCallback} from 'react';
import {TouchableOpacity, Text, View} from 'react-native';
import {getStore} from '@store';
import css from '@controleonline/ui-products/src/react/css/products';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import ProductItem from '@controleonline/ui-orders/src/react/components/cart/ProductItem';

export default function ProductsList({route}) {
  const {styles, globalStyles} = css();
  const navigation = useNavigation();
  const {getters: orderProductsGetters} = getStore('order_products');
  const {getters: deviceConfigGetters} = getStore('device_config');
  const {item: device} = deviceConfigGetters;
  const {items, isLoading, isSaving, error, reload} = orderProductsGetters;

  return (
    <View>
      {(error || ((isLoading || isSaving) && items.length == 0)) && (
        <StateStore store="order_products" />
      )}
      {items.length > 0 && !error && (
        <>
          {items.map(
            orderProduct =>
              orderProduct.quantity > 0 && (
                <ProductItem
                  key={orderProduct.id}
                  orderProduct={orderProduct}
                />
              ),
          )}
        </>
      )}
    </View>
  );
}
