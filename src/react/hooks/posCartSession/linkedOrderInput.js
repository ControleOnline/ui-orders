import {resolveLinkedOrderLabel} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'
import {LINKED_ORDER_CODE_REQUIRED_ERROR} from '@controleonline/ui-orders/src/react/utils/posCartHelpers'
import {
  getOrderPeopleValue,
  resolvePosOpenOrderStatusIri,
} from './status'

const buildMissingLinkedOrderCodeError = () => {
  const error = new Error(
    global.t?.t('orders', 'message', 'linkedOrderCodeRequired') ||
      'A tab, table or stamp code is required to continue.',
  )
  error.code = LINKED_ORDER_CODE_REQUIRED_ERROR
  return error
}

const buildLinkedOrderManagementError = linkedOrderType => {
  const orderLabel = resolveLinkedOrderLabel(linkedOrderType)

  return new Error(
    global.t?.t(
      'orders',
      'message',
      'linkedOrderManagementDisabled',
    ) ||
      `This device can only use ${orderLabel.toLowerCase()}s that are already open.`,
  )
}

export const requestPosLinkedOrderCode = async ({
  activeOrder,
  checkInputType,
  defaultStatusId,
  ensureSettlementOrder,
  linkedOrderType,
  requestLinkedOrderInput,
  showPrompt,
}) => {
  const validateLinkedOrderInput = async linkedOrderInput => {
    const externalCode = String(linkedOrderInput?.externalCode || '').trim()
    const linkedOrderInputType = String(
      linkedOrderInput?.inputType || checkInputType,
    )
      .trim()
      .toLowerCase()

    if (!externalCode) {
      throw buildMissingLinkedOrderCodeError()
    }

    const orderOpenStatusIri = await resolvePosOpenOrderStatusIri(defaultStatusId)

    if (!orderOpenStatusIri) {
      throw new Error('Nao foi possivel resolver o status open/open do pedido no PDV.')
    }

    const settlementOrder = await ensureSettlementOrder({
      externalCode,
      peopleIri: getOrderPeopleValue(activeOrder)?.['@id'] || null,
      statusIri: orderOpenStatusIri,
    })

    if (!settlementOrder) {
      throw buildLinkedOrderManagementError(linkedOrderType)
    }

    return {
      externalCode,
      inputType: linkedOrderInputType,
      settlementOrder,
    }
  }

  if (typeof requestLinkedOrderInput === 'function') {
    const requestedInput = await requestLinkedOrderInput({
      orderType: linkedOrderType,
      preferredInputType: checkInputType,
      validateInput: validateLinkedOrderInput,
    })

    if (typeof requestedInput === 'string') {
      return {
        externalCode: String(requestedInput || '').trim(),
        inputType: checkInputType,
      }
    }

    return {
      externalCode: String(requestedInput?.externalCode || '').trim(),
      inputType: String(requestedInput?.inputType || checkInputType)
        .trim()
        .toLowerCase(),
      settlementOrder: requestedInput?.settlementOrder || null,
    }
  }

  const orderLabel = resolveLinkedOrderLabel(linkedOrderType)
  const readMethodLabel =
    checkInputType === 'barcode'
      ? global.t?.t('orders', 'label', 'barcode') || 'barcode'
      : checkInputType === 'rfid'
        ? global.t?.t('orders', 'label', 'rfid') || 'NFC / RFID'
        : global.t?.t('orders', 'label', 'code') || 'code'
  const promptValue = await showPrompt?.({
    title:
      global.t?.t('orders', 'title', 'identifyOrderBase') ||
      `Identify ${orderLabel}`,
    message:
      global.t?.t('orders', 'message', 'enterLinkedOrderCode') ||
      `Inform the ${readMethodLabel} for this ${orderLabel.toLowerCase()}.`,
    placeholder:
      global.t?.t('orders', 'placeholder', 'linkedOrderCode') ||
      `${orderLabel} ${global.t?.t('orders', 'label', 'code') || 'code'}`,
    confirmLabel: global.t?.t('orders', 'button', 'confirm') || 'Confirm',
    cancelLabel: global.t?.t('orders', 'button', 'cancel') || 'Cancel',
  })

  return {
    externalCode: String(promptValue || '').trim(),
    inputType: checkInputType,
  }
}
