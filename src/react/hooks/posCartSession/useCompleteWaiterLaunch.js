import {useCallback} from 'react'
import {useStore} from '@store'
import {normalizeId} from '../../utils/posCartHelpers'
import {buildPosDraftOrderStorageKey} from './status'
import {getActivePosOrderContext, setActivePosOrderContext} from './activePosOrderContext'
import usePosDraftOrderStorage from './usePosDraftOrderStorage'

// Called only after the confirm endpoint accepts the launch. Do not manufacture
// a sale snapshot from the cart or clear another order that became active.
export default function useCompleteWaiterLaunch() {
  const people = useStore('people')
  const device = useStore('device')
  const orders = useStore('orders')
  const companyId = normalizeId(people.getters.currentCompany?.id || people.getters.currentCompany?.['@id'])
  const deviceId = normalizeId(device.getters.item?.id || device.getters.item?.['@id'])
  const consultationDeviceId = String(device.getters.item?.id || deviceId || '')
  const {readStoredDraftOrderId, clearStoredDraftOrderId} =
    usePosDraftOrderStorage(buildPosDraftOrderStorageKey(companyId, deviceId))

  return useCallback(orderId => {
    const id = normalizeId(orderId)
    if (!id || !companyId || !deviceId) return
    const current = orders.getters.item
    if (normalizeId(current?.id || current?.['@id']) === id) {
      // Keep the acknowledged products for consultation before clearing the draft.
      void orders.actions.rememberConfirmedWaiterLaunch?.({companyId, deviceId: consultationDeviceId, order: current})?.catch(() => {})
    }
    const active = getActivePosOrderContext({companyId, deviceId})
    if (normalizeId(active?.id || active?.['@id']) === id) {
      setActivePosOrderContext({companyId, deviceId, order: null})
    }
    if (readStoredDraftOrderId() === id) clearStoredDraftOrderId()
    if (normalizeId(current?.id || current?.['@id']) === id) orders.actions.setItem({})
  }, [companyId, deviceId, consultationDeviceId, orders, readStoredDraftOrderId, clearStoredDraftOrderId])
}
