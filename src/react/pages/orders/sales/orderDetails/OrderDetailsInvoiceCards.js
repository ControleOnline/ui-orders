import React from 'react'
import { Text, View, TouchableOpacity } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import Formatter from '@controleonline/ui-common/src/utils/formatter'

/**
 * Local invoice cards for OrderDetails (details + mobile variants).
 */
export default function OrderDetailsInvoiceCards({
  variant = 'default',
  localInvoiceCards = [],
  groupedInvoiceSections = [],
  localInvoicesEmptyText,
  localStyles,
  ppcColors,
  handleOpenInvoiceDetails,
  }) {
  const isDetailsVariant = variant === 'details'

  if (!localInvoiceCards.length) {
  return (
    <Text style={isDetailsVariant ? localStyles.detailsInfoText : localStyles.mobileInfoSubtitle}>
      {localInvoicesEmptyText}
    </Text>
  )
}

return (
  <View style={localStyles.detailsTabStack}>
    {groupedInvoiceSections.map(section => (
      <View
        key={section.key}
        style={section.label ? localStyles.detailsSection : null}>
        {!!section.label && (
          <Text style={localStyles.detailsSectionTitle}>{section.label}</Text>
        )}
        <View style={localStyles.orderInvoiceList}>
          {section.cards.map(invoiceCard => {
            const canOpenInvoiceDetails = Number(invoiceCard?.invoiceId || 0) > 0
            const InvoiceCardContainer = canOpenInvoiceDetails ? TouchableOpacity : View
            const invoiceInfoCards = [
              {
                key: 'type',
                label: global.t?.t('orders', 'label', 'invoiceType') || 'Tipo',
                value: invoiceCard.kindLabel,
              },
              {
                key: 'paymentType',
                label:
                  global.t?.t('orders', 'label', 'paymentMethod') ||
                  'Forma de pagamento',
                value: invoiceCard.paymentTypeLabel,
              },
              {
                key: 'description',
                label: global.t?.t('orders', 'label', 'description') || 'Descrição',
                value: invoiceCard.descriptionLabel,
                wide: true,
              },
              {
                key: 'payer',
                label: global.t?.t('orders', 'label', 'payer') || 'Pagador',
                value: invoiceCard.payerLabel,
              },
              {
                key: 'receiver',
                label: global.t?.t('orders', 'label', 'receiver') || 'Recebedor',
                value: invoiceCard.receiverLabel,
              },
            ].filter(detail => detail.value)

            return (
              <InvoiceCardContainer
                key={invoiceCard.id}
                {...(canOpenInvoiceDetails
                  ? {
                      activeOpacity: 0.88,
                      onPress: () => handleOpenInvoiceDetails(invoiceCard),
                      accessibilityRole: 'button',
                    }
                  : {})}
                style={[
                  localStyles.orderInvoiceCard,
                  canOpenInvoiceDetails && localStyles.orderInvoiceCardInteractive,
                  isDetailsVariant && localStyles.orderInvoiceCardDetails,
                ]}
              >
                <View style={localStyles.orderInvoiceCardHeader}>
                  <View style={localStyles.orderInvoiceTitleWrap}>
                    <Text style={localStyles.orderInvoiceTitle}>{invoiceCard.title}</Text>
                    {!!invoiceCard.subtitle && (
                      <Text style={localStyles.orderInvoiceSubtitle}>
                        {invoiceCard.subtitle}
                      </Text>
                    )}
                  </View>

                  <View style={localStyles.orderInvoiceCardHeaderActions}>
                    <View
                      style={[
                        localStyles.orderInvoiceStatusBadge,
                        {
                          borderColor: invoiceCard.statusColor,
                          backgroundColor: invoiceCard.statusBackgroundColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          localStyles.orderInvoiceStatusText,
                          {color: invoiceCard.statusColor},
                        ]}
                      >
                        {invoiceCard.statusLabel}
                      </Text>
                    </View>

                    {canOpenInvoiceDetails ? (
                      <Icon
                        name="chevron-right"
                        size={20}
                        color={ppcColors.textSecondary}
                      />
                    ) : null}
                  </View>
                </View>

                <Text style={localStyles.orderInvoiceAmount}>
                  {Formatter.formatMoney(invoiceCard.amount || 0)}
                </Text>
                <View style={localStyles.orderInvoiceInfoGrid}>
                  {invoiceInfoCards.map(detail => (
                    <View
                      key={`${invoiceCard.id}-${detail.key}`}
                      style={[
                        localStyles.orderInvoiceInfoCard,
                        detail.wide && localStyles.orderInvoiceInfoCardWide,
                      ]}>
                      <Text style={localStyles.orderInvoiceInfoLabel}>
                        {detail.label}
                      </Text>
                      <Text style={localStyles.orderInvoiceInfoValue}>
                        {detail.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </InvoiceCardContainer>
            )
          })}
        </View>
      </View>
    ))}
  </View>
)
}
