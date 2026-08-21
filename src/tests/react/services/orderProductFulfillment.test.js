import {
  FULFILLMENT_ACTION_SERVED,
  FULFILLMENT_ACTION_PICKED_UP,
  FULFILLMENT_ACTION_COUNTER_DELIVERED,
  FULFILLMENT_ACTIONS,
  resolveDefaultPosFulfillmentAction,
  buildFulfillmentIdempotencyKey,
  executeOrderProductFulfillment,
  isRootOrderProduct,
} from '../../../react/services/orderProductFulfillment'

describe('orderProductFulfillment', () => {
  test('resolveDefaultPosFulfillmentAction prefers picked_up for totem/self-service', () => {
    expect(resolveDefaultPosFulfillmentAction({isSelfServiceMode: true})).toBe(
      FULFILLMENT_ACTION_PICKED_UP,
    )
    expect(resolveDefaultPosFulfillmentAction({channel: 'totem'})).toBe(
      FULFILLMENT_ACTION_PICKED_UP,
    )
  })

  test('resolveDefaultPosFulfillmentAction uses counter_delivered for counter mode', () => {
    expect(resolveDefaultPosFulfillmentAction({isCounterMode: true})).toBe(
      FULFILLMENT_ACTION_COUNTER_DELIVERED,
    )
  })

  test('resolveDefaultPosFulfillmentAction defaults to served for waiter/POS', () => {
    expect(resolveDefaultPosFulfillmentAction({})).toBe(FULFILLMENT_ACTION_SERVED)
  })

  test('buildFulfillmentIdempotencyKey is stable and bounded', () => {
    const key = buildFulfillmentIdempotencyKey({
      orderProductId: 42,
      action: 'served',
      quantity: 2,
      attemptId: 'abc',
    })
    expect(key).toBe('opf:42:served:2:abc')
    expect(key.length).toBeLessThanOrEqual(128)
  })

  test('executeOrderProductFulfillment posts required body', async () => {
    const posts = []
    const api = {
      post: async (path, body) => {
        posts.push({path, body})
        return {id: 1, ...body}
      },
    }
    const result = await executeOrderProductFulfillment(api, {
      orderProductId: 99,
      action: FULFILLMENT_ACTION_SERVED,
      quantity: 1.5,
      idempotencyKey: 'fixed-key',
      deviceOrigin: 'device-7',
    })
    expect(posts).toHaveLength(1)
    expect(posts[0].path).toBe('/order_product_fulfillments/execute')
    expect(posts[0].body).toEqual({
      orderProductId: 99,
      action: 'served',
      quantity: 1.5,
      idempotencyKey: 'fixed-key',
      deviceOrigin: 'device-7',
    })
    expect(result.id).toBe(1)
  })

  test('executeOrderProductFulfillment rejects invalid action and client', async () => {
    await expect(
      executeOrderProductFulfillment(null, {orderProductId: 1, action: 'served'}),
    ).rejects.toThrow(/api client/)
    await expect(
      executeOrderProductFulfillment(
        {post: async () => ({})},
        {orderProductId: 1, action: 'not-real'},
      ),
    ).rejects.toThrow(/Invalid fulfillment action/)
    expect(FULFILLMENT_ACTIONS).toContain('dispatched')
  })

  test('isRootOrderProduct detects parent links', () => {
    expect(isRootOrderProduct({id: 1})).toBe(true)
    expect(isRootOrderProduct({id: 2, orderProduct: null})).toBe(true)
    expect(isRootOrderProduct({id: 3, orderProduct: '/order_products/1'})).toBe(
      false,
    )
    expect(isRootOrderProduct(null)).toBe(false)
  })
})
