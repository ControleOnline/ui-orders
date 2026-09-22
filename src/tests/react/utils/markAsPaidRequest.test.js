import {buildMarkAsPaidRequest} from '../../../react/utils/markAsPaidRequest';

describe('buildMarkAsPaidRequest', () => {
  it('uses the server-authorized order endpoint and sends only advisory payment references', () => {
    expect(
      buildMarkAsPaidRequest({
        order: {'@id': '/orders/8371', company: '/people/tenant-a'},
        selectedProduct: {'@id': '/products/11'},
        selectedPayment: {
          paymentType: {'@id': '/payment_types/4'},
          wallet: {'@id': '/wallets/8'},
        },
        amount: 99.5,
      }),
    ).toEqual({
      endpoint: 'orders/8371/mark-as-paid',
      options: {
        method: 'POST',
        body: {
          product: '/products/11',
          paymentType: '/payment_types/4',
          destinationWallet: '/wallets/8',
          price: 99.5,
        },
      },
    });
  });

  it('does not build a request without an order id', () => {
    expect(buildMarkAsPaidRequest({order: {id: null}})).toBeNull();
  });
});
