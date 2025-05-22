import React, {useCallback} from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

import ProductsList from '@controleonline/ui-orders/src/react/components/cart/ProductList';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import {getStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Icon from 'react-native-vector-icons/MaterialIcons';

const OrderDetails = ({route, navigation}) => {
  const order = route.params.order;
  const {getters, actions} = getStore('orders');
  const {item, isLoading, error} = getters;
  const {styles, globalStyles} = css();

  useFocusEffect(
    useCallback(() => {
      if (!item || (item && order && item['@id'] != order['@id']))
        actions.get(order['@id']);
    }, [order]),
  );

  const handleAddProduct = () => {
    navigation.navigate('AddProductScreen');
  };
  const handleOrderTools = () => {
    navigation.navigate('OrderTools');
  };

  useFocusEffect(
    useCallback(() => {
      if (item && item.orderProducts?.length == 0) handleAddProduct();
    }, [item]),
  );

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
              <Text style={{color: '#fff', marginLeft: 8}}>Adicionar Item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleOrderTools}
              style={[globalStyles.button, {marginLeft: 5}]}>
              <Icon name="settings" size={24} color="#fff" />
              <Text style={{color: '#fff', marginLeft: 8}}>Detalhes</Text>
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
