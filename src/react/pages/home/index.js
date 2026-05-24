import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import {Text} from 'react-native-animatable';
import {useStore} from '@store';
import {
  isPosCashRegisterClosed,
  isPosCounterMode,
  isPosKioskMode,
  shouldUsePosCashRegisterLifecycle,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import AppMenuGrid from '@controleonline/ui-layout/src/react/components/AppMenuGrid';
import styles from './index.styles';

export default function HomePage({navigation}) {
  const themeStore = useStore('theme');
  const getters = themeStore.getters;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore.getters;
  const {item: device} = deviceConfigGetters;
  const {colors, menus} = getters;
  const {currentCompany} = peopleGetters;
  const isKioskMode = isPosKioskMode(device?.configs);
  const isCounterMode = isPosCounterMode(device?.configs);
  const shouldUseCashRegisterLifecycle = shouldUsePosCashRegisterLifecycle(
    device?.configs,
  );
  const isCashRegisterClosed = isPosCashRegisterClosed(device?.configs);

  const checkType = device?.configs?.['check-type'] || 'manual';

  const handleTo = to => {
    if (
      shouldUseCashRegisterLifecycle &&
      isCashRegisterClosed &&
      to !== 'CloseCashRegister'
    ) {
      navigation.navigate('CloseCashRegister');
      return;
    }

    navigation.navigate(to);
  };

  const handleOpenCheckReader = () => {
    if (shouldUseCashRegisterLifecycle && isCashRegisterClosed) {
      navigation.navigate('CloseCashRegister');
      return;
    }

    if (checkType === 'barcode') {
      console.log('🎥 [CAMERA] Ativando leitor de código de barras para comanda...');
    } else if (checkType === 'rfid') {
      console.log('📡 [RFID] Ativando leitor RFID para comanda...');
    } else {
      console.log('📋 [MANUAL] Abrindo lista de comandas manualmente...');
    }

    if (isCounterMode) {
      navigation.navigate('OrderHistoryPage', {resumeCounterFlow: true});
      return;
    }

    navigation.navigate('OrderHistoryPage');
  };

  const handleMenuPress = item => {
    if (item?.menuKey === 'orders') {
      handleOpenCheckReader();
      return;
    }

    if (!item?.route) {
      return;
    }

    handleTo(item?.route);
  };

  if (
    isKioskMode ||
    !device?.configs ||
    !currentCompany ||
    Object.entries(currentCompany).length === 0 ||
    !colors ||
    Object.entries(colors).length === 0
  ) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={colors['primary'] || '#0000ff'}
        />
        <Text style={styles.loadingText}>{global.t?.t('orders', 'message', 'loading')}</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <AppMenuGrid
          menus={menus}
          navigation={navigation}
          onMenuPress={handleMenuPress}
        />
      </View>
    </>
  );
}
