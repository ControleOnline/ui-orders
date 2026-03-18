import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStore } from '@store'
import { api } from '@controleonline/ui-common/src/api'
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService'
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore'
import css from '@controleonline/ui-orders/src/react/css/orders'
import Icon from 'react-native-vector-icons/MaterialIcons'
import BarcodeInput from '@controleonline/ui-orders/src/react/pages/checkout/BarcodeInput'
import OrderProducts from '@controleonline/ui-ppc/src/react/components/OrderProducts'
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader'

const formatApiError = error => {
  if (!error) return 'Nao foi possivel concluir a operacao.'
  if (typeof error === 'string') return error
  if (Array.isArray(error?.message)) {
    return error.message
      .map(item => item?.message || item?.title || String(item))
      .filter(Boolean)
      .join('\n')
  }

  return error?.message || error?.description || error?.errmsg || 'Nao foi possivel concluir a operacao.'
}

const formatFood99Eta = value => {
  if (value === null || value === undefined || value === '') return ''

  const normalized = String(value).trim()
  if (!normalized) return ''

  if (/^\d+$/.test(normalized)) {
    const timestamp = Number(normalized)
    const date = new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('pt-BR')
    }
  }

  return normalized
}

const normalizeErrno = value => String(value ?? '').trim()

const hasErrnoError = value => {
  const normalized = normalizeErrno(value)
  if (!normalized) return false
  return normalized !== '0'
}

const formatAgeMinutes = value => {
  if (value === null || value === undefined || value === '') return ''

  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes < 0) return ''
  if (minutes === 0) return 'agora'
  if (minutes === 1) return 'ha 1 min'
  return `ha ${minutes} min`
}

