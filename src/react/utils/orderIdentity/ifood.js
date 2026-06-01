/*
 * Regra de negocio: o codigo externo do iFood vem do payload canonico.
 * `order_index` e o campo de verdade; `pickup_code`, `handover_code`,
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
    getMarketplaceField(order, IFOOD_APP_KEYS, 'order_index') ||
      getRemoteSummaryIdentifier(remoteOrderSummary, ['orderIndex']) ||
      '',
  )
