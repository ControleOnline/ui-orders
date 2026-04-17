import React, {useEffect, useRef, useState} from 'react';
import { TextInput, View, Keyboard, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@controleonline/ui-common/src/react/stores';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import styles from './BarcodeInput.styles';

const BarcodeInput = () => {
  const peopleStore = useStore('people');
  const deviceConfigStore = useStore('device_config');
  const peopleGetters = peopleStore.getters;
  const {currentCompany} = peopleGetters;

  const device = deviceConfigStore.getters?.item;
  const productInputType = device?.configs?.['product-input-type'] || 'manual';

  const [value, setValue] = useState('');
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef(null);
  const {showToast} = useMessage();

  const getIconName = () => {
    if (productInputType === 'rfid') {
      return 'nfc';
    }
    return 'camera-alt';
  };

  const getPlaceholder = () => {
    if (productInputType === 'rfid') {
      return global.t?.t('orders', 'placeholder', 'rfidInput');
    }
    return global.t?.t('orders', 'placeholder', 'barcodeInput');
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      inputRef.current?.focus();
    });

    return () => {
      showSubscription.remove();
    };
  }, []);

  const handleSubmit = () => {
    if (value.trim()) {
      api
        .post('/products/sku', {
          sku: value,
          people: currentCompany.id,
        })
        .then(product => {
          if (product) {
            eventBus.emit('add-product', {
              product: product['@id'].replace(/\D/g, ''),
              quantity: quantity,
            });
            setValue('');
            setQuantity(1);
          }
        })
        .catch(error => {
          console.log(error);
          showToast(
            `${global.t?.t('orders', 'message', 'errorAddingProductVerifyCodeMessage')} ${error?.message}`,
            {
              position: 'center',
            },
          );
        });
    }
  };

  const increaseQuantity = () => setQuantity(q => q + 1);
  const decreaseQuantity = () => setQuantity(q => (q > 1 ? q - 1 : 1));

  const handleReadButton = () => {
    inputRef.current?.focus();
    if (productInputType === 'rfid') {
      console.log('📡 [RFID] Ativando leitor RFID para produtos...');
    } else {
      console.log('🎥 [CAMERA] Ativando leitor de código de barras para produtos...');
    }
  };

  return (
    <View style={styles.inputRow}>
      <View style={styles.qtyContainer}>
        <TouchableOpacity onPress={decreaseQuantity} style={styles.qtyButton}>
          <Text style={styles.qtyText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.qtyLabel}>{quantity}</Text>
        <TouchableOpacity onPress={increaseQuantity} style={styles.qtyButton}>
          <Text style={styles.qtyText}>+</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleReadButton} style={styles.readButton}>
        <Icon name={getIconName()} size={24} color="#fff" />
      </TouchableOpacity>

      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={getPlaceholder()}
        placeholderTextColor="#999"
        value={value}
        onChangeText={setValue}
        onSubmitEditing={handleSubmit}
        autoFocus
        blurOnSubmit={false}
        showSoftInputOnFocus={false}
        returnKeyType="done"
      />
    </View>
  );
};

export default BarcodeInput;
