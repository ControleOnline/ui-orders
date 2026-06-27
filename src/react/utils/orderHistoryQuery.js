const normalizeText = value => String(value || '').trim();

export const POS_SALE_ORDER_TYPES = Object.freeze([
  'sale',
  'cart',
  'online',
  'manual',
]);

export const ACTIVE_HISTORY_REAL_STATUSES = Object.freeze([
  'open',
  'pending',
]);

export const resolveHistoryOrderTypeQuery = ({orderTypeFilter} = {}) => {
  const normalizedOrderType = normalizeText(orderTypeFilter).toLowerCase();

  if (normalizedOrderType === 'sale') {
    return POS_SALE_ORDER_TYPES;
  }

  return normalizedOrderType || 'sale';
};

export const resolveHistoryStatusQuery = ({appType, orderTypeFilter} = {}) => {
  const normalizedAppType = normalizeText(appType).toUpperCase();
  const normalizedOrderType = normalizeText(orderTypeFilter).toLowerCase();

  if (normalizedAppType === 'POS' && normalizedOrderType === 'sale') {
    return ACTIVE_HISTORY_REAL_STATUSES;
  }

  return null;
};

export const resolveHistoryStatusQueryKey = ({
  showAdvancedFilters = false,
} = {}) =>
  showAdvancedFilters ? 'status.status' : 'status.realStatus';
