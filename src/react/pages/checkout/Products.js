import React, {useState, useCallback, useEffect, useRef} from 'react';
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

const ProductsPage = ({navigation, route}) => {
  const {category} = route.params;
  const {actions} = getStore('products');
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {getters: categoriesGetters, actions: categoryActions} =
    getStore('categories');
  const {items: categories} = categoriesGetters;
  const {item: order} = ordersGetters;
  const {getters: orderProductsGetters, actions: orderProductsActions} =
    getStore('order_products');
  const {isLoading, error} = orderProductsGetters;
  const [price, setPrice] = useState(order?.price);
  const debounceRef = useRef(null);
  const {styles, globalStyles} = css();
  const [categoryProducts, setCategoryProducts] = useState([]);

  useFocusEffect(useCallback(() => {}, []));

  useFocusEffect(
    useCallback(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        InteractionManager.runAfterInteractions(() => {
          let o = {...order};
          o.price = price;
          ordersActions.setItem(o);
        });
      }, 300);
    }, [price]),
  );

  const changePrice = useCallback(
    p => {
      setPrice(price + p);
    },
    [price],
  );

  const changeCategoryProduct = (p, changeStorage = false) => {
    const index = categories.findIndex(c => c['@id'] === category['@id']);
    let c = [...categories];
    c[index]['products'] = p;
    setCategoryProducts(p);
    categoryActions.setItems(c);
    if (changeStorage)
      localStorage.setItem('categories', JSON.stringify(categories));
  };

  useFocusEffect(
    useCallback(() => {
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
    }, [category, categories, categoryProducts]),
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        handleSave();
      };
    }, [categoryProducts]),
  );

  const changeProduct = (product, order) => {
    const order_product = {
      parentProduct: null,
      product: product['@id'],
      product_group_id: null,
      quantity: product.quantity || 0,
      order: order['@id'],
    };

    return orderProductsActions.save(order_product);
  };
  const handleSave = () => {
    const currentOrder = {...order};
    const currentCategoryProducts = [...categoryProducts];

    currentCategoryProducts.forEach(product => {
      if (product?.quantity > 0)
        orderProductsActions.addToQueue(() =>
          changeProduct(product, currentOrder),
        );
    });
    orderProductsActions.initQueue();
  };

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
