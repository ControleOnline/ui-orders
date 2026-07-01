import React, {useEffect, useMemo} from 'react'
import {ActivityIndicator, Text, View} from 'react-native'
import {useStore} from '@store'
import OrderIdentityLabel from '@controleonline/ui-orders/src/react/components/OrderIdentityLabel'
import SaleOrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails'
import OrderLogisticsPage from '@controleonline/ui-logistic/src/react/pages/orders/OrderLogisticsPage'
import {
  getOrderRouteId,
  resolveOrderDetailsScreenType,
} from '@controleonline/ui-orders/src/react/utils/orderRoute'

const getOrderDetailsTitle = () =>
  global.t?.t('orders', 'title', 'order') || 'Pedido'

const normalizeOrder = order => (order && typeof order === 'object' ? order : null)

const LoadingState = ({message}) => (
  <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
    <ActivityIndicator size="large" />
    <Text>{message || global.t?.t('orders', 'label', 'loading') || 'Carregando...'}</Text>
  </View>
)

const ErrorState = ({message}) => (
  <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
    <Text>{message || global.t?.t('orders', 'message', 'unableCompleteOperation') || 'Nao foi possivel carregar o pedido.'}</Text>
  </View>
)

export default function OrderDetailsPage({navigation, route}) {
  const ordersStore = useStore('orders')
  const ordersActions = ordersStore?.actions || {}
  const storeOrder = normalizeOrder(ordersStore?.getters?.item)
  const routeOrderId = useMemo(
    () => getOrderRouteId(route?.params?.id),
    [route?.params?.id],
  )
  const resolvedOrderId = getOrderRouteId(storeOrder)
  const resolvedOrder =
    routeOrderId && resolvedOrderId === routeOrderId ? storeOrder : null

  useEffect(() => {
    if (!routeOrderId) {
      return undefined
    }

    if (resolvedOrderId === routeOrderId) {
      return undefined
    }

    Promise.resolve(ordersActions.get?.(routeOrderId)).catch(() => undefined)
  }, [ordersActions, resolvedOrderId, routeOrderId])

  const screenType = useMemo(
    () => resolveOrderDetailsScreenType(resolvedOrder) || 'sale',
    [resolvedOrder],
  )

  useEffect(() => {
    if (!routeOrderId) {
      navigation.setOptions({
        title: getOrderDetailsTitle(),
        headerBackVisible: true,
      })
      return
    }

    if (!resolvedOrder && routeOrderId) {
      navigation.setOptions({
        title: getOrderDetailsTitle(),
        headerBackVisible: true,
      })
      return
    }

    if (screenType === 'delivery') {
      navigation.setOptions({
        headerShown: false,
        showBottomCart: false,
        showBottomToolBar: false,
      })
      return
    }

    navigation.setOptions({
      title: getOrderDetailsTitle(),
      headerBackVisible: true,
      headerTitle: () => (
        <OrderIdentityLabel
          order={resolvedOrder}
          primaryTextStyle={{fontSize: 16, fontWeight: '700'}}
          secondaryTextStyle={{fontSize: 11, color: '#64748B', fontWeight: '600'}}
        />
      ),
    })
  }, [navigation, resolvedOrder, routeOrderId, screenType])

  if (!routeOrderId) {
    return (
      <ErrorState
        message={global.t?.t('orders', 'message', 'unableCompleteOperation') || 'Pedido nao informado.'}
      />
    )
  }

  if (routeOrderId && !resolvedOrder) {
    if (!ordersStore?.getters?.isLoading && ordersStore?.getters?.error) {
      return (
        <ErrorState
          message={ordersStore?.getters?.error}
        />
      )
    }

    return <LoadingState />
  }

  const Screen = screenType === 'delivery' ? OrderLogisticsPage : SaleOrderDetails

  return <Screen navigation={navigation} route={route} />
}