const OrderDetails = ({ route, navigation }) => {
  const orderParam = route.params.order
  const isKds = !!route.params?.kds
  const { showError, showSuccess } = useMessage()
  const [food99ActionLoading, setFood99ActionLoading] = useState('')
  const [food99State, setFood99State] = useState(null)
  const [food99StateLoading, setFood99StateLoading] = useState(false)

  const ordersStore = useStore('orders')
  const { getters: ordersGetters, actions: ordersActions } = ordersStore
  const { item, isLoading, error } = ordersGetters

  const invoiceStore = useStore('invoice')
  const { getters: invoiceGetters, actions: invoiceActions } = invoiceStore
  const { items: invoices } = invoiceGetters

  const { styles: cssStyles, globalStyles } = css()
  const { width } = useWindowDimensions()

  const scale = useMemo(() => {
    if (width >= 2200) return 1.15
    if (width >= 1700) return 1.05
    if (width >= 1300) return 0.97
    return 0.92
  }, [width])

  const localStyles = useMemo(() => createStyles(scale), [scale])

  const deviceConfigStore = useStore('device_config')
  const device = deviceConfigStore.getters?.item
  const productInputType = device?.configs?.['product-input-type'] || 'manual'

  // @todo implementar. já vem do banco.
  const selectionType = device?.configs?.['selection-type'] || 'single' // ou multiple

  const isManualInput = productInputType === 'manual'
  const showBarcodeInput = item?.app === 'POS' && !isManualInput
  const isFood99Order = /food99|99food/i.test(String(item?.app || ''))

  useFocusEffect(
    useCallback(() => {
      if (
        invoices &&
        invoices.length === 0 &&
        orderParam &&
        orderParam['@id'] &&
        !isLoading
      ) {
        invoiceActions.getItems({ 'order.order': orderParam['@id'] })
      }
    }, [invoices, orderParam, isLoading]),
  )

  useFocusEffect(
    useCallback(() => {
      if (orderParam && orderParam['@id']) {
        ordersActions.get(orderParam['@id'])
      }
    }, [orderParam]),
  )

  const handleAddProduct = () => {
    navigation.navigate('AddProductScreen')
  }

  const handleOrderTools = () => {
    navigation.navigate('OrderTools')
  }

  const refreshCurrentOrder = useCallback(async () => {
    if (orderParam && orderParam['@id']) {
      await ordersActions.get(orderParam['@id'])
    }
  }, [orderParam, ordersActions])

  const loadFood99OrderState = useCallback(async ({ silent = false } = {}) => {
    if (!item?.id || !isFood99Order || !isKds) {
      setFood99State(null)
      return
    }

    try {
      setFood99StateLoading(true)
      const response = await api.fetch(
        `/marketplace/integrations/99food/orders/${item.id}/state`,
      )
      setFood99State(response || null)
    } catch (stateError) {
      setFood99State(null)
      if (!silent) {
        showError(formatApiError(stateError))
      }
    } finally {
      setFood99StateLoading(false)
    }
  }, [item?.id, isFood99Order, isKds, showError])

  useFocusEffect(
    useCallback(() => {
      if (item?.id && isFood99Order && isKds) {
        loadFood99OrderState({ silent: true })
      }
    }, [item?.id, isFood99Order, isKds, loadFood99OrderState]),
  )

  const runFood99OrderAction = useCallback(
    async action => {
      if (!item?.id || !isFood99Order || food99ActionLoading) {
        return
      }

      const capabilities = food99State?.capabilities || {}
      if (
        (action === 'ready' && capabilities.can_ready === false) ||
        (action === 'cancel' && capabilities.can_cancel === false) ||
        (action === 'delivered' && capabilities.can_delivered === false)
      ) {
        return
      }

      const reconcilePath = `/marketplace/integrations/99food/orders/${item.id}/reconcile`
      const actionMap = {
        ready: {
          path: `/marketplace/integrations/99food/orders/${item.id}/ready`,
          success: 'Pedido marcado como pronto na 99Food.',
        },
        cancel: {
          path: `/marketplace/integrations/99food/orders/${item.id}/cancel`,
          success: 'Pedido cancelado na 99Food.',
        },
        delivered: {
          path: `/marketplace/integrations/99food/orders/${item.id}/delivered`,
          success: 'Pedido finalizado na 99Food.',
        },
        reconcile: {
          path: reconcilePath,
          success: 'Pedido sincronizado com a 99Food.',
        },
      }

      const actionConfig = actionMap[action]
      if (!actionConfig) {
        return
      }

      try {
        setFood99ActionLoading(action)
        const response = await api.fetch(actionConfig.path, {
          method: 'POST',
          body: {},
        })

        if (normalizeErrno(response?.result?.errno) !== '0') {
          throw response?.result || response
        }

        if (response?.state) {
          setFood99State(response.state)
        }

        if (action === 'ready') {
          try {
            const reconcileResponse = await api.fetch(reconcilePath, {
              method: 'POST',
              body: {},
            })

            if (
              normalizeErrno(reconcileResponse?.result?.errno) === '0' &&
              reconcileResponse?.state
            ) {
              setFood99State(reconcileResponse.state)
            }
          } catch {
            // Keep user flow going; full state refresh runs below.
          }
        }

        await refreshCurrentOrder()
        await loadFood99OrderState({ silent: true })
        showSuccess(actionConfig.success)

        if (isKds && (action === 'cancel' || action === 'delivered')) {
          navigation.goBack()
        }
      } catch (actionError) {
        showError(formatApiError(actionError))
      } finally {
        setFood99ActionLoading('')
      }
    },
    [
      item?.id,
      isFood99Order,
      food99ActionLoading,
      food99State,
      refreshCurrentOrder,
      showSuccess,
      showError,
      isKds,
      navigation,
      loadFood99OrderState,
    ],
  )

  const food99Delivery = food99State?.delivery || null
  const food99Integration = food99State?.integration || null
  const food99Observability = food99State?.observability || null
  const food99Capabilities = food99State?.capabilities || {}
  const normalizedOrderRealStatus = String(
    food99State?.order?.status?.real_status || item?.status?.realStatus || '',
  ).toLowerCase()
  const isTerminalFood99Order =
    typeof food99Capabilities?.is_terminal === 'boolean'
      ? food99Capabilities.is_terminal
      : ['closed', 'cancelled', 'canceled'].includes(normalizedOrderRealStatus)
  const canCancelFood99Order =
    typeof food99Capabilities?.can_cancel === 'boolean'
      ? food99Capabilities.can_cancel
      : !isTerminalFood99Order
  const canManualCompleteFood99Order =
    typeof food99Capabilities?.can_delivered === 'boolean'
      ? food99Capabilities.can_delivered
      : !!food99Delivery?.allows_manual_delivery_completion
  const formattedFood99Eta = formatFood99Eta(food99Delivery?.expected_arrived_eta)
  const remoteOrderStateLabel = food99Integration?.remote_order_state_label || food99Integration?.remote_order_state || ''
  const isFood99Ready = String(food99Integration?.remote_order_state || '').toLowerCase() === 'ready'
  const shouldHideReadyFood99Action = !!food99Delivery?.is_platform_delivery && isFood99Ready
  const canReadyFood99Order =
    typeof food99Capabilities?.can_ready === 'boolean'
      ? food99Capabilities.can_ready
      : !isTerminalFood99Order && !shouldHideReadyFood99Action
  const isFood99Delivering =
    typeof food99Capabilities?.is_delivering === 'boolean'
      ? food99Capabilities.is_delivering
      : ['picked_up', 'delivering', 'arriving'].includes(
          String(food99Integration?.remote_order_state || '').toLowerCase(),
        )
  const remoteStateAgeLabel = formatAgeMinutes(food99Observability?.remote_state_age_minutes)
  const lastActionAgeLabel = formatAgeMinutes(food99Observability?.last_action_age_minutes)
  const lastReconcileAgeLabel = formatAgeMinutes(food99Observability?.last_reconcile_age_minutes)
  const hasFood99SyncIssue =
    food99Observability?.is_healthy === false ||
    hasErrnoError(food99Integration?.last_action_errno) ||
    hasErrnoError(food99Integration?.confirm_errno) ||
    hasErrnoError(food99Integration?.reconcile_errno)

  return (
    <SafeAreaView
      style={[
        cssStyles.container,
        { flex: 1, paddingBottom: 120 },
        isKds && localStyles.kdsContainer,
      ]}
    >
      {showBarcodeInput && <BarcodeInput />}

      <StateStore store="orders" />

      {!isLoading && item && !error && (
        <View style={{ flex: 1 }}>
          {isKds ? (
            <>
              <OrderHeader order={item} showCustomer />

              {isFood99Order && (
                <View style={localStyles.food99InfoCard}>
                  <View style={localStyles.food99InfoHeader}>
                    <Text style={localStyles.food99InfoTitle}>Operacao 99Food</Text>
                    {food99StateLoading ? (
                      <ActivityIndicator size="small" color="#38BDF8" />
                    ) : (
                      <Text style={localStyles.food99InfoBadge}>
                        {food99Delivery?.delivery_label || 'Entrega indefinida'}
                      </Text>
                    )}
                  </View>

                  <Text style={localStyles.food99InfoText}>
                    Status remoto: {food99Delivery?.remote_delivery_status || food99Integration?.remote_order_state || 'Sem retorno'}
                  </Text>

                  {!!remoteOrderStateLabel && (
                    <Text style={localStyles.food99InfoText}>
                      Estado remoto: {remoteOrderStateLabel}
                    </Text>
                  )}

                  {isFood99Delivering ? (
                    <Text style={localStyles.food99InfoHint}>
                      Pedido em entrega. Conclua em Entregue quando a loja finalizar no app 99Food.
                    </Text>
                  ) : null}

                  {!!remoteStateAgeLabel && (
                    <Text style={localStyles.food99InfoText}>
                      Atualizacao remota: {remoteStateAgeLabel}
                    </Text>
                  )}

                  {!!formattedFood99Eta && (
                    <Text style={localStyles.food99InfoText}>
                      ETA previsto: {formattedFood99Eta}
                    </Text>
                  )}

                  {!!food99Delivery?.handover_code && (
                    <Text style={localStyles.food99InfoText}>
                      Codigo de entrega: {food99Delivery.handover_code}
                    </Text>
                  )}

                  {!!food99Delivery?.locator && (
                    <Text style={localStyles.food99InfoText}>
                      Localizador: {food99Delivery.locator}
                    </Text>
                  )}

                  {!!food99Delivery?.virtual_phone_number && (
                    <Text style={localStyles.food99InfoText}>
                      Telefone virtual: {food99Delivery.virtual_phone_number}
                    </Text>
                  )}

                  {food99Delivery?.is_platform_delivery ? (
                    <Text style={localStyles.food99InfoHint}>
                      Entrega 99: a loja conclui no status Pronto. A plataforma finaliza a entrega.
                    </Text>
                  ) : null}

                  {!!lastActionAgeLabel && (
                    <Text style={localStyles.food99InfoText}>
                      Ultima acao: {lastActionAgeLabel}
                    </Text>
                  )}

                  {!!lastReconcileAgeLabel && (
                    <Text style={localStyles.food99InfoText}>
                      Ultima conciliacao: {lastReconcileAgeLabel}
                    </Text>
                  )}

                  {shouldHideReadyFood99Action ? (
                    <Text style={localStyles.food99InfoHint}>
                      Pedido pronto aguardando plataforma. O cliente sera atualizado pela 99Food.
                    </Text>
                  ) : null}

                  {hasFood99SyncIssue ? (
                    <Text style={localStyles.food99InfoWarning}>
                      Integracao com divergencia. Use Sincronizar para atualizar o estado.
                    </Text>
                  ) : null}
                </View>
              )}

              {isFood99Order ? (
                <View style={localStyles.kdsActionRow}>
                  {canCancelFood99Order && (
                    <TouchableOpacity
                      onPress={() => runFood99OrderAction('cancel')}
                      disabled={!!food99ActionLoading}
                      style={[
                        localStyles.kdsActionButton,
                        localStyles.kdsActionDanger,
                        food99ActionLoading && localStyles.kdsActionButtonDisabled,
                      ]}
                    >
                      {food99ActionLoading === 'cancel' ? (
                        <ActivityIndicator size="small" color="#F8FAFC" />
                      ) : (
                        <Text style={localStyles.kdsActionText}>Cancelar</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {canReadyFood99Order && (
                    <TouchableOpacity
                      onPress={() => runFood99OrderAction('ready')}
                      disabled={!!food99ActionLoading}
                      style={[
                        localStyles.kdsActionButton,
                        localStyles.kdsActionPrimary,
                        food99ActionLoading && localStyles.kdsActionButtonDisabled,
                      ]}
                    >
                      {food99ActionLoading === 'ready' ? (
                        <ActivityIndicator size="small" color="#F8FAFC" />
                      ) : (
                        <Text style={localStyles.kdsActionText}>Pronto</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {canManualCompleteFood99Order && (
                    <TouchableOpacity
                      onPress={() => runFood99OrderAction('delivered')}
                      disabled={!!food99ActionLoading}
                      style={[
                        localStyles.kdsActionButton,
                        localStyles.kdsActionSuccess,
                        food99ActionLoading && localStyles.kdsActionButtonDisabled,
                      ]}
                    >
                      {food99ActionLoading === 'delivered' ? (
                        <ActivityIndicator size="small" color="#F8FAFC" />
                      ) : (
                        <Text style={localStyles.kdsActionText}>Entregue</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => runFood99OrderAction('reconcile')}
                    disabled={!!food99ActionLoading}
                    style={[
                      localStyles.kdsActionButton,
                      localStyles.kdsActionNeutral,
                      food99ActionLoading && localStyles.kdsActionButtonDisabled,
                    ]}
                  >
                    {food99ActionLoading === 'reconcile' ? (
                      <ActivityIndicator size="small" color="#F8FAFC" />
                    ) : (
                      <Text style={localStyles.kdsActionText}>Sincronizar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={localStyles.kdsActionRow}>
                  <TouchableOpacity style={[localStyles.kdsActionButton, localStyles.kdsActionDanger]}>
                    <Text style={localStyles.kdsActionText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[localStyles.kdsActionButton, localStyles.kdsActionSuccess]}>
                    <Text style={localStyles.kdsActionText}>Entregue</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={localStyles.kdsActionRow}>
                {showBarcodeInput && isManualInput && (
                  <TouchableOpacity
                    onPress={handleAddProduct}
                    style={[localStyles.kdsActionButton, localStyles.kdsActionPrimary]}
                  >
                    <Icon name="add-circle" size={18} color="#fff" />
                    <Text style={[localStyles.kdsActionText, { marginLeft: 6 }]}>Adicionar Item</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleOrderTools}
                  style={[localStyles.kdsActionButton, localStyles.kdsActionPrimary]}
                >
                  <Icon name="settings" size={18} color="#fff" />
                  <Text style={[localStyles.kdsActionText, { marginLeft: 6 }]}>Detalhes</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <OrderHeader key={item.id} order={item} />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isManualInput && (
                  <TouchableOpacity
                    onPress={handleAddProduct}
                    style={[globalStyles.button, { marginRight: 5 }]}
                  >
                    <Icon name="add-circle" size={24} color="#fff" />
                    <Text style={{ color: '#fff', marginLeft: 8 }}>
                      Adicionar Item
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleOrderTools}
                  style={[globalStyles.button, { marginLeft: 5 }]}
                >
                  <Icon name="settings" size={24} color="#fff" />
                  <Text style={{ color: '#fff', marginLeft: 8 }}>
                    Detalhes
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            <View
              style={[
                cssStyles.itemsSection,
                {
                  flex: 1,
                  flexDirection: 'column',
                  width: '100%',
                  backgroundColor: isKds ? '#060A11' : undefined,
                  borderRadius: isKds ? 12 : 0,
                  padding: isKds ? 8 : 0,
                },
              ]}
            >
              <OrderProducts
                order={item}
                scale={scale}
                styles={localStyles}
                indentStep={22}
              />
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  )
}

const createStyles = scale =>
  StyleSheet.create({
    itemRow: {
      marginTop: 6 * scale,
      paddingVertical: 6 * scale,
      paddingLeft: 9 * scale,
      borderLeftWidth: 5,
      borderRadius: 10,
      backgroundColor: '#101927',
    },
    text: {
      color: '#F8FAFC',
      fontSize: 17 * scale,
      fontWeight: '800',
    },
    subText: {
      color: '#CBD5E1',
      fontSize: 14 * scale,
      fontWeight: '600',
    },
    qtyText: {
      color: '#FACC15',
      fontWeight: '900',
    },
    statusMarker: {
      fontWeight: '900',
    },
    kdsContainer: {
      backgroundColor: '#060A11',
    },
    food99InfoCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#163047',
      backgroundColor: '#0A1420',
      padding: 12,
      marginBottom: 10,
    },
    food99InfoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    food99InfoTitle: {
      color: '#E2E8F0',
      fontSize: 15,
      fontWeight: '800',
    },
    food99InfoBadge: {
      color: '#7DD3FC',
      fontSize: 12,
      fontWeight: '700',
    },
    food99InfoText: {
      color: '#CBD5E1',
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 4,
    },
    food99InfoHint: {
      color: '#FCD34D',
      fontSize: 12,
      fontWeight: '700',
      marginTop: 6,
    },
    kdsActionRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    kdsActionButton: {
      flex: 1,
      borderRadius: 10,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      borderWidth: 1,
    },
    kdsActionPrimary: {
      backgroundColor: '#0B84C6',
      borderColor: '#0B84C6',
    },
    kdsActionDanger: {
      backgroundColor: '#2A1114',
      borderColor: '#7F1D1D',
    },
    kdsActionSuccess: {
      backgroundColor: '#102617',
      borderColor: '#166534',
    },
    kdsActionNeutral: {
      backgroundColor: '#1E293B',
      borderColor: '#334155',
    },
    kdsActionText: {
      color: '#F8FAFC',
      fontSize: 14,
      fontWeight: '700',
    },
    kdsActionButtonDisabled: {
      opacity: 0.6,
    },
    food99InfoWarning: {
      color: '#FDBA74',
      fontSize: 12,
      fontWeight: '700',
      marginTop: 6,
    },
  })

export default OrderDetails
