import React, { useCallback, useMemo } from 'react'
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader'
import { useStore } from '@store'
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore'
import css from '@controleonline/ui-orders/src/react/css/orders'
import Icon from 'react-native-vector-icons/MaterialIcons'
import BarcodeInput from '@controleonline/ui-orders/src/react/pages/checkout/BarcodeInput'
import OrderProducts from '@controleonline/ui-ppc/src/react/components/OrderProducts'
import KDSOrderHeader from '@controleonline/ui-ppc/src/react/components/KDSOrderHeader'

const OrderDetails = ({ route, navigation }) => {
  const orderParam = route.params.order
  const isKds = !!route.params?.kds

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

  const showBarcodeInput = item?.app === 'POS'
  const isManualInput = productInputType === 'manual'

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
              <KDSOrderHeader order={item} showCustomer />

              <View style={localStyles.kdsActionRow}>
                <TouchableOpacity style={[localStyles.kdsActionButton, localStyles.kdsActionDanger]}>
                  <Text style={localStyles.kdsActionText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[localStyles.kdsActionButton, localStyles.kdsActionSuccess]}>
                  <Text style={localStyles.kdsActionText}>Entregue</Text>
                </TouchableOpacity>
              </View>

              <View style={localStyles.kdsActionRow}>
                {isManualInput && (
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
  })

export default OrderDetails
