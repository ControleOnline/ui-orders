import React, {useCallback, useState} from 'react';

import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useFocusEffect} from '@react-navigation/native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';
import Formatter from '@controleonline/ui-common/src/utils/formatter.js';
import {
  isPosCashRegisterOpen,
  shouldUsePosCashRegisterLifecycle,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';

import {
  inlineStyle_123_20,
  inlineStyle_130_18,
  inlineStyle_137_24,
  inlineStyle_141_24,
  inlineStyle_148_24,
  inlineStyle_152_24,
  inlineStyle_183_24,
  inlineStyle_192_24,
} from './CloseCashRegister.styles';

const CloseCashRegister = ({navigation}) => {
  const {styles, globalStyles} = css();
  const {width} = useWindowDimensions();
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
  const cashRegisterLifecycleEnabled = shouldUsePosCashRegisterLifecycle(
    device?.configs,
  );
  const cashRegisterOpen = isPosCashRegisterOpen(device?.configs);
  const isCompactWidth = width < 360;
  const footerButtonContainerStyle = isCompactWidth
    ? {
        height: 44,
        paddingHorizontal: 4,
        paddingBottom: 4,
      }
    : null;
  const footerButtonStyle = isCompactWidth
    ? {
        marginHorizontal: 3,
        paddingVertical: 8,
        paddingHorizontal: 6,
      }
    : null;
  const footerButtonTextStyle = isCompactWidth
    ? {
        flexShrink: 1,
        fontSize: 12,
        marginLeft: 4,
      }
    : null;
  const footerButtonIconSize = isCompactWidth ? 18 : 24;

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

  const syncLocalCashRegisterState = useCallback(
    isOpening => {
      const currentConfigs =
        device?.configs && typeof device.configs === 'object'
          ? device.configs
          : {};
      const nextConfigs = {
        ...currentConfigs,
        'cash-wallet-closed-id': isOpening
          ? 0
          : currentConfigs['cash-wallet-open-id'] || 1,
      };

      deviceConfigsActions.setItem({
        ...(device || {}),
        configs: nextConfigs,
      });
    },
    [device, deviceConfigsActions],
  );

  const refreshCurrentConfig = useCallback(async () => {
    if (!currentCompany?.id || !storagedDevice?.id) {
      return;
    }

    const items = await deviceConfigsActions.getItems({
      'device.device': storagedDevice.id,
      people: `/people/${currentCompany.id}`,
      type: device?.type || 'PDV',
    });

    const nextConfig =
      (Array.isArray(items) ? items : []).find(
        item =>
          item?.device?.device === storagedDevice.id ||
          item?.device?.id === storagedDevice.id,
      ) || null;

    if (nextConfig) {
      deviceConfigsActions.setItem(nextConfig);
    }
  }, [
    currentCompany?.id,
    device?.type,
    deviceConfigsActions,
    storagedDevice?.id,
  ]);

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

  const handleCashRegister = async isOpening => {
    if (!currentCompany?.id || !storagedDevice?.id) {
      return;
    }

    const action = isOpening
      ? invoiceActions.openCashRegister
      : invoiceActions.closeCashRegister;

    await action({
      device: storagedDevice.id,
      provider: currentCompany.id,
    });
    syncLocalCashRegisterState(isOpening);
    void refreshCurrentConfig().catch(() => {});

    navigation.reset({
      index: 0,
      routes: [{name: 'HomePage'}],
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
              <Text style={inlineStyle_123_20}>
                {user?.realname}
              </Text>

              {orderItems.map((item, index) => (
                <View
                  key={index}
                  style={inlineStyle_130_18}>
                  <Text style={inlineStyle_137_24}>
                    {item.quantity}
                  </Text>

                  <Text style={inlineStyle_141_24}>
                    {item.product_name}
                    {item.product_description
                      ? ' - ' + item.product_description
                      : ''}
                  </Text>

                  <Text style={inlineStyle_148_24}>
                    {Formatter.formatMoney(item.order_product_price)}
                  </Text>

                  <Text style={inlineStyle_152_24}>
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

            <View
              style={[
                styles.CloseCashRegister.buttonContainer,
                footerButtonContainerStyle,
              ]}>
              <PrintButton
                job={{type: 'cash-register'}}
                store={'invoice'}
                label="Imprimir"
                iconSize={footerButtonIconSize}
                style={[globalStyles.button, footerButtonStyle]}
                printerSelection={{enabled: true}}
                textStyle={footerButtonTextStyle}
              />

              {cashRegisterLifecycleEnabled ? (
                cashRegisterOpen ? (
                <TouchableOpacity
                  onPress={handleConfirmClose}
                  style={[globalStyles.button, footerButtonStyle]}>
                  <Icon name="lock" size={footerButtonIconSize} color="#fff" />
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[inlineStyle_183_24, footerButtonTextStyle]}>
                    {global.t?.t('orders', 'button', 'closeCashRegister')}
                  </Text>
                </TouchableOpacity>
                ) : (
                <TouchableOpacity
                  onPress={handleConfirmOpen}
                  style={[globalStyles.button, footerButtonStyle]}>
                  <Icon name="lock-open" size={footerButtonIconSize} color="#fff" />
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[inlineStyle_192_24, footerButtonTextStyle]}>
                    {global.t?.t('orders', 'button', 'openCashRegister')}
                  </Text>
                </TouchableOpacity>
                )
              ) : (
                <View style={[globalStyles.button, footerButtonStyle, {opacity: 0.75}]}>
                  <Icon name="event-note" size={footerButtonIconSize} color="#fff" />
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[inlineStyle_192_24, footerButtonTextStyle]}>
                    {isCompactWidth
                      ? 'Fechamento diario'
                      : 'Fechamento diario configurado'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default CloseCashRegister;
