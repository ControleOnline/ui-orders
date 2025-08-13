import React, {useState, useCallback, useEffect} from 'react';
import {View, ScrollView, SafeAreaView, Text, FlatList} from 'react-native';
import {useStores} from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import ProductItem from '@controleonline/ui-products/src/react/components/products/ProductItem';
import {useFocusEffect} from '@react-navigation/native';

const ProductsPage = ({navigation, route}) => {
  const {category} = route.params;
  const productsStore = useStores(state => state.products);
  const {actions, isLoading, error} = productsStore;
  const ordersStore = useStores(state => state.orders);
  const ordersActions = ordersStore.actions;
  const categoriesStore = useStores(state => state.categories);
  const categoriesGetters = categoriesStore.getters;
  const categoryActions = categoriesStore.actions;
  const {items: categories} = categoriesGetters;

  const {styles} = css();
  const [categoryProducts, setCategoryProducts] = useState([]);

  const changeCategoryProduct = (p, changeStorage = false) => {
    const index = categories.findIndex(c => c['@id'] === category['@id']);
    let c = [...categories];
    c[index].products = p;
    setCategoryProducts(p);
    categoryActions.setItems(c);
    if (changeStorage) {
      localStorage.setItem('categories', JSON.stringify(categories));
    }
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
        categories[index].products &&
        categories[index].products.length > 0
      ) {
        setCategoryProducts(categories[index].products);
      } else {
        actions
          .getItems({
            'productCategory.category': category['@id'],
            active: 1,
            'order[product]': 'ASC',
            'order[description]': 'ASC',
            type: ['custom', 'product', 'manufactured'],
          })
          .then(data => {
            if (data && Object.keys(data).length > 0) {
              changeCategoryProduct(data, true);
            }
          });
      }
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
        if (categories.length > 0) {
          categoryActions.setItems(categories);
        }
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
          <SafeAreaView style={styles.container}>
            <StateStore store="products" />
            {!error && !isLoading && (
              <FlatList
                data={categoryProducts}
                keyExtractor={item => item.id.toString()}
                numColumns={2}
                contentContainerStyle={styles.scrollContent}
                columnWrapperStyle={{justifyContent: 'space-between'}}
                renderItem={({item}) => (
                  <ProductItem product={item} category={category} />
                )}
                initialNumToRender={9}
                windowSize={7}
                removeClippedSubviews={true}
              />
            )}
          </SafeAreaView>
        )}
    </SafeAreaView>
  );
};

export default ProductsPage;
