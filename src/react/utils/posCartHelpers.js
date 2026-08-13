/**
 * Shared pure helpers for POS cart session and checkout.
 * Extracted to keep hooks and pages under the 500-line absolute limit.
 */

export const normalizeStatusKey = value => String(value || '').trim().toLowerCase();

export const buildStatusIriFromId = value => {
  const normalizedId = String(value || '').replace(/\D/g, '');
  return normalizedId ? `/statuses/${normalizedId}` : null;
};

export const normalizeId = value => {
  const normalizedId = String(value || '').replace(/\D/g, '');
  return normalizedId || null;
};

export const extractCollectionItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

export const DRAFT_SALE_ORDER_TYPE = 'cart';
export const LINKED_SALE_ORDER_TYPE = 'sale';
export const LINKED_ORDER_CODE_REQUIRED_ERROR = 'LINKED_ORDER_CODE_REQUIRED';
export const POS_ORDER_CREATION_CANCELLED_ERROR = 'POS_ORDER_CREATION_CANCELLED';
export const RECENT_LINKED_ORDER_INPUT_TTL_MS = 20 * 1000;

export const buildCancelledOrderCreationError = () => {
  const error = new Error('A preparacao do pedido foi cancelada.');
  error.code = POS_ORDER_CREATION_CANCELLED_ERROR;
  return error;
};

export const isOpenPosCartOrder = (order, openStatusIri) => {
  if (!order) return false;
  const statusIri = typeof order.status === 'string' ? order.status : order.status?.['@id'] || order.status?.id;
  const statusKey = normalizeStatusKey(statusIri || order.status);
  const openKey = normalizeStatusKey(openStatusIri);
  if (openKey && statusKey === openKey) return true;
  // fallback common open statuses
  return ['open', 'cart', 'draft', 'pending'].some(k => statusKey.includes(k));
};

export const getOrderPeopleValue = order => {
  if (!order) return null;
  const people = order.people || order.client || order.customer;
  if (!people) return null;
  if (typeof people === 'string') return people;
  return people['@id'] || people.id || null;
};

export const isLinkedOrderCodeRequiredError = error =>
  error?.code === LINKED_ORDER_CODE_REQUIRED_ERROR ||
  String(error?.message || '').includes('LINKED_ORDER_CODE_REQUIRED');

export const isPosOrderCreationCancelledError = error =>
  error?.code === POS_ORDER_CREATION_CANCELLED_ERROR ||
  String(error?.message || '').toLowerCase().includes('preparacao do pedido foi cancelada');
