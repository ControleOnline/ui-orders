const normalizeText = value => String(value || '').trim();

export const isOrderChannelContext = context =>
  /ifood|food99|99|instagram|insta|keeta|whats|messenger|facebook/i.test(
    String(context || ''),
  );

export const extractOrderExtraEntries = extraData => {
  if (!Array.isArray(extraData)) {
    return [];
  }

  return extraData
    .filter(item => normalizeText(item?.value))
    .map(item => ({
      id: item?.id || `${item?.extra_fields?.context || 'extra'}-${item?.extra_fields?.name || 'field'}-${item?.value}`,
      context: normalizeText(
        item?.extra_fields?.context ||
          item?.extraFields?.context,
      ),
      name: normalizeText(
        item?.extra_fields?.name ||
          item?.extraFields?.name,
      ),
      label: normalizeText(
        item?.extra_fields?.label ||
          item?.extraFields?.label ||
          item?.extra_fields?.context ||
          item?.extraFields?.context ||
          item?.extra_fields?.name ||
          item?.extraFields?.name,
      ),
      value: normalizeText(item?.value),
    }));
};

export const extractVisibleOrderExtraEntries = order =>
  extractOrderExtraEntries(order?.extraData);
