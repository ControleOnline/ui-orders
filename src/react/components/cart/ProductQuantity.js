import React, {useCallback, useState, useRef, useEffect} from 'react';
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
  const ordersActions = ordersStore.actions;
  const {item: order} = ordersGetters;
  const [decreaseIcon, setDecreaseIcon] = useState(null);
  const [qtd, setQtd] = useState(0);
  const saveTimerRef = useRef(null);
  // Ref sempre atualizada com a order mais recente — usada dentro do debounce
  const orderRef = useRef(order);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const changePrice = p => {
    setTimeout(() => {
      eventBus.emit('price', p);
    }, 1);
  };

  // Persiste a quantidade diretamente no order com debounce de 400ms.
  // Usa orderRef para pegar a order atual no momento do disparo,
  // mesmo que a order ainda estivesse sendo criada quando o usuário clicou.
  const scheduleSave = useCallback(
    newQty => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (newQty <= 0) return;
      saveTimerRef.current = setTimeout(() => {
        const currentOrder = orderRef.current;
        if (!currentOrder?.['@id']) return;
        ordersActions.addProducts(currentOrder['@id'].replace(/\D/g, ''), [
          {
            product: product['@id'].replace(/\D/g, ''),
            quantity: newQty,
          },
        ]);
        saveTimerRef.current = null;
      }, 400);
    },
    [ordersActions, product],
  );

  const increaseQuantity = useCallback(() => {
    const newQuantity = qtd + 1;
    product.quantity = newQuantity;
    setQtd(newQuantity);
    changePrice(product.price);
    scheduleSave(newQuantity);
  }, [qtd, product, scheduleSave]);

  const decreaseQuantity = useCallback(() => {
    const newQuantity = qtd > 0 ? qtd - 1 : 0;
    product.quantity = newQuantity;
    setQtd(newQuantity);
    changePrice(product.price * -1);
    if (newQuantity > 0) scheduleSave(newQuantity);
  }, [qtd, product, scheduleSave]);

  useFocusEffect(
    useCallback(() => {
      if (qtd === 1) setDecreaseIcon('delete');
      if (!qtd || qtd === 0) setDecreaseIcon(null);
      if (qtd > 1) setDecreaseIcon('remove');
    }, [qtd]),
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
