import React, {useCallback} from 'react';
import {TouchableOpacity, Text, View} from 'react-native';
import {getStore} from '@store';
import css from '@controleonline/ui-products/src/react/css/products';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import ProductItem from '@controleonline/ui-orders/src/react/components/cart/ProductItem';

export default function ProductsList() {
  const {styles, globalStyles} = css();
  const navigation = useNavigation();
  const {getters: ordersGetters} = getStore('orders');
  const {getters, actions: orderProductsActions} = getStore('order_products');
  const {getters: configsGetters, actions: configActions} = getStore('configs');
  const {item: config} = configsGetters;

  const {item: order} = ordersGetters;
  const {items, isLoading, error, reload} = getters;
  const {getters: peopleGetters} = getStore('people');
  const {currentCompany} = peopleGetters;

  useFocusEffect(
    useCallback(() => {
      if (order && order['@id']) {
        orderProductsActions.getItems({
          company: '/people/' + currentCompany.id,
          order: order['@id'],
          'order.product.product': 'ASC',
          'exists[parentProduct]': 'false',
        });
      }
    }, [order, currentCompany, reload]),
  );

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

  useFocusEffect(
    useCallback(() => {
      if (reload && order && order['@id']) {
        orderProductsActions
          .getItems({
            company: '/people/' + currentCompany.id,
            order: order['@id'],
            'exists[parentProduct]': 'false',
          })
          .finally(() => {
            orderProductsActions.setReload(false);
          });
      }
    }, [navigation, order, reload]),
  );

  return (
    <View>
      <StateStore store="order_products" />

      {!isLoading && items.length > 0 && !error && (
        <>
          {items.map(product => (
            <ProductItem key={product.id} product={product.product} />
          ))}
        </>
      )}
    </View>
  );
}
