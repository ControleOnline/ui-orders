import React, {useCallback, useEffect, useMemo, useState} from 'react';
import { Text, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import {useStore} from '@store';
import {useNavigation, useRoute} from '@react-navigation/native';
import PayableToolbar from '@controleonline/ui-orders/src/react/components/PayableToolbar';
import OrderTotalToolbar from '@controleonline/ui-orders/src/react/components/OrderTotalToolbar';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
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
import {app_type} from '@appType';
import createStyles from './BottomCart.styles';

const BottomCart = ({
  bottomOffset = 0,
  actionLabel = 'Conferir pedido',
  actionIcon = 'clipboard',
  actionDisabled,
  onActionPress,
  collapsePayableWhenPaid = true,
  showActionButton = true,
  showPayableBadge = false,
  variant = 'default',
  paymentPendingAmount = 0,
  paymentPendingLabel,
  paymentPaidLabel = 'Paga',
  showPaidBreakdown = false,
  paidOrderAmount = 0,
  paidOrderLabel,
  paidReceivedAmount = 0,
  paidReceivedLabel,
  paidDetailsLabel,
  onPaidDetailsPress,
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
  const successColor = themeColors.success;
  // const warningColor = '#D97706';
  const warningColor = themeColors.warning;
  const isCompact = width < 360;
  const isUltraCompact = width < 330;
  const isPaymentStatusVariant = variant === 'payment-status';
  const resolvedPendingAmount = Math.max(Number(paymentPendingAmount || 0), 0);
  const hasPendingPayment = resolvedPendingAmount > 0.009;
  const isPaidStateBar = isPaymentStatusVariant && !hasPendingPayment;
  const shouldShowPaidBreakdown = isPaymentStatusVariant && showPaidBreakdown;
  const shouldShowPaidBreakdownActionButton =
    shouldShowPaidBreakdown && showActionButton && hasPendingPayment;
  const shouldShowActionButton =
    showActionButton &&
    !shouldShowPaidBreakdown &&
    (!isPaymentStatusVariant || hasPendingPayment);
  const shouldShowDetailsButton =
    (shouldShowPaidBreakdown || isPaymentStatusVariant) &&
    typeof onPaidDetailsPress === 'function' &&
    !shouldShowPaidBreakdownActionButton &&
    (!shouldShowActionButton || isPaidStateBar || shouldShowPaidBreakdown);
  const pendingLabel = paymentPendingLabel || global.t?.t('orders', 'label', 'pending') || 'Pendente';
  const resolvedPaidOrderAmount = Math.max(Number(paidOrderAmount || 0), 0);
  const resolvedPaidReceivedAmount = Math.max(Number(paidReceivedAmount || 0), 0);
  const resolvedPaidOrderLabel =
    paidOrderLabel || global.t?.t('orders', 'label', 'localTotal') || 'Total do pedido';
  const resolvedPaidReceivedLabel =
    paidReceivedLabel || global.t?.t('orders', 'label', 'paid') || 'Recebido';
  const resolvedPaidDetailsLabel =
    paidDetailsLabel || global.t?.t('orders', 'button', 'details') || 'Detalhes';
  const cartHeight = shouldShowPaidBreakdown
    ? (isCompact ? 72 : 78)
    : isPaidStateBar
    ? (isCompact ? 34 : 38)
    : (isCompact ? 58 : 64);

  const styles = useMemo(
    () =>
      createStyles({
        primaryColor,
        cardBg,
        borderColor,
        totalCardBg,
        labelColor,
        textColor,
        successColor,
        warningColor,
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
      successColor,
      warningColor,
      isCompact,
      isUltraCompact,
    ],
  );
  const isPosApp = String(app_type || '').trim().toUpperCase() === 'POS';
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
      {showPayableBadge && (
        <PayableToolbar
          bottomOffset={bottomOffset}
          cartHeight={cartHeight + (isCompact ? 8 : 10)}
          collapseWhenPaid={collapsePayableWhenPaid}
        />
      )}
      {shouldShowPaidBreakdown ? (
        <View
          style={[
            styles.paidBreakdownToolbar,
            {bottom: bottomOffset + (isCompact ? 6 : 8), minHeight: cartHeight},
          ]}
        >
          <View style={styles.paidMetricWrap}>
            <Text style={styles.paidMetricLabel}>{resolvedPaidOrderLabel}</Text>
            <Text style={styles.paidMetricValue}>
              {Formatter.formatMoney(resolvedPaidOrderAmount)}
            </Text>
          </View>
          <View style={styles.paidMetricWrap}>
            <Text style={styles.paidMetricLabel}>{resolvedPaidReceivedLabel}</Text>
            <Text style={styles.paidMetricValue}>
              {Formatter.formatMoney(resolvedPaidReceivedAmount)}
            </Text>
          </View>
          {shouldShowDetailsButton && (
            <TouchableOpacity
              onPress={onPaidDetailsPress}
              style={styles.paidDetailsButton}>
              <Text style={styles.paidDetailsButtonText}>
                {resolvedPaidDetailsLabel}
              </Text>
            </TouchableOpacity>
          )}
          {shouldShowPaidBreakdownActionButton && (
            <TouchableOpacity
              disabled={isActionDisabled}
              onPress={handleActionPress}
              style={[
                styles.paidDetailsButton,
                isActionDisabled && styles.checkoutButtonDisabled,
              ]}>
              <Icon color="#fff" name={actionIcon} size={isCompact ? 15 : 16} />
              <Text style={styles.paidDetailsButtonText}>{actionLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : isPaidStateBar ? (
          <View
            style={[
              styles.paidToolbar,
              {bottom: bottomOffset + (isCompact ? 6 : 8)},
            ]}
          >
            <Icon color={successColor} name="check-circle" size={isCompact ? 14 : 15} />
            <Text style={styles.paidToolbarText}>{paymentPaidLabel}</Text>
          </View>
      ) : (
        <View
          style={[
            styles.toolbar,
            {bottom: bottomOffset + (isCompact ? 6 : 8), minHeight: cartHeight},
          ]}
        >
          {isPaymentStatusVariant ? (
            <View
              style={[
                styles.paymentSummaryWrap,
                hasPendingPayment
                  ? styles.paymentSummaryPending
                  : styles.paymentSummaryPaid,
              ]}
            >
              <Text
                style={[
                  styles.paymentSummaryLabel,
                  {color: hasPendingPayment ? warningColor : successColor},
                ]}
              >
                {hasPendingPayment
                  ? pendingLabel
                  : paymentPaidLabel}
              </Text>
              {hasPendingPayment && (
                <Text
                  style={[
                    styles.paymentSummaryValue,
                    {color: warningColor},
                  ]}
                >
                  {Formatter.formatMoney(resolvedPendingAmount)}
                </Text>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.paymentSummaryWrap,
                styles.paymentSummaryPending,
              ]}
            >
              <Text
                style={[
                  styles.paymentSummaryLabel,
                  {color: warningColor},
                ]}
              >
                {pendingLabel}
              </Text>
              <OrderTotalToolbar
                textStyle={[
                  styles.paymentSummaryValue,
                  styles.paymentSummaryValuePending,
                ]}
              />
            </View>
          )}
          {shouldShowActionButton && (
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
          {!isPaidStateBar && shouldShowDetailsButton && !shouldShowActionButton && (
            <TouchableOpacity
              onPress={onPaidDetailsPress}
              style={styles.checkoutButton}>
              <Text style={styles.checkoutButtonText}>{resolvedPaidDetailsLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );
};



export default BottomCart;
