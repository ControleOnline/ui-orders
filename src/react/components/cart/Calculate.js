import React, {useState, useCallback} from 'react';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {View, Text, TextInput, Button} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {getStore} from '@store';

export default Calculate = ({handleConfirmValue, handleCancel}) => {
  const {getters: paymentTypeGetters, actions: paymentTypeActions} =
    getStore('walletPaymentType');
  const {getters} = getStore('cart');
  const {item: order, payable} = getters;
  const [inputValue, setInputValue] = useState('');

  useFocusEffect(
    useCallback(() => {
      let value = 0;
      if (payable > 0) value = 0;
      else value = payable * -1;
      setInputValue(Formatter.formatMoney(value));
    }, []),
  );

  const handleConfirm = () => {
    const numericValue = parseFloat(inputValue.replace(/\D/g, ''));
    if (isNaN(numericValue) || numericValue <= 0) {
      paymentTypeActions.setError('Por favor, insira um valor válido!');
      handleCancel();
      return;
    } else handleConfirmValue(numericValue / 100);
  };

  const handleInputChange = text => {
    const numericValue = text.replace(/\D/g, '');
    if (!numericValue) {
      setInputValue('');
      return;
    }
    const number = parseFloat(numericValue) / 100;
    setInputValue(Formatter.formatMoney(number));
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}>
      <View
        style={{
          backgroundColor: 'white',
          padding: 20,
          borderRadius: 10,
          width: '80%',
        }}>
        <Text style={{marginBottom: 10}}>Valor à pagar:</Text>
        <TextInput
          placeholderTextColor="#666"
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            padding: 8,
            marginBottom: 10,
            color: '#666',
          }}
          keyboardType="numeric"
          value={inputValue}
          onChangeText={handleInputChange}
          placeholder="Digite o valor"
        />
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <Button title="Cancelar" onPress={handleCancel} />
          <Button title="Confirmar" onPress={handleConfirm} />
        </View>
      </View>
    </View>
  );
};
