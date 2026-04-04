import InfinitePay from '@controleonline-rn/react-native-infinitepay-payment';

class InfinitePayService {
  async payment(paymentMethod, installments, orderId, amount) {
    const json = {
      amount: amount,
      payment_method: paymentMethod,
      installments: installments,
      order_id: orderId,
      app_client_referrer: 'ControleOnline',
      af_force_deeplink: 'true',
    };

    const response = await InfinitePay.payment(JSON.stringify(json));

    return {
      success: response.success,
      code: response.code,
      result: response.success ? JSON.parse(response.result) : response.result,
    };
  }
}

export default InfinitePayService;