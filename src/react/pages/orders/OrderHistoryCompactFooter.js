import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useStore} from '@store';
import useDefaultTableTheme from '@controleonline/ui-default/src/react/components/table/useDefaultTableTheme';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {resolveHistorySalesTotals} from './orderHistoryCompactSummary';

export default function OrderHistoryCompactFooter({storeName}) {
  const {getters} = useStore(storeName);
  const {themeColors: c} = useDefaultTableTheme(null, 'compact');
  const configs = getters.configs || {};
  if (configs.showTotalItemsInFooter === false) return null;
  // Never derive financial totals from the currently loaded page.
  const sales = !configs.paginationLoading && configs.requestParams?.summary === 'sales'
    ? resolveHistorySalesTotals(getters.summary) : null;
  const text = c.tableFooterText || c.textPrimary;
  const muted = c.textSecondary || text;
  const metric = (label, value) => <View style={s.metric}><Text style={[s.label, {color: muted}]}>{label}</Text><Text style={[s.value, {color: text}]}>{value}</Text></View>;
  return <View style={[s.footer, {backgroundColor: c.tableFooterBackground || c.panelBackground, borderTopColor: c.tableFooterBorder || c.inputBorder}]}>
    <View style={s.metrics}>
      {metric('Pedidos', configs.paginationLoading ? '…' : getters.totalItems ?? 0)}
      {sales ? <>{metric('Receita concluída', Formatter.formatMoney(sales.revenue))}{metric('Ticket médio', Formatter.formatMoney(sales.averageTicket))}</> : null}
    </View>
    {sales ? <Text style={[s.basis, {color: muted}]}>{sales.orders} vendas concluídas · filtros aplicados</Text> : null}
  </View>;
}

const s = StyleSheet.create({
  footer: {flexShrink: 0, paddingHorizontal: 12, paddingVertical: 8, gap: 5, borderTopWidth: 1},
  metrics: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14},
  metric: {flexDirection: 'row', gap: 6, alignItems: 'baseline', minWidth: 62},
  label: {fontSize: 11},
  value: {fontSize: 14, fontWeight: '700'},
  basis: {fontSize: 11},
});
