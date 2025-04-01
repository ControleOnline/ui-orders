import React, {useState} from 'react';
import {TouchableOpacity, Text} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import css from '@controleonline/ui-orders/src/react/css/orders';
import cielo from '@controleonline/ui-orders/src/react/services/Cielo/Print';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {getStore} from '@store';

const PrintButton = ({}) => {
  const {styles, globalStyles} = css();
  const {getters, actions} = getStore('orders');
  const {getters: deviceGetters} = getStore('device');
  const {item: device} = deviceGetters;
  const {item: order, error} = getters;
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    if (device.configs['pos-gateway'] !== 'cielo') return;

    try {
      setIsPrinting(true);
      await cielo.print(order, actions);
    } catch (err) {
      actions.setError(err.message || 'Erro ao processar impressão');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <>
      <StateStore store="orders" />
      {!error && device.configs['pos-gateway'] === 'cielo' && (
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
