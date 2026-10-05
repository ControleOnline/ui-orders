const {afterEach, describe, expect, it} = global;

const {
  clearActivePosOrderContexts,
  consumeConfirmedPosOrderContext,
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

it('consumes a recent server acknowledgment once and isolates company, device and order',()=>{
 setActivePosOrderContext({companyId:3,deviceId:10,order:{id:123,orderProducts:[]},confirmed:true});
 expect(consumeConfirmedPosOrderContext({companyId:4,deviceId:10,orderId:123})).toBeNull();
 expect(consumeConfirmedPosOrderContext({companyId:3,deviceId:11,orderId:123})).toBeNull();
 expect(consumeConfirmedPosOrderContext({companyId:3,deviceId:10,orderId:124})).toBeNull();
 expect(consumeConfirmedPosOrderContext({companyId:3,deviceId:10,orderId:123})).toMatchObject({id:123});
 expect(consumeConfirmedPosOrderContext({companyId:3,deviceId:10,orderId:123})).toBeNull();
});
it('never treats an old acknowledgment as a fresh return from customization',()=>{
 const clock=jest.spyOn(Date,'now').mockReturnValue(1000);
 setActivePosOrderContext({companyId:3,deviceId:10,order:{id:123},confirmed:true});
 clock.mockReturnValue(32000);
 expect(consumeConfirmedPosOrderContext({companyId:3,deviceId:10,orderId:123})).toBeNull();
 clock.mockRestore();
});

it('preserves the original confirmation time instead of renewing it at navigation', () => {
 const clock = jest.spyOn(Date, 'now').mockReturnValue(29000)
 try {
  setActivePosOrderContext({companyId: 3, deviceId: 10, order: {id: 123}, confirmed: true, confirmedAt: 1000})
  clock.mockReturnValue(32000)
  expect(consumeConfirmedPosOrderContext({companyId: 3, deviceId: 10, orderId: 123})).toBeNull()
 } finally {clock.mockRestore()}
})
