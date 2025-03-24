import { NativeModules } from 'react-native';
import { env } from '@env';

class InfinitePay {
  async payment(paymentMethod, installments, orderId, amount) {
    const json = {    
      amount: amount,
      payment_method: paymentMethod,
      installments: installments,
      order_id: orderId,
      app_client_referrer: "pdv.controleonline.com",
      af_force_deeplink: "true",
    };

    const response = await NativeModules.InfinitePay.payment(JSON.stringify(json));

    return {
      success: response.success,
      code: response.code,
      result: response.success ? JSON.parse(response.result) : response.result,
    };
  }
}

export default InfinitePay;