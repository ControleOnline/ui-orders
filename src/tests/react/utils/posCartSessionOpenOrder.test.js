jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: jest.fn(),
  },
}))
jest.mock('@controleonline/ui-common/src/react/components/MessageService', () => ({
  useMessage: () => ({}),
}))
jest.mock('@store', () => ({
  useStore: () => ({
    actions: {},
    getters: {},
  }),
}))
jest.mock(
  '@controleonline/ui-common/src/react/config/deviceConfigBootstrap',
  () => ({
    canManagePosCheckOrders: () => true,
    POS_CHECK_ORDER_TYPE_NONE: 'none',
    resolvePosCheckOrderType: () => 'none',
  }),
)

const {isOpenPosCartOrder} = require('../../../react/hooks/posCartSession/status')

const {describe, expect, it} = global

describe('isOpenPosCartOrder', () => {
  const buildBaseOrder = overrides => ({
    app: 'POS',
    status: {
      realStatus: 'open',
      status: 'open',
    },
    orderType: 'sale',
    ...overrides,
  })

  it('accepts linked sale orders with externalCode even when mainOrderId is absent', () => {
    const order = buildBaseOrder({
      externalCode: 'MESA-17',
    })

    expect(
      isOpenPosCartOrder(order, {usesLinkedCheckOrders: true}),
    ).toBe(true)
  })

  it('keeps linked parent orders excluded from active cart detection', () => {
    const order = buildBaseOrder({
      externalCode: 'MESA-17',
      orderType: 'table',
    })

    expect(
      isOpenPosCartOrder(order, {usesLinkedCheckOrders: true}),
    ).toBe(false)
  })

  it('requires at least linked identifiers in linked mode', () => {
    const order = buildBaseOrder({
      externalCode: '',
      orderType: 'sale',
    })

    expect(
      isOpenPosCartOrder(order, {usesLinkedCheckOrders: true}),
    ).toBe(false)
  })
})
