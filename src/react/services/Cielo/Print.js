import {NativeModules} from 'react-native';

const {Cielo} = NativeModules;

export class CieloPrint {
  constructor(device, currentCompany, getters, actions) {
    this.actions = actions;
    this.getters = getters;
    this.device = device;
    this.currentCompany = currentCompany;
  }

  print = async printType => {
    try {
      if (printType == 'order') return await this.printOrder();
      if (printType == 'cash-register') return await this.printCashRegister();
      if (printType == 'purchasing-suggestion') return await this.printPurchasingSuggestion();

      
    } catch (error) {
      throw error;
    }
  };

  printPurchasingSuggestion= async () => {
    const printData = await this.actions.printPurchasingSuggestion({
      device: this.device.id,
      people: this.currentCompany.id,
      'print-type': 'pos',
      'device-type': 'cielo',
    });

    const printRequest = JSON.stringify(printData);
    const result = await Cielo.print(printRequest);

    return result;
  };

  printCashRegister = async () => {
    const printData = await this.actions.getCashRegisterPrint({
      device: this.device.id,
      people: this.currentCompany.id,
      'print-type': 'pos',
      'device-type': 'cielo',
    });

    const printRequest = JSON.stringify(printData);
    const result = await Cielo.print(printRequest);

    return result;
  };

  printOrder = async () => {
    const {item: order} = this.getters;
    const orderId = order['@id'].split('/').pop();

    const printData = await this.actions.print({
      id: orderId,
      'print-type': 'pos',
      'device-type': 'cielo',
    });

    const printRequest = JSON.stringify(printData);
    const result = await Cielo.print(printRequest);

    return result;
  };
}
