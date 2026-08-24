import {
  formatPhoneDisplay,
  normalizeText,
  resolveAddressDisplayParts,
} from '@controleonline/ui-common/src/react/utils/entityDisplay'
import { toEntityIri } from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders'

import { resolveDocumentLabel, resolvePreferredText } from './helpers'

/** Pure display fields derived from order client/address entities. */
export function resolveOrderPartyDisplay(localOrderClient, localOrderAddress) {
  const localOrderAddressParts = resolveAddressDisplayParts(localOrderAddress)
  const orderCustomerName = resolvePreferredText(
    localOrderClient?.alias,
    localOrderClient?.name,
  )
  const orderCustomerPhone = resolvePreferredText(
    formatPhoneDisplay(localOrderClient?.phone?.[0]),
    Array.isArray(localOrderClient?.phone)
      ? localOrderClient.phone.map(formatPhoneDisplay).find(Boolean)
      : formatPhoneDisplay(localOrderClient?.phone),
  )
  const localOrderCustomerDocument = resolvePreferredText(
    localOrderClient?.document?.[0]?.document,
    Array.isArray(localOrderClient?.document)
      ? localOrderClient.document
          .map(document => normalizeText(document?.document))
          .find(Boolean)
      : normalizeText(localOrderClient?.document),
  )
  const orderCustomerDocumentType = resolvePreferredText(
    localOrderClient?.document?.[0]?.documentType?.documentType,
    Array.isArray(localOrderClient?.document)
      ? localOrderClient.document
          .map(document =>
            normalizeText(document?.documentType?.documentType),
          )
          .find(Boolean)
      : normalizeText(localOrderClient?.documentType?.documentType),
  )
  const orderCustomerDocumentLabel = resolveDocumentLabel(
    orderCustomerDocumentType,
    localOrderCustomerDocument,
  )
  const orderAddressPrimary = resolvePreferredText(localOrderAddressParts.primary)
  const orderAddressSecondary = resolvePreferredText(
    localOrderAddressParts.secondary,
  )
  const selectedOrderClientIri = toEntityIri(localOrderClient, 'people')
  const selectedOrderAddressIri = toEntityIri(localOrderAddress, 'addresses')

  return {
    orderCustomerName,
    orderCustomerPhone,
    localOrderCustomerDocument,
    orderCustomerDocumentLabel,
    orderAddressPrimary,
    orderAddressSecondary,
    selectedOrderClientIri,
    selectedOrderAddressIri,
  }
}
