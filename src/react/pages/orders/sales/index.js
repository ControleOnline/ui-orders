import React, {useState, useCallback} from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import {getStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

const Orders = ({navigation}) => {
  const {getters, actions: ordersActions} = getStore('orders');
  const {items, item, isLoading, error, columns} = getters;
  const {styles, globalStyles} = css();
  const {getters: peopleGetters} = getStore('people');
  const {actions: cartActions} = getStore('cart');
  const localDevice = JSON.parse(localStorage.getItem('device') || '{}');
  const {getters: orderProductsGetters, actions: orderProductsActions} =
    getStore('order_products');
  const {getters: invoiceGetters, actions: invoiceActions} =
    getStore('invoice');
  const {currentCompany, defaultCompany} = peopleGetters;
  const status = defaultCompany?.configs['pos-default-status'];
  const {getters: deviceConfigGetters} = getStore('device_config');
  const {item: device} = deviceConfigGetters;

  useFocusEffect(
    useCallback(() => {
      if (
        currentCompany &&
        Object.entries(currentCompany).length > 0 &&
        device.configs
      )
        ordersActions
          .getItems({
            provider: '/people/' + currentCompany.id,
            status: status,
            'device.device': localDevice?.id,
            orderType: 'sale',
          })
          .then(data => {
            if (device.configs['pos-type'] == 'simple')
              if (data.length === 0) handleAddOrder();
          });
    }, [currentCompany]),
  );

  const handleEdit = order => {
    navigation.navigate('OrderDetails', {order: order});
  };

  const handleConfirm = () => {
    Alert.alert('Confirmação', 'Deseja criar um novo pedido?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Confirmar',
        onPress: () => handleAddOrder(true),
      },
    ]);
  };

  const handleAddOrder = force => {
    ordersActions.setItem(null);
    invoiceActions.setItems(null);
    orderProductsActions.setItems(null);
    cartActions.setItem(null);
    cartActions.setPayable(0);
    navigation.navigate('AddProductScreen', {force: force});
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={{height: 50}}>
        <TouchableOpacity
          onPress={handleConfirm}
          style={[
            globalStyles.button,

            {
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}>
          <Icon name="add-circle" size={24} color="#fff" />
          <Text style={{color: '#fff', marginLeft: 8}}>Adicionar Pedido</Text>
        </TouchableOpacity>
      </View>
      <StateStore store="orders" />
      {!isLoading && items && items.length > 0 && !error && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View>
            {items.map(order => (
              <TouchableOpacity
                key={order.id}
                onPress={() => handleEdit(order)}
                style={[styles.itemsSection]}>
                <OrderHeader order={order} showId={true} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
export default Orders;
