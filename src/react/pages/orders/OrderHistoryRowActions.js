import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { isCanceledOrder, isCancelableOrder } from './orderHistoryHelpers';

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
  const canCancel = isCancelableOrder(row);
  if (!canCancel && isCanceledOrder(row)) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {!isCanceledOrder(row) ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={global.t?.t('orders', 'button', 'createInvoice') || 'Criar fatura'}
          style={[styles.rowActionButton, { borderColor: themeColors.buttonBackground, backgroundColor: themeColors.buttonBackground }]}
          activeOpacity={0.82}
          onPress={e => { e?.stopPropagation?.(); onCreateInvoice?.(row); }}
        >
          <Icon name="file-text" size={16} color={themeColors.buttonIcon} />
        </TouchableOpacity>
      ) : null}
      {canCancel ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={global.t?.t('orders', 'button', 'cancelOrder')}
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
