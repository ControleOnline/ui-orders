import React, {useEffect, useState, useCallback} from 'react';
import {Text, View, ScrollView, SafeAreaView} from 'react-native';
import {getStore} from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import ProductItem from '@controleonline/ui-orders/src/react/components/cart/ProductItem';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

const ProductsPage = ({navigation, route}) => {
  const {category} = route.params;
  const {getters, actions} = getStore('products');
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {item: order} = ordersGetters;
  const {getters: orderProductsGetters, actions: orderProductsActions} =
    getStore('order_products');
  const {items: orderProducts, reload} = orderProductsGetters;
  const {isLoading, error} = getters;

  const {styles} = css();

  const [products, setProducts] = useState(
    JSON.parse(localStorage.getItem('products') || '{}'),
  );

  const [oProducts, setOProducts] = useState(
    JSON.parse(localStorage.getItem('products') || '{}'),
  );

  useFocusEffect(
    useCallback(() => {
      localStorage.setItem('products', JSON.stringify(products));
    }, [products]),
  );

  const getProductQuantities = () => {
    if (products) {
      ops = [];
      if (products[category['@id']])
        products[category['@id']].forEach(product => {
          const op = orderProducts.find(
            orderProduct => orderProduct.product['@id'] === product['@id'],
          );

          if (op) ops.push(op);
          else
            ops.push({
              product: product,
              quantity: 0,
            });
        });
      setOProducts(ops);
    }
  };
  useFocusEffect(
    useCallback(() => {
      getProductQuantities();
    }, [products, orderProducts]),
  );

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
      {!isLoading && oProducts && oProducts.length > 0 && !error && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.Product.productsContainer}>
            <>
              {oProducts.map(orderProduct => (
                <ProductItem
                  key={orderProduct.product.id}
                  orderProduct={orderProduct}
                />
              ))}
            </>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default ProductsPage;
