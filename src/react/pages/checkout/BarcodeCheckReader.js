import React, {useEffect, useRef, useState} from 'react';
import { TextInput, View, Keyboard, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@controleonline/ui-common/src/react/stores';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import styles from './BarcodeCheckReader.styles';

const BarcodeCheckReader = () => {
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const {currentCompany} = peopleGetters;

  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  const {showToast} = useMessage();

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
        .post('/checks/barcode', {
          barcode: value,
          people: currentCompany.id,
        })
        .then(check => {
          if (check) {
            eventBus.emit('select-check', {
              check: check['@id'].replace(/\D/g, ''),
            });
            setValue('');
          }
        })
        .catch(error => {
          console.log(error);
          showToast(
            `${global.t?.t('orders', 'message', 'errorSelectingCheckVerifyCodeMessage')} ${error?.message}`,
            {
              position: 'center',
            },
          );
        });
    }
  };

  const handleReadButton = () => {
    inputRef.current?.focus();
    // Aqui será ativada a câmera da Cielo quando integrado
  };

  return (
    <View style={styles.inputRow}>
      <TouchableOpacity onPress={handleReadButton} style={styles.readButton}>
        <Icon name="camera-alt" size={24} color="#fff" />
        <Text style={styles.readButtonText}>{global.t?.t('orders', 'button', 'readBarcode')}</Text>
      </TouchableOpacity>

      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={global.t?.t('orders', 'placeholder', 'barcodeCheckReader')}
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

export default BarcodeCheckReader;
