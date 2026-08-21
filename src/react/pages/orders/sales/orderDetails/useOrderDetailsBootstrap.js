import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@store'
import css from '@controleonline/ui-orders/src/react/css/orders'
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService'
import {
  isDeviceRuntimeDebugInfoEnabled,
  isPosTotemMode,
  isPosSingleItemMode,
  isTruthyValue,
  parseConfigsObject,
  isPosSelfServiceMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap'
import {
  buildAddProductsRouteParams,
  buildManagerPdvRouteParams,
  getOrderRouteId,
} from '@controleonline/ui-orders/src/react/utils/orderRoute'
import { app_type } from '@appType'
import {
  shouldShowOperationalBottomNavigation,
} from '@controleonline/ui-layout/src/react/utils/posBottomNavigation'
import useOrderDetailsVisuals from '../useOrderDetailsVisuals'
import {
  shouldRenderOrderDetailsPaymentBar,
} from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetailsPaymentBar'
import {
  POS_DELIVERY_ENABLED_CONFIG_KEY,
  isTerminalOrderStatus,
  resolveEditableOrderType,
  getEntityId,
} from './helpers'

/**
 * Route params, stores, device config, navigation effects and base derived flags
 * for OrderDetails. Keeps the page shell thin (wiring + feature hooks only).
 */
export default function useOrderDetailsBootstrap({ route, navigation }) {
  const appType = String(app_type || '').trim().toUpperCase()
  const routeOrderId = useMemo(
    () => getOrderRouteId(route.params?.id || route.params?.order),
    [route.params?.id, route.params?.order],
  )
  const routeOrderIri = useMemo(
    () => (routeOrderId ? `/orders/${routeOrderId}` : null),
    [routeOrderId],
  )
  const orderParam = useMemo(() => {
    const routeOrder = route.params?.order || null
    if (!routeOrder) return null

    const routeParamOrderId = getOrderRouteId(routeOrder)
    if (routeOrderId && routeParamOrderId && routeParamOrderId !== routeOrderId) {
      return null
    }

    return routeOrder
  }, [route.params?.order, routeOrderId])
  const useUnifiedKdsLayout = true
  const hasKdsOrigin =
    appType === 'PPC' ||
    !!route.params?.displayId ||
    !!route.params?.display?.id ||
    String(
      route.params?.displayType || route.params?.display?.displayType || '',
    ).trim() !== ''
  const isKds = Boolean(route.params?.kds && hasKdsOrigin)
  const isTvDisplay = String(route.params?.displayType || '').toLowerCase() === 'tv'
  const shouldShowMobilePaymentBar = shouldRenderOrderDetailsPaymentBar({
    useUnifiedKdsLayout,
    isKds,
    isTvDisplay,
  })
  const { showError, showSuccess } = useMessage()
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)
  const [financialDetailsVisible, setFinancialDetailsVisible] = useState(false)
  const [attachmentsVisible, setAttachmentsVisible] = useState(false)
  const insets = useSafeAreaInsets()

  const ordersStore = useStore('orders')
  const { getters: ordersGetters, actions: ordersActions } = ordersStore
  const { item: storedOrderItem, isLoading, error } = ordersGetters
  const item = useMemo(() => {
    if (!routeOrderId) return storedOrderItem
    return getOrderRouteId(storedOrderItem) === routeOrderId ? storedOrderItem : null
  }, [routeOrderId, storedOrderItem])
  const invoiceStore = useStore('invoice')
  const { actions: invoiceActions } = invoiceStore
  const orderInvoicesStore = useStore('order_invoices')
  const {
    actions: orderInvoicesActions,
    getters: orderInvoicesGetters,
  } = orderInvoicesStore
  const {
    items: storedOrderInvoiceItems,
    isLoading: orderInvoicesLoading,
  } = orderInvoicesGetters

  const peopleStore = useStore('people')
  const { getters: peopleGetters, actions: peopleActions } = peopleStore
  const { defaultCompany, currentCompany } = peopleGetters
  const addressStore = useStore('address')
  const { actions: addressActions } = addressStore

  const { styles: cssStyles, globalStyles } = css()
  const { ppcColors, styles: localStyles, width: viewportWidth } = useOrderDetailsVisuals()
  const selectedDisplay = useMemo(() => {
    if (!isKds) {
      return null
    }

    const normalizedDisplayId = String(
      route.params?.displayId || route.params?.display?.id || '',
    )
      .replace(/\D+/g, '')
      .trim()

    if (!normalizedDisplayId) {
      return null
    }

    return {
      id: normalizedDisplayId,
      displayType: route.params?.displayType || route.params?.display?.displayType || '',
    }
  }, [isKds, route.params?.display?.displayType, route.params?.display?.id, route.params?.displayId, route.params?.displayType])

  const orderCompanyId = useMemo(
    () =>
      getEntityId(item?.provider) ||
      getEntityId(orderParam?.provider) ||
      getEntityId(currentCompany) ||
      getEntityId(defaultCompany),
    [item?.provider, orderParam?.provider, currentCompany, defaultCompany],
  )
  const orderCompanyIri = useMemo(
    () => (orderCompanyId ? `/people/${orderCompanyId}` : null),
    [orderCompanyId],
  )
  const deviceConfigStore = useStore('device_config')
  const device = deviceConfigStore.getters?.item
  const deviceConfigs = parseConfigsObject(device?.configs)
  const productInputType = device?.configs?.['product-input-type'] || 'manual'
  const isPosSelfServiceOperationMode = isPosSelfServiceMode(deviceConfigs)
  const isSingleItemOperationMode =
    route?.params?.singleItemMode === true ||
    isPosSingleItemMode(deviceConfigs)
  const shouldShowBottomNavigation = useMemo(
    () =>
      shouldShowOperationalBottomNavigation({
        appType,
        interactionMode: route?.params?.interactionMode,
        isTotemMode: isPosTotemMode(deviceConfigs),
      }),
    [appType, deviceConfigs, route?.params?.interactionMode],
  )
  const isDeviceDeliveryEnabled = isTruthyValue(
    deviceConfigs?.[POS_DELIVERY_ENABLED_CONFIG_KEY],
  )
  const isDeviceDebugEnabled = isDeviceRuntimeDebugInfoEnabled(deviceConfigs)
  const canShowDebugActions = !isPosSelfServiceOperationMode || isDeviceDebugEnabled

  useEffect(() => {
    if (!shouldShowBottomNavigation) {
      if (route?.params?.showBottomToolBar !== true) {
        return
      }

      navigation.setParams({ showBottomToolBar: false })
      return
    }

    if (route?.params?.showBottomToolBar === true) {
      return
    }

    navigation.setParams({ showBottomToolBar: true })
  }, [
    navigation,
    route?.params?.showBottomToolBar,
    shouldShowBottomNavigation,
  ])

  useLayoutEffect(() => {
    if (!isSingleItemOperationMode) {
      return
    }

    // Single-item mode: order details is not part of the flow.
    // Going back from here means swapping the item on AddProductScreen before pay.
    const replaceRoute = buildAddProductsRouteParams(
      item || orderParam || routeOrderId,
      buildManagerPdvRouteParams({ singleItemMode: true }),
    )

    if (typeof navigation?.replace === 'function') {
      navigation.replace('AddProductScreen', replaceRoute)
      return
    }

    navigation?.navigate?.('AddProductScreen', replaceRoute)
  }, [
    item,
    navigation,
    orderParam,
    route?.params?.interactionMode,
    routeOrderId,
    isSingleItemOperationMode,
  ])

  const isManualInput = productInputType === 'manual'
  const showBarcodeInput = item?.app === 'POS' && !isManualInput
  const localStatusNameKey = String(
    item?.status?.status ||
    orderParam?.status?.status ||
    '',
  ).trim().toLowerCase()
  const localRealStatusKey = String(
    item?.status?.realStatus ||
    orderParam?.status?.realStatus ||
    '',
  ).trim().toLowerCase()
  const isLocallyTerminalOrder =
    isTerminalOrderStatus(item?.status?.realStatus) ||
    isTerminalOrderStatus(orderParam?.status?.realStatus)
  const isPurchaseOrder = String(item?.orderType || orderParam?.orderType || '').toLowerCase() === 'purchase'
  const shouldShowOrderPartyDetails = isPurchaseOrder || isDeviceDeliveryEnabled
  const localOrderTypeKey = resolveEditableOrderType(item?.orderType || orderParam?.orderType || '')

  return {
    appType,
    routeOrderId,
    routeOrderIri,
    orderParam,
    useUnifiedKdsLayout,
    isKds,
    isTvDisplay,
    shouldShowMobilePaymentBar,
    showError,
    showSuccess,
    detailsModalVisible,
    setDetailsModalVisible,
    financialDetailsVisible,
    setFinancialDetailsVisible,
    attachmentsVisible,
    setAttachmentsVisible,
    insets,
    ordersGetters,
    ordersActions,
    isLoading,
    error,
    item,
    invoiceActions,
    orderInvoicesActions,
    storedOrderInvoiceItems,
    orderInvoicesLoading,
    peopleActions,
    defaultCompany,
    currentCompany,
    addressActions,
    cssStyles,
    globalStyles,
    ppcColors,
    localStyles,
    viewportWidth,
    selectedDisplay,
    orderCompanyId,
    orderCompanyIri,
    device,
    deviceConfigs,
    productInputType,
    isPosSelfServiceOperationMode,
    isSingleItemOperationMode,
    shouldShowBottomNavigation,
    isDeviceDeliveryEnabled,
    canShowDebugActions,
    showBarcodeInput,
    localStatusNameKey,
    localRealStatusKey,
    isLocallyTerminalOrder,
    isPurchaseOrder,
    shouldShowOrderPartyDetails,
    localOrderTypeKey,
  }
}
