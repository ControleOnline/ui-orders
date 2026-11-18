import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useStore} from '@store';
import useDefaultTableTheme from '@controleonline/ui-default/src/react/components/table/useDefaultTableTheme';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import DefaultTablePaginationBar from '@controleonline/ui-default/src/react/components/table/DefaultTablePaginationBar';
import {resolveHistorySalesTotals} from './orderHistoryCompactSummary';

// Single-row footer, same layout as DefaultTableFooter (totals + item count + embedded paginator).
export default function OrderHistoryCompactFooter({storeName}) {
  const {getters} = useStore(storeName);
  const {themeColors: c} = useDefaultTableTheme(null, 'compact');
  const configs = getters.configs || {};
  const showTotals = configs.showTotalItemsInFooter !== false;
  // Never derive financial totals from the currently loaded page.
  const sales = showTotals && !configs.paginationLoading && configs.requestParams?.summary === 'sales'
    ? resolveHistorySalesTotals(getters.summary) : null;
  const text = c.defaultTable_tableFooterText || c.tableFooterText || c.textPrimary;
  const metric = (label, value) => <View key={label} style={s.metric}>
    <Text style={[s.label, {color: text}]} numberOfLines={1}>{label}</Text>
    <Text style={[s.value, {color: text}]} numberOfLines={1}>{value}</Text>
  </View>;
  return <View style={[s.footer, {
    backgroundColor: c.defaultTable_tableFooterBackground || c.tableFooterBackground || c.panelBackground,
    borderTopColor: c.defaultTable_tableFooterBorder || c.tableFooterBorder || c.inputBorder,
  }]}>
    <View style={s.metrics}>
      {showTotals ? metric('Pedidos', configs.paginationLoading ? '…' : getters.totalItems ?? 0) : null}
      {sales ? [
        metric('Vendas concluídas', sales.orders),
        metric('Receita concluída', Formatter.formatMoney(sales.revenue)),
        metric('Ticket médio', Formatter.formatMoney(sales.averageTicket)),
      ] : null}
    </View>
    <DefaultTablePaginationBar storeName={storeName} embedded />
  </View>;
}

const s = StyleSheet.create({
  footer: {flexShrink: 0, minHeight: 34, paddingHorizontal: 8, paddingVertical: 3, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6},
  metrics: {flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', gap: 4},
  metric: {flex: 1, flexBasis: 0, minWidth: 0, flexShrink: 1, paddingHorizontal: 4},
  label: {fontSize: 8, fontWeight: '900', textTransform: 'uppercase'},
  value: {fontSize: 12, fontWeight: '900'},
});
