import React, {useCallback, useState, useEffect, useMemo} from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import {useStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import {buildFood99OrderSummary} from '../services/marketplaceOrderSummary';
import {resolvePaidAmountForOrder} from '../utils/checkoutInvoices';
import createStyles from './PayableToolbar.styles';
import { inlineStyle_125_12 } from './PayableToolbar.styles';

const PayableToolbar = ({
  bottomOffset = 0,
  cartHeight = 60,
  collapseWhenPaid = true,
}) => {
  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const themeStore = useStore('theme');
  const colors = themeStore?.getters?.colors || {};
  const orderInvoicesStore = useStore('order_invoices');
  const orderInvoicesGetters = orderInvoicesStore.getters;
  const {isLoading, items: orderInvoices} = orderInvoicesGetters;
  const {items: orders, item: order, payable} = ordersGetters;
  const {width} = useWindowDimensions();
  const safeOrders = useMemo(
    () => (Array.isArray(orders) ? orders : []),
    [orders],
  );
  const [price, setPrice] = useState(0);
  const [paid, setPaid] = useState(0);
  const primaryColor = colors.primary;
  const dangerColor = colors['danger'];
  const successColor = colors['success'];
  const isCompact = width < 360;
  const isUltraCompact = width < 330;
  const food99Summary = useMemo(() => buildFood99OrderSummary(order), [order]);
  const resolvedPrice = Number.isFinite(Number(food99Summary?.financial?.customerTotal))
    ? Number(food99Summary.financial.customerTotal)
    : Number(order?.price || 0);
  const styles = useMemo(
    () =>
      createStyles({
        primaryColor,
        dangerColor,
        successColor,
        compact: isCompact,
        ultraCompact: isUltraCompact,
      }),
    [primaryColor, dangerColor, successColor, isCompact, isUltraCompact],
  );

  useFocusEffect(
    useCallback(() => {
      if (!order) return;
      setPrice(resolvedPrice > 0 ? resolvedPrice : 0);
    }, [order, resolvedPrice]),
  );

  useEffect(() => {
    const listener = p => {
      let value = price + p;
      setPrice(value > 0 ? value : 0);
    };
    eventBus.on('price', listener);
    return () => eventBus.off('price', listener);
  }, [price, setPrice]);

  useEffect(() => {
    if (food99Summary?.payment) {
      setPaid(Number(food99Summary.payment.amountPaid || 0));
      return;
    }

    setPaid(resolvePaidAmountForOrder({order, orderInvoices}));
  }, [food99Summary, order, orderInvoices]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let p = parseFloat(paid) - parseFloat(price);
      ordersActions.setPayable(p);
    }, 300);

    return () => clearTimeout(timeout);
  }, [price, paid]);

  useEffect(() => {
    if (payable >= 0 && order && order['@id'] && price > 0 && safeOrders.length > 0) {
      const updatedOrders = safeOrders.filter(item => item['@id'] !== order['@id']);
      if (updatedOrders.length === safeOrders.length) {
        return;
      }
      ordersActions.setItems(updatedOrders);
    }
  }, [order, ordersActions, payable, price, safeOrders]);

  const payableValue = Number.isFinite(Number(payable)) ? Number(payable) : 0;
  const isDebt = payableValue < 0;
  const statusText = isDebt ? (isUltraCompact ? 'Devedor' : 'Saldo devedor') : 'Pago';
  const amountText = isDebt
    ? Formatter.formatMoney(payableValue)
    : Formatter.formatMoney(payableValue + parseFloat(price || 0));
  const messageColor = isDebt ? dangerColor : successColor;

  return (price > 0 && (<View
    style={[
      styles.toolbarWrap,
      {
        bottom:
          collapseWhenPaid && payable != undefined && payable == 0
            ? bottomOffset + (isCompact ? 6 : 8)
            : cartHeight + bottomOffset + (isCompact ? 8 : 12),
      },
    ]}>
    {isLoading ? (
      <Text style={[styles.badgeText, {color: primaryColor}, inlineStyle_125_12]}>
        Carregando...
      </Text>
    ) : (
      <View style={[styles.badge, isDebt ? styles.badgeDanger : styles.badgeSuccess]}>
        <Icon
          color={messageColor}
          name={isDebt ? 'alert-triangle' : 'check-circle'}
          size={14}
        />
        <Text style={[styles.badgeText, {color: messageColor}]}>
          {statusText}: {amountText}
        </Text>
      </View>
    )}
  </View>));
};

export default PayableToolbar;
