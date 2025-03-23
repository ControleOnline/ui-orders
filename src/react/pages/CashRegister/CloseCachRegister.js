import React, {useCallback} from 'react';
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
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Orders = ({navigation}) => {
  const {getters, actions: ordersActions} = getStore('orders');
  const {items, isLoading, error, columns} = getters;
  const {styles, globalStyles} = css();
  const {getters: peopleGetters} = getStore('people');
  const {currentCompany, defaultCompany} = peopleGetters;
  const {getters: configsGetters, actions: configActions} = getStore('configs');
  const {item: config, items: companyConfigs} = configsGetters;
  const status = defaultCompany?.configs['pdv-default-status'];
  useFocusEffect(
    useCallback(() => {
      ordersActions.getItems({
        provider: '/people/' + currentCompany.id,
        status: status,
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
        onPress: () => handleAddOrder(),
      },
    ]);
  };

  const handleAddOrder = () => {
    ordersActions
      .save({
        app: 'PDV',
        provider: '/people/' + currentCompany.id,
        status: '/statuses/' + status,
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
