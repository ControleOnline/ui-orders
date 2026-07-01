import React from 'react'
import {Text, View} from 'react-native'

import Formatter from '@controleonline/ui-common/src/utils/formatter'

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
  isLoadingInvoices = false,
  renderLocalInvoiceCards,
  variant = 'main',
  showFinancialSections = true,
  showInvoicesSectionTitle = true,
}) => {
  const {styles: localStyles, ppcColors} = useOrderDetailsVisuals()
  const detailsVariant = variant === 'details'
  const marketplaceFinancialLines = marketplaceSummary.summary?.financial || []
  const marketplaceDeliveryPaymentLines =
    marketplaceSummary.summary?.deliveryPaymentLines || []
  const marketplacePaymentCards = marketplaceSummary.summary?.paymentCards || []
  const hasStaticContent =
    showFinancialSections &&
    (localFinancialLines.length > 0 ||
      marketplaceFinancialLines.length > 0 ||
      marketplaceDeliveryPaymentLines.length > 0 ||
      marketplacePaymentCards.length > 0)
  const hasInvoiceCards = localInvoiceCards.length > 0
  const hasContent = hasStaticContent || hasInvoiceCards
  const shouldRenderLoadingState = isLoadingInvoices && !hasContent
  const shouldRenderInvoiceSectionLoading = isLoadingInvoices && !hasInvoiceCards

  if (shouldRenderLoadingState) {
    return (
      <View style={localStyles.detailsLoadingState}>
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

  if (!showFinancialSections && !showInvoicesSectionTitle) {
    if (shouldRenderInvoiceSectionLoading) {
      return (
        <View style={localStyles.detailsLoadingState}>
          <Text style={localStyles.detailsLoadingText}>
            {global.t?.t('orders', 'label', 'loading') || 'Carregando invoices...'}
          </Text>
        </View>
      )
    }

    return renderLocalInvoiceCards(detailsVariant ? 'details' : 'mobile')
  }

  return (
    <View style={localStyles.detailsTabStack}>
      {showFinancialSections && renderPaymentCards(marketplacePaymentCards, localStyles)}

      {showFinancialSections && !!localFinancialLines.length && (
        <View style={localStyles.detailsSection}>
          <Text style={localStyles.detailsSectionTitle}>
            {global.t?.t('orders', 'title', 'payments') || 'Financeiro'}
          </Text>
          {renderDetailsLines(localFinancialLines, localStyles)}
        </View>
      )}

      {showFinancialSections && !!marketplaceFinancialLines.length && (
        <View style={localStyles.detailsSection}>
          <Text style={localStyles.detailsSectionTitle}>
            {marketplaceSummary.summary?.financeTitle ||
              global.t?.t('orders', 'title', 'payments') ||
              'Financeiro da integracao'}
          </Text>
          {renderDetailsLines(marketplaceFinancialLines, localStyles)}
        </View>
      )}

      {showFinancialSections && !!marketplaceDeliveryPaymentLines.length && (
        <View style={localStyles.detailsSection}>
          <Text style={localStyles.detailsSectionTitle}>
            {global.t?.t('orders', 'label', 'paymentMethod') || 'Cobranca'}
          </Text>
          {renderDetailsLines(marketplaceDeliveryPaymentLines, localStyles)}
        </View>
      )}

      <View style={localStyles.detailsSection}>
        {showInvoicesSectionTitle ? (
          <Text style={localStyles.detailsSectionTitle}>
            {localInvoicesSectionTitle}
          </Text>
        ) : null}
        {shouldRenderInvoiceSectionLoading ? (
          <View style={localStyles.detailsLoadingState}>
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
