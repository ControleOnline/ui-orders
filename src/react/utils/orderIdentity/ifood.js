import {
  getMarketplaceField,
  getRemoteSummaryIdentifier,
  normalizeText,
} from './shared'

export const IFOOD_APP_KEYS = ['ifood']
export const IFOOD_LABEL = 'IFOOD'

export const resolveIfoodOrderCode = (order, remoteOrderSummary = null) => {
  const fallbackCode = getRemoteSummaryIdentifier(remoteOrderSummary, [
    'order_index',
    'orderIndex',
  ])

  return normalizeText(
    getMarketplaceField(order, IFOOD_APP_KEYS, 'pickup_code') ||
      getMarketplaceField(order, IFOOD_APP_KEYS, 'pickupCode') ||
      getMarketplaceField(order, IFOOD_APP_KEYS, 'handover_code') ||
      getMarketplaceField(order, IFOOD_APP_KEYS, 'handoverCode') ||
      getRemoteSummaryIdentifier(remoteOrderSummary, [
        'pickupCode',
        'pickup_code',
        'handoverCode',
        'handover_code',
        'localizer',
      ]) ||
      getMarketplaceField(order, IFOOD_APP_KEYS, 'displayId') ||
      getMarketplaceField(order, IFOOD_APP_KEYS, 'display_id') ||
      getMarketplaceField(order, IFOOD_APP_KEYS, 'order_index') ||
      getMarketplaceField(order, IFOOD_APP_KEYS, 'orderIndex') ||
      getRemoteSummaryIdentifier(remoteOrderSummary, [
        'displayId',
        'display_id',
        'order_index',
        'orderIndex',
      ]) ||
      fallbackCode ||
      getMarketplaceField(order, IFOOD_APP_KEYS, 'code'),
  )
}
