import React, {useState, useCallback, useEffect, useRef, useMemo} from 'react';
import {
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  InteractionManager,
} from 'react-native';
import {getStore} from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import ProductItem from '@controleonline/ui-products/src/react/components/products/ProductItem';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {eventBus} from '@controleonline/ui-common/src/react/components/EventBus';

const ProductsPage = ({navigation, route}) => {
  const {category} = route.params;
  const {actions, isLoading, error} = getStore('products');
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {getters: categoriesGetters, actions: categoryActions} =
    getStore('categories');
  const {items: categories} = categoriesGetters;
  const {item: order} = ordersGetters;
  const {styles, globalStyles} = css();
  const [categoryProducts, setCategoryProducts] = useState([]);

  const changePrice = p => {
    return new Promise(resolve => {
      let o = {...order};
      o.price = p;
      ordersActions.setItem(o);
      resolve();
    });
  };

  useEffect(() => {
    const listener = p => {
      let o = {...order};
      o.price = p;
      ordersActions.setItem(o);
    };

    eventBus.on('price', listener);
    return () => eventBus.off('price', listener);
  }, []);

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
            type: ['custom', 'product', 'manufactured'],
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
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.gridContainer}>
              {categoryProducts.map(product => (
                <View key={product.id} style={styles.cardWrapper}>
                  <ProductItem
                    key={product.id}
                    product={product}
                    category={category}
                    changePrice={changePrice}
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
