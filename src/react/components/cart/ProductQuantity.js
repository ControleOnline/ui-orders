import React, {useCallback, useState} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '@store';
import {useFocusEffect} from '@react-navigation/native';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
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

const ProductQuantity = ({product}) => {
  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const {item: order} = ordersGetters;
  const [decreaseIcon, setDecreaseIcon] = useState(null);
  const [qtd, setQtd] = useState(0);

  const changePrice = p => {
    setTimeout(() => {
      eventBus.emit('price', p);
    }, 1);
  };

  const increaseQuantity = useCallback(() => {
    const newQuantity = qtd + 1;
    product.quantity = newQuantity;
    setQtd(newQuantity);
    changePrice(product.price);
  }, [qtd, product, order]);

  const decreaseQuantity = useCallback(() => {
    const newQuantity = qtd > 0 ? qtd - 1 : 0;
    product.quantity = newQuantity;
    setQtd(newQuantity);
    changePrice(product.price * -1);
  }, [qtd, product, order]);

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
        handleSave();
      };
    }, []),
  );

  const handleSave = useCallback(() => {
    if (product.quantity > 0)
      eventBus.emit('add-product', {
        product: product['@id'].replace(/\D/g, ''),
        quantity: product.quantity,
      });
  }, [product]);

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
