import * as types from '@controleonline/ui-default/src/store/default/mutation_types'
import {normalizeEntityId, preserveOrderProductHierarchy} from '../../utils/orderState'

// Transform the committed payload: the Zustand bridge stores that payload
// directly, rather than the value calculated by a module mutation.
export const withOrderProductHierarchy = action => (context, ...args) => {
  const previousById = new Map((context.getters.items || []).map(order => [normalizeEntityId(order), order]))
  if (context.getters.item) previousById.set(normalizeEntityId(context.getters.item), context.getters.item)
  const preserve = order => {
    if (!order || typeof order !== 'object' || Array.isArray(order)) return order
    const current = normalizeEntityId(context.getters.item) === normalizeEntityId(order)
      ? context.getters.item : previousById.get(normalizeEntityId(order))
    return preserveOrderProductHierarchy(current, order)
  }
  const result = action({...context, commit: (type, payload, ...options) => {
    const next = type === types.SET_ITEM ? preserve(payload)
      : type === types.SET_ITEMS && Array.isArray(payload) ? payload.map(preserve) : payload
    context.commit(type, next, ...options)
  }}, ...args)
  return result?.then ? result.then(preserve) : preserve(result)
}
