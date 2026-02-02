import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ScrollView, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import ProductItem from '@controleonline/ui-products/src/react/components/products/ProductItem';
import { useFocusEffect } from '@react-navigation/native';

const ProductsPage = ({ navigation, route }) => {
  const { category } = route.params;
  const productsStore = useStore('products');
  const actions = productsStore.actions;
  const isLoading = productsStore.isLoading;
  const error = productsStore.error;
  const ordersStore = useStore('orders');
  const ordersActions = ordersStore.actions;
  const categoriesStore = useStore('categories');
  const categoriesGetters = categoriesStore.getters;
  const categoryActions = categoriesStore.actions;
  const { items: categories } = categoriesGetters;
  const { styles } = css();
  const [categoryProducts, setCategoryProducts] = useState([]);
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const { currentCompany, defaultCompany } = peopleGetters;

  const changeCategoryProduct = (p, changeStorage = false) => {
    const index = categories.findIndex(c => c['@id'] === category['@id']);
    let c = [...categories];
    c[index]['products'] = p;
    setCategoryProducts(p);
    categoryActions.setItems(c);
    if (changeStorage)
      localStorage.setItem('categories', JSON.stringify(categories));
  };

  useEffect(() => {
    if (
      categories &&
      categories.length > 0 &&
      category &&
      category['@id'] &&
      (!categoryProducts || categoryProducts.length == 0)
    ) {
      const index = categories.findIndex(c => c['@id'] === category['@id']);
      if (
        index >= 0 &&
        categories[index] &&
        categories[index]['products'] &&
        categories[index]['products'].length > 0
      )
        setCategoryProducts(categories[index]['products']);
      else
        actions
          .getItems({
            'productCategory.category': category['@id'],
            active: 1,
            'order[product]': 'ASC',
            'order[description]': 'ASC',
            company: currentCompany?.id,
            type: ['custom', 'product', 'manufactured', 'service'],
          })
          .then(data => {
            if (data && Object.keys(data).length > 0)
              changeCategoryProduct(data, true);
          });
    }
  }, [category, categories, categoryProducts]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        ordersActions.initQueue();
        const categories = JSON.parse(
          localStorage.getItem('categories') || '[]',
        );
        setCategoryProducts([]);
        if (categories.length > 0) categoryActions.setItems(categories);
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="products" />
      {categoryProducts &&
        categoryProducts.length > 0 &&
        !error &&
        !isLoading && (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 220 },
            ]}>
            <View style={styles.gridContainer}>
              {categoryProducts.map(product => (
                <View key={product.id} style={styles.cardWrapper}>
                  <ProductItem
                    key={product.id}
                    product={product}
                    category={category}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        )}
    </SafeAreaView>
  );
};

export default ProductsPage;
