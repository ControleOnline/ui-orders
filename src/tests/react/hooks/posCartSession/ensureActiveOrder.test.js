jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: jest.fn(),
  },
}))

const {api} = require('@controleonline/ui-common/src/api')
const {
  assertActiveEnsureConsumer,
  createEnsureActiveOrderRequestKey,
  hasActiveEnsureConsumer,
  runEnsureActiveOrder,
} = require('../../../../react/hooks/posCartSession/ensureActiveOrder')
const {
  POS_ORDER_CREATION_CANCELLED_ERROR,
  buildCancelledOrderCreationError,
} = require('../../../../react/utils/posCartHelpers')

const {describe, expect, it, beforeEach} = global

const buildRequestEntry = signal => ({
  consumers: new Set([{signal}]),
})

const buildRunArgs = overrides => ({
  activeOrder: null,
  buildCancelledError: buildCancelledOrderCreationError,
  buildOrderPayload: (status, people, _orderProducts, orderType) => ({
    app: 'POS',
    orderType,
    people,
    status,
  }),
  checkInputType: 'none',
  companyId: 3,
  defaultStatusId: 901,
  ensureSettlementOrder: jest.fn(),
  findOpenLinkedSessionOrder: jest.fn(),
  forceNew: false,
  getRecentLinkedOrderInput: jest.fn(),
  linkedOrderType: 'table',
  loadStoredDraftOrder: jest.fn().mockResolvedValue(null),
  materializeOpenPosOrder: jest.fn(async order => ({...order, hydrated: true})),
  ordersActions: {
    save: jest.fn().mockResolvedValue({
      '@id': '/orders/456',
      id: 456,
      orderType: 'cart',
    }),
  },
  peopleIri: '/people/3',
  providedLinkedOrderInput: null,
  rememberLinkedOrderInput: jest.fn(),
  requestEntry: buildRequestEntry(undefined),
  requestLinkedOrderCode: jest.fn(),
  syncActiveOrderState: jest.fn(order => order),
  usesLinkedCheckOrders: false,
  ...overrides,
})

describe('runEnsureActiveOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    api.fetch.mockRejectedValue(new Error('offline'))
  })

  it('keeps forceNew and resume requests in separate locks', () => {
    expect(createEnsureActiveOrderRequestKey('pdv-active-order:3:web-7', false))
      .toBe('pdv-active-order:3:web-7:resume')
    expect(createEnsureActiveOrderRequestKey('pdv-active-order:3:web-7', true))
      .toBe('pdv-active-order:3:web-7:new')
  })

  it('treats an aborted AbortController as an inactive consumer', () => {
    const controller = new AbortController()
    controller.abort()
    const requestEntry = buildRequestEntry(controller.signal)

    expect(hasActiveEnsureConsumer(requestEntry)).toBe(false)
    expect(() =>
      assertActiveEnsureConsumer(requestEntry, buildCancelledOrderCreationError),
    ).toThrow('A preparacao do pedido foi cancelada.')
  })

  it('resumes the stored draft without creating a new order', async () => {
    const storedDraftOrder = {id: 123, orderType: 'cart'}
    const args = buildRunArgs({
      loadStoredDraftOrder: jest.fn().mockResolvedValue(storedDraftOrder),
    })

    await expect(runEnsureActiveOrder(args)).resolves.toBe(storedDraftOrder)
    expect(args.ordersActions.save).not.toHaveBeenCalled()
    expect(api.fetch).not.toHaveBeenCalled()
  })

  it('uses forceNew to skip stored draft reuse and clear the active order first', async () => {
    const args = buildRunArgs({forceNew: true})

    await expect(runEnsureActiveOrder(args)).resolves.toMatchObject({
      id: 456,
      hydrated: true,
    })
    expect(args.loadStoredDraftOrder).not.toHaveBeenCalled()
    expect(args.syncActiveOrderState).toHaveBeenNthCalledWith(1, null)
    expect(args.ordersActions.save).toHaveBeenCalledWith({
      app: 'POS',
      orderType: 'cart',
      people: '/people/3',
      status: '/statuses/901',
    })
  })

  it('cancels a pending creation when every consumer aborts before save', async () => {
    const controller = new AbortController()
    api.fetch.mockImplementationOnce(async () => {
      controller.abort()
      return {member: [{'@id': '/statuses/901', status: 'open', realStatus: 'open'}]}
    })
    const args = buildRunArgs({
      requestEntry: buildRequestEntry(controller.signal),
    })

    await expect(runEnsureActiveOrder(args)).rejects.toMatchObject({
      code: POS_ORDER_CREATION_CANCELLED_ERROR,
    })
    expect(args.ordersActions.save).not.toHaveBeenCalled()
  })
})
