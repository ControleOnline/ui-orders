import React, {useEffect, useRef, useState} from 'react';
import {TextInput, View, StyleSheet, Keyboard} from 'react-native';

import {api} from '@controleonline/ui-common/src/api';
import {getStore} from '@controleonline/ui-common/src/react/stores';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';

const BarcodeInput = () => {
  const {getters: peopleGetters} = getStore('people');
  const {currentCompany} = peopleGetters;

  const [value, setValue] = useState('');
  const inputRef = useRef(null);

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
              quantity: 1,
            });
            setValue('');
          }
        })
        .catch(error => {
          console.log(error);
        });
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder="Escaneie o código ou digite"
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
  container: {
    marginVertical: 5,
    paddingHorizontal: 18,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 18,
    elevation: 2,
  },
});

export default BarcodeInput;
