import React, {useMemo} from 'react';
import {Text, View, TouchableOpacity, StyleSheet} from 'react-native';
import {useStore} from '@store';
import {useNavigation} from '@react-navigation/native';
import PayableToolbar from '@controleonline/ui-orders/src/react/components/PayableToolbar';
import OrderTotalToolbar from '@controleonline/ui-orders/src/react/components/OrderTotalToolbar';
import Icon from 'react-native-vector-icons/Feather';

const BottomCart = ({bottomOffset = 0}) => {
  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const {item: order} = ordersGetters;
  const themeStore = useStore('theme');
  const themeColors = themeStore?.getters?.colors || {};
  const navigation = useNavigation();
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

  const handlePay = item => {
    navigation.navigate('Checkout', {orderId: item.id});
  };

  const canPay = !!order?.id;

  return (
    <>
      <PayableToolbar
        bottomOffset={bottomOffset}
        cartHeight={cartHeight + 10}
      />
      <View style={[styles.toolbar, {bottom: bottomOffset + 8, minHeight: cartHeight}]}>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>{global.t?.t('orders', 'label', 'orderTotal')}</Text>
          <OrderTotalToolbar />
        </View>
        <TouchableOpacity
          disabled={!canPay}
          onPress={() => canPay && handlePay(order)}
          style={[
            styles.checkoutButton,
            !canPay && styles.checkoutButtonDisabled,
          ]}>
          <Icon color="#fff" name="check-circle" size={16} />
          <Text style={styles.checkoutButtonText}>{global.t?.t('orders', 'button', 'closeOrder')}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const createStyles = ({
  primaryColor,
  cardBg,
  borderColor,
  totalCardBg,
  labelColor,
  textColor,
}) =>
  StyleSheet.create({
    toolbar: {
      position: 'absolute',
      left: 10,
      right: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor,
      backgroundColor: cardBg,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      shadowColor: '#0F172A',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: {width: 0, height: 8},
      elevation: 6,
      gap: 8,
    },
    totalWrap: {
      flex: 1,
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor,
      backgroundColor: totalCardBg,
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    totalLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.2,
      textTransform: 'uppercase',
      color: labelColor,
      marginBottom: 2,
    },
    checkoutButton: {
      minHeight: 48,
      minWidth: 168,
      borderRadius: 12,
      backgroundColor: primaryColor,
      borderWidth: 1,
      borderColor: primaryColor,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 14,
    },
    checkoutButtonDisabled: {
      opacity: 0.55,
    },
    checkoutButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.35,
    },
    totalText: {
      color: textColor,
    },
  });

export default BottomCart;
