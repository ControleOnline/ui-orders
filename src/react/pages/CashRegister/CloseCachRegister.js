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
  const {getters: authGetters} = getStore('auth');
  const {getters: peopleGetters} = getStore('people');
  const {actions: invoiceActions} = getStore('invoice');
  const {getters: deviceGetters, actions: deviceActions} = getStore('device');
  const {item: device} = deviceGetters;
  const {currentCompany} = peopleGetters;
  const {user} = authGetters;
  const storagedDevice = localStorage.getItem('device');
  const [localDevice] = useState(() => {
    return storagedDevice ? JSON.parse(storagedDevice) : {};
  });
  const {isLoading, error} = configsGetters;

  useFocusEffect(
    useCallback(() => {
      console.log(device.configs['cash-wallet-open-id']);
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
    invoiceActions
      .getItems({
        'order[id]': 'DESC',
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

        deviceActions
          .addDeviceConfigs({
            device: localDevice?.id,
            configs: JSON.stringify(configValue),
            people: '/people/' + currentCompany.id,
          })
          .then(data => {
            if (data && Object.keys(data).length > 0) {
              let d = {...data};
              d.configs = JSON.parse(d.configs);
              deviceActions.setItem(d);
            }
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
              <Text>{user.realname}</Text>
            </View>
          </ScrollView>
          <View>
            <Text>Imprimir</Text>
          </View>
          <View style={{height: 50}}>
            {!device.configs['cash-wallet-closed-id'] == undefined ||
            device.configs['cash-wallet-closed-id'] == 0 ? (
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
