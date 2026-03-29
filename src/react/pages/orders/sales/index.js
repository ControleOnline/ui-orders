import React, { useCallback, useState, useEffect } from 'react';
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
import { env } from '@env';

const Orders = ({ navigation, route }) => {
  const ordersStore = useStore('orders');
  const { getters: ordersGetters, actions: ordersActions } = ordersStore;
  const { items, isLoading, error } = ordersGetters;

  const peopleStore = useStore('people');
  const { getters: peopleGetters } = peopleStore;
  const { currentCompany, defaultCompany } = peopleGetters;

  const deviceStore = useStore('device');
  const { getters: deviceGetters } = deviceStore;
  const { item: storagedDevice } = deviceGetters;

  const deviceConfigStore = useStore('device_config');
  const { getters: deviceConfigGetters } = deviceConfigStore;
  const { item: device } = deviceConfigGetters;

  const statusStore = useStore('status');
  const { getters: statusGetters, actions: statusActions } = statusStore;
  const { items: statusItems } = statusGetters;

  const { styles, globalStyles } = css();

  const { app: routeApp } = route?.params || {};

  // Status padrão
  const defaultStatus = defaultCompany?.configs['pos-default-status'];

  // Estado dos filtros
  const [selectedStatus, setSelectedStatus] = useState(
    defaultStatus || 'ALL',
  );

  const [selectedApp, setSelectedApp] = useState(
    routeApp || 'ALL',
  );

  // Opções de APP
  const APP_OPTIONS = [
    { label: 'Todos', value: 'ALL' },
    { label: '99Food', value: 'Food99' },
    { label: 'iFood', value: 'iFood' },
    { label: 'PDV', value: 'POS' },
  ];

  // Carregar status
  useEffect(() => {
    statusActions.getItems({
      context: 'order',
    });
  }, []);

  // Atualizar quando mudar empresa
  useEffect(() => {
    if (defaultStatus) {
      setSelectedStatus(defaultStatus);
    }
  }, [defaultStatus]);

  // 🔥 Buscar pedidos
  const loadOrders = useCallback(() => {
    if (
      currentCompany &&
      Object.entries(currentCompany).length > 0 &&
      device?.configs
    ) {
      const params = {
        provider: `/people/${currentCompany.id}`,
        orderType: 'sale',
      };

      if (selectedStatus !== 'ALL') {
        params.status = selectedStatus;
      }

      // 🔥 FILTRO DE APP
      if (selectedApp !== 'ALL') {
        params.app = selectedApp;
      }

      if (env.APP_TYPE === 'POS') {
        params['device.device'] = storagedDevice.id;
      }

      ordersActions.getItems(params).then(data => {
        if (
          device.configs['pos-type'] === 'simple' &&
          data.length === 0
        ) {
          handleAddOrder();
        }
      });
    }
  }, [
    currentCompany,
    selectedStatus,
    selectedApp,
    device,
    storagedDevice,
  ]);

  // Atualiza ao focar
  useFocusEffect(loadOrders);

  // 🔥 Atualiza ao trocar filtros
  useEffect(() => {
    loadOrders();
  }, [selectedStatus, selectedApp]);

  const handleEdit = order => {
    navigation.navigate('OrderDetails', { order });
  };

  const handleConfirm = () => {
    Alert.alert('Confirmação', 'Deseja criar um novo pedido?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => handleAddOrder(true) },
    ]);
  };

  const handleAddOrder = force => {
    ordersActions.setItem(null);
    ordersActions.setPayable(0);
    navigation.navigate('AddProductScreen', { forceCreate: force });
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 🔥 FILTRO DE APP */}
      <View style={{ paddingTop: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {APP_OPTIONS.map(item => (
            <TouchableOpacity
              key={item.value}
              onPress={() => setSelectedApp(item.value)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                marginRight: 8,
                borderRadius: 20,
                backgroundColor:
                  selectedApp === item.value ? '#000' : '#ccc',
              }}
            >
              <Text
                style={{
                  color:
                    selectedApp === item.value ? '#fff' : '#000',
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* STATUS FILTER */}
      <View style={{ paddingVertical: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* TODOS */}
          <TouchableOpacity
            onPress={() => setSelectedStatus('ALL')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              marginRight: 8,
              borderRadius: 20,
              backgroundColor:
                selectedStatus === 'ALL' ? '#007bff' : '#ccc',
            }}
          >
            <Text style={{ color: '#fff' }}>Todos</Text>
          </TouchableOpacity>

          {/* STATUS DINÂMICOS */}
          {statusItems?.map(status => (
            <TouchableOpacity
              key={status.id}
              onPress={() => setSelectedStatus(status.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                marginRight: 8,
                borderRadius: 20,
                backgroundColor:
                  selectedStatus === status.id
                    ? '#007bff'
                    : '#ccc',
              }}
            >
              <Text style={{ color: '#fff' }}>
                {status.status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* BOTÃO */}
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
          ]}
        >
          <Icon name="add-circle" size={24} color="#fff" />
          <Text style={{ color: '#fff', marginLeft: 8 }}>
            Adicionar Pedido
          </Text>
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
                style={[styles.itemsSection]}
              >
                <OrderHeader order={order} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default Orders;