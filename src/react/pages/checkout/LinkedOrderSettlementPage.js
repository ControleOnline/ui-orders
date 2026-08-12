import React from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import {SafeAreaView} from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/Feather'
import {withOpacity} from '@controleonline/../../src/styles/branding'
import LinkedOrderEntrySheet from '@controleonline/ui-orders/src/react/components/LinkedOrderEntrySheet'
import {normalizeEntityId} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'
import {
  SettlementOrdersTable,
  SettlementInvoicesTable,
} from './SettlementSectionTable'
import {useLinkedOrderSettlement} from './useLinkedOrderSettlement'
import styles from './LinkedOrderSettlementPage.styles'

export default function LinkedOrderSettlementPage({navigation, route}) {
  const {
    palette,
    orderLabel,
    linkedOrderType,
    preferredInputType,
    loadingTree,
    actionLoading,
    primaryOrder,
    settlementOrders,
    childSaleOrders,
    invoiceCards,
    invoiceSummary,
    pendingAmount,
    linkedOrderEntryState,
    resolveLinkedOrderEntry,
    handleIdentifyLinkedOrder,
    handleRefresh,
    handleOpenOrderDetails,
    handleOpenCheckout,
    handleCloseSettlement,
    primaryContext,
    canUseSettlementScreen,
    currentCompany,
  } = useLinkedOrderSettlement({navigation, route})

  if (!currentCompany?.id) {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: palette.background}]}
        edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={34} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Select a company</Text>
          <Text style={styles.centerStateText}>
            The settlement workflow depends on the active company to find open
            tabs, tables and invoices.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!canUseSettlementScreen) {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: palette.background}]}
        edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="slash" size={34} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Settlement disabled</Text>
          <Text style={styles.centerStateText}>
            This PDV does not use linked tabs or tables, so the settlement screen
            is hidden here.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
  <SafeAreaView
    style={[
      styles.container,
      {backgroundColor: palette.background},
    ]}
    edges={['bottom']}>
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loadingTree}
          onRefresh={() => {
            void handleRefresh()
          }}
          tintColor={palette.primary}
        />
      }>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View
            style={[
              styles.heroIconWrap,
              {backgroundColor: withOpacity(palette.primary, 0.12)},
            ]}>
            <Icon name="layers" size={20} color={palette.primary} />
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              {global.t?.t('orders', 'title', 'linkedOrderSettlement') ||
                `${orderLabel} settlement`}
            </Text>
            <Text style={styles.heroText}>
              {primaryOrder
                ? `Collect payments, link more ${orderLabel.toLowerCase()}s and close the full settlement tree from here.`
                : `Identify one or more ${orderLabel.toLowerCase()}s to centralize invoices and collect the remaining balance.`}
            </Text>
          </View>
        </View>

        <View style={styles.heroActions}>
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={actionLoading !== ''}
            onPress={() => {
              void handleIdentifyLinkedOrder()
            }}
            style={[
              styles.primaryAction,
              {backgroundColor: palette.primary},
              actionLoading === 'identify' && styles.actionDisabled,
            ]}>
            {actionLoading === 'identify' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="plus-circle" size={16} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>
                  {primaryOrder
                    ? `Link ${orderLabel}`
                    : `Identify ${orderLabel}`}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={!primaryOrder || actionLoading !== ''}
            onPress={handleOpenCheckout}
            style={[
              styles.secondaryAction,
              !primaryOrder && styles.actionDisabled,
            ]}>
            <Icon name="credit-card" size={16} color="#0F172A" />
            <Text style={styles.secondaryActionText}>Open checkout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loadingTree && !primaryOrder ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={palette.primary} />
          <Text style={styles.loadingText}>Loading settlement data...</Text>
        </View>
      ) : null}

      {!primaryOrder ? (
        <View style={styles.emptyCard}>
          <Icon name="hash" size={30} color="#94A3B8" />
          <Text style={styles.emptyTitle}>
            No {orderLabel.toLowerCase()} selected
          </Text>
          <Text style={styles.emptyText}>
            Start by identifying the first {orderLabel.toLowerCase()}. The screen
            will create it when needed and keep every linked sale under the same
            financial root.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.primaryCard}>
            <View style={styles.primaryHeader}>
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText}>Primary {orderLabel}</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => handleOpenOrderDetails(primaryOrder)}
                style={styles.inlineLink}>
                <Icon name="external-link" size={14} color={palette.primary} />
                <Text style={[styles.inlineLinkText, {color: palette.primary}]}>
                  Details
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.primaryCode}>
              {primaryContext.externalCode ||
                `${orderLabel} #${normalizeEntityId(primaryOrder) || '-'}`}
            </Text>
            <Text style={styles.primarySubtitle}>
              Order #{normalizeEntityId(primaryOrder) || '-'} ·{' '}
              {translateOrderStatus(primaryOrder?.status?.status || primaryOrder?.status?.realStatus)}
            </Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total</Text>
                <Text style={styles.metricValue}>
                  {Formatter.formatMoney(primaryOrderTotal)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Paid</Text>
                <Text style={[styles.metricValue, styles.metricValueSuccess]}>
                  {Formatter.formatMoney(invoiceSummary.paidAmount)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Pending</Text>
                <Text
                  style={[
                    styles.metricValue,
                    pendingAmount > 0.009
                      ? styles.metricValueDanger
                      : styles.metricValueSuccess,
                  ]}>
                  {Formatter.formatMoney(pendingAmount)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Linked {orderLabel}s
              </Text>
              <Text style={styles.sectionMeta}>
                {settlementOrders.length}
              </Text>
            </View>

                          <SettlementOrdersTable
              orders={settlementOrders}
              primaryOrderId={normalizeEntityId(primaryOrder)}
              orderLabel={orderLabel}
              accentColor={palette.primary}
              onRowPress={handleOpenOrderDetails}
            />
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Linked sale orders</Text>
              <Text style={styles.sectionMeta}>{childSaleOrders.length}</Text>
            </View>

            {childSaleOrders.length ? (
                              <SettlementOrdersTable
                orders={childSaleOrders}
                primaryOrderId={null}
                orderLabel={global.t?.t('orders', 'label', 'sale') || 'Sale'}
                accentColor={palette.primary}
                onRowPress={handleOpenOrderDetails}
              />
            ) : (
              <Text style={styles.emptySectionText}>
                No sale orders are linked to this {orderLabel.toLowerCase()} yet.
              </Text>
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Invoices</Text>
              <Text style={styles.sectionMeta}>{invoiceSummary.count}</Text>
            </View>

            {invoiceCards.length ? (
                              <SettlementInvoicesTable
                invoices={invoiceCards}
                accentColor={palette.primary}
              />
            ) : (
              <Text style={styles.emptySectionText}>
                No invoices were registered for this settlement yet.
              </Text>
            )}
          </View>

          <View style={styles.footerActions}>
            <TouchableOpacity
              activeOpacity={0.88}
              disabled={actionLoading !== ''}
              onPress={handleOpenCheckout}
              style={[
                styles.footerPrimaryButton,
                {backgroundColor: palette.primary},
                actionLoading !== '' && styles.actionDisabled,
              ]}>
              <Icon name="dollar-sign" size={16} color="#FFFFFF" />
              <Text style={styles.footerPrimaryButtonText}>
                {pendingAmount > 0.009 ? 'Charge balance' : 'Review payments'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              disabled={actionLoading === 'close'}
              onPress={handleCloseSettlement}
              style={[
                styles.footerSecondaryButton,
                actionLoading === 'close' && styles.actionDisabled,
              ]}>
              {actionLoading === 'close' ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <>
                  <Icon name="check-circle" size={16} color="#0F172A" />
                  <Text style={styles.footerSecondaryButtonText}>Close settlement</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>

    <LinkedOrderEntrySheet
      onCancel={() => resolveLinkedOrderEntry(null)}
      onSubmit={resolveLinkedOrderEntry}
      orderType={linkedOrderEntryState?.orderType || linkedOrderType || 'tab'}
      preferredInputType={linkedOrderEntryState?.preferredInputType || preferredInputType}
      validateInput={linkedOrderEntryState?.validateInput || null}
      visible={!!linkedOrderEntryState}
    />
  </SafeAreaView>
)
}
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
