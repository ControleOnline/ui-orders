import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  createEmptyAddressForm,
  normalizePostalCodeInput,
  normalizeText,
} from '@controleonline/ui-common/src/react/utils/entityDisplay'
import { toEntityIri } from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders'

import {
  formatApiError,
  getEntityId,
  resolvePreferredText,
} from './helpers'
import { resolveOrderPartyDisplay } from './resolveOrderPartyDisplay'

/**
 * Customer / address / observation state and handlers for OrderDetails.
 * Keeps the shell focused on composition; this hook owns party-assignment UX.
 */
export default function useOrderDetailsParty({
  canEditItems,
  isKds,
  isPosSelfServiceOperationMode,
  isPurchaseOrder,
  shouldShowOrderPartyDetails,
  localOrderClient,
  localOrderAddress,
  localOrderObservationSource,
  orderCompanyIri,
  peopleActions,
  addressActions,
  updateCurrentOrder,
  showError,
  showSuccess,
}) {
  const [customerModalVisible, setCustomerModalVisible] = useState(false)
  const [customerCreateModalVisible, setCustomerCreateModalVisible] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState([])
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  const [customerLinkingId, setCustomerLinkingId] = useState('')
  const [addressModalVisible, setAddressModalVisible] = useState(false)
  const [addressModalMode, setAddressModalMode] = useState('select')
  const [addressOptions, setAddressOptions] = useState([])
  const [addressOptionsLoading, setAddressOptionsLoading] = useState(false)
  const [addressForm, setAddressForm] = useState(createEmptyAddressForm())
  const [addressSaveLoading, setAddressSaveLoading] = useState(false)
  const [addressSelectingId, setAddressSelectingId] = useState('')
  const [observationDraft, setObservationDraft] = useState('')
  const [observationEditing, setObservationEditing] = useState(false)
  const [observationSaving, setObservationSaving] = useState(false)

  const {
    orderCustomerName,
    orderCustomerPhone,
    localOrderCustomerDocument,
    orderCustomerDocumentLabel,
    orderAddressPrimary,
    orderAddressSecondary,
    selectedOrderClientIri,
    selectedOrderAddressIri,
  } = useMemo(
    () => resolveOrderPartyDisplay(localOrderClient, localOrderAddress),
    [localOrderClient, localOrderAddress],
  )

  const closeCustomerModal = useCallback(() => {
    if (customerLinkingId) {
      return
    }

    setCustomerModalVisible(false)
    setCustomerSearch('')
    setCustomerSearchResults([])
  }, [customerLinkingId])

  const openCustomerModal = useCallback(() => {
    if (!canEditItems) {
      return
    }

    setCustomerModalVisible(true)
  }, [canEditItems])

  const showTopBarCustomerAction =
    !isPosSelfServiceOperationMode &&
    !isPurchaseOrder &&
    shouldShowOrderPartyDetails &&
    canEditItems

  const orderHeaderActionProps = useMemo(
    () => ({
      showPricing: true,
      showWaitingTime: isKds,
      ...(showTopBarCustomerAction
        ? {
            onCustomerPress: openCustomerModal,
            customerActionLabel: orderCustomerName ? 'Trocar' : 'Vincular',
            customerActionDisabled: !!customerLinkingId,
          }
        : {}),
    }),
    [
      customerLinkingId,
      isKds,
      openCustomerModal,
      orderCustomerName,
      showTopBarCustomerAction,
    ],
  )

  const openCustomerCreateModal = useCallback(() => {
    setCustomerCreateModalVisible(true)
  }, [])

  const closeAddressModal = useCallback(() => {
    if (addressSaveLoading || addressSelectingId) {
      return
    }

    setAddressModalVisible(false)
    setAddressModalMode('select')
    setAddressOptions([])
    setAddressForm(createEmptyAddressForm())
  }, [addressSaveLoading, addressSelectingId])

  const loadAddressOptions = useCallback(
    async customer => {
      const customerIri = toEntityIri(customer, 'people')

      if (!customerIri) {
        setAddressOptions([])
        return []
      }

      try {
        setAddressOptionsLoading(true)
        const response = await addressActions.getItems({
          people: customerIri,
        })
        const items = Array.isArray(response) ? response : []

        setAddressOptions(items)
        return items
      } catch (addressError) {
        setAddressOptions([])
        showError(formatApiError(addressError))
        return []
      } finally {
        setAddressOptionsLoading(false)
      }
    },
    [addressActions, showError],
  )

  const openAddressCreateMode = useCallback(() => {
    if (!canEditItems) {
      return
    }

    setAddressForm(createEmptyAddressForm())
    setAddressModalMode('create')
    setAddressModalVisible(true)
  }, [canEditItems])

  const openAddressModal = useCallback(async () => {
    if (!canEditItems) {
      return
    }

    setAddressModalVisible(true)

    if (!selectedOrderClientIri) {
      setAddressOptions([])
      setAddressModalMode('create')
      return
    }

    setAddressModalMode('select')
    await loadAddressOptions(localOrderClient)
  }, [
    canEditItems,
    loadAddressOptions,
    localOrderClient,
    selectedOrderClientIri,
  ])

  const handleAddressFormFieldChange = useCallback((field, value) => {
    setAddressForm(previousForm => ({
      ...previousForm,
      [field]:
        field === 'cep'
          ? normalizePostalCodeInput(value)
          : field === 'number'
            ? String(value ?? '').replace(/\D+/g, '')
            : value,
    }))
  }, [])
  useEffect(() => {
    setObservationDraft(localOrderObservationSource || '')
  }, [localOrderObservationSource])

  const handleStartObservationEdit = useCallback(() => {
    if (!canEditItems) {
      return
    }

    setObservationDraft(localOrderObservationSource || '')
    setObservationEditing(true)
  }, [canEditItems, localOrderObservationSource])

  const handleCancelObservationEdit = useCallback(() => {
    if (observationSaving) {
      return
    }

    setObservationDraft(localOrderObservationSource || '')
    setObservationEditing(false)
  }, [localOrderObservationSource, observationSaving])

  const handleSaveObservation = useCallback(async () => {
    if (!canEditItems || observationSaving) {
      return
    }

    try {
      setObservationSaving(true)

      await updateCurrentOrder({
        comments: normalizeText(observationDraft) || null,
      })

      setObservationEditing(false)
      showSuccess(
        normalizeText(observationDraft)
          ? 'Observação do pedido atualizada com sucesso.'
          : 'Observação do pedido removida com sucesso.',
      )
    } catch (observationError) {
      showError(formatApiError(observationError))
    } finally {
      setObservationSaving(false)
    }
  }, [
    canEditItems,
    observationDraft,
    observationSaving,
    showError,
    showSuccess,
    updateCurrentOrder,
  ])

  useEffect(() => {
    if (!customerModalVisible) {
      return undefined
    }

    const normalizedSearch = String(customerSearch || '').trim()

    if (!normalizedSearch || !orderCompanyIri) {
      setCustomerSearchResults([])
      setCustomerSearchLoading(false)
      return undefined
    }

    let isMounted = true
    const timeoutId = setTimeout(async () => {
      try {
        setCustomerSearchLoading(true)
        const response = await peopleActions.getItems({
          'link.company': orderCompanyIri,
          'link.linkType': 'client',
          search: normalizedSearch,
        })

        if (!isMounted) {
          return
        }

        setCustomerSearchResults(Array.isArray(response) ? response : [])
      } catch {
        if (isMounted) {
          setCustomerSearchResults([])
        }
      } finally {
        if (isMounted) {
          setCustomerSearchLoading(false)
        }
      }
    }, 250)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [customerModalVisible, customerSearch, orderCompanyIri, peopleActions])

  const handleSelectCustomer = useCallback(
    async customer => {
      const nextCustomerIri = toEntityIri(customer, 'people')
      const nextCustomerId = String(getEntityId(customer) || '')

      if (!nextCustomerIri) {
        showError('Nao foi possivel identificar o cliente selecionado.')
        return
      }

      if (selectedOrderClientIri === nextCustomerIri) {
        closeCustomerModal()
        return
      }

      try {
        setCustomerLinkingId(nextCustomerId)
        await updateCurrentOrder({ client: nextCustomerIri })
        closeCustomerModal()
        showSuccess(
          selectedOrderClientIri
            ? 'Cliente do pedido atualizado com sucesso.'
            : 'Cliente vinculado ao pedido com sucesso.',
        )
      } catch (updateError) {
        showError(formatApiError(updateError))
      } finally {
        setCustomerLinkingId('')
      }
    },
    [
      closeCustomerModal,
      selectedOrderClientIri,
      showError,
      showSuccess,
      updateCurrentOrder,
    ],
  )

  const handleCustomerCreated = useCallback(
    async savedCustomer => {
      setCustomerCreateModalVisible(false)

      if (!savedCustomer) {
        return
      }

      await handleSelectCustomer(savedCustomer)
    },
    [handleSelectCustomer],
  )

  const handleSelectAddress = useCallback(
    async address => {
      const nextAddressIri = toEntityIri(address, 'addresses')
      const nextAddressId = String(getEntityId(address) || '')

      if (!nextAddressIri) {
        showError('Nao foi possivel identificar o endereco selecionado.')
        return
      }

      if (selectedOrderAddressIri === nextAddressIri) {
        closeAddressModal()
        return
      }

      try {
        setAddressSelectingId(nextAddressId)
        await updateCurrentOrder({ addressDestination: nextAddressIri })
        closeAddressModal()
        showSuccess('Endereço de entrega atualizado com sucesso.')
      } catch (updateError) {
        showError(formatApiError(updateError))
      } finally {
        setAddressSelectingId('')
      }
    },
    [
      closeAddressModal,
      selectedOrderAddressIri,
      showError,
      showSuccess,
      updateCurrentOrder,
    ],
  )

  const handleCreateAddress = useCallback(async () => {
    const street = normalizeText(addressForm.street)
    const district = normalizeText(addressForm.district)
    const city = normalizeText(addressForm.city)
    const state = normalizeText(addressForm.state)
    const country = normalizeText(addressForm.country)
    const number = String(addressForm.number ?? '').replace(/\D+/g, '').trim()
    const cep = normalizePostalCodeInput(addressForm.cep)
    const complement = normalizeText(addressForm.complement)
    const nickname = resolvePreferredText(addressForm.nickname, 'Entrega')

    if (!street || !district || !city || !state || !country || !number || !cep) {
      showError(
        'Rua, número, bairro, cidade, estado, país e CEP são obrigatórios.',
      )
      return
    }

    try {
      setAddressSaveLoading(true)

      const payload = {
        street,
        district,
        city,
        state,
        country,
        number: Number(number),
        cep,
        nickname,
        complement,
        ...(selectedOrderClientIri ? { people: selectedOrderClientIri } : {}),
      }

      const savedAddress = await addressActions.save(payload)
      const savedAddressIri = toEntityIri(savedAddress, 'addresses')

      if (!savedAddressIri) {
        throw new Error('Endereço criado sem identificador válido.')
      }

      await updateCurrentOrder({ addressDestination: savedAddressIri })
      closeAddressModal()
      showSuccess('Endereço de entrega atualizado com sucesso.')
    } catch (saveError) {
      showError(formatApiError(saveError))
    } finally {
      setAddressSaveLoading(false)
    }
  }, [
    addressActions,
    addressForm.cep,
    addressForm.city,
    addressForm.complement,
    addressForm.country,
    addressForm.district,
    addressForm.nickname,
    addressForm.number,
    addressForm.state,
    addressForm.street,
    closeAddressModal,
    selectedOrderClientIri,
    showError,
    showSuccess,
    updateCurrentOrder,
  ])

  return {
    customerModalVisible,
    setCustomerModalVisible,
    customerCreateModalVisible,
    setCustomerCreateModalVisible,
    customerSearch,
    setCustomerSearch,
    customerSearchResults,
    customerSearchLoading,
    customerLinkingId,
    addressModalVisible,
    addressModalMode,
    setAddressModalMode,
    addressOptions,
    addressOptionsLoading,
    addressForm,
    addressSaveLoading,
    addressSelectingId,
    observationDraft,
    setObservationDraft,
    observationEditing,
    observationSaving,
    orderCustomerName,
    orderCustomerPhone,
    localOrderCustomerDocument,
    orderCustomerDocumentLabel,
    orderAddressPrimary,
    orderAddressSecondary,
    selectedOrderClientIri,
    selectedOrderAddressIri,
    closeCustomerModal,
    openCustomerModal,
    orderHeaderActionProps,
    openCustomerCreateModal,
    closeAddressModal,
    openAddressCreateMode,
    openAddressModal,
    handleAddressFormFieldChange,
    handleStartObservationEdit,
    handleCancelObservationEdit,
    handleSaveObservation,
    handleSelectCustomer,
    handleCustomerCreated,
    handleSelectAddress,
    handleCreateAddress,
  }
}
