/* eslint-disable no-unused-vars */
import React, {useEffect, useMemo} from 'react'
import {useStore} from '@store'
import OrderIdentityLabel from '@controleonline/ui-orders/src/react/components/OrderIdentityLabel'
import SaleOrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails'
import OrderLogisticsPage from '@controleonline/ui-logistic/src/react/pages/orders/OrderLogisticsPage'
import {resolveOrderDetailsScreenType} from '@controleonline/ui-orders/src/react/utils/orderRoute'

const getOrderDetailsTitle = () =>
  global.t?.t('orders', 'title', 'order') || 'Pedido'

const normalizeOrder = order => (order && typeof order === 'object' ? order : null)

export default function OrderDetailsPage({navigation, route}) {
  const ordersStore = useStore('orders')
  const storeOrder = normalizeOrder(ordersStore?.getters?.item)
  const routeOrder = normalizeOrder(route?.params?.order)
  const resolvedOrder = routeOrder || storeOrder

  const screenType = useMemo(() => {
    const routeType = resolveOrderDetailsScreenType(route?.params)
    if (routeType) {
      return routeType
    }

    return resolveOrderDetailsScreenType(resolvedOrder) || 'sale'
  }, [resolvedOrder, route?.params])

  useEffect(() => {
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
  }, [navigation, resolvedOrder, screenType])

  const Screen = screenType === 'delivery' ? OrderLogisticsPage : SaleOrderDetails

  return <Screen navigation={navigation} route={route} />
}
