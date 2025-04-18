import {NativeModules} from 'react-native';

const {Cielo} = NativeModules;

export class CieloPrint {

  print = async printRequest => {
    try {
      return await Cielo.print(JSON.stringify(printRequest));
    } catch (error) {
      throw error;
    }
  };
}
