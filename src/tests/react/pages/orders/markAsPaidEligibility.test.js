import { isPayableOrder, isCanceledOrder } from '../../../../react/pages/orders/orderHistoryHelpers';

describe('isPayableOrder', () => {
  test('rejects canceled orders', () => {
    expect(isPayableOrder({ status: { status: 'canceled', realStatus: 'canceled' } })).toBe(false);
  });

  test('rejects closed orders', () => {
    expect(isPayableOrder({ status: { status: 'closed', realStatus: 'closed' } })).toBe(false);
  });

  test('accepts open sale orders', () => {
    expect(isPayableOrder({ status: { status: 'open', realStatus: 'open' } })).toBe(true);
  });
});
