import React, {useCallback, useState} from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useFocusEffect} from '@react-navigation/native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';
import Formatter from '@controleonline/ui-common/src/utils/formatter.js';

const CloseCashRegister = ({navigation}) => {
  const {styles, globalStyles} = css();
  const authStore = useStore('auth');
  const authGetters = authStore.getters;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const invoiceStore = useStore('invoice');
  const invoiceGetters = invoiceStore.getters;
  const invoiceActions = invoiceStore.actions;
  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore.getters;
  const deviceConfigsActions = device_configStore.actions;
  const {item: device} = deviceConfigGetters;
  const {currentCompany} = peopleGetters;
  const {user} = authGetters;
  const deviceStore = useStore('device');
  const deviceGetters = deviceStore.getters;
  const {item: storagedDevice} = deviceGetters;
  const {isLoading, error} = invoiceGetters;
  const [orderItems, setOrderItems] = useState([]);

  useFocusEffect(
    useCallback(() => {
      if (storagedDevice)
        invoiceActions
          .getCashRegister({
            device: storagedDevice.id,
            provider: currentCompany.id,
          })
          .then(data => {
            setOrderItems(data);
          });
    }, [storagedDevice, currentCompany]),
  );

  const confirm = (message, callback) => {
    if (Platform.OS === 'web') {
      if (window.confirm(message)) callback();
    } else {
      Alert.alert(global.t?.t('orders', 'title', 'confirmation'), message, [
        { text: global.t?.t('orders', 'button', 'cancel'), style: 'cancel' },
        { text: global.t?.t('orders', 'button', 'confirm'), onPress: callback },
      ]);
    }
  };

  const handleConfirmClose = () => {
    confirm(global.t?.t('orders', 'message', 'confirmCloseCashRegister'), () =>
      handleCashRegister(false),
    );
  };

  const handleConfirmOpen = () => {
    confirm(global.t?.t('orders', 'message', 'confirmOpenCashRegister'), () =>
      handleCashRegister(true),
    );
  };

  const handleCashRegister = isOpening => {
    invoiceActions
      .getItems({
        'order[id]': 'DESC',
        itemsPerPage: 1,
      })
      .then(data => {
        let openId = 0;
        if (data && data.length > 0)
          openId = data[0]['@id'].replace(/\D/g, '');

        const configValue = isOpening
          ? {
              'cash-wallet-open-id': openId,
              'cash-wallet-closed-id': 0,
            }
          : {
              'cash-wallet-closed-id': openId,
            };

        deviceConfigsActions
          .addDeviceConfigs({
            configs: JSON.stringify(configValue),
            people: '/people/' + currentCompany.id,
          })
          .then(() => {
            navigation.reset({
              index: 0,
              routes: [{name: 'HomePage'}],
            });
          });
      });
  };

  const total = orderItems.reduce(
    (sum, item) => sum + item.order_product_total,
    0,
  );

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="invoice" />
      {!isLoading && !error && (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View>
              <Text style={{color: '#666', marginLeft: 8}}>
                {user?.realname}
              </Text>

              {orderItems.map((item, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 4,
                    borderBottomWidth: 1,
                    borderBottomColor: '#eee',
                  }}>
                  <Text style={{color: '#333', flex: 0.2}}>
                    {item.quantity}
                  </Text>

                  <Text style={{color: '#333', flex: 2}}>
                    {item.product_name}
                    {item.product_description
                      ? ' - ' + item.product_description
                      : ''}
                  </Text>

                  <Text style={{color: '#333', flex: 1, textAlign: 'right'}}>
                    {Formatter.formatMoney(item.order_product_price)}
                  </Text>

                  <Text style={{color: '#333', flex: 1, textAlign: 'right'}}>
                    {Formatter.formatMoney(item.order_product_total)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.CloseCashRegister.footerContainer}>
            <View style={styles.CloseCashRegister.totalContainer}>
              <Text style={styles.CloseCashRegister.total}>{global.t?.t('orders', 'label', 'total').toUpperCase()}</Text>
              <Text style={styles.CloseCashRegister.total}>
                {Formatter.formatMoney(total)}
              </Text>
            </View>

            <View style={styles.CloseCashRegister.buttonContainer}>
              <PrintButton
                printType={'cash-register'}
                store={'invoice'}
                style={[globalStyles.button]}
              />

              {!device?.configs ||
              device?.configs['cash-wallet-closed-id'] === undefined ||
              device?.configs['cash-wallet-closed-id'] === 0 ? (
                <TouchableOpacity
                  onPress={handleConfirmClose}
                  style={[globalStyles.button]}>
                  <Icon name="print" size={24} color="#fff" />
                  <Text style={{color: '#fff', marginLeft: 8}}>
                    {global.t?.t('orders', 'button', 'closeCashRegister')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleConfirmOpen}
                  style={[globalStyles.button]}>
                  <Icon name="print" size={24} color="#fff" />
                  <Text style={{color: '#fff', marginLeft: 8}}>
                    {global.t?.t('orders', 'button', 'openCashRegister')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default CloseCashRegister;