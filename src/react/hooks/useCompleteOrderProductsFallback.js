import {useCallback, useEffect, useRef, useState} from 'react'

import {fetchCompleteOrderProductsFromStore} from '@controleonline/ui-orders/src/utils/orderProductsCollection'

const normalizeOrderId = orderId =>
  String(Number(String(orderId || '').replace(/\D+/g, '')) || '')

const createIdleState = orderId => ({
  error: null,
  items: [],
  orderId,
  status: 'idle',
})

const useCompleteOrderProductsFallback = ({
  actions,
  enabled,
  orderId,
}) => {
  const normalizedOrderId = normalizeOrderId(orderId)
  const actionsRef = useRef(actions)
  const activeRequestRef = useRef(0)
  const attemptedOrderIdRef = useRef('')
  const [state, setState] = useState(() => createIdleState(normalizedOrderId))

  useEffect(() => {
    actionsRef.current = actions
  }, [actions])

  const load = useCallback(async () => {
    if (!normalizedOrderId) {
      return []
    }

    const requestId = activeRequestRef.current + 1
    activeRequestRef.current = requestId
    attemptedOrderIdRef.current = normalizedOrderId
    setState({
      error: null,
      items: [],
      orderId: normalizedOrderId,
      status: 'loading',
    })

    try {
      const items = await fetchCompleteOrderProductsFromStore({
        actions: actionsRef.current,
        params: {'order.id': Number(normalizedOrderId)},
      })

      if (activeRequestRef.current === requestId) {
        setState({
          error: null,
          items,
          orderId: normalizedOrderId,
          status: 'ready',
        })
      }

      return items
    } catch (error) {
      if (activeRequestRef.current === requestId) {
        setState({
          error,
          items: [],
          orderId: normalizedOrderId,
          status: 'error',
        })
      }

      throw error
    }
  }, [normalizedOrderId])

  useEffect(() => {
    if (enabled) {
      return
    }

    activeRequestRef.current += 1
    attemptedOrderIdRef.current = ''
    setState(previousState =>
      previousState.status === 'idle' &&
      previousState.orderId === normalizedOrderId
        ? previousState
        : createIdleState(normalizedOrderId),
    )
  }, [enabled, normalizedOrderId])

  useEffect(() => {
    activeRequestRef.current += 1
    attemptedOrderIdRef.current = ''
    setState(createIdleState(normalizedOrderId))

    return () => {
      activeRequestRef.current += 1
    }
  }, [normalizedOrderId])

  useEffect(() => {
    if (
      !enabled ||
      !normalizedOrderId ||
      attemptedOrderIdRef.current === normalizedOrderId
    ) {
      return
    }

    void load().catch(() => null)
  }, [enabled, load, normalizedOrderId])

  const retry = useCallback(() => load(), [load])
  const stateMatchesOrder = state.orderId === normalizedOrderId

  return {
    error: stateMatchesOrder ? state.error : null,
    items: stateMatchesOrder ? state.items : [],
    retry,
    status: stateMatchesOrder ? state.status : 'idle',
  }
}

export default useCompleteOrderProductsFallback
