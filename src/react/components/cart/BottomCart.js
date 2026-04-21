import React, {useCallback, useMemo} from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import {useStore} from '@store';
import {useNavigation, useRoute} from '@react-navigation/native';
import PayableToolbar from '@controleonline/ui-orders/src/react/components/PayableToolbar';
import OrderTotalToolbar from '@controleonline/ui-orders/src/react/components/OrderTotalToolbar';
import {
  buildManagerPdvRouteParams,
  buildOrderDetailsRouteParams,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import Icon from 'react-native-vector-icons/Feather';
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
  const {item: order} = ordersGetters;
  const themeStore = useStore('theme');
  const themeColors = themeStore?.getters?.colors || {};
  const navigation = useNavigation();
  const route = useRoute();
  const primaryColor = themeColors.primary || '#1B5587';
  const cardBg = themeColors['cart-bottom-bg'] || '#FFFFFF';
  const borderColor = themeColors['cart-bottom-border'] || '#D3DFEC';
  const totalCardBg = themeColors['cart-bottom-total-bg'] || '#F8FBFF';
  const labelColor = themeColors['cart-bottom-label'] || '#64748B';
  const textColor = themeColors['cart-bottom-text'] || '#0F172A';
  const cartHeight = 64;

  const styles = useMemo(
    () =>
      createStyles({
        primaryColor,
        cardBg,
        borderColor,
        totalCardBg,
        labelColor,
        textColor,
      }),
    [primaryColor, cardBg, borderColor, totalCardBg, labelColor, textColor],
  );

  const handleDefaultAction = useCallback(item => {
    ordersStore.actions.syncOrder?.(item);
    const shouldKeepPdvMode = route?.params?.interactionMode === 'pdv';
    navigation.navigate(
      'OrderDetails',
      buildOrderDetailsRouteParams(
        item,
        shouldKeepPdvMode ? buildManagerPdvRouteParams() : {},
      ),
    );
  }, [navigation, ordersStore.actions, route?.params?.interactionMode]);

  const isActionDisabled = !order?.id || !!actionDisabled;
  const handleActionPress = useCallback(() => {
    if (!order || isActionDisabled) {
      return;
    }

    if (typeof onActionPress === 'function') {
      onActionPress(order);
      return;
    }

    handleDefaultAction(order);
  }, [handleDefaultAction, isActionDisabled, onActionPress, order]);

  return (
    <>
      <PayableToolbar
        bottomOffset={bottomOffset}
        cartHeight={cartHeight + 10}
        collapseWhenPaid={collapsePayableWhenPaid}
      />
      <View style={[styles.toolbar, {bottom: bottomOffset + 8, minHeight: cartHeight}]}>
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
            <Icon color="#fff" name={actionIcon} size={16} />
            <Text style={styles.checkoutButtonText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
};



export default BottomCart;
