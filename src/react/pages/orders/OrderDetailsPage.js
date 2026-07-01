import React, {useEffect, useMemo, useState} from 'react'
import {useStore} from '@store'
import OrderIdentityLabel from '@controleonline/ui-orders/src/react/components/OrderIdentityLabel'
import SaleOrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails'
import OrderLogisticsPage from '@controleonline/ui-logistic/src/react/pages/orders/OrderLogisticsPage'
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore'
import {
  getOrderRouteId,
  resolveOrderDetailsScreenType,
} from '@controleonline/ui-orders/src/react/utils/orderRoute'

const getOrderDetailsTitle = () =>
  global.t?.t('orders', 'title', 'order') || 'Pedido'

const normalizeOrder = order => (order && typeof order === 'object' ? order : null)

export default function OrderDetailsPage({navigation, route}) {
  const ordersStore = useStore('orders')
  const ordersActions = ordersStore?.actions || {}
  const [resolvedOrderFromFetch, setResolvedOrderFromFetch] = useState(null)
  const [orderLoadError, setOrderLoadError] = useState(null)
  const routeOrderId = useMemo(
    () => getOrderRouteId(route?.params?.id),
    [route?.params?.id],
  )

  useEffect(() => {
    let isCancelled = false

    setResolvedOrderFromFetch(null)
    setOrderLoadError(null)

    if (!routeOrderId) {
      return undefined
    }

    if (typeof ordersActions.get !== 'function') {
      setOrderLoadError(
        global.t?.t('orders', 'message', 'unableCompleteOperation') ||
          'Nao foi possivel carregar o pedido.',
      )
      return undefined
    }

    Promise.resolve(
      ordersActions.get({
        id: routeOrderId,
        __storeMeta: {
          preserveItem: true,
        },
      }),
    )
      .then(order => {
        if (isCancelled) {
          return order
        }

        const normalizedOrder = normalizeOrder(order)

        if (!normalizedOrder) {
          setOrderLoadError(
            global.t?.t('orders', 'message', 'unableCompleteOperation') ||
              'Nao foi possivel carregar o pedido.',
          )
          return order
        }

        setResolvedOrderFromFetch(normalizedOrder)
        return order
      })
      .catch(error => {
        if (!isCancelled) {
          setOrderLoadError(error || true)
        }

        return undefined
      })

    return () => {
      isCancelled = true
    }
  }, [ordersActions, routeOrderId])

  const isFetchingCurrentOrder = Boolean(routeOrderId && !resolvedOrderFromFetch && !orderLoadError)

  const screenType = useMemo(
    () => resolveOrderDetailsScreenType(resolvedOrderFromFetch) || 'sale',
    [resolvedOrderFromFetch],
  )

  if (routeOrderId) {
    console.error(
      '[OrderDetailsPage debug]',
      `route=${routeOrderId}`,
      `loading=${isFetchingCurrentOrder}`,
      `error=${Boolean(orderLoadError)}`,
      `orderType=${resolvedOrderFromFetch?.orderType || resolvedOrderFromFetch?.order_type || ''}`,
      `screenType=${screenType}`,
    )
  }

  useEffect(() => {
    if (!routeOrderId) {
      navigation.setOptions({
        title: getOrderDetailsTitle(),
        headerBackVisible: true,
      })
      return
    }

    if (!resolvedOrderFromFetch) {
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
          order={resolvedOrderFromFetch}
          primaryTextStyle={{fontSize: 16, fontWeight: '700'}}
          secondaryTextStyle={{fontSize: 11, color: '#64748B', fontWeight: '600'}}
        />
      ),
    })
  }, [navigation, resolvedOrderFromFetch, routeOrderId, screenType])

  if (!routeOrderId) {
    return (
      <StateStore
        error={global.t?.t('orders', 'message', 'unableCompleteOperation') || 'Pedido nao informado.'}
      />
    )
  }

  if (isFetchingCurrentOrder) {
    return <StateStore loading="Carregando pedido..." />
  }

  if (orderLoadError && !resolvedOrderFromFetch) {
    return (
      <StateStore
        error={orderLoadError}
        errorText="Nao foi possivel carregar o pedido."
      />
    )
  }

  if (!resolvedOrderFromFetch) {
    return <StateStore loading="Carregando pedido..." />
  }

  const Screen = screenType === 'delivery' ? OrderLogisticsPage : SaleOrderDetails

  return <Screen navigation={navigation} route={route} />
}
