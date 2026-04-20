import Cielo from '@controleonline-rn/react-native-cielo-payment';
import {env} from '@env';
import {getAllStores} from '@store';
import {
  resolveCieloConfig,
} from '@controleonline/ui-common/src/utils/integrationConfigs';

const isConfigMap = value =>
  value && typeof value === 'object' && !Array.isArray(value);

const resolveRuntimeCompanyConfigs = () => {
  const stores = getAllStores();
  const peopleStore = stores?.people?.getters || {};
  const configsStore = stores?.configs?.getters || {};

  if (isConfigMap(configsStore.items)) {
    return configsStore.items;
  }

  if (isConfigMap(peopleStore.currentCompany?.configs)) {
    return peopleStore.currentCompany.configs;
  }

  if (isConfigMap(peopleStore.defaultCompany?.configs)) {
    return peopleStore.defaultCompany.configs;
  }

  return {};
};

const resolveRuntimeCieloConfig = () => {
  const runtimeConfig = resolveCieloConfig(resolveRuntimeCompanyConfigs());

  return {
    ACCESS_TOKEN: runtimeConfig.ACCESS_TOKEN || env?.CIELO?.ACCESS_TOKEN || '',
    CLIENT_ID: runtimeConfig.CLIENT_ID || env?.CIELO?.CLIENT_ID || '',
    EMAIL: runtimeConfig.EMAIL || env?.CIELO?.EMAIL || '',
  };
};

class CieloService {
  async payment(paymentCode, items, orderPrice) {
    const cieloConfig = resolveRuntimeCieloConfig();

    if (
      !cieloConfig.ACCESS_TOKEN ||
      !cieloConfig.CLIENT_ID ||
      !cieloConfig.EMAIL
    ) {
      throw new Error('Configuracao da Cielo incompleta.');
    }

    const json = {
      accessToken: cieloConfig.ACCESS_TOKEN,
      clientID: cieloConfig.CLIENT_ID,
      email: cieloConfig.EMAIL,
      installments: 0,
      items: items,
      paymentCode: paymentCode,
      value: orderPrice,
    };

    const response = await Cielo.payment(JSON.stringify(json));

    return {
      success: response.success,
      code: response.code,
      result: response.success ? JSON.parse(response.result) : response.result,
    };
  }
}

export default CieloService;
