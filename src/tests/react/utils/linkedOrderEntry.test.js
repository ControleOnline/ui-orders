const {
  LINKED_ORDER_INPUT_METHOD_BARCODE,
  LINKED_ORDER_INPUT_METHOD_MANUAL,
  LINKED_ORDER_INPUT_METHOD_NFC,
  normalizeLinkedOrderInputType,
  resolveLinkedOrderInputMethod,
  shouldUseLinkedOrderCameraScanner,
  shouldUseLinkedOrderNativeScanner,
  shouldUseLinkedOrderNfcScanner,
} = require('../../../react/utils/linkedOrderEntry')

const {describe, expect, it} = global

describe('linkedOrderEntry', () => {
  it('normalizes barcode and qr code inputs into the camera method', () => {
    expect(normalizeLinkedOrderInputType('barcode')).toBe(
      LINKED_ORDER_INPUT_METHOD_BARCODE,
    )
    expect(normalizeLinkedOrderInputType('qrcode')).toBe(
      LINKED_ORDER_INPUT_METHOD_BARCODE,
    )
    expect(normalizeLinkedOrderInputType('qr-code')).toBe(
      LINKED_ORDER_INPUT_METHOD_BARCODE,
    )
  })

  it('keeps barcode scanning on native runtime and falls back to manual on web', () => {
    expect(
      resolveLinkedOrderInputMethod({
        preferredInputType: 'barcode',
        isNativeRuntime: true,
      }),
    ).toBe(LINKED_ORDER_INPUT_METHOD_BARCODE)

    expect(
      resolveLinkedOrderInputMethod({
        preferredInputType: 'qrcode',
        isNativeRuntime: false,
      }),
    ).toBe(LINKED_ORDER_INPUT_METHOD_MANUAL)
  })

  it('maps rfid to nfc only on native runtime', () => {
    expect(
      resolveLinkedOrderInputMethod({
        preferredInputType: 'rfid',
        isNativeRuntime: true,
      }),
    ).toBe(LINKED_ORDER_INPUT_METHOD_NFC)

    expect(
      resolveLinkedOrderInputMethod({
        preferredInputType: 'rfid',
        isNativeRuntime: false,
      }),
    ).toBe(LINKED_ORDER_INPUT_METHOD_MANUAL)
  })

  it('enables the camera scanner only for native barcode flows', () => {
    expect(
      shouldUseLinkedOrderCameraScanner({
        inputMethod: 'barcode',
        isNativeRuntime: true,
      }),
    ).toBe(true)

    expect(
      shouldUseLinkedOrderCameraScanner({
        inputMethod: 'manual',
        isNativeRuntime: true,
      }),
    ).toBe(false)

    expect(
      shouldUseLinkedOrderCameraScanner({
        inputMethod: 'barcode',
        isNativeRuntime: false,
      }),
    ).toBe(false)
  })

  it('enables the nfc scanner only for native rfid flows', () => {
    expect(
      shouldUseLinkedOrderNfcScanner({
        inputMethod: 'rfid',
        isNativeRuntime: true,
      }),
    ).toBe(true)

    expect(
      shouldUseLinkedOrderNativeScanner({
        inputMethod: 'rfid',
        isNativeRuntime: true,
      }),
    ).toBe(true)

    expect(
      shouldUseLinkedOrderNfcScanner({
        inputMethod: 'rfid',
        isNativeRuntime: false,
      }),
    ).toBe(false)
  })
})
