import React, {useState, useCallback} from 'react';
import {
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import {getStore} from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import ProductItem from '@controleonline/ui-products/src/react/components/products/ProductItem';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

const ProductsPage = ({navigation, route}) => {
  const {category} = route.params;
  const {getters, actions} = getStore('products');
  const {getters: ordersGetters} = getStore('orders');
  const {item: order} = ordersGetters;
  const {getters: orderProductsGetters, actions: orderProductActions} =
    getStore('order_products');
  const {
    items: orderProducts,
    reload,
    isLoading,
    isSaving,
    error,
  } = orderProductsGetters;

  const {styles, globalStyles} = css();

  const [products, setProducts] = useState(
    JSON.parse(localStorage.getItem('products') || '{}'),
  );

  const changeProduct = product => {
    const order_product = {
      parentProduct: null,
      product: product['@id'],
      product_group_id: null,
      quantity: product.quantity || 0,
      order: order['@id'],
    };

    return orderProductActions.save(order_product).then(() => {
      const storedProducts = JSON.parse(
        localStorage.getItem('products') || '{}',
      );
      if (storedProducts[category['@id']]) {
        storedProducts[category['@id']] = storedProducts[category['@id']].map(
          p => (p['@id'] === product['@id'] ? {...p, quantity: 0} : p),
        );
        localStorage.setItem('products', JSON.stringify(storedProducts));
        setProducts(storedProducts);
      }
    });
  };

  useFocusEffect(
    useCallback(() => {
      let p = {...products};

      if (!p[category['@id']]) {
        actions
          .getItems({
            'productCategory.category': category['@id'],
            active: 1,
            'order[product]': 'ASC',
            'order[description]': 'ASC',
            type: ['custom', 'product', 'manufactured'],
          })
          .then(data => {
            p[category['@id']] = data;
            setProducts(p);
            localStorage.setItem('products', JSON.stringify(p));
          });
      }
    }, [category]),
  );

  const onQuantityChange = () => {
    setProducts(JSON.parse(localStorage.getItem('products') || '{}'));
  };

  useFocusEffect(
    useCallback(() => {
      const hasProducts = Object.values(products)
        .flat()
        .some(p => p.quantity > 0);

      if (hasProducts)
        navigation.setOptions({
          headerLeft: () => null,
          headerBackVisible: false,
          gestureEnabled: false,
        });
      else
        navigation.setOptions({
          headerBackVisible: true,
          gestureEnabled: true,
        });
    }, [products]),
  );

  const handleSave = () => {
    const storedProducts = JSON.parse(localStorage.getItem('products') || '{}');

    for (const categoryId in storedProducts) {
      const categoryProducts = storedProducts[categoryId];
      categoryProducts.forEach(product => {
        if (product.quantity > 0)
          orderProductActions.addToQueue(() => changeProduct(product));
      });
    }
    let queueInstance = orderProductActions.initQueue();
    const checkQueueStatus = setInterval(() => {
      if (queueInstance.queue.length === 0 && !queueInstance.isProcessing) {
        clearInterval(checkQueueStatus);
        navigation.navigate('OrderDetails', {order});
      }
    }, 100);
  };

  const currentCategoryProducts = products[category['@id']] || [];

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="order_products" />
      {!isLoading &&
        !isSaving &&
        currentCategoryProducts.length > 0 &&
        !error && (
          <>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.Product.productsContainer}>
                {currentCategoryProducts.map(product => (
                  <ProductItem
                    key={product.id}
                    product={product}
                    category={category}
                    onQuantityChange={onQuantityChange}
                  />
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              onPress={handleSave}
              style={[
                globalStyles.button,
                {
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                },
              ]}>
              <Text style={styles.textWhite}>ADICIONAR</Text>
            </TouchableOpacity>
          </>
        )}
    </SafeAreaView>
  );
};

export default ProductsPage;
