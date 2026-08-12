jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: jest.fn(),
  },
}))

const {api} = require('@controleonline/ui-common/src/api')
const {
  refreshPosActiveOrder,
} = require('../../../../react/hooks/posCartSession/hydration')

const {beforeEach, describe, expect, it} = global

describe('refreshPosActiveOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('syncs the active order with hydrated order_products instead of stale order payload products', async () => {
    const richOrderProducts = [
      {
        '@id': '/order_products/10',
        id: 10,
        product: {id: 101, product: 'Coxinha'},
        quantity: 1,
        total: 12.5,
      },
    ]
    api.fetch.mockImplementation((resource, options) => {
      if (resource === 'orders/123') {
        return Promise.resolve({
          id: 123,
          orderProducts: [{id: 999, product: {product: 'stale'}}],
        })
      }
      if (resource === 'order_products') {
        expect(options).toEqual({params: {'order.id': 123}})
        return Promise.resolve({member: richOrderProducts})
      }
      return Promise.reject(new Error(`Unexpected resource ${resource}`))
    })
    const orderProductsActions = {setItems: jest.fn()}
    const ordersActions = {syncOrderProducts: jest.fn()}
    const syncActiveOrderState = jest.fn(order => order)

    const result = await refreshPosActiveOrder({
      activeOrderId: null,
      normalizeDraftOrderType: jest.fn(async order => ({...order, normalized: true})),
      orderProductsActions,
      ordersActions,
      storedOrderId: null,
      syncActiveOrderState,
      targetOrderId: 123,
    })

    expect(result).toMatchObject({
      id: 123,
      normalized: true,
      orderProducts: richOrderProducts,
    })
    expect(syncActiveOrderState).toHaveBeenCalledWith(expect.objectContaining({
      orderProducts: richOrderProducts,
    }))
    expect(orderProductsActions.setItems).toHaveBeenCalledWith(richOrderProducts)
    expect(ordersActions.syncOrderProducts).toHaveBeenCalledWith({
      orderId: 123,
      orderProducts: richOrderProducts,
    })
  })

  it('waits for order detail and product hydration before syncing the active order', async () => {
    let resolveProducts
    const productHydration = new Promise(resolve => {
      resolveProducts = resolve
    })
    api.fetch.mockImplementation(resource => {
      if (resource === 'orders/123') {
        return Promise.resolve({id: 123, orderProducts: []})
      }
      if (resource === 'order_products') {
        return productHydration
      }
      return Promise.reject(new Error(`Unexpected resource ${resource}`))
    })
    const syncActiveOrderState = jest.fn(order => order)

    const refreshPromise = refreshPosActiveOrder({
      activeOrderId: 123,
      normalizeDraftOrderType: jest.fn(async order => order),
      orderProductsActions: {setItems: jest.fn()},
      ordersActions: {syncOrderProducts: jest.fn()},
      storedOrderId: null,
      syncActiveOrderState,
      targetOrderId: null,
    })

    await Promise.resolve()
    expect(syncActiveOrderState).not.toHaveBeenCalled()
    resolveProducts({member: [{id: 10, total: 12.5}]})
    await refreshPromise
    expect(syncActiveOrderState).toHaveBeenCalledWith(expect.objectContaining({
      orderProducts: [{id: 10, total: 12.5}],
    }))
  })
})
