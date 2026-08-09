import {
  resolveOrderTypeFilter,
  isCanceledOrder,
  isCancelableOrder,
  buildHistoryRequestParams,
  buildStatusOptions,
  configureOrderHistoryColumns,
  normalizeText,
} from '../../../../react/pages/orders/orderHistoryHelpers';

describe('orderHistoryHelpers', () => {
  it('resolveOrderTypeFilter defaults to sale', () => {
    expect(resolveOrderTypeFilter('')).toBe('sale');
    expect(resolveOrderTypeFilter('purchase')).toBe('purchase');
  });
  it('isCanceledOrder detects canceled', () => {
    expect(isCanceledOrder({ status: { realStatus: 'canceled' } })).toBe(true);
    expect(isCanceledOrder({ status: { realStatus: 'open' } })).toBe(false);
  });
  it('buildHistoryRequestParams requires company', () => {
    expect(buildHistoryRequestParams({ currentCompanyId: null })).toBeNull();
    const p = buildHistoryRequestParams({
      currentCompanyId: 10, canViewCompanyOrders: true, filters: {}, orderTypeFilter: 'sale', showAdvancedFilters: false,
    });
    expect(p.provider).toBe('/people/10');
  });
  it('buildStatusOptions filters context', () => {
    const opts = buildStatusOptions([
      { '@id': '/statuses/1', context: 'order', status: 'open' },
      { '@id': '/statuses/2', context: 'invoice', status: 'paid' },
    ]);
    expect(opts).toHaveLength(1);
  });
  it('configureOrderHistoryColumns', () => {
    const cols = configureOrderHistoryColumns({
      columns: [{ name: 'app' }, { name: 'other' }],
      showAdvancedFilters: true, orderTypeFilter: 'sale', allChannelLabel: 'All',
    });
    expect(cols[0].externalFilter).toBe(true);
    expect(cols[1].externalFilter).toBe(false);
  });
  it('normalizeText', () => {
    expect(normalizeText('  a ')).toBe('a');
  });
});
