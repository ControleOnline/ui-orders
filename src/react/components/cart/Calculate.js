import React, {useState, useCallback} from 'react';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {View, Text, TextInput, Button} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useStore} from '@store';

import {
  inlineStyle_45_6,
  inlineStyle_52_8,
  inlineStyle_58_14,
  inlineStyle_61_10,
  inlineStyle_73_14,
} from './Calculate.styles';

const Calculate = ({handleConfirmValue, handleCancel}) => {
  const walletPaymentTypeStore = useStore('walletPaymentType');
  const paymentTypeActions = walletPaymentTypeStore.actions;
  const ordersStore = useStore('orders');
  const getters = ordersStore.getters;
  const {payable} = getters;
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
      paymentTypeActions.setError(global.t?.t('orders', 'message', 'enterValidAmount'));
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
      style={inlineStyle_45_6}>
      <View
        style={inlineStyle_52_8}>
        <Text style={inlineStyle_58_14}>{global.t?.t('orders', 'label', 'amountToPay')}:</Text>
        <TextInput
          placeholderTextColor="#666"
          style={inlineStyle_61_10}
          keyboardType="numeric"
          value={inputValue}
          onChangeText={handleInputChange}
          placeholder={global.t?.t('orders', 'placeholder', 'enterValue')}
        />
        <View style={inlineStyle_73_14}>
          <Button title={global.t?.t('orders', 'button', 'cancel')} onPress={handleCancel} />
          <Button title={global.t?.t('orders', 'button', 'confirm')} onPress={handleConfirm} />
        </View>
      </View>
    </View>
  );
};

export default Calculate;
