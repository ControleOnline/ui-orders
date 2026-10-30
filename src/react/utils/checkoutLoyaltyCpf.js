import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {
  normalizeBooleanConfig,
  SHOP_LOYALTY_GIFT_PRODUCT_ID_CONFIG_KEY,
  SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY,
  SHOP_LOYALTY_PRODUCT_IDS_CONFIG_KEY,
  SHOP_LOYALTY_REQUIRED_SALES_CONFIG_KEY,
} from '@controleonline/ui-common/src/react/utils/shopConfig';

export const LOYALTY_CPF_MIN_SEARCH_LENGTH = 11;
export const LOYALTY_CPF_SEARCH_CONTEXT = 'checkout-cpf-lookup';
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

export const isValidCpf = value => {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const checkDigit = length => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return checkDigit(9) === Number(cpf[9]) && checkDigit(10) === Number(cpf[10]);
};

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

  const digits = digitsOnly(cpfDocument?.document || '');
  // Documents are stored as integers, so CPFs starting with 0 lose it.
  return digits && digits.length < 11 ? digits.padStart(11, '0') : digits;
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
      const hasDocumentPayload =
        people && Object.prototype.hasOwnProperty.call(people, 'document');

      return {
        cpf,
        cpfDisplay: formatCpfDisplay(cpf),
        hasDocumentPayload,
        id: peopleId,
        label: name || `Pessoa ${peopleId || ''}`.trim(),
        raw: people,
      };
    })
    .filter(item => {
      if (!item.id) {
        return false;
      }

      // The API already matched the CPF exactly; only trust payload documents
      // when they are present.
      return item.cpf ? item.cpf === normalizedQuery : !item.hasDocumentPayload;
    })
    .map(item =>
      item.cpf
        ? item
        : {...item, cpf: normalizedQuery, cpfDisplay: formatCpfDisplay(normalizedQuery)},
    )
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

// Exact CPF lookup across the base (not restricted to people already linked to
// the company). The API only allows it for companies the user belongs to.
export const buildLoyaltyCpfSearchParams = ({
  companyId,
  itemsPerPage = 2,
  query,
}) => {
  const params = {
    itemsPerPage,
    peopleType: 'F',
    // Not `search`: the generic search filter does LIKE on the bigint document column and
    // never matches a CPF with leading zero.
    cpf: digitsOnly(query).slice(0, 11),
    context: LOYALTY_CPF_SEARCH_CONTEXT,
  };
  const normalizedCompanyId = resolvePeopleId(companyId);

  if (normalizedCompanyId) {
    params.company = `/people/${normalizedCompanyId}`;
  }

  return params;
};

export const resolveCheckoutCompanyConfigs = ({
  companyConfigs,
  currentCompanyConfigs,
  mainCompanyConfigs,
}) => {
  const runtimeConfigs = isConfigMap(companyConfigs) ? companyConfigs : null;
  const currentConfigs = isConfigMap(currentCompanyConfigs)
    ? currentCompanyConfigs
    : null;
  const defaultConfigs = isConfigMap(mainCompanyConfigs)
    ? mainCompanyConfigs
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
      String(selectedPeople?.name || '').trim() || `Pessoa ${peopleId}`,
    raw: selectedPeople,
  };
};

export const extractLoyaltySnapshotCards = response => {
  if (Array.isArray(response?.member)) {
    return response.member.filter(Boolean);
  }

  if (Array.isArray(response?.['hydra:member'])) {
    return response['hydra:member'].filter(Boolean);
  }

  if (Array.isArray(response)) {
    return response.filter(Boolean);
  }

  return [];
};

export const filterLoyaltySnapshotCardsByProvider = (response, providerId = null) => {
  const cards = extractLoyaltySnapshotCards(response);
  const normalizedProviderId = resolvePeopleId(providerId);

  if (!normalizedProviderId) {
    return cards;
  }

  return cards.filter(
    card =>
      resolvePeopleId(card?.provider?.id || card?.provider?.['@id']) ===
      normalizedProviderId,
  );
};

export const resolveLoyaltyCardProgress = card => {
  const requiredSales = Math.max(Number(card?.requiredSales || 0), 0);
  const stamps = Array.isArray(card?.stamps) ? card.stamps : [];
  const completedStampCount = Math.min(stamps.length, requiredSales);

  return {
    completedStampCount,
    requiredSales,
    stamps,
  };
};

export const resolveLoyaltyStampCount = (response, providerId = null) =>
  filterLoyaltySnapshotCardsByProvider(response, providerId).reduce(
    (total, card) => total + resolveLoyaltyCardProgress(card).completedStampCount,
    0,
  );

export const resolveRewardableLoyaltyCard = (response, providerId = null) => {
  const cards = filterLoyaltySnapshotCardsByProvider(response, providerId);

  return (
    cards.find(card => {
      const {completedStampCount, requiredSales} =
        resolveLoyaltyCardProgress(card);

      return requiredSales > 0 && completedStampCount >= requiredSales;
    }) || null
  );
};
