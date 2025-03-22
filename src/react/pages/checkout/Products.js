import React, {useEffect, useState} from 'react';
import {Text, View, ScrollView, SafeAreaView} from 'react-native';
import {getStore} from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import ProductItem from '@controleonline/ui-orders/src/react/components/cart/ProductItem';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

const ProductsPage = ({navigation, route}) => {
  const {category} = route.params;
  const {getters, actions} = getStore('products');
  const {getters: categoryGetters, actions: categoryActions} =
    getStore('categories');
  const {items, isLoading, error} = getters;
  const {item} = categoryGetters;
  const {styles} = css();

  const [products, setProducts] = useState(
    JSON.parse(localStorage.getItem('products') || '{}'),
  );

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    let p = {...products};

    if (!p[category['@id']])
      actions
        .getItems({
          'productCategory.category': category['@id'],
          active: 1,
          'order.name': 'ASC',
          type: ['custom', 'product'],
        })
        .then(data => {
          p[category['@id']] = data;
          setProducts(p);
        });
  }, [category]);

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="products" />
      {!isLoading &&
        products &&
        products[category['@id']] &&
        products[category['@id']].length > 0 &&
        !error && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.Product.productsContainer}>
              <>
                {products[category['@id']].map(product => (
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
