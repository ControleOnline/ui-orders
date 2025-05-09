import React, {useCallback, useState, useRef} from 'react';
import {View, Text, TouchableOpacity, InteractionManager} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {getStore} from '@store';
import {useFocusEffect} from '@react-navigation/native';

const styles = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: 16,
    fontSize: 16,
  },
  button: {
    padding: 8,
  },
};

const ProductQuantity = ({product, category, changePrice}) => {
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {getters: categoriesGetters, actions: categoryActions} =
    getStore('categories');
  const {items: categories} = categoriesGetters;
  const {item: order} = ordersGetters;
  const [decreaseIcon, setDecreaseIcon] = useState(null);
  const [qtd, setQtd] = useState(0);
  const debounceRef = useRef(null);

  const debouncedUpdate = useCallback(
    newQuantity => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        InteractionManager.runAfterInteractions(() => {
          const index = categories.findIndex(c => c['@id'] === category['@id']);
          let c = [...categories];

          let q = newQuantity - (product.quantity || 0);
          const productIndex = c[index].products.findIndex(
            p => p['@id'] === product['@id'],
          );

          c[index].products[productIndex] = {
            ...product,
            quantity: newQuantity,
          };
          categoryActions.setItems(c);
        });
      }, 300);
    },
    [categories, category, product, ordersActions, categoryActions],
  );

  const increaseQuantity = useCallback(() => {
    const newQuantity = qtd + 1;
    setQtd(newQuantity);
    changePrice(product.price);
    debouncedUpdate(newQuantity);
  }, [qtd, product, debouncedUpdate]);

  const decreaseQuantity = useCallback(() => {
    const newQuantity = qtd > 0 ? qtd - 1 : 0;
    setQtd(newQuantity);
    changePrice(product.price * -1);
    debouncedUpdate(newQuantity);
  }, [qtd, product, debouncedUpdate]);

  useFocusEffect(
    useCallback(() => {
      if (qtd === 1) setDecreaseIcon('delete');
      if (!qtd || qtd === 0) setDecreaseIcon(null);
      if (qtd > 1) setDecreaseIcon('remove');
    }, [qtd]),
  );
  
  useFocusEffect(
    useCallback(() => {
      return () => {
        setQtd(0);
      };
    }, []),
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        disabled={qtd === 0}
        onPress={decreaseQuantity}>
        {decreaseIcon && <Icon name={decreaseIcon} size={24} color="red" />}
      </TouchableOpacity>

      <Text style={[styles.quantityText, {color: '#666'}]}>{qtd || '0'}</Text>

      <TouchableOpacity style={styles.button} onPress={increaseQuantity}>
        <Icon name="add" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );
};

export default ProductQuantity;
