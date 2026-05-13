const {
  buildPaymentSections,
  buildPaymentSelectionOption,
} = require('../../../react/pages/checkout/CheckoutPaymentOptions')
const {jest} = require('@jest/globals')

const {describe, expect, it} = global

describe('CheckoutPaymentOptions', () => {
  it('keeps local options first and remote options after them', () => {
    const cashOption = buildPaymentSelectionOption({
      channel: 'local',
      payment: {
        id: 10,
        paymentType: {id: 1, paymentType: 'Dinheiro'},
      },
    })
    const remoteCardOption = buildPaymentSelectionOption({
      channel: 'remote',
      payment: {
        id: 11,
        paymentType: {id: 2, paymentType: 'Credito'},
      },
      targetDeviceId: 'device-1',
      targetDeviceLabel: 'PDV principal',
    })

    const sections = buildPaymentSections({
      canChangeRemoteDevice: true,
      localPaymentOptions: [cashOption],
      onPressRemoteAction: jest.fn(),
      remotePaymentOptions: [remoteCardOption],
      remoteSectionTitle: 'PDV principal',
    })

    expect(sections).toHaveLength(2)
    expect(sections[0].title).toBe('Neste equipamento')
    expect(sections[0].options).toEqual([cashOption])
    expect(sections[1].title).toBe('PDV principal')
    expect(sections[1].options).toEqual([remoteCardOption])
    expect(sections[1].actionLabel).toBe('Trocar')
    expect(typeof sections[1].onPressAction).toBe('function')
  })

  it('does not expose remote action when switching devices is not allowed', () => {
    const remoteCardOption = buildPaymentSelectionOption({
      channel: 'remote',
      payment: {
        id: 22,
        paymentType: {id: 5, paymentType: 'Debito'},
      },
      targetDeviceId: 'device-2',
    })

    const sections = buildPaymentSections({
      canChangeRemoteDevice: false,
      localPaymentOptions: [],
      remotePaymentOptions: [remoteCardOption],
      remoteSectionTitle: 'Caixa remoto',
    })

    expect(sections).toHaveLength(1)
    expect(sections[0].title).toBe('Caixa remoto')
    expect(sections[0].actionLabel).toBe('')
    expect(sections[0].onPressAction).toBeNull()
  })
})
