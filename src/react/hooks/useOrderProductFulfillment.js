import {useCallback, useState} from 'react'
import {api} from '@controleonline/ui-common/src/api'
import {
  executeOrderProductFulfillment,
  resolveDefaultPosFulfillmentAction,
  isRootOrderProduct,
  buildFulfillmentIdempotencyKey,
} from '@controleonline/ui-orders/src/react/services/orderProductFulfillment'

/**
 * POS/Totem unitary fulfillment against the ledger endpoint.
 * Does not open a second checkout; only registers quantity per root OrderProduct.
 */
export default function useOrderProductFulfillment({
  deviceId = null,
  isSelfServiceMode = false,
  isCounterMode = false,
  channel = null,
} = {}) {
  const [loadingKey, setLoadingKey] = useState('')
  const [lastError, setLastError] = useState('')

  const defaultAction = resolveDefaultPosFulfillmentAction({
    isSelfServiceMode,
    isCounterMode,
    channel,
  })

  const fulfill = useCallback(
    async ({
      orderProductId,
      action = defaultAction,
      quantity = 1,
      idempotencyKey = null,
      reason = null,
    } = {}) => {
      const key = buildFulfillmentIdempotencyKey({
        orderProductId,
        action,
        quantity,
        attemptId: idempotencyKey || 'ui',
      })
      setLoadingKey(key)
      setLastError('')
      try {
        const entry = await executeOrderProductFulfillment(api, {
          orderProductId,
          action,
          quantity,
          idempotencyKey: idempotencyKey || key,
          deviceOrigin: deviceId != null ? String(deviceId) : undefined,
          reason,
        })
        return entry
      } catch (error) {
        const message =
          error?.response?.data?.error ||
          error?.message ||
          'Fulfillment request failed'
        setLastError(String(message))
        throw error
      } finally {
        setLoadingKey('')
      }
    },
    [defaultAction, deviceId],
  )

  return {
    fulfill,
    defaultAction,
    isRootOrderProduct,
    loadingKey,
    lastError,
    isLoading: Boolean(loadingKey),
  }
}
