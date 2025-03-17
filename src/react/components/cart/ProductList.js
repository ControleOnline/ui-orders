import React, {useEffect, useState, useCallback} from 'react';
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
  const {getters, actions} = getStore('order_products');
  const {item: order} = ordersGetters;
  const {items, isLoading, error, reload} = getters;
  const {getters: peopleGetters} = getStore('people');
  const {currentCompany} = peopleGetters;

  useEffect(() => {
    if ((!items || items.length == 0) && order && order['@id']) {
      actions.getItems({
        company: '/people/' + currentCompany.id,
        order: order['@id'],
        'order.product.product': 'ASC',
        'exists[parentProduct]': 'false',
      });
    }
  }, [order, currentCompany, reload]);

  useFocusEffect(
    useCallback(() => {
      if (reload && order && order['@id']) {
        actions
          .getItems({
            company: '/people/' + currentCompany.id,
            order: order['@id'],
            'exists[parentProduct]': 'false',
          })
          .finally(() => {
            actions.setReload(false);
          });
      }
    }, [navigation, reload]),
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
