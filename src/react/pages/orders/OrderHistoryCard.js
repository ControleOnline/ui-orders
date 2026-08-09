import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import { getEntityId, getPeopleLabel } from './orderHistoryHelpers';

export default function OrderHistoryCard({ order, openRow, onOpenOrder, styles, purchaseSuppliersById }) {
  const isPurchase = order?.orderType === 'purchase';
  const isTransfer = order?.orderType === 'transfer';
  const isLoss = order?.orderType === 'loss';
  const supplierId = getEntityId(order?.client);
  const supplierLabel = getPeopleLabel(order?.client) || (supplierId ? purchaseSuppliersById?.[supplierId] : '') || '';
  const channelLabel = isPurchase
    ? supplierLabel
    : isTransfer
      ? global.t?.t('orders', 'label', 'stock_transfer')
      : isLoss
        ? global.t?.t('orders', 'label', 'stock_loss')
        : '';
  return (
    <TouchableOpacity key={order.id} style={styles.orderCard} activeOpacity={0.85} onPress={openRow || (() => onOpenOrder?.(order))}>
      <OrderHeader order={order} isKds={false} layout="historyCompact" />
      {(isPurchase || isTransfer || isLoss) ? (
        <View style={styles.cardMetaRow}>
          <Text style={styles.channelText} numberOfLines={1}>{channelLabel}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
