import {NativeModules} from 'react-native';

const {Cielo} = NativeModules;

const print = async (order, actions) => {
  const orderId = order['@id'].split('/').pop();

  try {
    const printData = await actions.print({
      id: orderId,
      'print-type': 'pos',
      'device-type': 'cielo',
    });

    const printRequest = JSON.stringify(printData);
    const result = await Cielo.print(printRequest);

    return result;
  } catch (error) {
    throw error;
  }
};

export default {print};
