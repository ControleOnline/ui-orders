import React, {useState} from 'react';
import {TouchableOpacity, Text} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';

const PrintButton = ({printType, store}) => {
  const {styles, globalStyles} = css();
  const {getters, actions} = getStore(store);
  const {getters: deviceConfigGetters} = getStore('device_config');
  const {getters: printGetters, actions: printActions} = getStore('print');
  const {isLoading} = printGetters;
  const {item: device} = deviceConfigGetters;

  const handlePrint = async () => {
    try {
      printActions.addToPrint({
        printId: Math.random().toString(36).substr(2, 9),
        printType: printType,
        id: getters.item ? getters.item['@id'].split('/').pop() : null,
      });
    } catch (err) {
      actions.setError(err.message || 'Erro ao processar impressão');
    }
  };

  return (
    <>
      {device &&
        device.configs &&
        device.configs['pos-gateway'] === 'cielo' && (
          <TouchableOpacity
            style={[globalStyles.button, {marginLeft: 5}]}
            onPress={handlePrint}
            disabled={isLoading}>
            <Icon name="print" size={24} color="#fff" />
            <Text style={{color: '#fff', marginLeft: 8}}>
              {isLoading ? 'Imprimindo...' : 'Imprimir'}
            </Text>
          </TouchableOpacity>
        )}
    </>
  );
};

export default PrintButton;
