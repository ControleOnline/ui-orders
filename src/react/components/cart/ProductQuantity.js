import React, {useCallback, useState, useRef, useEffect, useMemo} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {getStore} from '@store';
import {useFocusEffect} from '@react-navigation/native';
import debounce from 'lodash.debounce';

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
  const {actions: orderProductsActions} = getStore('order_products');
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const {item: order} = ordersGetters;
  const [decreaseIcon, setDecreaseIcon] = useState(null);
  const [qtd, setQtd] = useState(0);
  const [price, setPrice] = useState(0);
  const priceRef = useRef(price);

  useEffect(() => {
    priceRef.current = price;
  }, [price]);

  const modifyPrice = useMemo(() => {
    return debounce(() => {
      changePrice(priceRef.current);
    }, 300);
  }, []);

  const increaseQuantity = useCallback(() => {
    const newQuantity = qtd + 1;
    setQtd(newQuantity);
    setPrice(price + product.price);
    product.quantity = newQuantity;
    modifyPrice();
  }, [qtd, product, price]);

  const decreaseQuantity = useCallback(() => {
    const newQuantity = qtd > 0 ? qtd - 1 : 0;
    setQtd(newQuantity);
    setPrice(price + product.price * -1);
    product.quantity = newQuantity;
    modifyPrice();
  }, [qtd, product, price]);

  useFocusEffect(
    useCallback(() => {
      if (order) setPrice(order.price);
    }, [order]),
  );

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

  const changeProduct = (currentProduct, currentOrder) => {
    const order_product = {
      parentProduct: null,
      product: currentProduct['@id'],
      product_group_id: null,
      quantity: currentProduct.quantity,
      order: currentOrder['@id'],
    };

    return orderProductsActions.save(order_product);
  };

  const handleSave = useCallback(() => {
    const currentOrder = {...order};
    const currentProduct = {...product};

    if (currentProduct.quantity > 0)
      ordersActions.executeQueue(() => {
        return changeProduct(currentProduct, currentOrder);
      });
  }, [qtd, product, order, ordersActions]);

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
