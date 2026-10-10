import React from 'react';
import {resolveOrderHistoryStatusColor} from './orderHistoryStatusColor';
import {Text, TouchableOpacity, View, StyleSheet} from 'react-native';
import useDefaultTableTheme from '@controleonline/ui-default/src/react/components/table/useDefaultTableTheme';
import OrderIdentityLabel from '../../components/OrderIdentityLabel';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import { getEntityId, getPeopleLabel } from './orderHistoryHelpers';

export default function OrderHistoryCard({order, openRow, onOpenOrder, purchaseSuppliersById}) {
  const {themeColors: c} = useDefaultTableTheme(null, 'compact');
  const text = c.cardText || c.textPrimary;
  const muted = c.textSecondary || text;
  const status = order?.status || {};
  const rawStatus = typeof status === 'string' ? status : status.status || status.name || '';
  const statusLabel = global.t?.t('orders', 'status', rawStatus.toLowerCase()) || rawStatus || '—';
  const statusColor = resolveOrderHistoryStatusColor(status, c);
  const supplierId = getEntityId(order?.client);
  const client = getPeopleLabel(order?.client) || purchaseSuppliersById?.[supplierId] || 'Sem cliente';
  const type = ({sale: 'Venda', purchase: 'Compra', transfer: 'Transferência', loss: 'Perda', cart: 'Carrinho', tab: 'Comanda', table: 'Mesa', stamp: 'Carimbo'})[order?.orderType] || global.t?.t('orders', 'orderType', order?.orderType) || order?.orderType || '';
  const channel = typeof order?.app === 'object' ? order.app.name || order.app.label : order?.app;
  const date = order?.orderDate || order?.alterDate;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Abrir pedido ${order.id}`} activeOpacity={0.85}
    style={s.card} onPress={openRow || (() => onOpenOrder?.(order))}>
    <View style={s.head}><OrderIdentityLabel order={order} containerStyle={[s.identity, {borderColor: c.border, backgroundColor: c.inputBackground}]} primaryTextStyle={[s.id, {color: text}]} secondaryTextStyle={[s.meta, {color: muted}]} />
      <View style={[s.status, {borderColor: statusColor, backgroundColor: /^#[0-9a-f]{6}$/i.test(statusColor) ? statusColor + '10' : c.cardBackground}]}><Text style={[s.statusText, {color: statusColor}]}>{statusLabel}</Text></View>
    </View>
    <Text style={[s.client, {color: text}]} numberOfLines={1}>{client}</Text>
    <Text style={[s.meta, {color: muted}]} numberOfLines={1}>{[channel, type].filter(Boolean).join(' · ')}</Text>
    <View style={s.bottom}><Text style={[s.meta, {color: muted}]}>{date ? Formatter.formatDateYmdTodmY(date, !/T00:00:00| 00:00:00/.test(date)).replace(/(\d{2}:\d{2}):\d{2}/, '$1') : '—'}</Text>
      <Text style={[s.price, {color: text}]}>{Formatter.formatMoney(order?.price || 0)}</Text>
    </View>
  </TouchableOpacity>;
}

const s = StyleSheet.create({
  card: {padding: 14, gap: 7},
  head: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8},
  id: {fontSize: 14, fontWeight: '700'},
  identity: {borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 3},
  status: {borderWidth: 1, borderRadius: 18, paddingHorizontal: 9, paddingVertical: 4},
  statusText: {fontSize: 12, fontWeight: '600'},
  client: {fontSize: 13},
  meta: {fontSize: 12, flexShrink: 1},
  bottom: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 5},
  price: {fontSize: 19, fontWeight: '700'},
  open: {fontSize: 12, marginTop: 5},
});
