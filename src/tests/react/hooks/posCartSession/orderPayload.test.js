import {
  buildPosOrderPayload,
  resolvePosOrderChannel,
  ORDER_CHANNEL_POS,
  ORDER_CHANNEL_TOTEM,
} from '../../../../react/hooks/posCartSession/orderPayload'

describe('buildPosOrderPayload channel', () => {
  test('resolvePosOrderChannel defaults to pos', () => {
    expect(resolvePosOrderChannel({})).toBe(ORDER_CHANNEL_POS)
  })

  test('resolvePosOrderChannel maps totem operation mode and self-service', () => {
    expect(
      resolvePosOrderChannel({
        deviceConfigs: {'pos-operation-mode': 'totem'},
      }),
    ).toBe(ORDER_CHANNEL_TOTEM)
    expect(resolvePosOrderChannel({isSelfServiceMode: true})).toBe(
      ORDER_CHANNEL_TOTEM,
    )
  })

  test('buildPosOrderPayload includes channel pos by default', () => {
    const payload = buildPosOrderPayload({
      companyId: 10,
      deviceId: 3,
      statusIri: '/statuses/1',
      orderType: 'sale',
    })
    expect(payload.channel).toBe(ORDER_CHANNEL_POS)
    expect(payload.app).toBe('POS')
    expect(payload['device.device']).toBe(3)
  })

  test('buildPosOrderPayload uses totem when device config says so', () => {
    const payload = buildPosOrderPayload({
      companyId: 10,
      deviceId: 3,
      statusIri: '/statuses/1',
      orderType: 'sale',
      deviceConfigs: {'pos-operation-mode': 'totem'},
    })
    expect(payload.channel).toBe(ORDER_CHANNEL_TOTEM)
  })

  test('explicit channel wins over device config', () => {
    const payload = buildPosOrderPayload({
      companyId: 10,
      statusIri: '/statuses/1',
      orderType: 'sale',
      channel: 'pos',
      deviceConfigs: {'pos-operation-mode': 'totem'},
    })
    expect(payload.channel).toBe(ORDER_CHANNEL_POS)
  })
})
