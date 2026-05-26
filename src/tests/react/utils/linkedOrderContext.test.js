const {
  buildLinkedOrderMetadata,
  getLinkedOrderContext,
} = require('../../../react/utils/linkedOrderContext')

const {describe, expect, it} = global

describe('linkedOrderContext', () => {
  it('prioritizes the order externalCode field over linked metadata', () => {
    const context = getLinkedOrderContext({
      externalCode: 'MESA-10',
      orderType: 'table',
      otherInformations: JSON.stringify({
        linked_order: {
          external_code: 'LEGACY-10',
          input_type: 'nfc',
          order_type: 'table',
        },
      }),
    })

    expect(context.externalCode).toBe('MESA-10')
    expect(context.inputType).toBe('nfc')
    expect(context.orderType).toBe('table')
    expect(context.isLinkedParent).toBe(true)
  })

  it('does not read linked_order main_order_id when the root field is absent', () => {
    const context = getLinkedOrderContext({
      orderType: 'sale',
      otherInformations: JSON.stringify({
        linked_order: {
          external_code: 'COM-22',
          input_type: 'barcode',
          main_order_id: 77,
          order_type: 'tab',
        },
      }),
    })

    expect(context.externalCode).toBe('')
    expect(context.inputType).toBe('barcode')
    expect(context.mainOrderId).toBeNull()
    expect(context.orderType).toBe('tab')
    expect(context.isLinkedParent).toBe(true)
  })

  it('keeps linked metadata free of mesa and comanda identifiers when building payloads', () => {
    expect(
      buildLinkedOrderMetadata({
        externalCode: 'IGNORED',
        inputType: 'nfc',
        mainOrderId: 15,
        orderType: 'table',
      }),
    ).toEqual({
      linked_order: {
        input_type: 'nfc',
        order_type: 'table',
      },
    })
  })
})
