const {
  COUNTER_SCREEN_ADD_PRODUCT,
  COUNTER_SCREEN_ORDER_DETAILS,
  COUNTER_SCREEN_ORDER_HISTORY,
  extractEmbeddedOrderProducts,
  hasCounterOrderProducts,
  resolveCounterDestinationFromOrders,
} = require('../../../react/utils/counterOrderFlow')

const {describe, expect, it} = global

describe('counterOrderFlow', () => {
  it('goes straight to add products when there is no open order', () => {
    expect(resolveCounterDestinationFromOrders([])).toEqual({
      orderCount: 0,
      order: null,
      screen: COUNTER_SCREEN_ADD_PRODUCT,
    })
  })

  it('goes back to history when there is more than one open order', () => {
    const result = resolveCounterDestinationFromOrders([{id: 1}, {id: 2}])

    expect(result.orderCount).toBe(2)
    expect(result.order).toBeNull()
    expect(result.screen).toBe(COUNTER_SCREEN_ORDER_HISTORY)
  })

  it('keeps the operator in order details when the single order already has items', () => {
    const order = {
      id: 10,
      orderProducts: [{id: 100}],
    }

    const result = resolveCounterDestinationFromOrders([order])

    expect(result.order).toBe(order)
    expect(result.screen).toBe(COUNTER_SCREEN_ORDER_DETAILS)
  })

  it('opens add products when the single order is still empty', () => {
    const order = {
      id: 11,
      orderProducts: [],
      price: 0,
    }

    const result = resolveCounterDestinationFromOrders([order])

    expect(result.order).toBe(order)
    expect(result.screen).toBe(COUNTER_SCREEN_ADD_PRODUCT)
  })

  it('reads embedded order products from hydra payloads and price fallback', () => {
    expect(
      extractEmbeddedOrderProducts({
        orderProducts: {'hydra:member': [{id: 1}]},
      }),
    ).toHaveLength(1)

    expect(hasCounterOrderProducts({price: 12.5})).toBe(true)
  })
})
