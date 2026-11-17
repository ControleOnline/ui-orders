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

  const custom = name => ({
    background: c[`buttonBackground_${name}`],
    border: c[`buttonBorder_${name}`],
    icon: c[`buttonIcon_${name}`],
    text: c[`buttonText_${name}`],
  });
  const palettes = {customInfo: custom('customInfo'), customOpen: custom('customOpen'), customPay: custom('customPay')};
  const text = c.textPrimary || c.cardText;
  const background = c.panelBackground || c.cardBackground;
  const border = c.inputBorder || c.cardBorder;
  const dangerBackground = c.tableActionDangerBackground || c.inputErrorBackground || background;
  const dangerBorder = c.tableActionDangerBorder || c.inputErrorBorder || c.textDanger || border;
  const button = (label, icon, fn, iconOnly = false, danger = false, kind = null) => {
    const custom = kind ? palettes[kind] : null;
    return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label}
      onPress={event => {event?.stopPropagation?.(); fn?.();}} style={[s.button, {backgroundColor: danger ? dangerBackground : custom ? custom.background : background, borderColor: danger ? dangerBorder : custom ? custom.border : border}]}>
      <Icon name={icon} size={15} color={danger ? c.iconDanger || c.textDanger : custom ? custom.icon : text} />
      {!iconOnly ? <Text style={[s.label, {color: danger ? c.textDanger || text : custom ? custom.text : text}]}>{label}</Text> : null}
    </TouchableOpacity>;
  };
  // Fixed slots keep Abrir / Pagar / Excluir (or Ver cancelamento) in the same position on every row.
  const slot = (key, width, node) => <View key={key} style={{width}}>{node}</View>;
  return <View style={s.row}>
    {slot('open', 66, onOpenOrder ? button('Abrir', 'eye', onOpenOrder, false, false, 'customOpen') : null)}
    {slot('pay', 71, canPay ? button('Pagar', 'dollar-sign', () => onCreateInvoice?.(row), false, false, 'customPay') : null)}
    {slot('last', 33, canceled && onViewCancellation ? button('Ver cancelamento', 'info', () => onViewCancellation(row), true, false, 'customInfo')
      : canCancel && onCancelOrder ? button('Excluir pedido', 'trash-2', () => onCancelOrder(row), true, true) : null)}
  </View>;
}

const s = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap', gap: 5},
  button: {minHeight: 30, minWidth: 30, paddingHorizontal: 8, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5},
  label: {fontSize: 12},
});
