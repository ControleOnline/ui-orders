import React, {useEffect} from 'react'
import {ActivityIndicator, Text, View} from 'react-native'

import Formatter from '@controleonline/ui-common/src/utils/formatter'
import {useStore} from '@store'

import useOrderDetailsVisuals from './useOrderDetailsVisuals'

const renderDetailsLines = (lines, localStyles) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    return null
  }

  return lines.map(line => {
    const value = line?.money
      ? Formatter.formatMoney(Number(line?.value || 0))
      : String(line?.value ?? '').trim()

    if (!value) {
      return null
    }

    const textStyle = line?.strong
      ? localStyles.detailsInfoTextStrong
      : localStyles.detailsInfoText

    return (
      <Text key={line.key} style={textStyle}>
        {!!line.label ? `${line.label}: ` : ''}
        {value}
      </Text>
    )
  })
}

const renderPaymentCards = (cards, localStyles) => {
  if (!Array.isArray(cards) || cards.length === 0) {
    return null
  }

  return (
    <View style={localStyles.detailsGrid}>
      {cards.map(card => (
        <View key={card.key} style={localStyles.detailsCard}>
          <Text style={localStyles.detailsCardLabel}>{card.label}</Text>
          <Text style={localStyles.detailsCardValue}>
            {Formatter.formatMoney(Number(card.value || 0))}
          </Text>
        </View>
      ))}
    </View>
  )
}

const OrderInvoices = ({
  localFinancialLines = [],
  localInvoiceCards = [],
  localInvoicesEmptyText = '',
  localInvoicesSectionTitle = '',
  marketplaceSummary = {},
  renderLocalInvoiceCards,
  routeOrderIri = '',
  variant = 'main',
}) => {
  const {styles: localStyles, ppcColors} = useOrderDetailsVisuals()
  const invoiceStore = useStore('invoice')
  const {actions: invoiceActions, getters: invoiceGetters} = invoiceStore
  const detailsVariant = variant === 'details'

  useEffect(() => {
    if (!routeOrderIri) {
      return
    }

    // Financial data is loaded only when the tab is mounted.
    invoiceActions.getItems({'order.order': routeOrderIri}).catch(() => null)
  }, [invoiceActions, routeOrderIri])

  const marketplaceFinancialLines = marketplaceSummary.summary?.financial || []
  const marketplaceDeliveryPaymentLines =
    marketplaceSummary.summary?.deliveryPaymentLines || []
  const marketplacePaymentCards = marketplaceSummary.summary?.paymentCards || []
  const hasStaticContent =
    localFinancialLines.length > 0 ||
    marketplaceFinancialLines.length > 0 ||
    marketplaceDeliveryPaymentLines.length > 0 ||
    marketplacePaymentCards.length > 0
  const hasContent = hasStaticContent || localInvoiceCards.length > 0
  const isLoadingInvoices =
    !hasContent && !!invoiceGetters?.isLoading

  if (isLoadingInvoices) {
    return (
      <View style={localStyles.detailsLoadingState}>
        <ActivityIndicator size="small" color={ppcColors.accentInfo} />
        <Text style={localStyles.detailsLoadingText}>
          {global.t?.t('orders', 'label', 'loading') || 'Carregando financeiro...'}
        </Text>
      </View>
    )
  }

  if (!hasContent) {
    return (
      <Text
        style={
          detailsVariant ? localStyles.detailsInfoText : localStyles.mobileInfoSubtitle
        }
      >
        {localInvoicesEmptyText}
      </Text>
    )
  }

  return (
    <View style={localStyles.detailsTabStack}>
      {renderPaymentCards(marketplacePaymentCards, localStyles)}

      {!!localFinancialLines.length && (
        <View style={localStyles.detailsSection}>
          <Text style={localStyles.detailsSectionTitle}>
            {global.t?.t('orders', 'title', 'payments') || 'Financeiro'}
          </Text>
          {renderDetailsLines(localFinancialLines, localStyles)}
        </View>
      )}

      {!!marketplaceFinancialLines.length && (
        <View style={localStyles.detailsSection}>
          <Text style={localStyles.detailsSectionTitle}>
            {marketplaceSummary.summary?.financeTitle ||
              global.t?.t('orders', 'title', 'payments') ||
              'Financeiro da integracao'}
          </Text>
          {renderDetailsLines(marketplaceFinancialLines, localStyles)}
        </View>
      )}

      {!!marketplaceDeliveryPaymentLines.length && (
        <View style={localStyles.detailsSection}>
          <Text style={localStyles.detailsSectionTitle}>
            {global.t?.t('orders', 'label', 'paymentMethod') || 'Cobranca'}
          </Text>
          {renderDetailsLines(marketplaceDeliveryPaymentLines, localStyles)}
        </View>
      )}

      <View style={localStyles.detailsSection}>
        <Text style={localStyles.detailsSectionTitle}>
          {localInvoicesSectionTitle}
        </Text>
        {invoiceGetters?.isLoading && !localInvoiceCards.length ? (
          <View style={localStyles.detailsLoadingState}>
            <ActivityIndicator size="small" color={ppcColors.accentInfo} />
            <Text style={localStyles.detailsLoadingText}>
              {global.t?.t('orders', 'label', 'loading') || 'Carregando invoices...'}
            </Text>
          </View>
        ) : (
          renderLocalInvoiceCards(detailsVariant ? 'details' : 'mobile')
        )}
      </View>
    </View>
  )
}

export default OrderInvoices
