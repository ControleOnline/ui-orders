import React, {useCallback, useState} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStores} from '@store';
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

const ProductTotem = ({product}) => {
  const ordersStore = useStores(state => state.orders);
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const {item: order} = ordersGetters;
  const [selected, setSelected] = useState(false);

  const removeAllProducts = useCallback(async () => {
    if (!order?.products?.length) return;

    for (const item of order.products) {
      if (!item?.product) continue;
      await ordersActions.remove(item.product);
    }

    await ordersActions.setItem({...order, products: []});
  }, [order, ordersActions]);

  const selectProduct = useCallback(async () => {
    await removeAllProducts();

    eventBus.emit('add-product', {
      product: product['@id'].replace(/\D/g, ''),
      quantity: 1,
    });

    eventBus.emit('price', product.price);
    setSelected(true);
  }, [product, removeAllProducts]);

  const unselectProduct = useCallback(async () => {
    await removeAllProducts();
    setSelected(false);
  }, [removeAllProducts]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (selected) {
          unselectProduct();
        }
      };
    }, [selected, unselectProduct]),
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={selected ? unselectProduct : selectProduct}>
        <Icon
          name={selected ? 'check-circle' : 'radio-button-unchecked'}
          size={24}
          color="red"
        />
      </TouchableOpacity>

      <Text style={[styles.quantityText, {color: '#666'}]}>
        {selected ? 'Selecionado' : 'Selecionar'}
      </Text>
    </View>
  );
};

export default ProductTotem;
