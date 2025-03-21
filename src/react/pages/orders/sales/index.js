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
  const {getters: configsGetters, actions: configActions} = getStore('configs');
  const {actions: authActions} = getStore('auth');
  const {items, isLoading, error, columns} = getters;
  const {styles, globalStyles} = css();
  const {getters: peopleGetters} = getStore('people');
  const device = JSON.parse(localStorage.getItem('device') || '{}');
  const [pdvType, setPdvType] = useState(null);
  const {item: config, items: companyConfigs} = configsGetters;
  const {currentCompany, defaultCompany} = peopleGetters;
  const status = defaultCompany?.configs['pdv-default-status'];

  useFocusEffect(
    useCallback(() => {
      if (currentCompany && Object.entries(currentCompany).length > 0)
        ordersActions
          .getItems({
            provider: '/people/' + currentCompany.id,
            status: status,
            device: device?.id,
          })
          .then(data => {
            if (!data || data.length == 0) handleAddOrder();
          });
    }, [currentCompany]),
  );

  useFocusEffect(
    useCallback(() => {
      if (
        config &&
        Object.entries(config).length > 0 &&
        device &&
        config['config-version' == device.buildNumber]
      )
        setPdvType(config['pdv-type'] || 'full');
      else if (
        config != undefined &&
        config !== false &&
        authActions.isLogged()
      )
        navigation.reset({
          index: 0,
          routes: [{name: 'SettingsPage'}],
        });
    }, [config, device]),
  );

  useFocusEffect(
    useCallback(() => {
      if (config && config['pdv-type'] == 'simple' && items && items.length > 0)
        navigation.reset({
          index: 0,
          routes: [{name: 'OrderDetails', params: {order: items[0]}}],
        });
    }, [items, config]),
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
          app: 'PDV',
          provider: '/people/' + currentCompany.id,
          status: '/statuses/' + status,
          device: device?.id,
        })
        .then(order => {
          items.push(order);
          ordersActions.setItems(items);
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
