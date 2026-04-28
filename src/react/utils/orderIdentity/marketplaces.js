import {FOOD99_APP_KEYS, FOOD99_LABEL, resolveFood99OrderCode} from './food99'
import {IFOOD_APP_KEYS, IFOOD_LABEL, resolveIfoodOrderCode} from './ifood'
import {normalizeText} from './shared'

const MARKETPLACE_RESOLVERS = [
  {
    appKeys: IFOOD_APP_KEYS,
    label: IFOOD_LABEL,
    resolveOrderCode: resolveIfoodOrderCode,
  },
  {
    appKeys: FOOD99_APP_KEYS,
    label: FOOD99_LABEL,
    resolveOrderCode: resolveFood99OrderCode,
  },
]

export const resolveMarketplaceResolver = order => {
  const normalizedApp = normalizeText(order?.app).toLowerCase()

  return (
    MARKETPLACE_RESOLVERS.find(({appKeys}) => appKeys.includes(normalizedApp)) || null
  )
}
