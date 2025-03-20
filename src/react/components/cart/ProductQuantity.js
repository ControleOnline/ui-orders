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

const ProductQuantityControl = ({product, defaultQuantity = 0}) => {
  const navigation = useNavigation();
  const currentPageName =
    navigation.getState().routes[navigation.getState().index].name;
  const {getters: orderGetters} = getStore('orders');
  const {getters: cartGetters, actions: cartActions} = getStore('cart');
  const {getters: orderProductGetters, actions: orderProductActions} =
    getStore('order_products');
  const {item: order, isLoading} = orderGetters;
  const {items: orderProducts, isSaving} = orderProductGetters;
  const {isLoading: cartIsLoading} = cartGetters;

  const getInitialQuantity = () => {
    if (!orderProducts) return defaultQuantity;
    const orderProduct = orderProducts.find(
      p => p.product['@id'] === product['@id'],
    );
    return orderProduct?.quantity || defaultQuantity;
  };

  const [localProduct, setLocalProduct] = useState({
    ...product,
    quantity: getInitialQuantity(),
  });

  const saveRef = useRef(
    debounce(updatedProduct => {
      const quantity = updatedProduct.quantity || 0;
      const orderProduct = getorderProduct(updatedProduct);

      if (quantity === 0 && orderProduct) {
        orderProductActions
          .remove(orderProduct['@id'])
          .then(() => {
            const index = getIndex(updatedProduct);
            if (index) orderProducts.splice(index, 1);
            else orderProducts = [];
          })
          .finally(() => {
            cartActions.setReload(true);
            if (currentPageName == 'ProductsPage')
              orderProductActions.setReload(true);
            orderProductActions.setItems(orderProducts);
          });
        return;
      }

      const order_product = {
        id: orderProduct?.['@id'] || null,
        parentProduct: null,
        product: updatedProduct['@id'],
        product_group_id: null,
        quantity: quantity,
        order: order['@id'],
      };

      orderProductActions
        .save(order_product)
        .then(result => {
          const index = getIndex(updatedProduct);
          if (index >= 0) orderProducts[index] = result;
          else orderProducts.push(result);
        })
        .finally(() => {
          cartActions.setReload(true);
          if (currentPageName == 'ProductsPage')
            orderProductActions.setReload(true);
          orderProductActions.setItems(orderProducts);
        });
    }, 500),
  );
  const getIndex = updatedProduct => {
    return orderProducts.findIndex(
      p => p.product['@id'] === updatedProduct['@id'],
    );
  };
  const increaseQuantity = () => {
    if (isSaving || isLoading || cartIsLoading) return;
    const newProduct = {
      ...localProduct,
      quantity: (localProduct.quantity || 0) + 1,
    };
    setLocalProduct(newProduct);
    changeQuantity(newProduct, true);
  };

  const decreaseQuantity = () => {
    if (!localProduct.quantity || isSaving || isLoading || cartIsLoading)
      return;
    if (localProduct.quantity && localProduct.quantity >= 1) {
      const newProduct = {
        ...localProduct,
        quantity: localProduct.quantity - 1,
      };
      setLocalProduct(newProduct);
      changeQuantity(newProduct, true);
    }
  };

  const changeQuantity = (changedProduct, emit = false) => {
    if (emit) {
      saveRef.current(changedProduct);
    }
  };

  const getorderProduct = product => {
    const index = orderProducts?.findIndex(
      item => item.product['@id'] === product['@id'],
    );

    return orderProducts[index];
  };

  const syncQuantityWithOrder = () => {
    if (localProduct.type !== 'product' || !orderProducts) return;

    const orderProduct = orderProducts.find(
      p =>
        p.product['@id'] === localProduct['@id'] &&
        p.product.type === 'product',
    );

    if (orderProduct && orderProduct.quantity !== localProduct.quantity) {
      setLocalProduct(prev => ({
        ...prev,
        quantity: orderProduct.quantity,
        order_products: orderProduct.id,
      }));
      changeQuantity({
        ...localProduct,
        quantity: orderProduct.quantity,
        order_products: orderProduct.id,
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      syncQuantityWithOrder();
    }, [order]),
  );

  useFocusEffect(
    useCallback(() => {
      saveRef.current.cancel();
    }, []),
  );

  const getDecreaseIcon = () => {
    if (localProduct.quantity === 1) return 'delete';
    if (!localProduct.quantity) return '';
    return 'remove';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          (!localProduct.quantity || isSaving || isLoading || cartIsLoading) &&
            styles.disabledButton,
        ]}
        disabled={
          !localProduct.quantity || isSaving || isLoading || cartIsLoading
        }
        onPress={decreaseQuantity}>
        {getDecreaseIcon() ? (
          <Icon name={getDecreaseIcon()} size={24} color="red" />
        ) : null}
      </TouchableOpacity>

      <Text style={[styles.quantityText, {color: '#666'}]}>
        {localProduct.quantity || '0'}
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          (isSaving || isLoading || cartIsLoading) && styles.disabledButton,
        ]}
        disabled={isSaving || isLoading || cartIsLoading}
        onPress={increaseQuantity}>
        <Icon name="add" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );
};

export default ProductQuantityControl;
