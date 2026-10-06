import md5 from 'md5'
import {api} from '@controleonline/ui-common/src/api'
import {env} from '@env'
import {normalizeEntityId} from '../../utils/orderState'
import {isPendingCartOrder} from '../../react/pages/checkout/pendingCartHelpers'
import {consultationCacheKey, writeConsultationCache} from './tabConsultationCache'
import {assertCompany} from './tabConsultationReads'

export const consultationSession = token => md5(JSON.stringify([env.API_ENTRYPOINT, env.DOMAIN, token]))
export const consultationScope = ({companyId, deviceId, rootOrderId}) =>
  JSON.stringify([String(companyId), String(deviceId || ''), String(rootOrderId)])
export function validatedOrderDetail(row, detail, companyId) {
  assertCompany(detail, companyId)
  if (normalizeEntityId(detail) !== normalizeEntityId(row) ||
      normalizeEntityId(detail.mainOrderId || detail.mainOrder) !== normalizeEntityId(row.mainOrderId || row.mainOrder) ||
      !Array.isArray(detail.orderProducts)) {
    throw new Error('Não foi possível carregar os produtos completos do lançamento.')
  }
  return {...detail, __treeDepth: row.__treeDepth}
}
export const persistConsultation = state => writeConsultationCache({
  id: consultationCacheKey(state.scope, state.session), snapshot: {...state.snapshot,
    descendants: state.snapshot.descendants.map(({__draftDetailsRequest, ...order}) => order)},
})
export async function rememberConfirmedWaiterLaunch(_context, {companyId, deviceId, order}) {
  const parentId = normalizeEntityId(order?.mainOrderId || order?.mainOrder)
  if (!companyId || !parentId || !Array.isArray(order?.orderProducts)) return
  assertCompany(order, companyId)
  const token = await api.getToken()
  if (!token) return
  // Only product hierarchy is reused. The server still supplies sale status and money.
  const scope = consultationScope({companyId, deviceId, rootOrderId: parentId})
  await writeConsultationCache({id: consultationCacheKey(scope, consultationSession(token), `products:${normalizeEntityId(order)}`),
    parentId, orderProducts: order.orderProducts})
}
const pendingDrafts = new WeakMap()
export async function loadTabDraftDetails(context, args) {
  const token = await api.getToken()
  const state = context.getters.tabConsultation
  if (!token || state?.session !== consultationSession(token) || state?.scope !== consultationScope(args) ||
      !state.fresh || state.loading) return
  if (pendingDrafts.get(context.getters)?.request === state.request) return pendingDrafts.get(context.getters).promise
  const pending = {request: state.request}
  const promise = (async () => {
    for (const row of state.snapshot.descendants.filter(isPendingCartOrder)) {
      if (context.getters.tabConsultation?.request !== state.request) return
      const current = context.getters.tabConsultation.snapshot.descendants.find(order => normalizeEntityId(order) === normalizeEntityId(row))
      if (current?.__draftDetailsRequest === state.request) continue
      const detail = validatedOrderDetail(row, await api.fetch(`orders/${normalizeEntityId(row)}`), args.companyId)
      if (context.getters.tabConsultation?.request !== state.request) return
      if (!isPendingCartOrder(detail)) throw new Error('O rascunho foi alterado. Atualize a consulta.')
      const latest = context.getters.tabConsultation
      const snapshot = {...latest.snapshot, descendants: latest.snapshot.descendants.map(order =>
        normalizeEntityId(order) === normalizeEntityId(row) ? {...detail, __draftDetailsRequest: state.request} : order)}
      context.commit('setTabConsultation', {...latest, snapshot})
      void persistConsultation({...latest, snapshot})
    }
  })().catch(error => {
    if (context.getters.tabConsultation?.request === state.request) {
      context.commit('setTabConsultation', {...context.getters.tabConsultation, fresh: false, request: {}, error: error.message})
    }
    throw error
  }).finally(() => {if (pendingDrafts.get(context.getters) === pending) pendingDrafts.delete(context.getters)})
  pending.promise = promise; pendingDrafts.set(context.getters, pending)
  return promise
}
