import React, {useCallback, useState, useRef, useMemo} from 'react';
import {Text, ActivityIndicator, useWindowDimensions} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {useStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useFocusEffect} from '@react-navigation/native';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import createStyles from './OrderTotalToolbar.styles';
import { inlineStyle_79_6 } from './OrderTotalToolbar.styles';

const OrderTotalToolbar = ({textStyle = null}) => {
  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const {item: order} = ordersGetters;
  const {styles} = css();
  const {width} = useWindowDimensions();
  const [price, setPrice] = useState(0);
  const timeoutId = useRef(null);
  const totalStyles = useMemo(() => createStyles(width < 360), [width]);
  let products = [];

  const persistProducts = currentProducts => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }

    timeoutId.current = setTimeout(() => {
      const currentOrder = {...order};
      addProducts(currentOrder, currentProducts);
      timeoutId.current = null;
    }, 200);
  };

  const addProducts = useCallback((currentOrder, currentProducts) => {
    if (currentProducts.length > 0 && currentOrder && currentOrder['@id']) {
      ordersActions.addProducts(
        currentOrder['@id'].replace(/\D/g, ''),
        currentProducts,
      );
    }
    products = [];
  }, []);

  const handleAddProduct = data => {
    products.push(data);
    persistProducts(products);
  };

  useFocusEffect(
    useCallback(() => {
      eventBus.on('add-product', handleAddProduct);
      return () => eventBus.off('add-product', handleAddProduct);
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      const nextPrice = Number(order?.price || 0);
      if (price !== nextPrice) {
        setPrice(nextPrice > 0 ? nextPrice : 0);
      }
    }, [order]),
  );

  useFocusEffect(
    useCallback(() => {
      const listener = p => {
        let value = price + p;
        setPrice(value > 0 ? value : 0);
      };

      eventBus.on('price', listener);
      return () => eventBus.off('price', listener);
    }, [price]),
  );

  return !order && price <= 0 ? (
    <ActivityIndicator
      size="small"
      color={styles.primary?.color}
      style={inlineStyle_79_6}
    />
  ) : (
    <Text style={[styles.primary, totalStyles.valueText, textStyle]}>
      {Formatter.formatMoney(price)}
    </Text>
  );
};

export default OrderTotalToolbar;
