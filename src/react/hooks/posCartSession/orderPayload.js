import {normalizeId} from '@controleonline/ui-orders/src/react/utils/posCartHelpers'

/** Canonical commercial channels (api-platform-orders Order::CHANNELS). */
export const ORDER_CHANNEL_POS = 'pos'
export const ORDER_CHANNEL_TOTEM = 'totem'
export const ORDER_CHANNEL_SHOP = 'shop'
export const ORDER_CHANNEL_EXTERNAL = 'external'

/**
 * Resolve channel for POS app flows.
 * Totem is APP_TYPE=POS with pos-operation-mode=totem (not a separate app type).
 */
export const resolvePosOrderChannel = ({
  channel,
  deviceConfigs,
  isSelfServiceMode,
} = {}) => {
  const explicit = String(channel || '').trim().toLowerCase()
  if (
    explicit === ORDER_CHANNEL_POS ||
    explicit === ORDER_CHANNEL_TOTEM ||
    explicit === ORDER_CHANNEL_SHOP ||
    explicit === ORDER_CHANNEL_EXTERNAL
  ) {
    return explicit
  }

  const operationMode = String(
    deviceConfigs?.['pos-operation-mode'] ||
      deviceConfigs?.posOperationMode ||
      '',
  )
    .trim()
    .toLowerCase()

  if (operationMode === 'totem' || isSelfServiceMode === true) {
    return ORDER_CHANNEL_TOTEM
  }

  return ORDER_CHANNEL_POS
}

export const buildPosOrderPayload = ({
  companyId,
  deviceId,
  extraOptions = {},
  orderId = null,
  orderType,
  peopleIri = null,
  statusIri,
  channel = null,
  deviceConfigs = null,
  isSelfServiceMode = false,
}) => {
  const payload = {
    app: 'POS',
    provider: '/people/' + companyId,
    status: statusIri,
    orderType,
  }

  if (orderId) {
    payload.id = Number(orderId)
  }

  if (peopleIri !== undefined) {
    payload.people = peopleIri
  }

  const resolvedChannel = resolvePosOrderChannel({
    channel: channel ?? extraOptions.channel,
    deviceConfigs: deviceConfigs ?? extraOptions.deviceConfigs,
    isSelfServiceMode:
      isSelfServiceMode === true || extraOptions.isSelfServiceMode === true,
  })
  payload.channel = resolvedChannel

  const normalizedExternalCode = String(
    extraOptions.externalCode || '',
  ).trim()
  if (normalizedExternalCode) {
    payload.externalCode = normalizedExternalCode
  }

  if (extraOptions.otherInformations) {
    payload.otherInformations = extraOptions.otherInformations
  }

  if (extraOptions.mainOrderId) {
    const normalizedMainOrderId = normalizeId(extraOptions.mainOrderId)
    if (normalizedMainOrderId) {
      payload.mainOrderId = Number(normalizedMainOrderId)
    }
  }

  if (extraOptions.includeDevice !== false && deviceId) {
    payload['device.device'] = deviceId
  }

  return payload
}
