import { useCallback, useMemo, useState } from 'react'
import { api } from '@controleonline/ui-common/src/api'
import {
  buildAddProductsRouteParams,
  buildCheckoutRouteParams,
  buildManagerPdvRouteParams,
  isPdvRouteContext,
} from '@controleonline/ui-orders/src/react/utils/orderRoute'
import {
  resolveOrderDetailsPrimaryActionIcon,
  resolveOrderDetailsPrimaryActionLabel,
  resolveOrderDetailsPrimaryActionMode,
} from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetailsPaymentBar'
import { app_type } from '@appType'
import { formatApiError, getEntityId } from './helpers'

/**
 * Primary action handlers for OrderDetails: add product, pay, produce.
 */
export default function useOrderDetailsPrimaryActions({
  canMutateOrderProducts,
  item,
  orderParam,
  routeOrderId,
  route,
  navigation,
  isSingleItemOperationMode,
  isLocallyTerminalOrder,
  flushPendingOrderProductChanges,
  ordersGetters,
  refreshCurrentOrder,
  showError,
  showSuccess,
}) {
  const [primaryActionLoading, setPrimaryActionLoading] = useState(false)

  const handleAddProduct = useCallback(() => {
    if (!canMutateOrderProducts) return
    const shouldUseManagerPdv =
      String(app_type || '').toUpperCase() === 'MANAGER' ||
      route?.params?.interactionMode === 'pdv'

    navigation.navigate(
      'AddProductScreen',
      buildAddProductsRouteParams(
        item || orderParam || routeOrderId,
        shouldUseManagerPdv
          ? buildManagerPdvRouteParams({
              singleItemMode: isSingleItemOperationMode,
            })
          : { singleItemMode: isSingleItemOperationMode },
      ),
    )
  }, [
    canMutateOrderProducts,
    item,
    orderParam,
    routeOrderId,
    route?.params?.interactionMode,
    navigation,
    isSingleItemOperationMode,
  ])

  const handleAddPayment = useCallback(async () => {
    if (!item?.id || isLocallyTerminalOrder) return
    await flushPendingOrderProductChanges()
    const shouldKeepPdvMode = isPdvRouteContext(route?.params)
    navigation.navigate(
      'Checkout',
      buildCheckoutRouteParams(
        ordersGetters.item || item,
        shouldKeepPdvMode
          ? buildManagerPdvRouteParams({ showBottomCart: false })
          : {},
      ),
    )
  }, [
    flushPendingOrderProductChanges,
    item,
    navigation,
    isLocallyTerminalOrder,
    ordersGetters.item,
    route?.params,
  ])

  const currentOrderSnapshot = useMemo(
    () =>
      item || orderParam
        ? {
            ...(orderParam || {}),
            ...(item || {}),
          }
        : null,
    [item, orderParam],
  )

  const handleProduceOrder = useCallback(async () => {
    const targetOrder = currentOrderSnapshot
    const orderId = getEntityId(targetOrder)

    if (!orderId || isLocallyTerminalOrder) {
      return
    }

    // Cart orders with mesa/comanda context are promoted here instead of opening Checkout.
    setPrimaryActionLoading(true)

    try {
      await flushPendingOrderProductChanges()

      const response = await api.post(`/orders/${orderId}/confirm`, {})
      const result = response?.result || response

      if (String(result?.errno ?? '0') !== '0') {
        throw result || response
      }

      await refreshCurrentOrder({ force: true })
      showSuccess(
        global.t?.t('orders', 'message', 'orderSentToProduction') ||
          'Pedido enviado para producao.',
      )
    } catch (error) {
      showError(formatApiError(error))
    } finally {
      setPrimaryActionLoading(false)
    }
  }, [
    flushPendingOrderProductChanges,
    isLocallyTerminalOrder,
    currentOrderSnapshot,
    refreshCurrentOrder,
    showError,
    showSuccess,
  ])

  const appType = String(app_type || '').trim().toUpperCase()
  const primaryActionSourceOrder = currentOrderSnapshot
  const primaryActionMode = resolveOrderDetailsPrimaryActionMode({
    appType,
    order: primaryActionSourceOrder,
  })
  const primaryActionLabel = resolveOrderDetailsPrimaryActionLabel({
    appType,
    order: primaryActionSourceOrder,
  })
  const primaryActionIcon = resolveOrderDetailsPrimaryActionIcon({
    appType,
    order: primaryActionSourceOrder,
  })

  const handlePrimaryAction = useCallback(async () => {
    if (primaryActionMode === 'produce') {
      await handleProduceOrder()
      return
    }

    await handleAddPayment()
  }, [handleAddPayment, handleProduceOrder, primaryActionMode])

  return {
    primaryActionLoading,
    setPrimaryActionLoading,
    handleAddProduct,
    handleAddPayment,
    handleProduceOrder,
    handlePrimaryAction,
    currentOrderSnapshot,
    primaryActionMode,
    primaryActionLabel,
    primaryActionIcon,
  }
}
