import React, {useCallback} from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import ProductsList from '@controleonline/ui-orders/src/react/components/cart/ProductList';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Icon from 'react-native-vector-icons/MaterialIcons';

const OrderDetails = ({route, navigation}) => {
  const order = route.params.order;
  const ordersStore = useStore('orders');
  const getters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const order_productsStore = useStore('order_products');
  const orderProductsActions = order_productsStore.actions;
  const invoiceStore = useStore('invoice');
  const invoiceGetters = invoiceStore.getters;
  const invoiceActions = invoiceStore.actions;
  const {items: invoices} = invoiceGetters;
  const {item, isLoading, error} = getters;
  const {styles, globalStyles} = css();

  useFocusEffect(
    useCallback(() => {
      if (
        invoices &&
        invoices.length === 0 &&
        order &&
        order['@id'] &&
        !isLoading
      ) {
        invoiceActions.getItems({'order.order': order['@id']});
      }
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (order && order['@id'])
        ordersActions.get(order['@id']).then(data => {
          orderProductsActions.setItems(data.orderProducts);
        });
    }, []),
  );

  const handleAddProduct = () => {
    navigation.navigate('AddProductScreen');
  };
  const handleOrderTools = () => {
    navigation.navigate('OrderTools');
  };

  return (
    <SafeAreaView style={[styles.container, {paddingBottom: 120}]}>
      <StateStore store="orders" />
      {!isLoading && item && !error && (
        <>
          <OrderHeader key={item.id} order={item} />
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity
              onPress={handleAddProduct}
              style={[globalStyles.button, {marginRight: 5}]}>
              <Icon name="add-circle" size={24} color="#fff" />
              <Text style={{color: '#fff', marginLeft: 8}}>{t.t('default','button',"AddItem")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleOrderTools}
              style={[globalStyles.button, {marginLeft: 5}]}>
              <Icon name="settings" size={24} color="#fff" />
              <Text style={{color: '#fff', marginLeft: 8}}>{t.t('default','button',"Details")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{paddingBottom: 0}}>
            <View style={styles.itemsSection}>
              <ProductsList order={order} />
            </View>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
};

export default OrderDetails;
