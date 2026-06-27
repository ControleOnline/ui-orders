const assert = require('node:assert/strict');

const {
  ACTIVE_HISTORY_REAL_STATUSES,
  POS_SALE_ORDER_TYPES,
  resolveHistoryOrderTypeQuery,
  resolveHistoryStatusQuery,
  resolveHistoryStatusQueryKey,
} = require('../../../react/utils/orderHistoryQuery');

test('sale history keeps the pos sale order types', () => {
  assert.deepEqual(
    resolveHistoryOrderTypeQuery({orderTypeFilter: 'sale'}),
    POS_SALE_ORDER_TYPES,
  );
  assert.deepEqual(
    POS_SALE_ORDER_TYPES,
    ['sale', 'cart', 'online', 'manual'],
  );
});

test('pos sale history defaults to open and pending only', () => {
  assert.deepEqual(
    resolveHistoryStatusQuery({
      appType: 'POS',
      orderTypeFilter: 'sale',
    }),
    ACTIVE_HISTORY_REAL_STATUSES,
  );
  assert.deepEqual(
    ACTIVE_HISTORY_REAL_STATUSES,
    ['open', 'pending'],
  );
});

test('history status query switches field when advanced filters are visible', () => {
  assert.equal(
    resolveHistoryStatusQueryKey({showAdvancedFilters: false}),
    'status.realStatus',
  );

  assert.equal(
    resolveHistoryStatusQueryKey({showAdvancedFilters: true}),
    'status.status',
  );
});

test('non-sale histories keep the raw order type filter and no active status override', () => {
  assert.equal(
    resolveHistoryOrderTypeQuery({orderTypeFilter: 'purchase'}),
    'purchase',
  );

  assert.equal(
    resolveHistoryStatusQuery({
      appType: 'POS',
      orderTypeFilter: 'purchase',
    }),
    null,
  );
});
