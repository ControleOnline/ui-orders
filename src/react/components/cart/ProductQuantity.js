import React, {useCallback, useState, useRef} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {getStore} from '@store';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

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

const ProductQuantity = ({product, category}) => {
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {getters: categoriesGetters, actions: categoryActions} =
    getStore('categories');
  const {items: categories} = categoriesGetters;
  const {item: order} = ordersGetters;
  const [decreaseIcon, setDecreaseIcon] = useState(null);
  const [qtd, setQtd] = useState(0);
  const debounceRef = useRef(null);

  const updateQuantityInStorage = useCallback(
    newQuantity => {
      const index = categories.findIndex(c => c['@id'] === category['@id']);
      const updatedProducts = [...categories];
      const categoryProducts = categories[index]['products'];
      const productIndex = categoryProducts.findIndex(
        p => p['@id'] === product['@id'],
      );
      if (productIndex >= 0) {
        categoryProducts[productIndex] = {
          ...categoryProducts[productIndex],
          ...product,
          quantity: newQuantity,
        };
      } else {
        categoryProducts.push({
          ...product,
          quantity: newQuantity,
        });
      }

      updatedProducts[index]['products'] = categoryProducts;
      categoryActions.setItems(updatedProducts);

      ordersActions.initQueue(() => {});
    },
    [product, category],
  );
  const debouncedUpdate = useCallback(
    (newQuantity, priceChange) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        updateQuantityInStorage(newQuantity);
        ordersActions.addToQueue(() => addPrice(priceChange));
      }, 300);
    },
    [updateQuantityInStorage, addPrice, ordersActions],
  );

  const increaseQuantity = useCallback(() => {
    const newQuantity = (product.quantity || 0) + 1;
    setQtd(newQuantity);
    debouncedUpdate(newQuantity, product.price);
  }, [qtd, product.price, debouncedUpdate]);

  const decreaseQuantity = useCallback(() => {
    const currentQuantity = product.quantity || 0;
    const newQuantity = currentQuantity > 0 ? currentQuantity - 1 : 0;
    setQtd(newQuantity);
    debouncedUpdate(newQuantity, product.price * -1);
  }, [qtd, product.price, debouncedUpdate]);

  const addPrice = useCallback(
    price => {
      let o = {...order};
      o.price = (o.price || 0) + price;
      ordersActions.setItem(o);
    },
    [order, ordersActions],
  );

  useFocusEffect(
    useCallback(() => {
      const quantity = product.quantity;

      if (quantity === 1) setDecreaseIcon('delete');
      if (!quantity || quantity === 0) setDecreaseIcon(null);
      if (quantity > 1) setDecreaseIcon('remove');
    }, [product]),
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        disabled={qtd == 0}
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
