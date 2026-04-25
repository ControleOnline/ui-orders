import React, {useCallback, useEffect, useMemo, useState} from 'react';
import { Text, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import {useStore} from '@store';
import {useNavigation, useRoute} from '@react-navigation/native';
import PayableToolbar from '@controleonline/ui-orders/src/react/components/PayableToolbar';
import OrderTotalToolbar from '@controleonline/ui-orders/src/react/components/OrderTotalToolbar';
import {
  isPdvRouteContext,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import {
  ADD_PRODUCT_SELECTION_CHANGE_EVENT,
  listPendingAddProducts,
} from '@controleonline/ui-orders/src/react/utils/addProductSession';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import usePosOrderMaterialization from '@controleonline/ui-orders/src/react/hooks/usePosOrderMaterialization';
import Icon from 'react-native-vector-icons/Feather';
import {env} from '@env';
import createStyles from './BottomCart.styles';

const BottomCart = ({
  bottomOffset = 0,
  actionLabel = 'Conferir pedido',
  actionIcon = 'clipboard',
  actionDisabled,
  onActionPress,
  collapsePayableWhenPaid = true,
  showActionButton = true,
}) => {
  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const {item: order} = ordersGetters;
  const themeStore = useStore('theme');
  const themeColors = themeStore?.getters?.colors || {};
  const navigation = useNavigation();
  const route = useRoute();
  const {showError} = useMessage() || {};
  const {width} = useWindowDimensions();
  const [isMaterializingOrder, setIsMaterializingOrder] = useState(false);
  const [pendingSelectionsState, setPendingSelectionsState] = useState(() =>
    listPendingAddProducts(),
  );
  const primaryColor = themeColors.primary || '#1B5587';
  const cardBg = themeColors['cart-bottom-bg'] || '#FFFFFF';
  const borderColor = themeColors['cart-bottom-border'] || '#D3DFEC';
  const totalCardBg = themeColors['cart-bottom-total-bg'] || '#F8FBFF';
  const labelColor = themeColors['cart-bottom-label'] || '#64748B';
  const textColor = themeColors['cart-bottom-text'] || '#0F172A';
  const isCompact = width < 360;
  const isUltraCompact = width < 330;
  const cartHeight = isCompact ? 58 : 64;

  const styles = useMemo(
    () =>
      createStyles({
        primaryColor,
        cardBg,
        borderColor,
        totalCardBg,
        labelColor,
        textColor,
        compact: isCompact,
        ultraCompact: isUltraCompact,
      }),
    [
      primaryColor,
      cardBg,
      borderColor,
      totalCardBg,
      labelColor,
      textColor,
      isCompact,
      isUltraCompact,
    ],
  );
  const isPosApp = String(env.APP_TYPE || '').trim().toUpperCase() === 'POS';
  const isPdvMode = isPosApp || isPdvRouteContext(route?.params);
  const pendingSelections = pendingSelectionsState;
  const hasPendingSelections = pendingSelections.length > 0;
  const {materializeOrderWithProducts, openOrderDetails} = usePosOrderMaterialization({
    interactionParams: route?.params,
    navigation,
  });

  useEffect(() => {
    const syncPendingSelections = () => {
      setPendingSelectionsState(listPendingAddProducts());
    };

    eventBus.on(ADD_PRODUCT_SELECTION_CHANGE_EVENT, syncPendingSelections);
    return () => eventBus.off(ADD_PRODUCT_SELECTION_CHANGE_EVENT, syncPendingSelections);
  }, []);

  const handleDefaultAction = useCallback(item => {
    ordersActions.syncOrder?.(item);
    openOrderDetails(item);
  }, [openOrderDetails, ordersActions]);

  const materializePendingSelections = useCallback(async () => {
    const resolvedOrder = await materializeOrderWithProducts();
    setPendingSelectionsState([]);
    return resolvedOrder;
  }, [materializeOrderWithProducts]);

  const isActionDisabled =
    !!actionDisabled || isMaterializingOrder || (!order?.id && !hasPendingSelections);
  const handleActionPress = useCallback(async () => {
    if (isActionDisabled) {
      return;
    }

    setIsMaterializingOrder(true);

    try {
      const resolvedOrder = isPdvMode
        ? await materializePendingSelections()
        : order;

      if (!resolvedOrder) {
        showError?.('Nao foi possivel preparar o pedido para conferencia.');
        return;
      }

      if (typeof onActionPress === 'function') {
        onActionPress(resolvedOrder);
        return;
      }

      handleDefaultAction(resolvedOrder);
    } catch (error) {
      showError?.(error?.message || 'Nao foi possivel preparar o pedido para conferencia.');
    } finally {
      setIsMaterializingOrder(false);
    }
  }, [
    handleDefaultAction,
    isActionDisabled,
    materializePendingSelections,
    onActionPress,
    showError,
  ]);

  return (
    <>
      <PayableToolbar
        bottomOffset={bottomOffset}
        cartHeight={cartHeight + (isCompact ? 8 : 10)}
        collapseWhenPaid={collapsePayableWhenPaid}
      />
      <View
        style={[
          styles.toolbar,
          {bottom: bottomOffset + (isCompact ? 6 : 8), minHeight: cartHeight},
        ]}
      >
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>{global.t?.t('orders', 'label', 'orderTotal')}</Text>
          <OrderTotalToolbar />
        </View>
        {showActionButton && (
          <TouchableOpacity
            disabled={isActionDisabled}
            onPress={handleActionPress}
            style={[
              styles.checkoutButton,
              isActionDisabled && styles.checkoutButtonDisabled,
            ]}>
            <Icon color="#fff" name={actionIcon} size={isCompact ? 15 : 16} />
            <Text style={styles.checkoutButtonText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
};



export default BottomCart;
