import React, {useState, useCallback} from 'react';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {View, Text, TextInput, TouchableOpacity} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useStore} from '@store';

import {
  inlineStyle_45_6,
  inlineStyle_52_8,
  inlineStyle_58_14,
  inlineStyle_61_10,
  inlineStyle_73_14,
  inlineStyle_79_12,
  inlineStyle_86_12,
  inlineStyle_93_10,
  inlineStyle_99_10,
  inlineStyle_104_10,
  inlineStyle_112_10,
} from './Calculate.styles';

const Calculate = ({
  handleConfirmValue,
  handleCancel,
  value,
  onChangeText,
  title = global.t?.t('orders', 'label', 'amountToPay') || 'Valor a cobrar',
  description = null,
  fieldLabel = '',
  placeholder = global.t?.t('orders', 'placeholder', 'enterValue') || 'Digite o valor',
  confirmLabel = global.t?.t('orders', 'button', 'confirm') || 'Confirmar',
  cancelLabel = global.t?.t('orders', 'button', 'cancel') || 'Cancelar',
  details = [],
  invalidValueMessage = global.t?.t('orders', 'message', 'enterValidAmount'),
  closeOnInvalid = false,
  defaultValue = null,
}) => {
  const walletPaymentTypeStore = useStore('walletPaymentType');
  const paymentTypeActions = walletPaymentTypeStore.actions;
  const ordersStore = useStore('orders');
  const getters = ordersStore.getters;
  const {item: order, payable} = getters;
  const [inputValue, setInputValue] = useState('');
  const isControlled = typeof onChangeText === 'function';
  const resolvedValue = isControlled ? String(value || '') : inputValue;

  useFocusEffect(
    useCallback(() => {
      if (isControlled) {
        return undefined;
      }

      const payableValue = Math.abs(Number(payable || 0));
      const fallbackValue = Number(order?.price || 0);
      const nextDefaultValue =
        defaultValue !== null && defaultValue !== undefined
          ? Number(defaultValue || 0)
          : payableValue > 0
            ? payableValue
            : fallbackValue;

      setInputValue(
        nextDefaultValue > 0 ? Formatter.formatMoney(nextDefaultValue) : '',
      );
      return undefined;
    }, [defaultValue, isControlled, order?.price, payable]),
  );

  const handleConfirm = () => {
    const numericValue = parseFloat(String(resolvedValue || '').replace(/\D/g, ''));
    if (isNaN(numericValue) || numericValue <= 0) {
      paymentTypeActions.setError(invalidValueMessage);
      if (closeOnInvalid) {
        handleCancel();
      }
      return;
    } else handleConfirmValue(numericValue / 100);
  };

  const handleInputChange = text => {
    const numericValue = text.replace(/\D/g, '');
    if (!numericValue) {
      if (isControlled) {
        onChangeText('');
      } else {
        setInputValue('');
      }
      return;
    }
    const number = parseFloat(numericValue) / 100;
    const formattedValue = Formatter.formatMoney(number);
    if (isControlled) {
      onChangeText(formattedValue);
      return;
    }

    setInputValue(formattedValue);
  };

  return (
    <View style={inlineStyle_45_6}>
      <View style={inlineStyle_52_8}>
        <Text style={inlineStyle_58_14}>{title}</Text>
        {Array.isArray(description)
          ? description.filter(Boolean).map((item, index) => (
              <Text key={`description-${index}`} style={inlineStyle_79_12}>
                {item}
              </Text>
            ))
          : description ? (
              <Text style={inlineStyle_79_12}>{description}</Text>
            ) : null}
        {fieldLabel ? <Text style={inlineStyle_86_12}>{fieldLabel}</Text> : null}
        <TextInput
          placeholderTextColor="#666"
          style={inlineStyle_61_10}
          keyboardType="numeric"
          value={resolvedValue}
          onChangeText={handleInputChange}
          placeholder={placeholder}
        />
        {details.filter(Boolean).map((item, index) => (
          <Text key={`detail-${index}`} style={inlineStyle_79_12}>
            {item}
          </Text>
        ))}
        <View style={inlineStyle_73_14}>
          <TouchableOpacity style={inlineStyle_93_10} onPress={handleCancel}>
            <Text style={inlineStyle_99_10}>{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={inlineStyle_104_10} onPress={handleConfirm}>
            <Text style={inlineStyle_112_10}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default Calculate;
