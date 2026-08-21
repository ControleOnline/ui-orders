/**
 * Unitary fulfillment client for POS/Totem (api-platform-orders T2).
 * POST /order_product_fulfillments/execute
 *
 * Allowed actions (OrderProductFulfillment::ALLOWED_ACTIONS):
 * - served
 * - counter_delivered
 * - picked_up
 * - delivered
 * - dispatched
 *
 * Only root OrderProduct rows are fulfillable; customizations follow the parent.
 * Idempotent on idempotencyKey.
 */

export const FULFILLMENT_ACTION_SERVED = 'served'
export const FULFILLMENT_ACTION_COUNTER_DELIVERED = 'counter_delivered'
export const FULFILLMENT_ACTION_PICKED_UP = 'picked_up'
export const FULFILLMENT_ACTION_DELIVERED = 'delivered'
export const FULFILLMENT_ACTION_DISPATCHED = 'dispatched'

export const FULFILLMENT_ACTIONS = [
  FULFILLMENT_ACTION_SERVED,
  FULFILLMENT_ACTION_COUNTER_DELIVERED,
  FULFILLMENT_ACTION_PICKED_UP,
  FULFILLMENT_ACTION_DELIVERED,
  FULFILLMENT_ACTION_DISPATCHED,
]

/**
 * Default action for POS floor service when device is not totem/self-service.
 * Totem / customer pickup defaults to picked_up; counter to counter_delivered.
 */
export const resolveDefaultPosFulfillmentAction = ({
  isSelfServiceMode = false,
  isCounterMode = false,
  channel = null,
} = {}) => {
  const normalizedChannel = String(channel || '').trim().toLowerCase()
  if (
    isSelfServiceMode ||
    normalizedChannel === 'totem'
  ) {
    return FULFILLMENT_ACTION_PICKED_UP
  }
  if (isCounterMode) {
    return FULFILLMENT_ACTION_COUNTER_DELIVERED
  }
  return FULFILLMENT_ACTION_SERVED
}

/**
 * Build a stable idempotency key for a fulfillment attempt.
 * Prefer caller-supplied key when retrying the same logical action.
 */
export const buildFulfillmentIdempotencyKey = ({
  orderProductId,
  action,
  quantity = 1,
  attemptId = null,
} = {}) => {
  const base = [
    'opf',
    String(orderProductId || '').trim(),
    String(action || '').trim(),
    String(quantity),
    String(attemptId || Date.now()),
  ].join(':')
  return base.slice(0, 128)
}

/**
 * Execute unitary fulfillment against the ledger endpoint.
 *
 * @param {object} api - HTTP client with .post(path, body)
 * @param {object} params
 * @param {number|string} params.orderProductId
 * @param {string} params.action
 * @param {number} [params.quantity=1]
 * @param {string} [params.idempotencyKey]
 * @param {string} [params.deviceOrigin]
 * @param {string} [params.reason]
 * @returns {Promise<object>} ledger entry from API
 */
export async function executeOrderProductFulfillment(api, params = {}) {
  const orderProductId = Number(params.orderProductId)
  const action = String(params.action || '').trim()
  const quantity = Number(params.quantity ?? 1)
  const idempotencyKey =
    String(params.idempotencyKey || '').trim() ||
    buildFulfillmentIdempotencyKey({
      orderProductId,
      action,
      quantity,
      attemptId: params.attemptId,
    })
  const deviceOrigin =
    params.deviceOrigin != null ? String(params.deviceOrigin) : undefined
  const reason = params.reason != null ? String(params.reason) : undefined

  if (!api || typeof api.post !== 'function') {
    throw new Error('executeOrderProductFulfillment requires an api client with post()')
  }
  if (!(orderProductId > 0)) {
    throw new Error('orderProductId is required')
  }
  if (!FULFILLMENT_ACTIONS.includes(action)) {
    throw new Error(
      `Invalid fulfillment action "${action}". Allowed: ${FULFILLMENT_ACTIONS.join(', ')}`,
    )
  }
  if (!(quantity > 0)) {
    throw new Error('quantity must be greater than zero')
  }

  const body = {
    orderProductId,
    action,
    quantity,
    idempotencyKey,
  }
  if (deviceOrigin) {
    body.deviceOrigin = deviceOrigin
  }
  if (reason) {
    body.reason = reason
  }

  return api.post('/order_product_fulfillments/execute', body)
}

/**
 * Whether an order product looks like a root (fulfillable) line.
 * Customizations typically have orderProduct / parent reference.
 */
export function isRootOrderProduct(orderProduct) {
  if (!orderProduct || typeof orderProduct !== 'object') {
    return false
  }
  const parent =
    orderProduct.orderProduct ||
    orderProduct.parent ||
    orderProduct.parentOrderProduct ||
    null
  if (parent == null || parent === false) {
    return true
  }
  if (typeof parent === 'string' && parent.trim() === '') {
    return true
  }
  return false
}
