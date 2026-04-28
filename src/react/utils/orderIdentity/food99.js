import {
  getMarketplaceField,
  getRemoteSummaryIdentifier,
  normalizeText,
} from './shared'

export const FOOD99_APP_KEYS = ['99', '99food', '99 food', 'food99']
export const FOOD99_LABEL = '99'

export const resolveFood99OrderCode = (order, remoteOrderSummary = null) => {
  const fallbackCode = getRemoteSummaryIdentifier(remoteOrderSummary, [
    'order_index',
    'orderIndex',
  ])

  return normalizeText(
    getMarketplaceField(order, FOOD99_APP_KEYS, 'order_index') ||
      getMarketplaceField(order, FOOD99_APP_KEYS, 'orderIndex') ||
      getMarketplaceField(order, FOOD99_APP_KEYS, 'code') ||
      fallbackCode ||
      getRemoteSummaryIdentifier(remoteOrderSummary, ['code']) ||
      getMarketplaceField(order, FOOD99_APP_KEYS, 'displayId') ||
      getMarketplaceField(order, FOOD99_APP_KEYS, 'display_id') ||
      getMarketplaceField(order, FOOD99_APP_KEYS, 'pickup_code') ||
      getMarketplaceField(order, FOOD99_APP_KEYS, 'pickupCode') ||
      getMarketplaceField(order, FOOD99_APP_KEYS, 'handover_code') ||
      getMarketplaceField(order, FOOD99_APP_KEYS, 'handoverCode') ||
      getRemoteSummaryIdentifier(remoteOrderSummary, [
        'pickupCode',
        'handoverCode',
        'localizer',
        'orderIndex',
      ]) ||
      getMarketplaceField(order, FOOD99_APP_KEYS, 'locator') ||
      getMarketplaceField(order, FOOD99_APP_KEYS, 'localizer') ||
      getMarketplaceField(order, FOOD99_APP_KEYS, 'id'),
  )
}
