import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import {
  ADD_PRODUCT_SELECTION_CHANGE_EVENT,
  getPendingAddProductQuantity,
  setPendingAddProductQuantity,
} from '@controleonline/ui-orders/src/react/utils/addProductSession';
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
  const [decreaseIcon, setDecreaseIcon] = useState(null);
  const [qtd, setQtd] = useState(() => getPendingAddProductQuantity(product));

  useEffect(() => {
    setQtd(getPendingAddProductQuantity(product));
  }, [product]);

  const syncQuantity = useCallback(
    nextQuantity => {
      const safeQuantity = Math.max(0, Number(nextQuantity || 0));
      setQtd(safeQuantity);
      setPendingAddProductQuantity(product, safeQuantity);

      eventBus.emit(ADD_PRODUCT_SELECTION_CHANGE_EVENT, {
        product,
        quantity: safeQuantity,
      });
    },
    [product],
  );

  const increaseQuantity = useCallback(() => {
    syncQuantity(qtd + 1);
  }, [qtd, syncQuantity]);

  const decreaseQuantity = useCallback(() => {
    syncQuantity(qtd > 0 ? qtd - 1 : 0);
  }, [qtd, syncQuantity]);

  useEffect(() => {
    if (qtd === 1) {
      setDecreaseIcon('delete');
      return;
    }

    if (!qtd || qtd === 0) {
      setDecreaseIcon(null);
      return;
    }

    setDecreaseIcon('remove');
  }, [qtd]);

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
