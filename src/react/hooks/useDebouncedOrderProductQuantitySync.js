import {useCallback, useEffect, useMemo, useRef, useState} from 'react'

import {normalizeEntityId} from '@controleonline/ui-orders/src/utils/orderState'

const DEFAULT_DELAY = 450
const normalizeQuantity = value => Math.max(0, Number(value || 0))

export default function useDebouncedOrderProductQuantitySync({
  delay = DEFAULT_DELAY,
  onCommit,
  onOptimisticUpdate,
  onError,
} = {}) {
  const entriesRef = useRef(new Map())
  const mountedRef = useRef(true)
  const flushAllChangesRef = useRef(null)
  const onCommitRef = useRef(onCommit)
  const onOptimisticUpdateRef = useRef(onOptimisticUpdate)
  const onErrorRef = useRef(onError)
  const [committingIds, setCommittingIds] = useState({})

  useEffect(() => {
    onCommitRef.current = onCommit
  }, [onCommit])

  useEffect(() => {
    onOptimisticUpdateRef.current = onOptimisticUpdate
  }, [onOptimisticUpdate])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

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
    if (!entry || entry.isCommitting || typeof onCommitRef.current !== 'function') {
      return entry?.promise || null
    }

    clearEntryTimer(entry)

    const committedTargetQuantity = normalizeQuantity(entry.targetQuantity)
    entry.isCommitting = true
    setOrderProductCommitting(orderProductId, true)

    const promise = Promise.resolve(onCommitRef.current(entry.orderProduct, committedTargetQuantity))
      .catch(async error => {
        entriesRef.current.delete(orderProductId)
        await onErrorRef.current?.(error, entry.orderProduct, committedTargetQuantity)
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
          // Cada clique renova a janela do debounce do item.
          const elapsedSinceLastChange = Date.now() - Number(latestEntry.lastChangedAt || 0)
          const remainingDelay = Math.max(0, delay - elapsedSinceLastChange)
          latestEntry.timeoutId = setTimeout(() => {
            void commitEntry(orderProductId)
          }, remainingDelay)
          return
        }

        entriesRef.current.delete(orderProductId)
      })

    entry.promise = promise
    entriesRef.current.set(orderProductId, entry)
    return promise
  }, [clearEntryTimer, delay, setOrderProductCommitting])

  const getScheduledQuantity = useCallback(orderProduct => {
    const orderProductId = normalizeEntityId(orderProduct)
    if (!orderProductId) {
      return normalizeQuantity(orderProduct?.quantity)
    }

    const currentEntry = entriesRef.current.get(orderProductId)
    return normalizeQuantity(currentEntry?.targetQuantity ?? orderProduct?.quantity)
  }, [])

  const scheduleQuantityChange = useCallback((orderProduct, nextQuantityOrUpdater) => {
    const orderProductId = normalizeEntityId(orderProduct)
    if (!orderProductId) return

    const currentEntry = entriesRef.current.get(orderProductId) || {
      orderProduct,
      timeoutId: null,
      promise: null,
      isCommitting: false,
      targetQuantity: getScheduledQuantity(orderProduct),
      lastChangedAt: Date.now(),
    }

    const resolvedNextQuantity =
      typeof nextQuantityOrUpdater === 'function'
        ? nextQuantityOrUpdater(getScheduledQuantity(orderProduct))
        : nextQuantityOrUpdater
    const nextQuantity = normalizeQuantity(resolvedNextQuantity)

    onOptimisticUpdateRef.current?.(orderProduct, nextQuantity)

    currentEntry.orderProduct = orderProduct
    currentEntry.targetQuantity = nextQuantity
    currentEntry.lastChangedAt = Date.now()
    clearEntryTimer(currentEntry)

    if (!currentEntry.isCommitting) {
      currentEntry.timeoutId = setTimeout(() => {
        void commitEntry(orderProductId)
      }, delay)
    }

    entriesRef.current.set(orderProductId, currentEntry)
  }, [clearEntryTimer, commitEntry, delay, getScheduledQuantity])

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
    flushAllChangesRef.current = flushAllChanges
  }, [flushAllChanges])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      void flushAllChangesRef.current?.()
    }
  }, [])

  return useMemo(() => ({
    getScheduledQuantity,
    scheduleQuantityChange,
    flushAllChanges,
    cancelAllChanges,
    isOrderProductCommitting: orderProductId => !!committingIds[orderProductId],
  }), [cancelAllChanges, committingIds, flushAllChanges, getScheduledQuantity, scheduleQuantityChange])
}
