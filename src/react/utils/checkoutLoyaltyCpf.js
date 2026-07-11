import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {
  normalizeBooleanConfig,
  SHOP_LOYALTY_GIFT_PRODUCT_ID_CONFIG_KEY,
  SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY,
  SHOP_LOYALTY_PRODUCT_IDS_CONFIG_KEY,
  SHOP_LOYALTY_REQUIRED_SALES_CONFIG_KEY,
} from '@controleonline/ui-common/src/react/utils/shopConfig';

export const LOYALTY_CPF_MIN_SEARCH_LENGTH = 5;
export const LOYALTY_CPF_SEARCH_CONTEXT = 'loyalty-cpf';
export const LOYALTY_PARENT_CONFIG_KEYS = [
  SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY,
  SHOP_LOYALTY_PRODUCT_IDS_CONFIG_KEY,
  SHOP_LOYALTY_REQUIRED_SALES_CONFIG_KEY,
  SHOP_LOYALTY_GIFT_PRODUCT_ID_CONFIG_KEY,
];

const isConfigMap = value =>
  value && typeof value === 'object' && !Array.isArray(value);

const hasConfigValue = value => value !== null && value !== undefined && value !== '';

export const digitsOnly = value => String(value || '').replace(/\D+/g, '');

export const resolvePeopleId = value => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return resolvePeopleId(value?.['@id'] || value?.id);
  }

  const normalized = digitsOnly(value);
  return normalized ? Number(normalized) : null;
};

export const extractPeopleCpfDigits = people => {
  const documents = Array.isArray(people?.document)
    ? people.document
    : people?.document
      ? [people.document]
      : [];

  const cpfDocument = documents.find(item => {
    const documentType = String(
      item?.documentType?.documentType || item?.documentType || '',
    )
      .trim()
      .toUpperCase();

    if (documentType === 'CPF') {
      return true;
    }

    return digitsOnly(item?.document).length === 11;
  });

  return digitsOnly(cpfDocument?.document || '');
};

export const formatCpfDisplay = value => {
  const digits = digitsOnly(value).slice(0, 11);
  return digits ? Formatter.maskCPF(digits) : '';
};

export const buildLoyaltyCpfSearchResults = (items, query) => {
  const normalizedQuery = digitsOnly(query);
  if (normalizedQuery.length < LOYALTY_CPF_MIN_SEARCH_LENGTH) {
    return [];
  }

  return (Array.isArray(items) ? items : [])
    .map(people => {
      const cpf = extractPeopleCpfDigits(people);
      const peopleId = resolvePeopleId(people);
      const name = String(people?.name || '').trim();
      const alias = String(people?.alias || '').trim();
      const hasDocumentPayload =
        people && Object.prototype.hasOwnProperty.call(people, 'document');

      return {
        cpf,
        cpfDisplay: formatCpfDisplay(cpf),
        hasDocumentPayload,
        id: peopleId,
        label: [name, alias].filter(Boolean).join(' ').trim() || `Pessoa ${peopleId || ''}`.trim(),
        raw: people,
      };
    })
    .filter(item => {
      if (!item.id) {
        return false;
      }

      if (item.cpf) {
        return item.cpf.includes(normalizedQuery);
      }

      return !item.hasDocumentPayload;
    })
    .sort((left, right) => {
      const leftStarts = left.cpf
        ? left.cpf.startsWith(normalizedQuery)
          ? 0
          : 1
        : 2;
      const rightStarts = right.cpf
        ? right.cpf.startsWith(normalizedQuery)
          ? 0
          : 1
        : 2;
      if (leftStarts !== rightStarts) {
        return leftStarts - rightStarts;
      }

      if (left.cpf !== right.cpf) {
        return left.cpf.localeCompare(right.cpf);
      }

      return left.label.localeCompare(right.label, 'pt-BR', {
        sensitivity: 'base',
      });
    });
};

export const isLoyaltyCouponsEnabledForCheckout = companyConfigs =>
  normalizeBooleanConfig(
    companyConfigs?.[SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY],
    false,
  );

export const buildLoyaltyCpfSearchParams = ({
  companyId,
  itemsPerPage = 8,
  query,
}) => {
  const search = digitsOnly(query).slice(0, 11);
  const normalizedCompanyId = resolvePeopleId(companyId);
  const params = {
    itemsPerPage,
    peopleType: 'F',
    search,
  };

  if (normalizedCompanyId) {
    params.company = `/people/${normalizedCompanyId}`;
    params.linkType = 'client';
    params['link.company'] = `/people/${normalizedCompanyId}`;
    params['link.linkType'] = 'client';
    params.context = LOYALTY_CPF_SEARCH_CONTEXT;
  }

  return params;
};

export const resolveCheckoutCompanyConfigs = ({
  companyConfigs,
  currentCompanyConfigs,
  defaultCompanyConfigs,
}) => {
  const runtimeConfigs = isConfigMap(companyConfigs) ? companyConfigs : null;
  const currentConfigs = isConfigMap(currentCompanyConfigs)
    ? currentCompanyConfigs
    : null;
  const defaultConfigs = isConfigMap(defaultCompanyConfigs)
    ? defaultCompanyConfigs
    : null;

  const baseConfigs =
    runtimeConfigs && Object.keys(runtimeConfigs).length > 0
      ? runtimeConfigs
      : currentConfigs && Object.keys(currentConfigs).length > 0
        ? currentConfigs
        : runtimeConfigs || {};

  if (!defaultConfigs || Object.keys(defaultConfigs).length === 0) {
    return baseConfigs;
  }

  const inheritedLoyaltyConfigs = LOYALTY_PARENT_CONFIG_KEYS.reduce(
    (accumulator, key) => {
      if (hasConfigValue(defaultConfigs[key])) {
        accumulator[key] = defaultConfigs[key];
      }

      return accumulator;
    },
    {},
  );

  if (Object.keys(inheritedLoyaltyConfigs).length === 0) {
    return baseConfigs;
  }

  return {
    ...baseConfigs,
    ...inheritedLoyaltyConfigs,
  };
};

export const resolveCheckoutLoyaltySelection = order => {
  const selectedPeople = order?.payer || order?.client || null;
  const peopleId = resolvePeopleId(selectedPeople);

  if (!peopleId) {
    return null;
  }

  const cpf = extractPeopleCpfDigits(selectedPeople);

  return {
    id: peopleId,
    cpf,
    cpfDisplay: formatCpfDisplay(cpf),
    label:
      [selectedPeople?.name, selectedPeople?.alias]
        .map(value => String(value || '').trim())
        .filter(Boolean)
        .join(' ')
        .trim() || `Pessoa ${peopleId}`,
    raw: selectedPeople,
  };
};
