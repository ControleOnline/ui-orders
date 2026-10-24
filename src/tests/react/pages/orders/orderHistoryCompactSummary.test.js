const {resolveHistorySalesTotals} = require('../../../../react/pages/orders/orderHistoryCompactSummary');
it.each([
  {sales: {sales: {totals: {orders: 2, revenue: '100.00', averageTicket: '50.00'}}}},
  {sales: {totals: {orders: 2, revenue: 100, averageTicket: 50}}},
])('reads complete server totals rather than the visible order prices', summary => {
  expect(resolveHistorySalesTotals(summary)).toEqual({orders: 2, revenue: 100, averageTicket: 50});
});
it('accepts a genuine zero summary and hides missing or malformed metrics', () => {
  expect(resolveHistorySalesTotals({sales: {totals: {orders: 0, revenue: 0, averageTicket: 0}}})).toEqual({orders: 0, revenue: 0, averageTicket: 0});
  expect(resolveHistorySalesTotals({})).toBeNull();
  expect(resolveHistorySalesTotals({sales: {totals: {revenue: 'bad'}}})).toBeNull();
});
