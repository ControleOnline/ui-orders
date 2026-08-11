import {
  fetchCompleteOrderProducts,
  fetchCompleteOrderProductsFromStore,
} from '@controleonline/ui-orders/src/utils/orderProductsCollection'

describe('orderProductsCollection', () => {
  it('loads every page before exposing a detailed order-product collection', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce({
        member: [
          {id: 107229, order: {id: 72883}},
          {
            id: 107230,
            order: {id: 72883},
            orderProduct: '/order_products/107229',
            productGroup: '/product_groups/102',
          },
        ],
        totalItems: 3,
      })
      .mockResolvedValueOnce({
        member: [
          {
            id: 107231,
            order: {id: 72883},
            orderProduct: '/order_products/107229',
            productGroup: '/product_groups/147',
          },
        ],
        totalItems: 3,
      })

    const result = await fetchCompleteOrderProducts({
      fetchPage,
      itemsPerPage: 2,
    })

    expect(fetchPage).toHaveBeenNthCalledWith(1, {
      itemsPerPage: 2,
      page: 1,
    })
    expect(fetchPage).toHaveBeenNthCalledWith(2, {
      itemsPerPage: 2,
      page: 2,
    })
    expect(result).toHaveLength(3)
    expect(result.map(item => item.id)).toEqual([107229, 107230, 107231])
  })

  it('allows a new complete load after a transient failure', async () => {
    const fetchPage = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        member: [{id: 107229, order: {id: 72883}}],
        totalItems: 1,
      })

    await expect(
      fetchCompleteOrderProducts({fetchPage, itemsPerPage: 50}),
    ).rejects.toThrow('temporary failure')

    await expect(
      fetchCompleteOrderProducts({fetchPage, itemsPerPage: 50}),
    ).resolves.toEqual([{id: 107229, order: {id: 72883}}])
  })

  it('appends store pages using request-scoped page results', async () => {
    const getters = {totalItems: 0}
    const actions = {
      getItems: jest
        .fn()
        .mockResolvedValueOnce([{id: 107229}, {id: 107230}])
        .mockResolvedValueOnce([{id: 107231}]),
    }

    await expect(
      fetchCompleteOrderProductsFromStore({
        actions,
        getters,
        itemsPerPage: 2,
        params: {'order.id': 72883},
      }),
    ).resolves.toEqual([{id: 107229}, {id: 107230}, {id: 107231}])

    expect(actions.getItems).toHaveBeenNthCalledWith(1, {
      'order.id': 72883,
      itemsPerPage: 2,
      page: 1,
    })
    expect(actions.getItems).toHaveBeenNthCalledWith(2, {
      'order.id': 72883,
      append: true,
      itemsPerPage: 2,
      page: 2,
    })
  })

  it('loads an extra empty page when a collection exactly fills a page', async () => {
    const actions = {
      getItems: jest
        .fn()
        .mockResolvedValueOnce([{id: 107229}, {id: 107230}])
        .mockResolvedValueOnce([]),
    }

    await expect(
      fetchCompleteOrderProductsFromStore({
        actions,
        getters: {totalItems: 1},
        itemsPerPage: 2,
        params: {'order.id': 72883},
      }),
    ).resolves.toEqual([{id: 107229}, {id: 107230}])

    expect(actions.getItems).toHaveBeenCalledTimes(2)
  })

  it('keeps concurrent order collections isolated from shared totalItems', async () => {
    const pagesByOrder = {
      72883: {
        1: [{id: 107229}, {id: 107230}],
        2: [{id: 107231}],
      },
      72884: {
        1: [{id: 107240}, {id: 107241}],
        2: [{id: 107242}, {id: 107243}],
        3: [{id: 107244}],
      },
    }
    const getters = {totalItems: 0}
    const actions = {
      getItems: jest.fn(async params => {
        getters.totalItems = params['order.id'] === 72883 ? 1 : 999
        await Promise.resolve()
        return pagesByOrder[params['order.id']][params.page] || []
      }),
    }

    const [firstOrder, secondOrder] = await Promise.all([
      fetchCompleteOrderProductsFromStore({
        actions,
        getters,
        itemsPerPage: 2,
        params: {'order.id': 72883},
      }),
      fetchCompleteOrderProductsFromStore({
        actions,
        getters,
        itemsPerPage: 2,
        params: {'order.id': 72884},
      }),
    ])

    expect(firstOrder.map(item => item.id)).toEqual([107229, 107230, 107231])
    expect(secondOrder.map(item => item.id)).toEqual([
      107240,
      107241,
      107242,
      107243,
      107244,
    ])
  })
})
