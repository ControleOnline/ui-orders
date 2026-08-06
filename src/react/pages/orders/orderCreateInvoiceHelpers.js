export const normalizeText = value => String(value || '').trim();

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

export const normalizeStatusKey = value => String(value || '').trim().toLowerCase();

export const getEntityId = entity => {
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

export const resolveOrderIri = order => {
  if (!order) return null;
  if (order['@id']) return order['@id'];
  const id = getEntityId(order);
  return id ? `/orders/${id}` : null;
};

export const resolveOrderPrice = order => {
  const raw = Number(order?.price ?? order?.total ?? 0);
  return Number.isFinite(raw) ? Math.round(raw * 100) / 100 : 0;
};

let paidStatusIriCache = null;

export const resolvePaidInvoiceStatusIri = async (api, fallbackStatusId) => {
  if (paidStatusIriCache) return paidStatusIriCache;
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
    const matched =
      items.find(
        item =>
          normalizeStatusKey(item?.realStatus) === 'closed' &&
          normalizeStatusKey(item?.status) === 'paid',
      ) || items[0];
    const resolvedIri =
      matched?.['@id'] || buildStatusIriFromId(matched?.id) || fallbackIri;
    if (resolvedIri) paidStatusIriCache = resolvedIri;
    return resolvedIri;
  } catch {
    return fallbackIri;
  }
};
