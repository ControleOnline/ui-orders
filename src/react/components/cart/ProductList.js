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
  const {getters: ordersGetters} = getStore('orders');
  const {getters, actions: orderProductsActions} = getStore('order_products');
  const {getters: configsGetters, actions: configActions} = getStore('configs');
  const {item: config} = configsGetters;
  const {item} = ordersGetters;
  const {items, isLoading, isSaving, error, reload} = getters;

  useFocusEffect(
    useCallback(() => {
      if (config && config['pdv-type'] == 'simple')
        if (items && items.length == 0) {
          navigation.reset({
            index: 0,
            routes: [{name: 'AddProductScreen'}],
          });
        }
    }, [items, config]),
  );
  return (
    <View>
      {(error || ((isLoading || isSaving) && items.length == 0)) && (
        <StateStore store="order_products" />
      )}
      {items.length > 0 && !error && (
        <>
          {items.map(orderProduct => (
            <ProductItem key={orderProduct.id} orderProduct={orderProduct} />
          ))}
        </>
      )}
    </View>
  );
}
