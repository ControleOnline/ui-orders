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

const CloseCashRegister = ({navigation}) => {
  const {getters, actions: ordersActions} = getStore('orders');
  const {items, isLoading, error, columns} = getters;
  const {styles, globalStyles} = css();
  const {getters: peopleGetters} = getStore('people');
  const {currentCompany, defaultCompany} = peopleGetters;
  const {getters: configsGetters} = getStore('configs');
  const {item: config, items: companyConfigs} = configsGetters;
  const status = defaultCompany?.configs['pdv-default-status'];
  useFocusEffect(
    useCallback(() => {
     
    }, [currentCompany]),
  );

  const handleConfirm = () => {
    Alert.alert('Confirmação', 'Deseja realmente fechar o caixa?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Confirmar',
        onPress: () => handleCloseCashRegister(),
      },
    ]);
  };

  const handleCloseCashRegister = () => {
    console.log('Imprime',
      config['cash-wallet-order']);
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
          <Text style={{color: '#fff', marginLeft: 8}}>Fechar Caixa</Text>
        </TouchableOpacity>
      </View>
      <StateStore store="orders" />
      {!isLoading && items.length > 0 && !error && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View>
            <Text>Aqui</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
export default CloseCashRegister;
