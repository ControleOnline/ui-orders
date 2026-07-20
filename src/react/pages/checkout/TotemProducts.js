import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-common/src/react/components/StateStore';
import ProductItem from '@controleonline/ui-products/src/react/components/products/ProductItem';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '@controleonline/ui-common/src/api';

const ProductsPage = () => {
  const productsStore = useStore('products');
  const isLoading = productsStore.isLoading;
  const error = productsStore.error;
  const ordersStore = useStore('orders');
  const ordersActions = ordersStore.actions;
  const { styles } = css();
  const [products, setProducts] = useState([]);
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const { currentCompany } = peopleGetters;
  const deviceStore = useStore('device');
  const { item: currentDevice } = deviceStore.getters;
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);

  useEffect(() => {
    if (!currentCompany?.id) return;

    setIsCatalogLoading(true);
    api
      .fetch('product-showcases/catalog', {
        params: {
          active: 1,
          integration_key: 'pos',
          company: currentCompany.id,
          device: currentDevice?.device || currentDevice?.id || '',
          type: ['custom', 'product', 'manufactured', 'service'],
        },
      })
      .then(data => {
        const items = Array.isArray(data?.member) ? data.member : [];
        setProducts(items);
      })
      .catch(() => setProducts([]))
      .finally(() => setIsCatalogLoading(false));
  }, [currentCompany?.id, currentDevice?.device, currentDevice?.id]);

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
      {products.length > 0 && !error && !isLoading && !isCatalogLoading && (
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
