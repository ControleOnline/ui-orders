// ProductsList.js
import React, {useEffect} from 'react';
import {TouchableOpacity, Text, View} from 'react-native';
import {getStore} from '@store';
import css from '@controleonline/ui-products/src/react/css/products';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import ProductItem from '@controleonline/ui-orders/src/react/components/cart/ProductItem';

export default ProductsList = props => {
  const {orderId} = props;
  const {styles} = css();
  const navigation = useNavigation();

  const {getters, actions} = getStore('order_products');
  const {items, isLoading, error} = getters;
  const {getters: peopleGetters} = getStore('people');
  const {currentCompany} = peopleGetters;

  useEffect(() => {
    actions.getItems({
      company: '/people/' + currentCompany.id,
      order: 'orders/' + orderId,
      'exists[parentProduct]': 'false',
    });
  }, [orderId, currentCompany]);

  const handleAddProduct = () => {
    navigation.navigate('AddProductScreen', {orderId});
  };

  return (
    <View>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <Text style={styles.subHeader}>Itens do Pedido</Text>
        <TouchableOpacity onPress={handleAddProduct} style={{marginLeft: 10}}>
          <Icon name="add-circle" size={24} color="#000" />
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
};
