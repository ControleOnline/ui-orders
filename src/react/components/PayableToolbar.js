import React, {useCallback, useState, useEffect, useMemo} from 'react';
import {View, Text, ActivityIndicator, StyleSheet} from 'react-native';
import {useStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import {buildFood99OrderSummary} from '../services/food99OrderSummary';

const withAlpha = (color, alphaHex) => {
  const raw = String(color || '').trim().replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw}${alphaHex}`;
  }

  if (/^[0-9a-fA-F]{8}$/.test(raw)) {
    return `#${raw.slice(0, 6)}${alphaHex}`;
  }

  return color || '#1B5587';
};

const PayableToolbar = ({bottomOffset = 0, cartHeight = 60}) => {
  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const themeStore = useStore('theme');
  const colors = themeStore?.getters?.colors || {};
  const invoiceStore = useStore('invoice');
  const invoiceGetters = invoiceStore.getters;
  const {isLoading, items: invoices} = invoiceGetters;
  const {items: orders, item: order, payable} = ordersGetters;
  const safeOrders = useMemo(
    () => (Array.isArray(orders) ? orders : []),
    [orders],
  );
  const [price, setPrice] = useState(0);
  const [paid, setPaid] = useState(0);
  const primaryColor = colors.primary || '#1B5587';
  const dangerColor = colors['danger'] || '#DC2626';
  const successColor = colors['success'] || '#16A34A';
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
      }),
    [primaryColor, dangerColor, successColor],
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

    if (invoices && invoices.length > 0) {
      const localPaid = invoices.reduce(
        (sum, invoice) => sum + parseFloat(invoice.price),
        0,
      );
      setPaid(localPaid);
      return;
    }

    setPaid(0);
  }, [food99Summary, invoices]);

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
  const statusText = isDebt ? 'Saldo devedor' : 'Pago';
  const amountText = isDebt
    ? Formatter.formatMoney(payableValue)
    : Formatter.formatMoney(payableValue + parseFloat(price || 0));
  const messageColor = isDebt ? dangerColor : successColor;

  return (
    price > 0 && (
      <View
        style={[
          styles.toolbarWrap,
          {
            bottom:
              payable != undefined && payable == 0
                ? bottomOffset + 8
                : cartHeight + bottomOffset + 12,
          },
        ]}>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={primaryColor}
            style={{paddingVertical: 6}}
          />
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
      </View>
    )
  );
};

const createStyles = ({primaryColor, dangerColor, successColor}) =>
  StyleSheet.create({
    toolbarWrap: {
      position: 'absolute',
      left: 10,
      right: 10,
      alignItems: 'center',
      zIndex: 12,
    },
    badge: {
      minHeight: 34,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      shadowColor: '#0F172A',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: {width: 0, height: 4},
      elevation: 3,
      backgroundColor: withAlpha(primaryColor, '10'),
      borderColor: withAlpha(primaryColor, '30'),
    },
    badgeDanger: {
      backgroundColor: withAlpha(dangerColor, '12'),
      borderColor: withAlpha(dangerColor, '55'),
    },
    badgeSuccess: {
      backgroundColor: withAlpha(successColor, '10'),
      borderColor: withAlpha(successColor, '45'),
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '800',
      textAlign: 'center',
    },
  });

export default PayableToolbar;
