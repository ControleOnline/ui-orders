import {buildFood99OrderSummary} from '@controleonline/ui-orders/src/react/services/food99OrderSummary'

import {resolveMarketplaceResolver} from './orderIdentity/marketplaces'
import {formatOrderCode, normalizeText} from './orderIdentity/shared'

export const resolveMarketplaceAppLabel = order => {
  const resolver = resolveMarketplaceResolver(order)
  if (resolver?.label) {
    return resolver.label
  }

  return normalizeText(order?.app).toUpperCase()
}

export const resolveMarketplaceOrderCode = (order, remoteOrderSummary = null) => {
  const resolver = resolveMarketplaceResolver(order)
  return resolver?.resolveOrderCode?.(order, remoteOrderSummary) || ''
}

export const resolveOrderIdentityRemoteSummary = (order, remoteOrderSummary = null) =>
  remoteOrderSummary || buildFood99OrderSummary(order) || null

export const resolveOrderIdentity = (order, remoteOrderSummary = null) => {
  const effectiveRemoteOrderSummary = resolveOrderIdentityRemoteSummary(
    order,
    remoteOrderSummary,
  )
  const internalId = normalizeText(order?.id)
  const marketplaceLabel = resolveMarketplaceAppLabel(order)
  const marketplaceOrderCode = resolveMarketplaceOrderCode(
    order,
    effectiveRemoteOrderSummary,
  )
  const hasMarketplaceReference = !!marketplaceLabel && !!marketplaceOrderCode

  if (hasMarketplaceReference) {
    return {
      internalId,
      externalId: marketplaceOrderCode,
      externalLabel: marketplaceLabel,
      hasMarketplaceReference: true,
      primaryText: formatOrderCode(marketplaceOrderCode),
      secondaryText: formatOrderCode(internalId),
    }
  }

  return {
    internalId,
    externalId: '',
    externalLabel: '',
    hasMarketplaceReference: false,
    primaryText: formatOrderCode(internalId) || global.t?.t('orders', 'title', 'order') || 'Pedido',
    secondaryText: '',
  }
}
