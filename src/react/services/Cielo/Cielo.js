import Cielo from '@controleonline-rn/react-native-cielo-payment';
import {env} from '@env';
import {api} from '@controleonline/ui-common/src/api';
import {getAllStores} from '@store';
import {
  DEFAULT_CIELO_CONFIG,
  resolveCieloConfig,
} from '@controleonline/ui-common/src/utils/integrationConfigs';

const isConfigMap = value =>
  value && typeof value === 'object' && !Array.isArray(value);

const normalizeEntityId = value =>
  String(value?.id || value?.['@id'] || value || '')
    .replace(/\D+/g, '')
    .trim();

const extractCollectionItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const hasRequiredCieloConfig = config =>
  Boolean(
    String(config?.ACCESS_TOKEN || '').trim() &&
      String(config?.CLIENT_ID || '').trim() &&
      String(config?.EMAIL || '').trim(),
  );

let technicalCieloConfigCache = DEFAULT_CIELO_CONFIG;
let technicalCieloConfigCompanyId = '';
let technicalCieloConfigPromise = null;

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

const resolveDefaultCompanyId = () => {
  const stores = getAllStores();
  const peopleStore = stores?.people?.getters || {};

  return normalizeEntityId(
    peopleStore.defaultCompany?.id || peopleStore.defaultCompany?.['@id'],
  );
};

const loadTechnicalCieloConfig = async () => {
  const defaultCompanyId = resolveDefaultCompanyId();

  if (!defaultCompanyId) {
    return DEFAULT_CIELO_CONFIG;
  }

  if (
    technicalCieloConfigCompanyId === defaultCompanyId &&
    hasRequiredCieloConfig(technicalCieloConfigCache)
  ) {
    return technicalCieloConfigCache;
  }

  if (technicalCieloConfigPromise) {
    return technicalCieloConfigPromise;
  }

  technicalCieloConfigPromise = api
    .fetch('/configs', {
      params: {
        configKey: 'CIELO',
        itemsPerPage: 1,
        people: '/people/' + defaultCompanyId,
        visibility: 'private',
      },
    })
    .then(response => {
      const item = extractCollectionItems(response)[0];
      technicalCieloConfigCompanyId = defaultCompanyId;
      technicalCieloConfigCache = resolveCieloConfig(
        item?.configKey ? {[item.configKey]: item?.configValue} : {},
      );

      return technicalCieloConfigCache;
    })
    .catch(() => DEFAULT_CIELO_CONFIG)
    .finally(() => {
      technicalCieloConfigPromise = null;
    });

  return technicalCieloConfigPromise;
};

const resolveRuntimeCieloConfig = async () => {
  const runtimeConfig = resolveCieloConfig(resolveRuntimeCompanyConfigs());
  const technicalConfig = hasRequiredCieloConfig(runtimeConfig)
    ? DEFAULT_CIELO_CONFIG
    : await loadTechnicalCieloConfig();

  return {
    ACCESS_TOKEN:
      runtimeConfig.ACCESS_TOKEN ||
      technicalConfig.ACCESS_TOKEN ||
      env?.CIELO?.ACCESS_TOKEN ||
      '',
    CLIENT_ID:
      runtimeConfig.CLIENT_ID ||
      technicalConfig.CLIENT_ID ||
      env?.CIELO?.CLIENT_ID ||
      '',
    EMAIL: runtimeConfig.EMAIL || technicalConfig.EMAIL || env?.CIELO?.EMAIL || '',
  };
};

class CieloService {
  async payment(paymentCode, items, orderPrice) {
    const cieloConfig = await resolveRuntimeCieloConfig();

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
