import React, {useEffect} from 'react';
import {Text, View, ScrollView, SafeAreaView} from 'react-native';
import {getStore} from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import ProductItem from '@controleonline/ui-orders/src/react/components/cart/ProductItem';

const ProductsPage = ({navigation, route}) => {
  const {category} = route.params;
  const {getters, actions} = getStore('products');
  const {getters: categoryGetters, actions: categoryActions} =
    getStore('categories');
  const {items, isLoading, error} = getters;
  const {item} = categoryGetters;
  const {styles} = css();

  useEffect(() => {
    if (!item || item['@id'] != category['@id']) {
      actions
        .getItems({
          'productCategory.category': category['@id'],
          active: 1,
          'order.name': 'ASC',
          type: ['custom', 'product'],
        })
        .finally(() => {
          categoryActions.setItem(category);
        });
    }
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
      
    </SafeAreaView>
  );
};

export default ProductsPage;
