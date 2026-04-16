import {useCallback, useEffect, useMemo, useRef, useState} from 'react'

import {normalizeEntityId} from '@controleonline/ui-orders/src/utils/orderState'

const DEFAULT_DELAY = 450

export default function useDebouncedOrderProductQuantitySync({
  delay = DEFAULT_DELAY,
  onCommit,
  onOptimisticUpdate,
  onError,
} = {}) {
  const entriesRef = useRef(new Map())
  const mountedRef = useRef(true)
  const [committingIds, setCommittingIds] = useState({})

  const setOrderProductCommitting = useCallback((orderProductId, isCommitting) => {
    if (!mountedRef.current) return

    setCommittingIds(prev => {
      const currentlyCommitting = !!prev[orderProductId]
      if (currentlyCommitting === isCommitting) {
        return prev
      }

      const next = {...prev}
      if (isCommitting) {
        next[orderProductId] = true
      } else {
        delete next[orderProductId]
      }

      return next
    })
  }, [])

  const clearEntryTimer = useCallback(entry => {
    if (entry?.timeoutId) {
      clearTimeout(entry.timeoutId)
      entry.timeoutId = null
    }
  }, [])

  const commitEntry = useCallback(async orderProductId => {
    const entry = entriesRef.current.get(orderProductId)
    if (!entry || entry.isCommitting || typeof onCommit !== 'function') {
      return entry?.promise || null
    }

    clearEntryTimer(entry)

    const committedTargetQuantity = Number(entry.targetQuantity || 0)
    entry.isCommitting = true
    setOrderProductCommitting(orderProductId, true)

    const promise = Promise.resolve(onCommit(entry.orderProduct, committedTargetQuantity))
      .catch(async error => {
        entriesRef.current.delete(orderProductId)
        await onError?.(error, entry.orderProduct, committedTargetQuantity)
      })
      .finally(() => {
        const latestEntry = entriesRef.current.get(orderProductId)
        setOrderProductCommitting(orderProductId, false)

        if (!latestEntry) {
          return
        }

        latestEntry.isCommitting = false
        latestEntry.promise = null

        if (Number(latestEntry.targetQuantity || 0) !== committedTargetQuantity) {
          latestEntry.timeoutId = setTimeout(() => {
            void commitEntry(orderProductId)
          }, delay)
          return
        }

        entriesRef.current.delete(orderProductId)
      })

    entry.promise = promise
    entriesRef.current.set(orderProductId, entry)
    return promise
  }, [clearEntryTimer, delay, onCommit, onError, setOrderProductCommitting])

  const scheduleQuantityChange = useCallback((orderProduct, nextQuantity) => {
    const orderProductId = normalizeEntityId(orderProduct)
    if (!orderProductId) return

    onOptimisticUpdate?.(orderProduct, Number(nextQuantity || 0))

    const currentEntry = entriesRef.current.get(orderProductId) || {
      orderProduct,
      timeoutId: null,
      promise: null,
      isCommitting: false,
      targetQuantity: Number(nextQuantity || 0),
    }

    currentEntry.orderProduct = orderProduct
    currentEntry.targetQuantity = Number(nextQuantity || 0)
    clearEntryTimer(currentEntry)

    if (!currentEntry.isCommitting) {
      currentEntry.timeoutId = setTimeout(() => {
        void commitEntry(orderProductId)
      }, delay)
    }

    entriesRef.current.set(orderProductId, currentEntry)
  }, [clearEntryTimer, commitEntry, delay, onOptimisticUpdate])

  const flushOrderProductChange = useCallback(async orderProductId => {
    const entry = entriesRef.current.get(orderProductId)
    if (!entry) return

    clearEntryTimer(entry)

    if (entry.promise) {
      await entry.promise
      if (entriesRef.current.has(orderProductId)) {
        await flushOrderProductChange(orderProductId)
      }
      return
    }

    await commitEntry(orderProductId)
  }, [clearEntryTimer, commitEntry])

  const flushAllChanges = useCallback(async () => {
    const orderProductIds = [...entriesRef.current.keys()]
    for (const orderProductId of orderProductIds) {
      await flushOrderProductChange(orderProductId)
    }
  }, [flushOrderProductChange])

  const cancelAllChanges = useCallback(() => {
    entriesRef.current.forEach(entry => {
      clearEntryTimer(entry)
    })
    entriesRef.current.clear()
    setCommittingIds({})
  }, [clearEntryTimer])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      void flushAllChanges()
    }
  }, [flushAllChanges])

  return useMemo(() => ({
    scheduleQuantityChange,
    flushAllChanges,
    cancelAllChanges,
    isOrderProductCommitting: orderProductId => !!committingIds[orderProductId],
  }), [cancelAllChanges, committingIds, flushAllChanges, scheduleQuantityChange])
}
