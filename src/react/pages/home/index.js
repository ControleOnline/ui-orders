import React from 'react';
import { TouchableOpacity, View, FlatList, ActivityIndicator } from 'react-native';
import {Text} from 'react-native-animatable';
import {useStore} from '@store';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {
  isPosCashRegisterClosed,
  isPosCounterMode,
  isPosKioskMode,
  shouldUsePosCashRegisterLifecycle,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import styles from './index.styles';

export default function HomePage({navigation}) {
  const themeStore = useStore('theme');
  const getters = themeStore.getters;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore.getters;
  const {item: device} = deviceConfigGetters;
  const {colors} = getters;
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
      // Aqui será ativada a câmera para leitura de código de barras
    } else if (checkType === 'rfid') {
      console.log('📡 [RFID] Ativando leitor RFID para comanda...');
      // Aqui será ativado o leitor RFID
    } else {
      // checkType === 'manual' ou qualquer outro valor
      console.log('📋 [MANUAL] Abrindo lista de comandas manualmente...');
      if (isCounterMode) {
        navigation.navigate('OrderHistoryPage', {resumeCounterFlow: true});
        return;
      }

      navigation.navigate('OrderHistoryPage');
    }
  };

  const getCheckButtonConfig = () => {
    let icon = 'shopping-cart';
    let title = global.t?.t('orders', 'title', 'salesOrders');
    let iconLibrary = 'fontawesome';

    if (checkType === 'barcode') {
      icon = 'camera-alt';
      title = global.t?.t('orders', 'button', 'openTab');
      iconLibrary = 'material';
    } else if (checkType === 'rfid') {
      icon = 'nfc';
      title = global.t?.t('orders', 'button', 'openTab');
      iconLibrary = 'material';
    }

    return {
      id: '1',
      title,
      icon,
      iconLibrary,
      backgroundColor: colors['primary'],
      onPress: handleOpenCheckReader,
    };
  };

  const buttons = [
    getCheckButtonConfig(),
    {
      id: '2',
      title: global.t?.t('orders', 'title', 'cashRegister'),
      icon: 'money',
      iconLibrary: 'fontawesome',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('CashRegisterIndex'),
    },
    {
      id: '3',
      title: 'Impressões',
      icon: 'print',
      iconLibrary: 'material',
      backgroundColor: '#0f766e',
      onPress: () => handleTo('PrintQueuePage'),
    },
  ];

  const renderButton = ({item}) => (
    <TouchableOpacity
      style={[styles.button, {backgroundColor: item.backgroundColor}]}
      onPress={item.onPress}>
      {item.iconLibrary === 'material' ? (
        <MaterialIcon name={item.icon} size={30} color="#fff" style={styles.icon} />
      ) : (
        <Icon name={item.icon} size={30} color="#fff" style={styles.icon} />
      )}
      <Text style={styles.buttonText}>{item.title}</Text>
    </TouchableOpacity>
  );

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
        <FlatList
          data={buttons}
          renderItem={renderButton}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.content}
        />
      </View>
    </>
  );
}
