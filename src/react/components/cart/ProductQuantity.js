import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

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

const ProductQuantity = ({ product, category, onQuantityChange }) => {
  const updateQuantityInStorage = useCallback(
    (newQuantity) => {
      const storedProducts = JSON.parse(localStorage.getItem('products') || '{}');
      const categoryProducts = storedProducts[category['@id']] || [];
      const productIndex = categoryProducts.findIndex(
        (p) => p['@id'] === product['@id']
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
      const updatedProducts = {
        ...storedProducts,
        [category['@id']]: categoryProducts,
      };
      localStorage.setItem('products', JSON.stringify(updatedProducts));
      if (onQuantityChange) onQuantityChange();
    },
    [product, category, onQuantityChange]
  );

  const increaseQuantity = () => {
    const newQuantity = (product.quantity || 0) + 1;
    updateQuantityInStorage(newQuantity);
  };

  const decreaseQuantity = () => {
    const currentQuantity = product.quantity || 0;
    const newQuantity = currentQuantity > 0 ? currentQuantity - 1 : 0;
    updateQuantityInStorage(newQuantity);
  };

  const getDecreaseIcon = () => {
    const quantity = product.quantity || 0;
    if (quantity === 1) return 'delete';
    if (quantity === 0) return '';
    return 'remove';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={decreaseQuantity}>
        {getDecreaseIcon() ? (
          <Icon name={getDecreaseIcon()} size={24} color="red" />
        ) : null}
      </TouchableOpacity>

      <Text style={[styles.quantityText, { color: '#666' }]}>
        {product.quantity || '0'}
      </Text>

      <TouchableOpacity style={styles.button} onPress={increaseQuantity}>
        <Icon name="add" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );
};

export default ProductQuantity;