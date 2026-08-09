/**
 * Pure helpers for OrderHistoryPage (app-community#329 modularization).
 */
const ORDER_TYPE_FILTER_KEYS = new Set(['sale', 'purchase', 'transfer', 'loss']);
const SIMPLE_TAB_KEYS = new Set(['transfer', 'loss']);
const TERMINAL_ORDER_STATUSES = new Set(['closed', 'canceled', 'cancelled']);
const ORDER_HISTORY_TABLE_PREFERENCE_KEY = 'order-history-page';

const normalizeText = value => String(value || '').trim();

const buildDefaultHistoryFilters = () => ({
  alterDate: {
    shortcut: 'today',
    customRange: { from: '', to: '' },
  },
});

const buildExternalColumnsSignature = columns =>
  (Array.isArray(columns) ? columns : [])
    .map(column => [
      column?.key || column?.name || '',
      column?.externalFilter === true ? '1' : '0',
      column?.inputType || column?.type || '',
      column?.label || '',
      column?.list ? '1' : '0',
      column?.emptyOptionLabel || '',
    ].join(':'))
    .join('|');

const resolveOrderTypeFilter = value => {
  const normalizedValue = normalizeText(value).toLowerCase();
  return ORDER_TYPE_FILTER_KEYS.has(normalizedValue) ? normalizedValue : 'sale';
};

const resolveDateRangeFilter = value => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const shortcut = value.shortcut || value.value || 'all';
  const customRange = value.customRange || { from: '', to: '' };
  const dateRange = getDateRange(shortcut, customRange, {
    relativeMode: 'rolling',
    useCurrentMoment: true,
  });

  return {
    after: dateRange?.after || '',
    before: dateRange?.before || '',
  };
};

const getEntityId = entity => {
  if (!entity) return null;

  if (typeof entity === 'number' || typeof entity === 'string') {
    const matches = String(entity).match(/\d+/g);
    return matches ? Number(matches[matches.length - 1]) : null;
  }

  if (typeof entity === 'object') {
    if (entity.id) return Number(entity.id);
    if (entity['@id']) {
      const matches = String(entity['@id']).match(/\d+/g);
      return matches ? Number(matches[matches.length - 1]) : null;
    }
  }

  return null;
};

const getPeopleLabel = entity =>
  normalizeText(
    entity?.alias ||
    entity?.name ||
    entity?.fantasy_name ||
    entity?.company ||
    entity?.document
  );

const formatApiError = error =>
  normalizeText(
    error?.errmsg ||
    error?.message ||
    error?.error ||
    error?.description ||
    error?.['hydra:description'],
  ) || 'Nao foi possivel concluir a operacao.';

const isCancelableOrder = order => {
  const realStatus = normalizeText(order?.status?.realStatus || order?.realStatus).toLowerCase();
  const status = normalizeText(order?.status?.status || order?.status).toLowerCase();

  return !TERMINAL_ORDER_STATUSES.has(realStatus) && !TERMINAL_ORDER_STATUSES.has(status);
};

const isCanceledOrder = order => {
  const realStatus = normalizeText(order?.status?.realStatus || order?.realStatus).toLowerCase();
  const status = normalizeText(order?.status?.status || order?.status).toLowerCase();

  return ['canceled', 'cancelled'].includes(realStatus) ||
    ['canceled', 'cancelled', 'cancelado'].includes(status);
};

const getCurrentUserLabel = user =>
  normalizeText(
    user?.people?.alias ||
    user?.people?.name ||
    user?.name ||
    user?.email ||
    user?.username,
  );

const buildOrderHistoryPalette = themeColors => ({
  cardBackground: themeColors.cardBackground,
  cardBorder: themeColors.cardBorder,
  cardShadow: themeColors.cardShadow,
  dividerBorder: themeColors.dividerBorder,
  pageBackground: themeColors.pageBackground,
  textPrimary: themeColors.textPrimary,
  textSecondary: themeColors.textSecondary,
});

const buildHistoryRequestParams = ({
  appType = app_type,
  canViewCompanyOrders,
  currentCompanyId,
  currentDeviceId,
  filters,
  orderTypeFilter,
  showAdvancedFilters,
}) => {
  if (!currentCompanyId) {
    return null;
  }

  const query = {
    provider: `/people/${currentCompanyId}`,
    orderType: resolveHistoryOrderTypeQuery({
      orderTypeFilter,
    }),
  };

  if (showAdvancedFilters && orderTypeFilter === 'sale') {
    query.report = 1;
  }

  if (!showAdvancedFilters && orderTypeFilter === 'sale') {
    query['status.realStatus'] = 'open';
  }

  if (showAdvancedFilters && filters?.app) {
    query.app = filters.app;
  }

  if (showAdvancedFilters && filters?.status) {
    query.status = filters.status;
  }

  if (appType === 'POS' && !canViewCompanyOrders && currentDeviceId) {
    query['device.device'] = currentDeviceId;
  }

  if (showAdvancedFilters) {
    const orderDateRange = resolveDateRangeFilter(filters?.orderDate);
    const dateRange = resolveDateRangeFilter(filters?.alterDate);

    if (orderDateRange?.after) {
      query['orderDate[after]'] = orderDateRange.after;
    }

    if (orderDateRange?.before) {
      query['orderDate[before]'] = orderDateRange.before;
    }

    if (dateRange?.after) {
      query['alterDate[after]'] = dateRange.after;
    }

    if (dateRange?.before) {
      query['alterDate[before]'] = dateRange.before;
    }
  }

  return query;
};


module.exports = {
  ORDER_TYPE_FILTER_KEYS,
  SIMPLE_TAB_KEYS,
  TERMINAL_ORDER_STATUSES,
  ORDER_HISTORY_TABLE_PREFERENCE_KEY,
  normalizeText,
  buildDefaultHistoryFilters,
  buildExternalColumnsSignature,
  resolveOrderTypeFilter,
  resolveDateRangeFilter,
  getEntityId,
  getPeopleLabel,
  formatApiError,
  isCancelableOrder,
  isCanceledOrder,
  getCurrentUserLabel,
  buildOrderHistoryPalette,
  buildHistoryRequestParams,
};
