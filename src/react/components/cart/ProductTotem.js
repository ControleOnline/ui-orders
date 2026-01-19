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

const ProductTotem = ({product}) => {
  const ordersStore = useStore('orders');
  const ordersProductsStore = useStore('order_products');
  const ordersGetters = ordersStore.getters;
  const ordersProductsGetters = ordersProductsStore.getters;
  const ordersActions = ordersStore.actions;
  const ordersProductsActions = ordersProductsStore.actions;
  const {item: order} = ordersGetters;
  const {item: ordersProducts} = ordersProductsGetters;
  const [selected, setSelected] = useState(false);

  const removeAllProducts = useCallback(async () => {
    
    
    console.log(ordersProducts,order.orderProducts);


    if (!order?.orderProducts?.length) return;

    for (const item of order.orderProducts) {
      if (!item?.product) continue;
      console.log(item.product);

      // ALEMAC // apaga corretamente o item do pedido
      // await ordersProductsActions.remove(item.product['@id']);
      await ordersProductsActions.remove(item['@id']);
    }

    await ordersActions.setItem({...order, orderProducts: []});
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
