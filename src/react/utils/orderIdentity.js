/*
 * Regra de negocio: identidade operacional nao pode inventar codigo de
 * marketplace. O resolvedor deve usar a summary canonica do provider e, se
 * nao houver identificador canonico, o pedido segue apenas com o id interno.
 */
import {buildFood99OrderSummary} from '@controleonline/ui-orders/src/react/services/marketplaceOrderSummary'

import {getLinkedOrderContext} from './linkedOrderContext'
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

const resolveOrderApp = order => normalizeText(order?.app).toUpperCase()

const resolvePosExternalCode = order => {
  if (resolveOrderApp(order) !== 'POS') {
    return ''
  }

  return getLinkedOrderContext(order).externalCode
}

const resolvePosExternalLabel = () => global.t?.t('orders', 'title', 'table')

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
  const posExternalCode = resolvePosExternalCode(order)
  const hasMarketplaceReference = !!marketplaceLabel && !!marketplaceOrderCode

  if (posExternalCode) {
    return {
      internalId,
      externalId: posExternalCode,
      externalLabel: '',
      hasMarketplaceReference: false,
      primaryText: [resolvePosExternalLabel(), formatOrderCode(posExternalCode)]
        .filter(Boolean)
        .join(' '),
      secondaryText:
        normalizeText(posExternalCode) === internalId
          ? ''
          : formatOrderCode(internalId),
    }
  }

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
    primaryText:
      formatOrderCode(internalId) ||
      global.t?.t('orders', 'title', 'order'),
    secondaryText: '',
  }
}
