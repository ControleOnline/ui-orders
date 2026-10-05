import {awaitProductConfirmation, reportProductConfirmationError} from '../../../../utils/confirmPendingProducts';
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
import { useStore } from '@store'
import { setActivePosOrderContext } from '../../../../hooks/posCartSession/activePosOrderContext'
import { hasDetailedOrderProductMetadata } from '../../../../utils/orderProductsFetchPolicy'
import useCompleteWaiterLaunch from '../../../../hooks/posCartSession/useCompleteWaiterLaunch'
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
  isWaiterMode,
  isLocallyTerminalOrder,
  flushPendingOrderProductChanges,
  ordersGetters,
  refreshCurrentOrder,
  showError,
  showSuccess,
}) {
  const completeWaiterLaunch = useCompleteWaiterLaunch()
  const peopleStore = useStore('people')
  const deviceStore = useStore('device')
  const [primaryActionLoading, setPrimaryActionLoading] = useState(false)

  const handleAddProduct = useCallback(async () => {
    if (!canMutateOrderProducts || isLocallyTerminalOrder) return
    try {
      await flushPendingOrderProductChanges()
      const target = item || orderParam || routeOrderId
      const snapshot = ordersGetters.item
      const orderId = getEntityId(target)
      const companyId = getEntityId(peopleStore.getters.currentCompany)
      const deviceId = getEntityId(deviceStore.getters.item)
      const loadedAt = Number(ordersGetters.loadedAt)
      const age = Date.now() - loadedAt
      const lines = snapshot?.orderProducts
      // Reuse only a recent server acknowledgment; navigation must not renew it.
      if (String(app_type || '').toUpperCase() === 'POS' && isWaiterMode &&
          companyId && deviceId && orderId && getEntityId(snapshot) === orderId &&
          getEntityId(snapshot?.provider) === companyId &&
          String(ordersGetters.loadedKey) === String(orderId) &&
          !ordersGetters.error && !ordersGetters.isSaving && loadedAt > 0 &&
          age >= 0 && age < 30000 && Array.isArray(lines) &&
          (lines.length === 0 || hasDetailedOrderProductMetadata(lines))) {
        setActivePosOrderContext({companyId, deviceId, order: snapshot,
          confirmed: true, confirmedAt: loadedAt})
      }
      const shouldUseManagerPdv =
        String(app_type || '').toUpperCase() === 'MANAGER' ||
        route?.params?.interactionMode === 'pdv'
      navigation.navigate('AddProductScreen', buildAddProductsRouteParams(target,
        shouldUseManagerPdv
          ? buildManagerPdvRouteParams({singleItemMode: isSingleItemOperationMode})
          : {singleItemMode: isSingleItemOperationMode}))
    } catch (error) {
      showError(formatApiError(error))
    }
  }, [canMutateOrderProducts, isLocallyTerminalOrder, flushPendingOrderProductChanges,
    item, orderParam, routeOrderId, ordersGetters, peopleStore, deviceStore,
    isWaiterMode, route?.params?.interactionMode, navigation,
    isSingleItemOperationMode, showError])

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
      if (isWaiterMode) await awaitProductConfirmation(targetOrder)
      await flushPendingOrderProductChanges()

      const response = await api.post(`/orders/${orderId}/confirm`, {})
      const result = response && Object.prototype.hasOwnProperty.call(response, 'result')
        ? response.result
        : response

      if (!result || typeof result !== 'object' || result.errno === undefined) {
        throw new Error('Invalid order confirmation response.');
      }

      if (String(result.errno) !== '0') {
        throw result || response
      }

      if (isWaiterMode) completeWaiterLaunch(orderId)
      else await refreshCurrentOrder({ force: true })
      showSuccess(
        global.t?.t('orders', 'message', 'orderSentToProduction') ||
          'Pedido enviado para producao.',
      )

      if (isWaiterMode) {
        navigation.navigate('HomePage')
      }
    } catch (error) {
      reportProductConfirmationError(error, () => showError(formatApiError(error)))
    } finally {
      setPrimaryActionLoading(false)
    }
  }, [
    completeWaiterLaunch,
    flushPendingOrderProductChanges,
    isLocallyTerminalOrder,
    currentOrderSnapshot,
    isWaiterMode,
    navigation,
    refreshCurrentOrder,
    showError,
    showSuccess,
  ])

  const appType = String(app_type || '').trim().toUpperCase()
  const primaryActionSourceOrder = currentOrderSnapshot
  const primaryActionMode = isWaiterMode
    ? 'produce'
    : resolveOrderDetailsPrimaryActionMode({
        appType,
        order: primaryActionSourceOrder,
      })
  const primaryActionLabel = isWaiterMode
    ? global.t?.t('orders', 'button', 'produce') || 'Enviar para produção'
    : resolveOrderDetailsPrimaryActionLabel({
        appType,
        order: primaryActionSourceOrder,
      })
  const primaryActionIcon = isWaiterMode
    ? 'send'
    : resolveOrderDetailsPrimaryActionIcon({
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
