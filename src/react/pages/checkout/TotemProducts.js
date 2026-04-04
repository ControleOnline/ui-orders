import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import ProductItem from '@controleonline/ui-products/src/react/components/products/ProductItem';
import { useFocusEffect } from '@react-navigation/native';

const ProductsPage = () => {
  const productsStore = useStore('products');
  const actions = productsStore.actions;
  const isLoading = productsStore.isLoading;
  const error = productsStore.error;
  const ordersStore = useStore('orders');
  const ordersActions = ordersStore.actions;
  const { styles } = css();
  const [products, setProducts] = useState([]);
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const { currentCompany, defaultCompany } = peopleGetters;

  useEffect(() => {
    actions
      .getItems({
        active: 1,
        'order[price]': 'ASC',
        'order[product]': 'ASC',
        'order[description]': 'ASC',
        company: currentCompany?.id,
        type: ['custom', 'product', 'manufactured', 'service'],
      })
      .then(data => {
        if (data && Object.keys(data).length > 0) setProducts(data);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        ordersActions.initQueue();
        setProducts([]);
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="products" />
      {products.length > 0 && !error && !isLoading && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.gridContainer}>
            {products.map(product => (
              <View key={product.id} style={styles.cardWrapper}>
                <ProductItem product={product} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default ProductsPage;
