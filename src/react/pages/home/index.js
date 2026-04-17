import React, {useState, useCallback} from 'react';
import { TouchableOpacity, View, FlatList, ActivityIndicator } from 'react-native';
import {Text} from 'react-native-animatable';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useStore} from '@store';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
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
  const [posType, setPosType] = useState(null);

  const checkType = device?.configs?.['check-type'] || 'manual';

  const handleTo = to => {
    navigation.navigate(to);
  };

  const handleOpenCheckReader = () => {
    if (checkType === 'barcode') {
      console.log('🎥 [CAMERA] Ativando leitor de código de barras para comanda...');
      // Aqui será ativada a câmera para leitura de código de barras
    } else if (checkType === 'rfid') {
      console.log('📡 [RFID] Ativando leitor RFID para comanda...');
      // Aqui será ativado o leitor RFID
    } else {
      // checkType === 'manual' ou qualquer outro valor
      console.log('📋 [MANUAL] Abrindo lista de comandas manualmente...');
      navigation.navigate('OrderHistoryPage');
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (device?.configs && Object.keys(device.configs).length > 0)
        setPosType(device.configs['pos-type'] || 'full');
    }, [device]),
  );

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
    !device.configs ||
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
