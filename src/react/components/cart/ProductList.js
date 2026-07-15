import React from 'react';
import {View} from 'react-native';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-common/src/react/components/StateStore';
import ProductItem from '@controleonline/ui-orders/src/react/components/cart/ProductItem';

export default function ProductsList() {
  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const {item: order, isLoading, isSaving, error} = ordersGetters;

  return (
    <View>
      {(error || isLoading || isSaving) && (
        <StateStore store="order_products" />
      )}
      {order.orderProducts?.length > 0 && !error && (
        <>
          {order.orderProducts.map(
            orderProduct =>
              orderProduct.quantity > 0 && (
                <ProductItem
                  key={orderProduct.id}
                  orderProduct={orderProduct}
                />
              ),
          )}
        </>
      )}
    </View>
  );
}
