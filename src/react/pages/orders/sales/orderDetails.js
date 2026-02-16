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

const OrderDetails = ({ route, navigation }) => {
  const orderParam = route.params.order

  const ordersStore = useStore('orders')
  const { getters: ordersGetters, actions: ordersActions } = ordersStore
  const { item, isLoading, error } = ordersGetters

  const invoiceStore = useStore('invoice')
  const { getters: invoiceGetters, actions: invoiceActions } = invoiceStore
  const { items: invoices } = invoiceGetters

  const { styles: cssStyles, globalStyles } = css()
  const { width } = useWindowDimensions()

  const scale = useMemo(() => {
    if (width >= 1800) return 0.85
    if (width >= 1400) return 0.9
    return 0.95
  }, [width])

  const localStyles = useMemo(() => createStyles(scale), [scale])

  const deviceConfigStore = useStore('device_config')
  const device = deviceConfigStore.getters?.item
  const productInputType = device?.configs?.['product-input-type'] || 'manual'

  const showBarcodeInput = item?.app === 'POS'

  productInputType === 'barcode' || productInputType === 'rfid'

  const isManualInput =

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
    <SafeAreaView style={[cssStyles.container, { flex: 1, paddingBottom: 120 }]}>
      {showBarcodeInput && <BarcodeInput />}

      <StateStore store="orders" />

      {!isLoading && item && !error && (
        <View style={{ flex: 1 }}>
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

          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            <View
              style={[
                cssStyles.itemsSection,
                {
                  flex: 1,
                  flexDirection: 'column',
                  width: '100%',
                },
              ]}
            >
              <OrderProducts
                order={item}
                scale={scale}
                styles={localStyles}
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
      marginTop: 4 * scale,
      paddingLeft: 6 * scale,
      borderLeftWidth: 4,
    },
    text: {
      color: '#fff',
      fontSize: 14 * scale,
    },
    subText: {
      color: '#aaa',
      fontSize: 12 * scale,
    },
  })

export default OrderDetails
