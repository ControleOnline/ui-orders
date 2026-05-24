export const LINKED_ORDER_INPUT_METHOD_MANUAL = 'manual'
export const LINKED_ORDER_INPUT_METHOD_BARCODE = 'barcode'
export const LINKED_ORDER_INPUT_METHOD_NFC = 'nfc'

export const LINKED_ORDER_CAMERA_BARCODE_TYPES = [
  'aztec',
  'codabar',
  'code128',
  'code39',
  'code93',
  'datamatrix',
  'ean13',
  'ean8',
  'itf14',
  'pdf417',
  'qr',
  'upc_a',
  'upc_e',
]

const normalizeInputValue = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s]+/g, '-')

export const normalizeLinkedOrderInputType = value => {
  const normalizedValue = normalizeInputValue(value)

  if (
    [
      'barcode',
      'qr',
      'qr-code',
      'qrcode',
    ].includes(normalizedValue)
  ) {
    return LINKED_ORDER_INPUT_METHOD_BARCODE
  }

  if (['nfc', 'rfid'].includes(normalizedValue)) {
    return LINKED_ORDER_INPUT_METHOD_NFC
  }

  return LINKED_ORDER_INPUT_METHOD_MANUAL
}

export const resolveLinkedOrderInputMethod = ({
  preferredInputType = LINKED_ORDER_INPUT_METHOD_MANUAL,
  isNativeRuntime = false,
} = {}) => {
  const normalizedInputType = normalizeLinkedOrderInputType(preferredInputType)

  if (normalizedInputType === LINKED_ORDER_INPUT_METHOD_NFC) {
    return isNativeRuntime
      ? LINKED_ORDER_INPUT_METHOD_NFC
      : LINKED_ORDER_INPUT_METHOD_MANUAL
  }

  if (normalizedInputType === LINKED_ORDER_INPUT_METHOD_BARCODE) {
    return isNativeRuntime
      ? LINKED_ORDER_INPUT_METHOD_BARCODE
      : LINKED_ORDER_INPUT_METHOD_MANUAL
  }

  return LINKED_ORDER_INPUT_METHOD_MANUAL
}

export const shouldUseLinkedOrderCameraScanner = ({
  inputMethod = LINKED_ORDER_INPUT_METHOD_MANUAL,
  isNativeRuntime = false,
} = {}) =>
  isNativeRuntime &&
  normalizeLinkedOrderInputType(inputMethod) === LINKED_ORDER_INPUT_METHOD_BARCODE

export const shouldUseLinkedOrderNfcScanner = ({
  inputMethod = LINKED_ORDER_INPUT_METHOD_MANUAL,
  isNativeRuntime = false,
} = {}) =>
  isNativeRuntime &&
  normalizeLinkedOrderInputType(inputMethod) === LINKED_ORDER_INPUT_METHOD_NFC

export const shouldUseLinkedOrderNativeScanner = options =>
  shouldUseLinkedOrderCameraScanner(options) ||
  shouldUseLinkedOrderNfcScanner(options)
