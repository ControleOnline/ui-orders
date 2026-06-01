/*
 * Regra de negocio: o codigo exibido do iFood vem do campo canonico `code`
 * materializado no `extra_data`. `pickup_code`, `handover_code`,
 * `displayId` e ids tecnicos nao podem fabricar identidade.
 */
import {
  getMarketplaceField,
  getRemoteSummaryIdentifier,
  normalizeText,
} from './shared'

export const IFOOD_APP_KEYS = ['ifood']
export const IFOOD_LABEL = 'IFOOD'

export const resolveIfoodOrderCode = (order, remoteOrderSummary = null) =>
  normalizeText(
    getMarketplaceField(order, IFOOD_APP_KEYS, 'code') ||
      getRemoteSummaryIdentifier(remoteOrderSummary, ['code']) ||
      '',
  )
