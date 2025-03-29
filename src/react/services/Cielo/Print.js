import { NativeModules } from 'react-native';

const { Cielo } = NativeModules;

const print = async (order, actions) => {
  const orderId = order['@id'].split('/').pop();

  const printData = await actions.print({
    id: orderId,
    'print-type': 'pos',
    'device-type': 'cielo',
  });
  console.log(printData);

  const printRequest = JSON.stringify(printData);

  const result = await Cielo.print(printRequest);

  if (result.success) {
    console.log('Impressão realizada com sucesso:', result.result);
  } else {
    console.error('Erro na impressão:', result.result);
  }
};

export default { print };