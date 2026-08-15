import {
  resolveOrderTypeFilter,
  isCanceledOrder,
  isCancelableOrder,
  buildHistoryRequestParams,
  buildStatusOptions,
  configureOrderHistoryColumns,
  normalizeText,
  areHistoryFiltersEqual,
  buildStatusOptionsSignature,
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

  it('areHistoryFiltersEqual treats equal objects as equal (anti-loop guard)', () => {
    const a = { alterDate: { shortcut: 'today' }, status: '/statuses/1' };
    const b = { alterDate: { shortcut: 'today' }, status: '/statuses/1' };
    expect(areHistoryFiltersEqual(a, b)).toBe(true);
    expect(areHistoryFiltersEqual(a, a)).toBe(true);
    expect(areHistoryFiltersEqual(null, {})).toBe(true);
  });

  it('areHistoryFiltersEqual detects changes (must call setFilters)', () => {
    const a = { alterDate: { shortcut: 'today' } };
    const b = { alterDate: { shortcut: 'week' } };
    expect(areHistoryFiltersEqual(a, b)).toBe(false);
    expect(areHistoryFiltersEqual(a, { ...a, status: 'x' })).toBe(false);
  });

  it('buildStatusOptionsSignature is stable for same options', () => {
    const opts = [{ value: '/statuses/1', label: 'Open' }];
    expect(buildStatusOptionsSignature(opts)).toBe(buildStatusOptionsSignature(opts));
    expect(buildStatusOptionsSignature(opts)).not.toBe(
      buildStatusOptionsSignature([{ value: '/statuses/2', label: 'Closed' }]),
    );
  });
});
