import React, {useEffect, useState, useRef} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
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
  const {getters: orderGetters, actions: orderActions} = getStore('orders');
  const {actions: cartActions} = getStore('cart');

  const {getters: orderProductGetters, actions: orderProductActions} =
    getStore('order_products');
  const {item: order, isLoading, reload} = orderGetters;
  const {isSaving} = orderProductGetters;

  const getInitialQuantity = () => {
    if (product.type !== 'product' || !order?.orderProducts)
      return defaultQuantity;
    const orderProduct = order.orderProducts.find(
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
        orderProductActions.remove(orderProduct['@id']).then(() => {
          const index = getIndex(updatedProduct);
          if (index) order.orderProducts.splice(index, 1);
          else order.orderProducts = [];
          cartActions.setReload(true);
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
          if (index >= 0) order.orderProducts[index] = result;
          else order.orderProducts.push(result);
          cartActions.setReload(true);
        })
        .finally(() => {});
    }, 500),
  );
  const getIndex = updatedProduct => {
    order.orderProducts.findIndex(
      p => p.product['@id'] === updatedProduct['@id'],
    );
  };
  const increaseQuantity = () => {
    const newProduct = {
      ...localProduct,
      quantity: (localProduct.quantity || 0) + 1,
    };
    setLocalProduct(newProduct);
    changeQuantity(newProduct, true);
  };

  const decreaseQuantity = () => {
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
    if (!product || !order?.orderProducts) return -1;
    const index = order?.orderProducts?.findIndex(
      item => item.product['@id'] === product['@id'],
    );

    return order?.orderProducts[index];
  };

  const syncQuantityWithOrder = () => {
    if (localProduct.type !== 'product' || !order?.orderProducts) return;

    const orderProduct = order.orderProducts.find(
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

  useEffect(() => {
    syncQuantityWithOrder();
  }, [order]);

  useEffect(() => {
    return () => {
      saveRef.current.cancel();
    };
  }, []);

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
          (!localProduct.quantity || isSaving || isLoading) &&
            styles.disabledButton,
        ]}
        disabled={!localProduct.quantity || isSaving || isLoading}
        onPress={decreaseQuantity}>
        {getDecreaseIcon() ? (
          <Icon name={getDecreaseIcon()} size={24} color="red" />
        ) : null}
      </TouchableOpacity>

      <Text style={styles.quantityText}>{localProduct.quantity || 0}</Text>

      <TouchableOpacity
        style={[
          styles.button,
          (isSaving || isLoading) && styles.disabledButton,
        ]}
        disabled={isSaving || isLoading}
        onPress={increaseQuantity}>
        <Icon name="add" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );
};

export default ProductQuantityControl;
