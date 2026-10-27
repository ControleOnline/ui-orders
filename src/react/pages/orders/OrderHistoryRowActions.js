import React from 'react';
import {Text, TouchableOpacity, View, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { isCanceledOrder, isCancelableOrder, isPayableOrder } from './orderHistoryHelpers';

export default function OrderHistoryRowActions({
  row, themeColors: c, onOpenOrder, onViewCancellation, onCreateInvoice, onCancelOrder,
}) {
  const canceled = isCanceledOrder(row);
  const canPay = isPayableOrder(row);
  const canCancel = isCancelableOrder(row);

  const text = c.textPrimary || c.cardText;
  const background = c.panelBackground || c.cardBackground;
  const border = c.inputBorder || c.cardBorder;
  const dangerBackground = c.tableActionDangerBackground || c.inputErrorBackground || background;
  const dangerBorder = c.tableActionDangerBorder || c.inputErrorBorder || c.textDanger || border;
  const button = (label, icon, fn, iconOnly = false, danger = false) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={label}
    onPress={event => {event?.stopPropagation?.(); fn?.();}} style={[s.button, {backgroundColor: danger ? dangerBackground : background, borderColor: danger ? dangerBorder : border}]}>
    <Icon name={icon} size={15} color={danger ? c.iconDanger || c.textDanger : text} />
    {!iconOnly ? <Text style={[s.label, {color: danger ? c.textDanger || text : text}]}>{label}</Text> : null}
  </TouchableOpacity>;
  return <View style={s.row}>
    {onOpenOrder ? button('Abrir', 'eye', onOpenOrder) : null}
    {canPay ? button('Pagar', 'dollar-sign', () => onCreateInvoice?.(row)) : null}
    {canceled && onViewCancellation ? button('Ver cancelamento', 'info', () => onViewCancellation(row), true) : null}
    {canCancel && onCancelOrder ? button('Excluir pedido', 'trash-2', () => onCancelOrder(row), true, true) : null}
  </View>;
}

const s = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 5},
  button: {minHeight: 44, minWidth: 44, paddingHorizontal: 8, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5},
  label: {fontSize: 12},
});
