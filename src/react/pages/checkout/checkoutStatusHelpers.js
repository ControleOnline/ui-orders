/**
 * Status/IRI helpers for Checkout (modularization app-community#329).
 */
import {Platform} from 'react-native';
import {api} from '@controleonline/ui-common/src/api';

export const PAYMENT_CHANNEL_LOCAL = 'local';
export const PAYMENT_CHANNEL_REMOTE = 'remote';
export const IS_WEB_PLATFORM = Platform.OS === 'web';
export const LOYALTY_REWARD_PAYMENT_CODE = 'VOUCHER_CORTESIA';
export const LOYALTY_REWARD_PAYMENT_LABEL = 'Cartao Fidelidade';
export const LOYALTY_GIFT_ORDER_PRODUCT_COMMENT = 'Brinde fidelidade';

export const normalizeStatusKey = value => String(value || '').trim().toLowerCase();

export const extractCollectionItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

export const buildStatusIriFromId = value => {
  const normalizedId = String(value || '').replace(/\D/g, '');
  return normalizedId ? `/statuses/${normalizedId}` : null;
};

export const buildLoyaltyRewardPayment = payment => {
  if (!payment) {
    return null;
  }

  return {
    ...payment,
    __loyaltyReward: true,
    paymentCode: LOYALTY_REWARD_PAYMENT_CODE,
    paymentType: {
      ...(payment?.paymentType || {}),
      name: LOYALTY_REWARD_PAYMENT_LABEL,
      paymentType: LOYALTY_REWARD_PAYMENT_LABEL,
    },
  };
};

let posPaidInvoiceStatusIriCache = null;
let posClosedOrderStatusIriCache = null;

export const resolvePosPaidInvoiceStatusIri = async fallbackStatusId => {
  if (posPaidInvoiceStatusIriCache) return posPaidInvoiceStatusIriCache;

  const fallbackIri = buildStatusIriFromId(fallbackStatusId);

  try {
    const response = await api.fetch('statuses', {
      params: {
        context: 'invoice',
        realStatus: 'closed',
        status: 'paid',
      },
    });
    const items = extractCollectionItems(response);
    const matchedStatus =
      items.find(
        item =>
          normalizeStatusKey(item?.realStatus) === 'closed' &&
          normalizeStatusKey(item?.status) === 'paid',
      ) || items[0];
    const resolvedIri =
      matchedStatus?.['@id'] ||
      buildStatusIriFromId(matchedStatus?.id) ||
      fallbackIri;

    if (resolvedIri) {
      posPaidInvoiceStatusIriCache = resolvedIri;
    }

    return resolvedIri;
  } catch {
    return fallbackIri;
  }
};

export const resolvePosClosedOrderStatusIri = async fallbackStatusId => {
  if (posClosedOrderStatusIriCache) return posClosedOrderStatusIriCache;

  const fallbackIri = buildStatusIriFromId(fallbackStatusId);

  try {
    const response = await api.fetch('statuses', {
      params: {
        context: 'order',
        realStatus: 'closed',
        status: 'closed',
      },
    });
    const items = extractCollectionItems(response);
    const matchedStatus =
      items.find(
        item =>
          normalizeStatusKey(item?.realStatus) === 'closed' &&
          normalizeStatusKey(item?.status) === 'closed',
      ) || items[0];
    const resolvedIri =
      matchedStatus?.['@id'] ||
      buildStatusIriFromId(matchedStatus?.id) ||
      fallbackIri;

    if (resolvedIri) {
      posClosedOrderStatusIriCache = resolvedIri;
    }

    return resolvedIri;
  } catch {
    return fallbackIri;
  }
};
