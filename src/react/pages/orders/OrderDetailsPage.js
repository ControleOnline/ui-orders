import React, {useEffect, useMemo, useRef, useState} from 'react'
import {useStore} from '@store'
import OrderIdentityLabel from '@controleonline/ui-orders/src/react/components/OrderIdentityLabel'
import SaleOrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails'
import OrderLogisticsPage from '@controleonline/ui-logistic/src/react/pages/orders/OrderLogisticsPage'
import DefaultErrors from '@controleonline/ui-default/src/react/components/errors/DefaultErrors'
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore'
import {
  getOrderRouteId,
  resolveOrderDetailsScreenType,
} from '@controleonline/ui-orders/src/react/utils/orderRoute'

const getOrderDetailsTitle = () =>
  global.t?.t('orders', 'title', 'order') || 'Pedido'

const normalizeOrder = order => (order && typeof order === 'object' ? order : null)
const pendingOrderDetailLoads = new Map()
const hasAddressCoordinates = address =>
  Number.isFinite(Number(address?.latitude)) && Number.isFinite(Number(address?.longitude))

const hasDeliveryDetailPayload = order =>
  Boolean(
    order &&
      typeof order === 'object' &&
      order.addressOrigin &&
      order.addressDestination &&
      hasAddressCoordinates(order.addressOrigin) &&
      hasAddressCoordinates(order.addressDestination),
  )

export default function OrderDetailsPage({navigation, route}) {
  const ordersStore = useStore('orders')
  const ordersActions = ordersStore?.actions || {}
  const storeOrder = normalizeOrder(ordersStore?.getters?.item)
  const storeOrderId = getOrderRouteId(storeOrder)
  const storeLoadedKey = getOrderRouteId(ordersStore?.getters?.loadedKey)
  const storeOrderType = resolveOrderDetailsScreenType(storeOrder)
  const routeOrder = normalizeOrder(route?.params?.order)
  const [resolvedOrderFromFetch, setResolvedOrderFromFetch] = useState(null)
  const [orderLoadError, setOrderLoadError] = useState(null)
  const routeOrderId = useMemo(
    () => getOrderRouteId(route?.params?.id || routeOrder || storeOrder),
    [route?.params?.id, routeOrder, storeOrder],
  )
  const lastResetRouteOrderIdRef = useRef('')
  const lastTrustedRouteOrderIdRef = useRef('')
  const requestedRouteOrderIdRef = useRef('')
  const hasStoreOrderProducts = Array.isArray(storeOrder?.orderProducts)
  const shouldTrustStoreOrder = Boolean(
    routeOrderId &&
      (storeLoadedKey === routeOrderId || storeOrderId === routeOrderId) &&
      (
        (storeOrderType === 'delivery' && hasDeliveryDetailPayload(storeOrder)) ||
        ((storeOrderType === 'sale' || storeOrderType === 'cart') && hasStoreOrderProducts)
      ),
  )

  useEffect(() => {
    if (lastResetRouteOrderIdRef.current === routeOrderId) {
      return undefined
    }

    lastResetRouteOrderIdRef.current = routeOrderId
    requestedRouteOrderIdRef.current = ''
    setResolvedOrderFromFetch(null)
    setOrderLoadError(null)
  }, [routeOrderId])

  useEffect(() => {
    if (!routeOrderId) {
      return undefined
    }

    if (shouldTrustStoreOrder) {
      if (lastTrustedRouteOrderIdRef.current === routeOrderId) {
        return undefined
      }

      lastTrustedRouteOrderIdRef.current = routeOrderId
      requestedRouteOrderIdRef.current = routeOrderId
      if (orderLoadError !== null) {
        setOrderLoadError(null)
      }
      return undefined
    }

    if (requestedRouteOrderIdRef.current === routeOrderId) {
      return undefined
    }

    requestedRouteOrderIdRef.current = routeOrderId
    setResolvedOrderFromFetch(null)
    setOrderLoadError(null)

    if (typeof ordersActions.get !== 'function') {
      setOrderLoadError(
        global.t?.t('orders', 'message', 'unableCompleteOperation') ||
          'Nao foi possivel carregar o pedido.',
      )
      return undefined
    }

    let isCancelled = false
    let request = pendingOrderDetailLoads.get(routeOrderId) || null

    if (!request) {
      try {
        request = Promise.resolve(
        ordersActions.get({
          id: routeOrderId,
          __storeMeta: {
            preserveItem: true,
            skipSystemError: true,
          },
        }),
      )
        pendingOrderDetailLoads.set(routeOrderId, request)
      } catch (error) {
        setOrderLoadError(error || true)
        return undefined
      }
    }

    request
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
      .finally(() => {
        if (pendingOrderDetailLoads.get(routeOrderId) === request) {
          pendingOrderDetailLoads.delete(routeOrderId)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [ordersActions.get, routeOrderId, shouldTrustStoreOrder])

  const resolvedOrder =
    resolvedOrderFromFetch || (shouldTrustStoreOrder ? storeOrder : null)
  const isFetchingCurrentOrder = Boolean(
    routeOrderId && !resolvedOrder && !orderLoadError,
  )
  const screenType = resolveOrderDetailsScreenType(resolvedOrder) || 'sale'
  const screenRoute = useMemo(
    () =>
      resolvedOrder
        ? {
            ...route,
            params: {
              ...(route?.params || {}),
              id: routeOrderId || route?.params?.id || routeOrder?.id,
              order: resolvedOrder,
            },
          }
        : route,
    [resolvedOrder, route, routeOrderId, routeOrder?.id],
  )
  useEffect(() => {
    if (!routeOrderId) {
      navigation.setOptions({
        title: getOrderDetailsTitle(),
        headerBackVisible: true,
      })
      return
    }

    if (!resolvedOrder) {
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
        showBottomToolBar: true,
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
  }, [navigation, resolvedOrder?.id, routeOrderId, screenType])

  if (!routeOrderId) {
    return (
      <DefaultErrors title="Pedido nao informado." />
    )
  }

  if (isFetchingCurrentOrder) {
    return <StateStore mode="display" loading="Carregando pedido..." />
  }

  if (orderLoadError && !resolvedOrder) {
    return (
      <DefaultErrors
        error={orderLoadError}
        title="Nao foi possivel carregar o pedido."
      />
    )
  }

  if (!resolvedOrder) {
    return <StateStore mode="display" loading="Carregando pedido..." />
  }

  const Screen = screenType === 'delivery' ? OrderLogisticsPage : SaleOrderDetails

  return <Screen navigation={navigation} route={screenRoute} />
}
