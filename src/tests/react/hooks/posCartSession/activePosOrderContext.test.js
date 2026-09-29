const {afterEach, describe, expect, it} = global;

const {
  clearActivePosOrderContexts,
  getActivePosOrderContext,
  setActivePosOrderContext,
} = require('../../../../react/hooks/posCartSession/activePosOrderContext');

afterEach(() => clearActivePosOrderContexts());

describe('active POS order context', () => {
  it('shares the confirmed order by company and device', () => {
    const order = {id: 73421, '@id': '/orders/73421'};
    setActivePosOrderContext({companyId: 3, deviceId: 10, order});

    expect(getActivePosOrderContext({companyId: 3, deviceId: 10})).toEqual(order);
    expect(getActivePosOrderContext({companyId: 3, deviceId: 11})).toBeNull();
  });

  it('clears only the matching device session', () => {
    setActivePosOrderContext({companyId: 3, deviceId: 10, order: {id: 73421}});
    setActivePosOrderContext({companyId: 3, deviceId: 10, order: null});

    expect(getActivePosOrderContext({companyId: 3, deviceId: 10})).toBeNull();
  });
});
