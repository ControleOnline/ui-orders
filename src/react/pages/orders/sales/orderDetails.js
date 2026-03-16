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

const OrderDetails = ({ route, navigation }) => {
  const orderParam = route.params.order
  const isKds = !!route.params?.kds
  const { showError, showSuccess } = useMessage()
  const [food99ActionLoading, setFood99ActionLoading] = useState('')

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

  const runFood99OrderAction = useCallback(
    async action => {
      if (!item?.id || !isFood99Order || food99ActionLoading) {
        return
      }

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

        if ((response?.result?.errno ?? 1) !== 0) {
          throw response?.result || response
        }

        await refreshCurrentOrder()
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
      refreshCurrentOrder,
      showSuccess,
      showError,
      isKds,
      navigation,
    ],
  )

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

              {isFood99Order ? (
                <View style={localStyles.kdsActionRow}>
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
    kdsActionText: {
      color: '#F8FAFC',
      fontSize: 14,
      fontWeight: '700',
    },
    kdsActionButtonDisabled: {
      opacity: 0.6,
    },
  })

export default OrderDetails
