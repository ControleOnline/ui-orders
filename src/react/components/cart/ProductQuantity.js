import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import {
  ADD_PRODUCT_SELECTION_CHANGE_EVENT,
  ADD_PRODUCT_CONFIRMATION_EVENT,
  getPendingAddProductQuantity,
  setPendingAddProductQuantity,
} from '@controleonline/ui-orders/src/react/utils/addProductSession';
import {isConfirmingProducts} from '../../utils/confirmPendingProducts';
import {useStore} from '@store';
import {useNavigation} from '@react-navigation/native';
import {app_type} from '@appType';
import {resolvePosOperationMode, POS_OPERATION_MODE_WAITER} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {getConfirmedCatalogQuantity} from '../../utils/catalogProductQuantity';
import {buildOrderDetailsRouteParams, buildManagerPdvRouteParams} from '../../utils/orderRoute';
const styles = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: 16,
    fontSize: 16,
  },
  quantityTextCompact: {
    marginHorizontal: 5,
    fontSize: 13,
  },
  button: {
    padding: 8,
  },
  buttonCompact: {
    padding: 4,
  },
};

const ProductQuantity = ({product, compact = false}) => {
  const {item: order} = useStore('orders').getters;
  const navigation = useNavigation();
  const configs = useStore('device_config').getters?.item?.configs;
  const waiterMode = app_type === 'POS' && resolvePosOperationMode(configs) === POS_OPERATION_MODE_WAITER;
  const confirmedQuantity = waiterMode ? getConfirmedCatalogQuantity(order, product) : 0;
  const orderId = String(order?.id || order?.['@id'] || '').replace(/\D+/g, '');
  const [confirming, setConfirming] = useState(() => isConfirmingProducts(orderId));
  const [decreaseIcon, setDecreaseIcon] = useState(null);
  const [qtd, setQtd] = useState(() => getPendingAddProductQuantity(product));
  const quantityRef = useRef(getPendingAddProductQuantity(product));

  useEffect(() => {
    const currentQuantity = getPendingAddProductQuantity(product);
    quantityRef.current = currentQuantity;
    setQtd(currentQuantity);
  }, [product]);

  useEffect(() => {
    const syncConfirmation = () => {
      const quantity = getPendingAddProductQuantity(product);
      quantityRef.current = quantity;
      setQtd(quantity);
      setConfirming(isConfirmingProducts(orderId));
    };
    syncConfirmation();
    eventBus.on(ADD_PRODUCT_CONFIRMATION_EVENT, syncConfirmation);
    return () => eventBus.off(ADD_PRODUCT_CONFIRMATION_EVENT, syncConfirmation);
  }, [orderId, product]);

  const syncQuantity = useCallback(
    nextQuantityOrUpdater => {
      const resolvedNextQuantity =
        typeof nextQuantityOrUpdater === 'function'
          ? nextQuantityOrUpdater(quantityRef.current)
          : nextQuantityOrUpdater;
      const safeQuantity = Math.max(0, Number(resolvedNextQuantity || 0));

      quantityRef.current = safeQuantity;
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
    syncQuantity(currentQuantity => currentQuantity + 1);
  }, [syncQuantity]);

  const decreaseQuantity = useCallback(() => {
    if (quantityRef.current > 0) {
      syncQuantity(currentQuantity => currentQuantity - 1);
    } else if (confirmedQuantity > 0) {
      // Saved lines use the existing cart's edit/remove confirmation, never an additive retry.
      navigation.navigate('OrderDetails', buildOrderDetailsRouteParams(order,
        buildManagerPdvRouteParams({showBottomCart: false})));
    }
  }, [confirmedQuantity, navigation, order, syncQuantity]);
  const displayedQuantity = confirmedQuantity + qtd;

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
        style={[styles.button, compact && styles.buttonCompact]}
        disabled={confirming || displayedQuantity === 0}
        accessibilityLabel={qtd > 0 ? 'Remover unidade pendente' : 'Editar quantidade no carrinho'}
        onPress={decreaseQuantity}>
        {(decreaseIcon || confirmedQuantity > 0) && <Icon name={decreaseIcon || 'edit'} size={compact ? 18 : 24} color="red" />}
      </TouchableOpacity>

      <Text style={[styles.quantityText, compact && styles.quantityTextCompact, {color: '#666'}]}>{displayedQuantity || '0'}</Text>

      <TouchableOpacity style={[styles.button, compact && styles.buttonCompact]} disabled={confirming} onPress={increaseQuantity}>
        <Icon name="add" size={compact ? 18 : 24} color="red" />
      </TouchableOpacity>
    </View>
  );
};

export default ProductQuantity;
