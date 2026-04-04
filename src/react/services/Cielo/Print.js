import Cielo from '@controleonline-rn/react-native-cielo-payment';

export class CieloPrint {
  async print(printRequest) {
    return await Cielo.print(printRequest);
  }
}