import React, {useState} from 'react';
import {TouchableOpacity, Text} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {CieloPrint} from '@controleonline/ui-orders/src/react/services/Cielo/Print';
import {getStore} from '@store';

const PrintButton = ({printType, store}) => {
  const {styles, globalStyles} = css();
  const {getters, actions} = getStore(store);
  const {getters: deviceConfigGetters} = getStore('device_config');
  const {getters: peopleGetters} = getStore('people');
  const {defaultCompany} = peopleGetters;
  const {item: device} = deviceConfigGetters;
  const {error} = getters;
  const [isPrinting, setIsPrinting] = useState(false);
  const storagedDevice = localStorage.getItem('device');
  const [localDevice] = useState(() => {
    return storagedDevice ? JSON.parse(storagedDevice) : {};
  });
  const handlePrint = async () => {
    if (device.configs['pos-gateway'] !== 'cielo') return;

    try {
      setIsPrinting(true);
      print = new CieloPrint(localDevice, defaultCompany, getters, actions);
      await print.print(printType);
    } catch (err) {
      actions.setError(err.message || 'Erro ao processar impressão');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <>
      {device.configs['pos-gateway'] === 'cielo' && (
        <TouchableOpacity
          style={[globalStyles.button, globalStyles.btnAdd, {marginLeft: 5}]}
          onPress={handlePrint}
          disabled={isPrinting}>
          <Icon name="print" size={24} color="#fff" />
          <Text style={{color: '#fff', marginLeft: 8}}>
            {isPrinting ? 'Imprimindo...' : 'Imprimir'}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
};

export default PrintButton;
