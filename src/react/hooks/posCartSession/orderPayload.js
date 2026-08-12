import {normalizeId} from '@controleonline/ui-orders/src/react/utils/posCartHelpers'

export const buildPosOrderPayload = ({
  companyId,
  deviceId,
  extraOptions = {},
  orderId = null,
  orderType,
  peopleIri = null,
  statusIri,
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
