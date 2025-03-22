import { NativeModules } from 'react-native';
import { env } from '@env';

class Cielo {
  async payment(paymentCode, items, orderPrice) {
    const json = {    
      accessToken: env.CIELO.ACCESS_TOKEN,
      clientID: env.CIELO.CLIENT_ID,
      email: env.CIELO.EMAIL,
      installments: 0,
      items: items,
      paymentCode: paymentCode,
      value: orderPrice,
    };

    const response = await NativeModules.Payment.payment(JSON.stringify(json));

    return {
      success: response.success,
      code: response.code,
      result: response.success ? JSON.parse(response.result) : response.result,
    };
  }
}

export default Cielo;
