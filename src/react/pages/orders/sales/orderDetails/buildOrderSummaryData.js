export const buildOrderSummaryData = ({
  orderIdentitySource,
  hasMarketplaceIntegration,
  orderAppLabel,
  translatedLocalStatusLabel,
  translatedLocalRealStatusLabel,
  localInvoiceCards,
  resolvedOrderDateValue,
  item,
  orderParam,
  localDisplayLabel,
  localDisplayAmount,
  shouldShowOrderPartyDetails,
  orderCustomerName,
  orderCustomerPhone,
  orderCustomerDocument,
  orderCustomerDocumentLabel,
  shouldShowOrderAddress,
  localOrderAddressParts,
  summaryInformationEntries,
  marketplaceSummary,
  formatOrderDateTime,
  Formatter,
}) => ({
  title: global.t?.t('orders', 'title', 'orderSummary'),
  base: {
    order: orderIdentitySource,
    cards: hasMarketplaceIntegration
      ? []
      : [
          {
            key: 'application',
            label: global.t?.t('orders', 'label', 'application'),
            value: orderAppLabel || '-',
          },
          {
            key: 'local-status',
            label: global.t?.t('orders', 'label', 'localStatus'),
            value: translatedLocalStatusLabel || '-',
          },
          {
            key: 'local-real-status',
            label:
              global.t?.t('orders', 'label', 'localRealStatus') ||
              'Real status local',
            value: translatedLocalRealStatusLabel || '-',
          },
          {
            key: 'payments',
            label: global.t?.t('orders', 'title', 'payments') || 'Pagamentos',
            value: localInvoiceCards.length,
          },
        ],
    lines: hasMarketplaceIntegration
      ? []
      : [
          {
            key: 'created-at',
            label: global.t?.t('orders', 'label', 'createdAt'),
            value: formatOrderDateTime(resolvedOrderDateValue),
          },
          {
            key: 'updated-at',
            label: global.t?.t('orders', 'label', 'updatedAt'),
            value: formatOrderDateTime(item?.alterDate || resolvedOrderDateValue),
          },
          {
            key: 'local-order-id',
            label:
              global.t?.t('orders', 'label', 'localOrderNumber') ||
              'Pedido interno',
            value: item?.id || orderParam?.id || '-',
          },
          {
            key: 'local-total',
            label: localDisplayLabel,
            value: Formatter.formatMoney(localDisplayAmount || 0),
          },
          shouldShowOrderPartyDetails && !!orderCustomerName && {
            key: 'customer',
            label: global.t?.t('orders', 'label', 'customer'),
            value: orderCustomerName,
          },
          shouldShowOrderPartyDetails && !!orderCustomerPhone && {
            key: 'customer-phone',
            label: global.t?.t('orders', 'label', 'phone'),
            value: orderCustomerPhone,
          },
          shouldShowOrderPartyDetails && !!orderCustomerDocument && {
            key: 'customer-document',
            label: orderCustomerDocumentLabel,
            value: orderCustomerDocument,
          },
          shouldShowOrderAddress && !!localOrderAddressParts.primary && {
            key: 'address',
            label: global.t?.t('orders', 'label', 'delivery'),
            value: localOrderAddressParts.primary,
          },
          ...summaryInformationEntries,
        ].filter(Boolean),
  },
  tabs: [],
  primaryAction: null,
  marketplace: marketplaceSummary?.summary,
})
