import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {confirmAction} from '@controleonline/ui-common/src/react/utils/confirmAction'
import {useFocusEffect} from '@react-navigation/native'
import {useStore} from '@store'
import {canManagePosCheckOrders} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap'
import {resolveThemePalette} from '@controleonline/../../src/styles/branding'
import usePosCartSession from '../../hooks/usePosCartSession'
import {resolveWaiterTabDestination} from '../home/waiterTabHomeActions'
import {getLinkedOrderContext, normalizeEntityId} from '../../utils/linkedOrderContext'
import {buildCheckoutRouteParams, buildManagerPdvRouteParams, buildOrderDetailsRouteParams} from '../../utils/orderRoute'
import {summarizeInvoices} from './linkedOrderSettlementHelpers'
import {isTerminalOrder, partitionTabConsultationRounds} from './pendingCartHelpers'
import {getWaiterChargeChannels} from './waiterChargeCapability'
import {tabConsultationScope} from '../../../store/orders/tabConsultation'

export default function useWaiterTabConsultation({navigation, route, draftsExpanded = false}) {
  const {currentCompany, mainCompany} = useStore('people').getters
  const {item: device} = useStore('device').getters
  const {item: deviceConfig} = useStore('device_config').getters
  const {colors} = useStore('theme').getters
  const ordersStore = useStore('orders')
  const cartActions = useStore('cart').actions
  const {ensureActiveOrder} = usePosCartSession({companyId: currentCompany?.id,
    deviceId: device?.id, defaultStatusId: mainCompany?.configs?.['pos-default-status'],
    companyConfigs: currentCompany?.configs})
  const args = useMemo(() => ({companyId: currentCompany?.id, deviceId: device?.id,
    rootOrderId: normalizeEntityId(route?.params?.rootOrderId)}),
  [currentCompany?.id, device?.id, route?.params?.rootOrderId])
  const scope = tabConsultationScope(args)
  const [verifiedScope, setVerifiedScope] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState('')
  const [feedback, setFeedback] = useState('')
  const activeRef = useRef(null)
  const actionRef = useRef(null)
  const finalizationRef = useRef(false)
  const readState = ordersStore.getters.tabConsultation
  const state = verifiedScope === scope && readState?.scope === scope ? readState : null
  const snapshot = state?.snapshot
  const root = snapshot?.rootOrder
  const rounds = useMemo(() => partitionTabConsultationRounds(snapshot?.descendants), [snapshot])
  const invoiceSummary = summarizeInvoices(snapshot?.invoices)
  const pending = Math.max(Number(root?.price || 0) - invoiceSummary.paidAmount, 0)
  const channels = getWaiterChargeChannels(root)
  const canCharge = channels.local || channels.remote
  const canManage = canManagePosCheckOrders(deviceConfig?.configs)
  const fresh = !!state?.fresh && !state.loading
  const open = !!root && !isTerminalOrder(root)
  const palette = useMemo(() => resolveThemePalette({...colors, ...(currentCompany?.theme?.colors || {})}),
    [colors, currentCompany?.theme?.colors])

  const refresh = useCallback(async () => {
    const active = activeRef.current
    if (!active || !args.companyId || !args.rootOrderId) return
    setRefreshing(true)
    try {
      await ordersStore.actions.loadTabConsultation({...args,
        onScopeReady: () => {if (activeRef.current === active) setVerifiedScope(scope)}})
    } catch (error) {
      if (activeRef.current === active) setFeedback(error.message)
    } finally {
      if (activeRef.current === active) setRefreshing(false)
    }
  }, [args, ordersStore.actions, scope])

  useFocusEffect(useCallback(() => {
    activeRef.current = {}
    setVerifiedScope(''); setFeedback(''); setBusy('')
    void refresh()
    return () => {activeRef.current = null; actionRef.current?.abort(); actionRef.current = null}
  }, [refresh]))

  useEffect(() => {
    if (!draftsExpanded || !state?.fresh || !activeRef.current) return
    const active = activeRef.current
    void ordersStore.actions.loadTabDraftDetails?.(args)?.catch(error => {
      if (activeRef.current === active) setFeedback(error.message)
    })
  }, [draftsExpanded, state?.request, state?.fresh, ordersStore.actions, args])

  const code = getLinkedOrderContext(root).externalCode || ''
  useFocusEffect(useCallback(() => {
    navigation.setOptions({title: code ? `Comanda ${code}` : 'Consultar comanda'})
  }, [navigation, code]))

  async function launch() {
    if (!fresh || !open || busy || actionRef.current) return
    const controller = new AbortController()
    actionRef.current = controller
    setBusy('launch'); setFeedback('')
    try {
      const destination = await resolveWaiterTabDestination({action: 'launch', externalCode: code,
        companyId: args.companyId, deviceId: args.deviceId, configs: deviceConfig?.configs,
        cartActions, ensureActiveOrder, signal: controller.signal})
      if (destination && !controller.signal.aborted) navigation.navigate(destination.screen, destination.params)
    } catch (error) {
      if (!controller.signal.aborted) setFeedback(error.message)
    } finally {
      if (actionRef.current === controller) {actionRef.current = null; setBusy('')}
    }
  }
  function checkout(draftIds) {
    if (!fresh || !canCharge || busy || !open) return
    navigation.navigate('Checkout', buildCheckoutRouteParams(root, buildManagerPdvRouteParams({
      showBottomCart: false, waiterTabConsultationRootId: normalizeEntityId(root),
      waiterTabCloseRequested: true, waiterTabDiscardDraftIds: draftIds,
    })))
  }
  function openDraft(order) {
    if (!fresh || busy) return
    navigation.navigate('OrderDetails', buildOrderDetailsRouteParams(order, buildManagerPdvRouteParams({showBottomCart: false})))
  }
  function close() {
    if (!fresh || !open || !canCharge || busy || actionRef.current) return
    if (pending <= 0.009 && !canManage) {
      setFeedback('Pagamento registrado. O fechamento deve ser concluído no caixa.')
      return
    }
    const draftIds = rounds.pendingCarts.map(normalizeEntityId)
    const proceed = () => pending > 0.009 ? checkout(draftIds) : runAction('close', null, draftIds)
    if (draftIds.length || pending <= 0.009) {
      confirmAction(`Fechar a comanda ${code}?${draftIds.length
        ? ` Após a quitação, ${draftIds.length} rascunho(s) não enviado(s) serão descartados, preservando o histórico.`
        : ''}`, proceed)
    } else proceed()
  }
  useEffect(() => {
    if (route?.params?.waiterTabFinalize !== true) {finalizationRef.current = false; return}
    if (!activeRef.current || !fresh || !root || finalizationRef.current || busy) return
    finalizationRef.current = true
    const approvedIds = route.params.waiterTabDiscardDraftIds || []
    if (!open) {navigation.setParams?.({waiterTabFinalize: false}); return}
    if (pending > 0.009) {
      setFeedback('Pagamento parcial registrado. A comanda permanece aberta com saldo pendente.')
    } else if (!canManage) {
      setFeedback('Pagamento registrado. O fechamento deve ser concluído no caixa.')
    } else {
      void runAction('close', null, approvedIds)
    }
    navigation.setParams?.({waiterTabFinalize: false, waiterTabDiscardDraftIds: null})
  })
  function discardDraft(order) {
    if (!fresh || busy || order?.orderType !== 'cart') return
    confirmAction(`Descartar o rascunho #${normalizeEntityId(order)}? Ele não será enviado para produção e o histórico será preservado.`,
      () => runAction('discard', normalizeEntityId(order)))
  }
  async function runAction(action, draftOrderId, approvedDraftIds) {
    if (actionRef.current || !activeRef.current) return
    const controller = new AbortController()
    actionRef.current = controller
    setBusy(action); setFeedback('')
    try {
      if (action === 'discard') {
        await ordersStore.actions.discardTabDraft({...args, draftOrderId})
      } else {
        await ordersStore.actions.closeTabConsultation({...args, canCharge, canManage, approvedDraftIds})
        if (!controller.signal.aborted) navigation.navigate('HomePage')
      }
    } catch (error) {
      if (action === 'close' && !controller.signal.aborted) await refresh()
      if (!controller.signal.aborted) setFeedback(pending <= 0.009 && action === 'close'
        ? `O pagamento está registrado, mas o fechamento não foi concluído. Tente Fechar comanda novamente. ${error.message}`
        : error.message)
    } finally {
      if (actionRef.current === controller) {actionRef.current = null; setBusy('')}
    }
  }

  return {snapshot, root, rounds, code, pending, invoiceSummary, palette, fresh, open,
    canCharge, canManage, channels, busy, feedback: feedback || state?.error, refreshing,
    refresh, launch, checkout, close, openDraft, discardDraft}
}
