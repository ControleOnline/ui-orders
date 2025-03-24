import React, {useCallback, useState} from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import {getStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CloseCashRegister = ({navigation}) => {
  const {styles, globalStyles} = css();
  const {getters: configsGetters, actions: configActions} = getStore('configs');
  const {getters: authGetters, actions: userActions} = getStore('auth');
  const {getters: peopleGetters, actions: peopleActions} = getStore('people');
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {items: orders} = ordersGetters;
  const {currentCompany} = peopleGetters;
  const {user} = authGetters;
  const storagedDevice = localStorage.getItem('device');
  const [device, setDevice] = useState(() => {
    return storagedDevice ? JSON.parse(storagedDevice) : {};
  });
  const {
    item: config,
    items: companyConfigs,
    isLoading,
    error,
  } = configsGetters;

  useFocusEffect(
    useCallback(() => {
      console.log(config['cash-wallet-open-id']);
      //cash-wallet-open-id
    }, [user]),
  );

  const handleConfirmClose = () => {
    Alert.alert('Confirmação', 'Deseja realmente fechar o caixa?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Confirmar',
        onPress: () => handleCashRegister(false),
      },
    ]);
  };

  const handleConfirmOpen = () => {
    Alert.alert('Confirmação', 'Deseja realmente abrir o caixa?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Confirmar',
        onPress: () => handleCashRegister(true),
      },
    ]);
  };
  const handleCashRegister = isOpening => {
    ordersActions
      .getItems({
        'order.id': 'DESC',
        itemsPerPage: 1,
      })
      .then(data => {
        let openId = 0;
        if (data && data.length > 0) openId = data[0]['@id'].replace(/\D/g, '');

        const configValue = isOpening
          ? {
              'cash-wallet-open-id': openId,
              'cash-wallet-closed-id': 0,
            }
          : {
              'cash-wallet-closed-id': openId,
            };

        configActions
          .addConfigs({
            configKey: 'pdv-' + device?.id,
            configValue: JSON.stringify(configValue),
            visibility: 'private',
            people: '/people/' + currentCompany.id,
            module: '/modules/' + 8,
          })
          .then(value => {
            configActions.setItem(JSON.parse(value.configValue));
            navigation.reset({
              index: 0,
              routes: [{name: 'HomePage'}],
            });
          });
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="orders" />
      {!isLoading && !error && (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View>
              <Text>{userActions.getLoggedUser().realname}</Text>
            </View>
          </ScrollView>
          <View>
            <Text>Imprimir</Text>
          </View>
          <View style={{height: 50}}>
            {!config['cash-wallet-closed-id'] == undefined ||
            config['cash-wallet-closed-id'] == 0 ? (
              <TouchableOpacity
                onPress={handleConfirmClose}
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
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleConfirmOpen}
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
                  <Text style={{color: '#fff', marginLeft: 8}}>
                    Abrir Caixa
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
};
export default CloseCashRegister;
