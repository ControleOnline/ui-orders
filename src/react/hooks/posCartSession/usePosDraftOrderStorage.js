import {useCallback} from 'react'
import {normalizeId} from '../../utils/posCartHelpers'

export default function usePosDraftOrderStorage(storageKey) {
  const clearStoredDraftOrderId = useCallback(() => {
    if (typeof localStorage === 'undefined' || !storageKey) return
    localStorage.removeItem(storageKey)
  }, [storageKey])

  const rememberDraftOrderId = useCallback(order => {
    const orderId = normalizeId(order?.id || order?.['@id'])
    if (typeof localStorage === 'undefined' || !storageKey || !orderId) return
    localStorage.setItem(storageKey, orderId)
  }, [storageKey])

  const readStoredDraftOrderId = useCallback(() => {
    if (typeof localStorage === 'undefined' || !storageKey) return null
    return normalizeId(localStorage.getItem(storageKey))
  }, [storageKey])

  return {clearStoredDraftOrderId, rememberDraftOrderId, readStoredDraftOrderId}
}
