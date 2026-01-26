import React, {useEffect, useRef, useState} from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  Keyboard,
  Text,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@controleonline/ui-common/src/react/stores';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';

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
      return t.t('default', 'title', 'RFIDInput');
    }
    return t.t('default', 'title', 'BarcodeInput');
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
            'Erro ao adicionar produto. Verifique o código. Mensagem:' +
              error?.message,
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

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginVertical: 5,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 10,
    fontSize: 18,
    elevation: 2,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 8,
  },
  qtyButton: {
    backgroundColor: '#1B5587',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qtyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  qtyLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 30,
    textAlign: 'center',
  },
  readButton: {
    backgroundColor: '#1B5587',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BarcodeInput;