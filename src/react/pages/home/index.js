import React, {useState, useCallback} from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {Text} from 'react-native-animatable';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useStore} from '@store';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

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
      navigation.navigate('SalesOrdersIndex');
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
    let title = 'Pedidos de Venda';
    let iconLibrary = 'fontawesome';

    if (checkType === 'barcode') {
      icon = 'camera-alt';
      title = 'Abrir Comanda';
      iconLibrary = 'material';
    } else if (checkType === 'rfid') {
      icon = 'nfc';
      title = 'Abrir Comanda';
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
      title: 'Caixa',
      icon: 'money',
      iconLibrary: 'fontawesome',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('CashRegisterIndex'),
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
        <Text style={styles.loadingText}>Carregando...</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 30,
    paddingBottom: 60,
  },
  content: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  button: {
    width: '48%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderRadius: 10,
  },
  icon: {
    marginBottom: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});