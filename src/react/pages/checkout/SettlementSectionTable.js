import React, {useMemo} from 'react'
import {Text, TouchableOpacity, View} from 'react-native'
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import {
  getLinkedOrderContext,
  normalizeEntityId,
} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'
import {
  resolveInvoicePaymentLabel,
  resolveInvoiceStatusLabel,
  normalizeStatusKey,
  translateOrderStatus,
  SETTLEMENT_ORDER_COLUMNS,
  SETTLEMENT_INVOICE_COLUMNS,
} from './linkedOrderSettlementHelpers'
import styles from './LinkedOrderSettlementPage.styles'

/**
 * DefaultTable-backed section lists for linked-order settlement.
 * Uses controlled `data` (tree already loaded by the page) + storeName for chrome/theme.
 */
export function SettlementOrdersTable({
  orders,
  primaryOrderId,
  orderLabel,
  storeName = 'orders',
  accentColor,
  onRowPress,
}) {
  const data = useMemo(
    () =>
      (Array.isArray(orders) ? orders : []).map(order => {
        const orderId = normalizeEntityId(order)
        const orderContext = getLinkedOrderContext(order)
        return {
          ...order,
          id: orderId,
          externalCode:
            orderContext.externalCode || `${orderLabel} #${orderId || '-'}`,
          statusLabel: translateOrderStatus(
            order?.status?.status || order?.status?.realStatus,
          ),
          isPrimary: orderId === String(primaryOrderId || ''),
        }
      }),
    [orders, orderLabel, primaryOrderId],
  )

  return (
    <DefaultTable
      storeName={storeName}
      data={data}
      columns={SETTLEMENT_ORDER_COLUMNS}
      initialViewMode="cards"
      forceCardsOnCompact
      showToolbar={false}
      showSearch={false}
      showRowActions={false}
      showColumnFiltersButton={false}
      showTotalItemsInFooter={false}
      onRowPress={onRowPress}
      accentColor={accentColor}
      renderCard={({item}) => {
        if (!item) return null
        return (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => onRowPress?.(item)}
            style={styles.listRow}>
            <View style={styles.listRowMain}>
              <Text style={styles.listRowTitle}>{item.externalCode}</Text>
              <Text style={styles.listRowSubtitle}>{item.statusLabel}</Text>
            </View>
            <View style={styles.listRowMeta}>
              {item.isPrimary ? (
                <View style={styles.primaryChip}>
                  <Text style={styles.primaryChipText}>Primary</Text>
                </View>
              ) : null}
              <Text style={styles.listRowAmount}>
                {Formatter.formatMoney(Number(item?.price || 0))}
              </Text>
            </View>
          </TouchableOpacity>
        )
      }}
      visibleColumnsPreferenceKey={`settlement-orders-${storeName}`}
    />
  )
}

export function SettlementInvoicesTable({
  invoices,
  storeName = 'invoice',
  accentColor,
}) {
  const data = useMemo(
    () =>
      (Array.isArray(invoices) ? invoices : []).map(invoice => {
        const invoiceId = normalizeEntityId(invoice)
        return {
          ...invoice,
          id: invoiceId,
          paymentLabel: resolveInvoicePaymentLabel(invoice),
          statusLabel: resolveInvoiceStatusLabel(invoice),
          isClosed: normalizeStatusKey(invoice?.status?.realStatus) === 'closed',
        }
      }),
    [invoices],
  )

  return (
    <DefaultTable
      storeName={storeName}
      data={data}
      columns={SETTLEMENT_INVOICE_COLUMNS}
      initialViewMode="cards"
      forceCardsOnCompact
      showToolbar={false}
      showSearch={false}
      showRowActions={false}
      showColumnFiltersButton={false}
      showTotalItemsInFooter={false}
      accentColor={accentColor}
      renderCard={({item}) => {
        if (!item) return null
        return (
          <View style={styles.invoiceRow}>
            <View style={styles.invoiceMain}>
              <Text style={styles.listRowTitle}>{item.paymentLabel}</Text>
              <Text style={styles.listRowSubtitle}>
                {Formatter.formatDateYmdTodmY(
                  item?.dueDate || item?.invoice_date,
                  true,
                ) || 'No due date'}
              </Text>
            </View>
            <View style={styles.invoiceMeta}>
              <View
                style={[
                  styles.invoiceStatusBadge,
                  item.isClosed
                    ? styles.invoiceStatusBadgeClosed
                    : styles.invoiceStatusBadgeOpen,
                ]}>
                <Text
                  style={[
                    styles.invoiceStatusText,
                    item.isClosed
                      ? styles.invoiceStatusTextClosed
                      : styles.invoiceStatusTextOpen,
                  ]}>
                  {item.statusLabel}
                </Text>
              </View>
              <Text style={styles.listRowAmount}>
                {Formatter.formatMoney(Number(item?.price || 0))}
              </Text>
            </View>
          </View>
        )
      }}
      visibleColumnsPreferenceKey="settlement-invoices"
    />
  )
}
