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
  const {items, isLoading, error, columns} = getters;
  const {styles, globalStyles} = css();
  const {getters: peopleGetters} = getStore('people');
  const localDevice = JSON.parse(localStorage.getItem('device') || '{}');
  const {currentCompany, defaultCompany} = peopleGetters;
  const status = defaultCompany?.configs['pos-default-status'];
  const {getters: deviceGetters} = getStore('device');
  const {item: device} = deviceGetters;

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
            device: localDevice?.id,
          })
          .then(data => {
            if (
              !data ||
              (data.length == 0 && device.configs['pos-type'] == 'simple')
            )
              handleAddOrder();
          });
    }, [currentCompany]),
  );

  useFocusEffect(
    useCallback(() => {
      if (
        device?.configs &&
        device.configs['pos-type'] == 'simple' &&
        items &&
        items.length > 0
      )
        navigation.reset({
          index: 0,
          routes: [{name: 'OrderDetails', params: {order: items[0]}}],
        });
    }, [items, device]),
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
        onPress: () => handleAddOrder(),
      },
    ]);
  };

  const handleAddOrder = () => {
    if (status && currentCompany)
      ordersActions
        .save({
          app: 'POS',
          provider: '/people/' + currentCompany.id,
          status: '/statuses/' + status,
          device: localDevice?.id,
        })
        .then(order => {
          handleEdit(order);
        });
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={{height: 50}}>
        <TouchableOpacity
          onPress={handleConfirm}
          style={[
            globalStyles.button,
            globalStyles.btnAdd,
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
      {!isLoading && items.length > 0 && !error && (
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
