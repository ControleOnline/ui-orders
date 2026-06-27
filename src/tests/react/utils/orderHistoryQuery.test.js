const assert = require('node:assert/strict');

const {
  ACTIVE_HISTORY_REAL_STATUSES,
  POS_SALE_ORDER_TYPES,
  resolveHistoryOrderTypeQuery,
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
    ACTIVE_HISTORY_REAL_STATUSES,
    ['open', 'pending'],
  );
});

test('non-sale histories keep the raw order type filter', () => {
  assert.equal(
    resolveHistoryOrderTypeQuery({orderTypeFilter: 'purchase'}),
    'purchase',
  );
});
