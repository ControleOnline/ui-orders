const normalizeText = value => String(value || '').trim();

export const POS_SALE_ORDER_TYPES = Object.freeze([
  'sale',
  'cart',
  'online',
  'manual',
]);

export const resolveHistoryOrderTypeQuery = ({orderTypeFilter} = {}) => {
  const normalizedOrderType = normalizeText(orderTypeFilter).toLowerCase();

  if (normalizedOrderType === 'sale') {
    return POS_SALE_ORDER_TYPES;
  }

  return normalizedOrderType || 'sale';
};
