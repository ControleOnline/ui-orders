import {api} from '@controleonline/ui-common/src/api'
import {normalizeEntityId} from '../../react/utils/linkedOrderContext'
import {summarizeInvoices} from '../../react/pages/checkout/linkedOrderSettlementHelpers'
import {isPendingCartOrder, isTerminalOrder} from '../../react/pages/checkout/pendingCartHelpers'
import {getLinkedOrderContext} from '../../react/utils/linkedOrderContext'
import {getWaiterChargeChannels} from '../../react/pages/checkout/tabConsultationCharge'
import {readTabTree} from './tabConsultationReads'
import {consultationCacheKey, readConsultationCache, writeConsultationCache} from './tabConsultationCache'
import {consultationSession, consultationScope, persistConsultation} from './tabConsultationDetails'

const pendingReads = new WeakMap()

export const TAB_CONSULTATION_MUTATION = 'setTabConsultation'
export const tabConsultationScope = consultationScope

export async function loadTabConsultation({commit, getters, dispatch}, args) {
  if (!args.companyId || !args.rootOrderId) throw new Error('Identifique a comanda para consultar.')
  const token = await api.getToken()
  if (!token) throw new Error('Entre novamente para consultar a comanda.')
  const scope = tabConsultationScope(args)
  const session = consultationSession(token)
  const running = pendingReads.get(getters)
  if (running?.scope === scope && running?.session === session && running.metadataOnly === !!args.metadataOnly &&
      getters.tabConsultation?.request === running.request) {
    args.onScopeReady?.()
    return running.promise
  }
  const old = getters.tabConsultation
  const snapshot = old?.scope === scope && old?.session === session ? old.snapshot : null
  const request = {}
  const state = {scope, session, request, snapshot, loading: true, fresh: false, error: ''}
  commit(TAB_CONSULTATION_MUTATION, state)
  args.onScopeReady?.()
  const promise = (async () => {
    try {
      const cached = snapshot || (await readConsultationCache(consultationCacheKey(scope, session)))?.snapshot
      if (getters.tabConsultation?.request === request && cached && !snapshot) {
        commit(TAB_CONSULTATION_MUTATION, {...state, snapshot: cached})
      }
      const publish = (result, detailsLoading = true) => {
        if (getters.tabConsultation?.request !== request) return
        const current = getters.tabConsultation
        // Expanding drafts during visible-sale hydration must not be overwritten.
        const descendants = result.descendants.map(row => {
          const draft = current.snapshot?.descendants?.find(order => normalizeEntityId(order) === normalizeEntityId(row))
          return draft?.__draftDetailsRequest === request && row.orderType === 'cart' &&
            isPendingCartOrder(row) ? {...row, orderProducts: draft.orderProducts, __productsPending: false,
              __draftDetailsRequest: request} : row
        })
        const next = {...current, snapshot: {...result, descendants}, loading: false,
          detailsLoading, fresh: true, error: ''}
        commit(TAB_CONSULTATION_MUTATION, next)
        void persistConsultation(next)
      }
      const result = await readTabTree((...params) => api.fetch(...params), {...args,
        deferDrafts: true, previousSnapshot: cached, onSnapshot: result => publish(result),
        onDetail: row => {
          if (getters.tabConsultation?.request !== request) return
          void writeConsultationCache({
          id: consultationCacheKey(scope, session, `products:${normalizeEntityId(row)}`),
          parentId: normalizeEntityId(row.mainOrderId || row.mainOrder), orderProducts: row.orderProducts,
        })},
        readKnownProducts: async row => {
          const record = await readConsultationCache(consultationCacheKey(scope, session, `products:${normalizeEntityId(row)}`))
          return String(record?.parentId) === String(normalizeEntityId(row.mainOrderId || row.mainOrder)) ? record.orderProducts : undefined
        },
      }, params => dispatch('invoice/fetchPage', params))
      publish(result, false)
      return result
    } catch (error) {
      if (getters.tabConsultation?.request === request) {
        commit(TAB_CONSULTATION_MUTATION, {...getters.tabConsultation, loading: false, detailsLoading: false, fresh: false, error: error.message})
      }
      throw error
    } finally {
      if (pendingReads.get(getters)?.request === request) pendingReads.delete(getters)
    }
  })()
  pendingReads.set(getters, {scope, session, request, promise, metadataOnly: !!args.metadataOnly})
  return promise
}

