import React, {useCallback, useState, useRef, useMemo} from 'react';
import {Text, useWindowDimensions} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {useStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {isPosSingleItemMode} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {useFocusEffect} from '@react-navigation/native';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import createStyles from './OrderTotalToolbar.styles';
import { inlineStyle_79_6 } from './OrderTotalToolbar.styles';

const OrderTotalToolbar = ({textStyle = null}) => {
  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const deviceConfigStore = useStore('device_config');
  const deviceConfigGetters = deviceConfigStore.getters;
  const {item: order} = ordersGetters;
  const isSingleItemMode = isPosSingleItemMode(deviceConfigGetters?.item?.configs);
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
      const orderId = String(currentOrder['@id'] || currentOrder.id || '').replace(/\D/g, '');
      const lastProduct = currentProducts[currentProducts.length - 1];
      if (isSingleItemMode && !lastProduct?.product) {
        products = [];
        return;
      }

      const payload = isSingleItemMode
        ? [{
            product: lastProduct?.product,
            quantity: 1,
          }]
        : currentProducts;

      ordersActions[isSingleItemMode ? 'replaceProducts' : 'addProducts'](
        orderId,
        payload,
      );
    }
    products = [];
  }, [isSingleItemMode, ordersActions]);

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
    <Text style={[styles.primary, totalStyles.valueText, textStyle, inlineStyle_79_6]}>
      Carregando...
    </Text>
  ) : (
    <Text style={[styles.primary, totalStyles.valueText, textStyle]}>
      {Formatter.formatMoney(price)}
    </Text>
  );
};

export default OrderTotalToolbar;
