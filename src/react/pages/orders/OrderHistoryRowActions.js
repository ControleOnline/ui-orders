import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { isCanceledOrder, isCancelableOrder, isPayableOrder } from './orderHistoryHelpers';

export default function OrderHistoryRowActions({
  row, styles, themeColors, onViewCancellation, onCreateInvoice, onCancelOrder,
}) {
  if (isCanceledOrder(row)) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={global.t?.t('orders', 'button', 'viewCancellationDetails') || 'Ver cancelamento'}
        style={[styles.rowActionButton, { borderColor: themeColors.buttonBackground, backgroundColor: themeColors.buttonBackground }]}
        activeOpacity={0.82}
        onPress={e => { e?.stopPropagation?.(); onViewCancellation?.(row); }}
      >
        <Icon name="eye" size={16} color={themeColors.buttonIcon} />
      </TouchableOpacity>
    );
  }

  const canPay = isPayableOrder(row);
  const canCancel = isCancelableOrder(row);

  if (!canPay && !canCancel) return null;

  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {canPay ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={global.t?.t('orders', 'button', 'markAsPaid') || 'Marcar como pago'}
          style={[styles.rowActionButton, { borderColor: themeColors.buttonBackground, backgroundColor: themeColors.buttonBackground }]}
          activeOpacity={0.82}
          onPress={e => { e?.stopPropagation?.(); onCreateInvoice?.(row); }}
        >
          <Icon name="dollar-sign" size={16} color={themeColors.buttonIcon} />
        </TouchableOpacity>
      ) : null}
      {canCancel ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={global.t?.t('orders', 'button', 'cancelOrder') || 'Cancelar'}
          style={[styles.rowActionButton, { borderColor: themeColors.buttonBackground, backgroundColor: themeColors.buttonBackground }]}
          activeOpacity={0.82}
          onPress={e => { e?.stopPropagation?.(); onCancelOrder?.(row); }}
        >
          <Icon name="trash-2" size={16} color={themeColors.buttonIcon} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
