const {jest} = require('@jest/globals');

const {beforeEach, describe, expect, it} = global;

let mockFetch = jest.fn();

jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: (...args) => mockFetch(...args),
  },
}));

const {getHistorySummaryApps} = require('../../../../store/orders/customActions');

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
});