export async function closeTabConsultation(context, args) {
  if (!args.canCharge || !args.canManage) throw new Error('Este device não está autorizado a fechar a comanda.')
  let snapshot = await loadTabConsultation(context, {...args, metadataOnly: true})
  if (!getWaiterChargeChannels(snapshot.rootOrder).enabled) throw new Error('Este device não está autorizado a fechar a comanda.')
  const paid = summarizeInvoices(snapshot.invoices).paidAmount
  if (Number(snapshot.rootOrder.price || 0) - paid > 0.009) throw new Error('A comanda ainda tem saldo pendente.')
  const drafts = snapshot.descendants.filter(isPendingCartOrder)
  const approved = new Set((args.approvedDraftIds || []).map(normalizeEntityId))
  if (drafts.some(order => order.orderType !== 'cart' || !approved.has(normalizeEntityId(order)))) {
    throw new Error('Há rascunhos novos ou pendentes. Confirme o descarte ao fechar a comanda.')
  }
  if (drafts.length) {
    context.commit(TAB_CONSULTATION_MUTATION, {...context.getters.tabConsultation, fresh: false, request: {}})
    for (const draft of drafts) {
      await context.dispatch('cancelOrder', {id: normalizeEntityId(draft), companyId: args.companyId,
        draftOnly: true, expectedMainOrderId: getLinkedOrderContext(draft).mainOrderId,
        reason: 'Rascunho descartado no fechamento da comanda quitada'})
    }
    snapshot = await loadTabConsultation(context, {...args, metadataOnly: true})
    if (!getWaiterChargeChannels(snapshot.rootOrder).enabled) throw new Error('Este device não está autorizado a fechar a comanda.')
    if (Number(snapshot.rootOrder.price || 0) - summarizeInvoices(snapshot.invoices).paidAmount > 0.009) {
      throw new Error('A comanda recebeu novos lançamentos e ainda tem saldo pendente.')
    }
    if (snapshot.descendants.some(isPendingCartOrder)) throw new Error('Há novos rascunhos. Confirme o descarte novamente.')
  }
  // Reuse the existing settlement operation, deepest descendants first.
  const queue = [...snapshot.descendants].sort((a, b) => b.__treeDepth - a.__treeDepth)
    .concat(snapshot.rootOrder).filter(order => !isTerminalOrder(order))
  context.commit(TAB_CONSULTATION_MUTATION, {...context.getters.tabConsultation, fresh: false, request: {}})
  for (const order of queue) {
    const response = await api.fetch(`orders/${normalizeEntityId(order)}/delivered`, {method: 'POST', body: {}})
    if (String(response?.result?.errno ?? response?.errno ?? '') !== '0') {
      throw new Error(response?.result?.errmsg || response?.errmsg || 'Não foi possível confirmar o fechamento da comanda.')
    }
  }
  const state = context.getters.tabConsultation
  void writeConsultationCache({id: consultationCacheKey(state.scope, state.session), snapshot: null})
  context.commit(TAB_CONSULTATION_MUTATION, null)
}

export async function discardTabDraft(context, args) {
  const draftId = normalizeEntityId(args.draftOrderId)
  if (!draftId) throw new Error('Identifique o rascunho para descartar.')
  const token = await api.getToken()
  const state = context.getters.tabConsultation
  const session = token && consultationSession(token)
  if (!token || state?.scope !== tabConsultationScope(args) || state?.session !== session ||
      !state.fresh || state.loading || !state.snapshot) {
    throw new Error('Atualize a consulta antes de descartar o rascunho.')
  }
  // The existing transactional API guard rechecks this displayed cart and link.
  // Reading every unrelated launch before canceling adds no protection.
  const snapshot = state.snapshot
  const draft = snapshot.descendants.find(order => normalizeEntityId(order) === draftId)
  if (!draft || draft.orderType !== 'cart' || !isPendingCartOrder(draft)) {
    throw new Error('O rascunho foi alterado ou enviado. Atualize a consulta.')
  }
  context.commit(TAB_CONSULTATION_MUTATION, {...context.getters.tabConsultation, fresh: false, request: {}})
  try {
    await context.dispatch('cancelOrder', {id: draftId, companyId: args.companyId,
      draftOnly: true, expectedMainOrderId: getLinkedOrderContext(draft).mainOrderId,
      reason: 'Rascunho descartado pela consulta da comanda'})
    if (context.getters.tabConsultation?.scope !== state.scope ||
        context.getters.tabConsultation?.session !== state.session) return null
    const current = context.getters.tabConsultation
    context.commit(TAB_CONSULTATION_MUTATION, {...current, fresh: false,
        snapshot: {...current.snapshot, descendants: current.snapshot.descendants.map(order =>
          normalizeEntityId(order) === draftId
            ? {...order, status: {...order.status, realStatus: 'canceled'}} : order)}})
    return await loadTabConsultation(context, args)
  } catch (error) {
    if (context.getters.tabConsultation?.scope === state.scope &&
        context.getters.tabConsultation?.session === state.session) {
      context.commit(TAB_CONSULTATION_MUTATION, {...context.getters.tabConsultation, fresh: false, error: error.message})
    }
    throw error
  }
}
