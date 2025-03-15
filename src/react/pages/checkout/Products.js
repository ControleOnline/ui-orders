import React, {useEffect} from 'react';
import {Text, View, ScrollView, SafeAreaView} from 'react-native';
import {getStore} from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import BottomCart from '@controleonline/ui-orders/src/react/components/cart/BottomCart';
import ProductItem from '@controleonline/ui-orders/src/react/components/cart/ProductItem';

const ProductsPage = ({navigation, route}) => {
  const {category} = route.params;
  const {getters, actions} = getStore('products');
  const {items, isLoading, error} = getters;
  const {styles} = css();

  useEffect(() => {
    actions.getItems({
      category: category['@id'],
      active: 'true',
      'order.name': 'ASC',
      type: ['custom', 'product'],
    });
  }, [category]);

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="products" />
      {!isLoading && items && items.length > 0 && !error && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.Product.productsContainer}>
            <>
              {items.map(product => (
                <ProductItem key={product.id} product={product} />
              ))}
            </>
          </View>
        </ScrollView>
      )}
      <BottomCart navigation={navigation} />
    </SafeAreaView>
  );
};

export default ProductsPage;
