const {jest} = require('@jest/globals');

const {beforeEach, describe, expect, it} = global;

let mockFetch = jest.fn();

jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: (...args) => mockFetch(...args),
  },
}));

const {
  cancelOrder,
  getCancelReasons,
  getHistorySummaryApps,
  syncOrderProducts,
} = require('../../../../store/orders/customActions');

describe('orders customActions', () => {
  beforeEach(() => {
    mockFetch = jest.fn();
  });

  it('returns the canonical summary apps list from the orders summary response', async () => {
    mockFetch.mockResolvedValue({
      summary: {
        apps: [
          {
            key: 'iFood',
            label: 'iFood',
            orders: 2,
            units: 6,
          },
        ],
      },
    });

    const result = await getHistorySummaryApps(
      {
        getters: {
          resourceEndpoint: 'orders',
        },
      },
      {
        query: {
          provider: '/people/4',
          report: 1,
        },
      },
    );

    expect(mockFetch).toHaveBeenCalledWith('orders', {
      params: {
        provider: '/people/4',
        report: 1,
      },
    });
    expect(result).toEqual([
      {
        key: 'iFood',
        label: 'iFood',
        orders: 2,
        units: 6,
      },
    ]);
  });

  it('loads cancellation reasons from the order action endpoint', async () => {
    mockFetch.mockResolvedValue({
      result: {
        errno: 0,
        data: {
          reasons: [
            {
              id: 10,
              description: 'Cliente desistiu',
            },
          ],
        },
      },
    });

    const result = await getCancelReasons(
      {
        getters: {
          resourceEndpoint: 'orders',
        },
      },
      {
        id: 72829,
        companyId: 8,
      },
    );

    expect(mockFetch).toHaveBeenCalledWith('orders/72829/cancel-reasons', {
      params: {
        company: '8',
      },
    });
    expect(result).toEqual([
      {
        id: 10,
        description: 'Cliente desistiu',
      },
    ]);
  });

  it('posts the selected cancellation reason and reloads the active history query', async () => {
    const commit = jest.fn();
    mockFetch
      .mockResolvedValueOnce({
        result: {
          errno: 0,
          errmsg: 'ok',
        },
      })
      .mockResolvedValueOnce({
        member: [],
        totalItems: 0,
      });

    await cancelOrder(
      {
        commit,
        getters: {
          items: [],
          resourceEndpoint: 'orders',
        },
      },
      {
        id: 72829,
        companyId: 8,
        reasonId: 10,
        reason: 'Cliente desistiu',
        reloadParams: {
          provider: '/people/1',
          orderType: ['sale'],
        },
      },
    );

    expect(mockFetch).toHaveBeenNthCalledWith(1, 'orders/72829/cancel', {
      method: 'POST',
      body: {
        company: '8',
        reason_id: 10,
        reason: 'Cliente desistiu',
      },
    });
    expect(mockFetch).toHaveBeenNthCalledWith(2, 'orders', {
      params: {
        provider: '/people/1',
        orderType: ['sale'],
      },
    });
    expect(commit).toHaveBeenCalledWith('SET_ISSAVING', true);
    expect(commit).toHaveBeenCalledWith('SET_ISSAVING', false);
  });

  it('preserves the authoritative order price while enriching a shallow product collection', () => {
    const shallowOrderProducts = [
      {
        id: 107229,
        product: {id: 1343, product: 'Produto customizado'},
        quantity: 2,
        price: 116.86,
        total: 233.72,
      },
      {
        id: 107230,
        product: {id: 1109, product: 'Componente'},
        quantity: 2,
        price: 49.85,
        total: 99.7,
      },
    ];
    const detailedOrderProducts = [
      shallowOrderProducts[0],
      {
        ...shallowOrderProducts[1],
        order: {id: 72883},
        orderProduct: '/order_products/107229',
        parentProduct: '/products/1343',
        productGroup: '/product_groups/102',
      },
    ];
    const currentOrder = {
      id: 72883,
      price: 233.72,
      orderProducts: shallowOrderProducts,
    };
    const commit = jest.fn();

    const result = syncOrderProducts(
      {
        commit,
        getters: {
          item: currentOrder,
          items: [currentOrder],
        },
      },
      {
        orderId: 72883,
        orderProducts: detailedOrderProducts,
      },
    );

    expect(result.price).toBe(233.72);
    expect(result.orderProducts).toEqual(detailedOrderProducts);
    expect(commit).toHaveBeenCalledWith(
      'SET_ITEM',
      expect.objectContaining({price: 233.72}),
    );
  });
});
