import React, { useCallback } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';

const Orders = ({ navigation }) => {
  const ordersStore = useStore('orders');
  const getters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const { items, isLoading, error } = getters;
  const { styles, globalStyles } = css();
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const deviceStore = useStore('device');
  const deviceGetters = deviceStore.getters;
  const { item: storagedDevice } = deviceGetters;
  const { currentCompany, defaultCompany } = peopleGetters;
  const status = defaultCompany?.configs['pos-default-status'];
  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore.getters;
  const { item: device } = deviceConfigGetters;

  // ALEMAC // 24/01/2026 // para validar o tipo de input de produto
  const productInputType = device?.configs?.['product-input-type'] || 'manual';

  //console.log('📋 [ORDERS] productInputType:', productInputType);

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
            'device.device': storagedDevice.id,
            orderType: 'sale',
          })
          .then(data => {
            if (device.configs['pos-type'] == 'simple')
              if (data.length === 0) handleAddOrder();
          });
    }, [currentCompany]),
  );

  const handleEdit = order => {
    navigation.navigate('OrderDetails', { order: order });
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
    ordersActions.setPayable(0);
    navigation.navigate('AddProductScreen', { forceCreate: force });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ height: 50 }}>
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
          <Text style={{ color: '#fff', marginLeft: 8 }}>Adicionar Pedido</Text>
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
                <OrderHeader order={order}/>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default Orders;