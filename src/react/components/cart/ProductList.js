import React, {useEffect, useState, useCallback} from 'react';
import {TouchableOpacity, Text, View} from 'react-native';
import {getStore} from '@store';
import css from '@controleonline/ui-products/src/react/css/products';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import Icon from 'react-native-vector-icons/MaterialIcons';
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
    if (!items || items.length == 0) {
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
      if (reload) {
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

  const handleAddProduct = () => {
    navigation.navigate('AddProductScreen');
  };

  return (
    <View>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <TouchableOpacity
          onPress={handleAddProduct}
          style={[
            globalStyles.button,
            globalStyles.btnAdd,
            {
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}>
          <Icon name="add-circle" size={24} color="#fff" />
          <Text style={{color: '#fff', marginLeft: 8}}>Adicionar Item</Text>
        </TouchableOpacity>
      </View>
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
