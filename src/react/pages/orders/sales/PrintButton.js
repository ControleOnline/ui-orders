import React from 'react';
import {TouchableOpacity, Text} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import css from '@controleonline/ui-orders/src/react/css/orders';
import cielo from '@controleonline/ui-orders/src/react/services/Cielo/Print';
import {getStore} from '@store';

const PrintButton = ({}) => {
  const {styles, globalStyles} = css();
  const {getters, actions} = getStore('orders');
  const {getters: deviceGetters} = getStore('device');
  const {item: device} = deviceGetters;
  const {item: order} = getters;

  const handlePrint = async () => {
    try {
      if (device.configs['pos-gateway'] == 'cielo') {
        await cielo.print(order, actions);
      }
    } catch (error) {
      console.error('Erro ao processar impressão:', error);
    }
  };

  return (
    <>
      {device.configs['pos-gateway'] == 'cielo' && (
        <TouchableOpacity
          style={[globalStyles.button, globalStyles.btnAdd, {marginLeft: 5}]}
          onPress={handlePrint}>
          <Icon name="print" size={24} color="#fff" />
          <Text style={{color: '#fff', marginLeft: 8}}>Imprimir</Text>
        </TouchableOpacity>
      )}
    </>
  );
};

export default PrintButton;
