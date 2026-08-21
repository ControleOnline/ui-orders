/**
 * Order product post-confirmation adjustment API client.
 * Backend: POST /order_product_adjustments/preview|commit
 * Collection GET /order_product_adjustments for audit trail.
 *
 * Body: { orderProductId, quantityAfter, reason, idempotencyKey, deviceId? }
 * Client / Shop / Totem must not call commit (backend denies).
 */
import {api} from '@controleonline/ui-common/src/api';

const PREVIEW_PATH = 'order_product_adjustments/preview';
const COMMIT_PATH = 'order_product_adjustments/commit';
const COLLECTION_PATH = 'order_product_adjustments';

const normalizeId = value => {
  if (value == null || value === '') return null;
  if (typeof value === 'object') {
    const nested = value.id ?? value['@id'] ?? value.value;
    return normalizeId(nested);
  }
  const asString = String(value).trim();
  if (!asString) return null;
  const digits = asString.replace(/\D+/g, '');
  if (digits && /^\d+$/.test(digits)) return Number(digits);
  return asString;
};

const extractErrorMessage = error => {
  const data = error?.response?.data || error?.data || error;
  if (typeof data?.errmsg === 'string' && data.errmsg) return data.errmsg;
  if (typeof data?.['hydra:description'] === 'string') return data['hydra:description'];
  if (typeof data?.message === 'string') return data.message;
  if (typeof error?.message === 'string') return error.message;
  return 'Adjustment request failed.';
};

const ensurePayload = ({orderProductId, quantityAfter, reason, idempotencyKey, deviceId} = {}) => {
  const opId = normalizeId(orderProductId);
  const qty = Number(quantityAfter);
  const reasonText = String(reason || '').trim();
  const key = String(idempotencyKey || '').trim();

  if (!opId) {
    return {ok: false, errmsg: 'orderProductId is required.'};
  }
  if (!Number.isFinite(qty) || qty < 0) {
    return {ok: false, errmsg: 'quantityAfter must be a non-negative number.'};
  }
  if (!reasonText) {
    return {ok: false, errmsg: 'reason is required for audited adjustments.'};
  }
  if (!key) {
    return {ok: false, errmsg: 'idempotencyKey is required.'};
  }

  const body = {
    orderProductId: opId,
    quantityAfter: qty,
    reason: reasonText,
    idempotencyKey: key,
  };
  const device = normalizeId(deviceId);
  if (device) {
    body.deviceId = device;
  }
  return {ok: true, body};
};

/**
 * Server-side preview (no mutation).
 * @returns {Promise<{ok: boolean, mode?: string, preview?: object, errmsg?: string, errno?: number}>}
 */
export async function previewOrderProductAdjustment(params) {
  const checked = ensurePayload(params);
  if (!checked.ok) {
    return {ok: false, errmsg: checked.errmsg};
  }
  try {
    const response = await api.fetch(PREVIEW_PATH, {
      method: 'POST',
      body: JSON.stringify(checked.body),
      headers: {'Content-Type': 'application/json'},
    });
    if (response?.ok === false) {
      return {
        ok: false,
        errno: response.errno,
        errmsg: response.errmsg || extractErrorMessage(response),
      };
    }
    return {
      ok: true,
      mode: 'preview',
      replayed: Boolean(response?.replayed),
      preview: response?.preview ?? response,
    };
  } catch (error) {
    return {ok: false, errmsg: extractErrorMessage(error)};
  }
}

/**
 * Commit after preview. Backend revalidates; partial failures are not success.
 * @returns {Promise<{ok: boolean, mode?: string, preview?: object, entry?: object, replayed?: boolean, errmsg?: string}>}
 */
export async function commitOrderProductAdjustment(params) {
  const checked = ensurePayload(params);
  if (!checked.ok) {
    return {ok: false, errmsg: checked.errmsg};
  }
  try {
    const response = await api.fetch(COMMIT_PATH, {
      method: 'POST',
      body: JSON.stringify(checked.body),
      headers: {'Content-Type': 'application/json'},
    });
    if (response?.ok === false) {
      return {
        ok: false,
        errno: response.errno,
        errmsg: response.errmsg || extractErrorMessage(response),
      };
    }
    return {
      ok: true,
      mode: 'commit',
      replayed: Boolean(response?.replayed),
      preview: response?.preview ?? null,
      entry: response?.entry ?? null,
    };
  } catch (error) {
    return {ok: false, errmsg: extractErrorMessage(error)};
  }
}

/**
 * List adjustment audit entries (optional filters).
 */
export async function listOrderProductAdjustments({orderId, orderProductId, page = 1, itemsPerPage = 20} = {}) {
  const params = {page, itemsPerPage};
  const oid = normalizeId(orderId);
  const opid = normalizeId(orderProductId);
  if (oid) params.order = oid;
  if (opid) params.orderProduct = opid;
  try {
    const response = await api.fetch(COLLECTION_PATH, {params});
    const items =
      (Array.isArray(response) && response) ||
      response?.member ||
      response?.['hydra:member'] ||
      [];
    return {ok: true, items: Array.isArray(items) ? items : []};
  } catch (error) {
    return {ok: false, items: [], errmsg: extractErrorMessage(error)};
  }
}

export function createIdempotencyKey(prefix = 'opa') {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${rand}`;
}

/**
 * UI gate: only human employee flows on confirmed sale should show the action.
 * Backend still enforces authZ; this is defense-in-depth only.
 */
export function canShowOrderProductAdjustment({order, appType, isClientContext} = {}) {
  if (isClientContext === true) return false;
  const type = String(appType || global?.APP_TYPE || '').toUpperCase();
  if (['SHOP', 'TOTEM', 'CLIENT'].includes(type)) return false;
  const orderType = String(order?.orderType || order?.order_type || '').toLowerCase();
  if (orderType && orderType !== 'sale') return false;
  // Prefer explicit capability when API sends it
  if (order?.capabilities?.adjustOrderProduct === false) return false;
  if (order?.canAdjustOrderProduct === false) return false;
  return true;
}

export default {
  previewOrderProductAdjustment,
  commitOrderProductAdjustment,
  listOrderProductAdjustments,
  createIdempotencyKey,
  canShowOrderProductAdjustment,
};
