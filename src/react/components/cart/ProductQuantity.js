import React, {useCallback, useState, useRef} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

import {getStore} from '@store';

const debounce = (func, wait) => {
  let timeout;
  const debounced = (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  debounced.cancel = () => clearTimeout(timeout);
  return debounced;
};

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
  disabledButton: {
    opacity: 0.5,
  },
};

const ProductQuantityControl = ({orderProduct}) => {
  const navigation = useNavigation();
  const currentPageName =
    navigation.getState().routes[navigation.getState().index].name;
  const {getters: orderGetters} = getStore('orders');
  const {actions: orderProductActions} = getStore('order_products');
  const {item: order} = orderGetters;
  const [localProduct, setLocalProduct] = useState({...orderProduct});

  const removeProduct = (product) => {
    orderProductActions.remove(product['@id']);
  };

  const changeProduct = product => {
    const order_product = {
      id: product ? product['@id'] : null,
      parentProduct: null,
      product: product.product['@id'],
      product_group_id: null,
      quantity: product.quantity,
      order: order['@id'],
    };

    orderProductActions.save(order_product).then(data => {
      setLocalProduct(data);
    });
  };

  useFocusEffect(
    useCallback(() => {
      changeQuantity.current.cancel();
    }, []),
  );

  const changeQuantity = useRef(
    debounce(product => {
      if (product.quantity === 0) removeProduct(product);
      else changeProduct(product);
    }, 1000),
  );
  const increaseQuantity = () => {
    const newProduct = {
      ...localProduct,
      quantity: localProduct.quantity + 1,
    };
    setLocalProduct(newProduct);
    changeQuantity.current(newProduct);
  };

  const decreaseQuantity = () => {
    const newProduct = {
      ...localProduct,
      quantity: localProduct.quantity > 0 ? localProduct.quantity - 1 : 0,
    };
    setLocalProduct(newProduct);
    changeQuantity.current(newProduct);
  };

  const getDecreaseIcon = () => {
    if (localProduct.quantity === 1) return 'delete';
    if (!localProduct.quantity) return '';
    return 'remove';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.button]} onPress={decreaseQuantity}>
        {getDecreaseIcon() ? (
          <Icon name={getDecreaseIcon()} size={24} color="red" />
        ) : null}
      </TouchableOpacity>

      <Text style={[styles.quantityText, {color: '#666'}]}>
        {localProduct.quantity || '0'}
      </Text>

      <TouchableOpacity style={[styles.button]} onPress={increaseQuantity}>
        <Icon name="add" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );
};

export default ProductQuantityControl;
