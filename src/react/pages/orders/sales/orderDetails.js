import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
  Modal,
  Text,
  TextInput,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native'

import { useFocusEffect } from '@react-navigation/native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@store'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
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
  searchCompanyProducts,
  toEntityIri,
} from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders'
import {api} from '@controleonline/ui-common/src/api'

import {
  formatHumanLabel,
  normalizeText,
} from '@controleonline/ui-common/src/react/utils/entityDisplay'
import DefaultAddress from '@controleonline/ui-default/src/react/components/address/DefaultAddress'
import {
  formatInvoiceTypeLabel,
  getInvoicePaymentTypeLabel,
} from '@controleonline/ui-common/src/react/utils/invoicePresentation'

import StateStore from '@controleonline/ui-common/src/react/components/StateStore'
import css from '@controleonline/ui-orders/src/react/css/orders'
import Icon from 'react-native-vector-icons/MaterialIcons'
import BarcodeInput from '@controleonline/ui-orders/src/react/pages/checkout/BarcodeInput'
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader'
import BottomCart from '@controleonline/ui-orders/src/react/components/cart/BottomCart'
import AddCompanyModal from '@controleonline/ui-people/src/react/components/AddCompanyModal'
import OrderInvoices from './OrderInvoices'
import OrderItemsTab from './OrderItemsTab'
import {
  buildAddProductsRouteParams,
  buildCheckoutRouteParams,
  buildManagerPdvRouteParams,
  getOrderRouteId,
  isPdvRouteContext,
} from '@controleonline/ui-orders/src/react/utils/orderRoute'
import { resolveMarketplaceAppLabel } from '@controleonline/ui-orders/src/react/utils/orderIdentity'
import {app_type} from '@appType'
import useDebouncedOrderProductQuantitySync from '@controleonline/ui-orders/src/react/hooks/useDebouncedOrderProductQuantitySync'
import usePosOrderMaterialization from '@controleonline/ui-orders/src/react/hooks/usePosOrderMaterialization'

import {
  calculateOrderProductsSubtotal,
  mergeOrderProductIntoList,
  mergeOrderWithOrderProducts,
  removeOrderProductFromList,
  withOrderProductQuantity,
} from '@controleonline/ui-orders/src/utils/orderState'
import { extractVisibleOrderExtraEntries } from '@controleonline/ui-orders/src/react/utils/orderExtraData'
import {
  resolveOperationalDisplayAmount,
  resolveOperationalDisplayLabelKey,
} from '@controleonline/ui-orders/src/react/utils/checkoutInvoices'

import OrderMarketplaceOverlayHost from './components/OrderMarketplaceOverlayHost'
import OrderSummaryModal from './components/OrderSummaryModal'
import OrderFinancialDetailsModal from './components/OrderFinancialDetailsModal'
import OrderAttachmentManager from './components/OrderAttachmentManager'
import OrderStackedTopBar from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderStackedTopBar'
import OrderTopBarActions, {
  ORDER_TOP_BAR_ACTIONS,
} from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderTopBarActions'
import {
  getOwnedBottomBarOffset,
  shouldShowOperationalBottomNavigation,
} from '@controleonline/ui-layout/src/react/utils/posBottomNavigation'
import useOrderDetailsVisuals from './useOrderDetailsVisuals'
import useOrderMarketplaceSummary from './useOrderMarketplaceSummary'
import {
  resolveMarketplaceInvoicePresentation,
  resolveMarketplaceReceivableAmount,
} from './orderMarketplaceFinancialPresentation'
import {
  shouldRenderOrderDetailsInlineTotal,
  resolveOrderDetailsPrimaryActionIcon,
  resolveOrderDetailsPrimaryActionLabel,
  resolveOrderDetailsPrimaryActionMode,
  shouldRenderOrderDetailsPaymentAction,
  shouldRenderOrderDetailsPaymentBar,
} from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetailsPaymentBar'

import {
  inlineStyle_2712_14,
  inlineStyle_2718_20,
  inlineStyle_2725_26,
  inlineStyle_2737_26,
  inlineStyle_2748_24,
} from './orderDetails.styles';

import {
  formatApiError,
  TERMINAL_ORDER_STATUSES,
  DRAFT_SALE_ORDER_TYPE,
  POS_DELIVERY_ENABLED_CONFIG_KEY,
  isTerminalOrderStatus,
  resolveEditableOrderType,
  translateOrderStatus,
  resolveEmbeddedOrderProducts,
  hasOrderProducts,
  getEmbeddedOrderProductComponents,
  hasGroupingMetadata,
  hasEmbeddedOrderProductComponents,
  hasDetailedOrderProductsPayload,
  filterOrderProductsByOrderId,
  choosePreferredOrderProducts,
  getOrderProductCollectionSignature,
  areOrderProductCollectionsEquivalent,
  resolveInvoiceStatusPresentation,
  resolveInvoiceTitle,
  getEntityId,
  getPeopleLabel,
  resolveInvoicePartyLabel,
  resolveInvoiceDisplayAmount,
  resolveInvoiceKind,
  resolvePreferredText,
  resolveDocumentLabel,
  formatOrderDateTime,
  resolveOrderDateValue,
  resolveOrderItemUnitLabel,
  resolveProductUnitLabel,
  mergeOrderProductWithResolvedProduct,
  pendingOrderDetailRefreshes,
  recentOrderDetailRefreshStarts,
  ORDER_DETAIL_REFRESH_COOLDOWN_MS,
} from './orderDetails/helpers';
import { buildOrderSummaryData } from './orderDetails/buildOrderSummaryData';
import useOrderDetailsParty from './orderDetails/useOrderDetailsParty'
import useOrderDetailsProductSearch from './orderDetails/useOrderDetailsProductSearch'
import useOrderDetailsFinancials from './orderDetails/useOrderDetailsFinancials'
import useOrderDetailsProductMutations from './orderDetails/useOrderDetailsProductMutations'
import useOrderDetailsToolbarActions from './orderDetails/useOrderDetailsToolbarActions'
import useOrderDetailsPrimaryActions from './orderDetails/useOrderDetailsPrimaryActions'
import useOrderDetailsRenderers from './orderDetails/useOrderDetailsRenderers'
import OrderDetailsView from './orderDetails/OrderDetailsView'
import { InlineLoadingText } from './orderDetails/InlineLoadingText';
import OrderDetailsInvoiceCards from './orderDetails/OrderDetailsInvoiceCards';
import OrderDetailsProductActions from './orderDetails/OrderDetailsProductActions';
import OrderDetailsKdsContent from './orderDetails/OrderDetailsKdsContent';
import OrderDetailsAssignmentModals from './orderDetails/OrderDetailsAssignmentModals'

const OrderDetails = ({ route, navigation }) => {
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
        return;
      }

      navigation.setParams({showBottomToolBar: false});
      return;
    }

    if (route?.params?.showBottomToolBar === true) {
      return;
    }

    navigation.setParams({showBottomToolBar: true});
  }, [
    navigation,
    route?.params?.showBottomToolBar,
    shouldShowBottomNavigation,
  ])

  useLayoutEffect(() => {
    if (!isSingleItemOperationMode) {
      return;
    }

    // No single-item o detalhe do pedido nao participa do fluxo.
    // Voltar daqui significa trocar o item no AddProductScreen antes de pagar.
    const replaceRoute = buildAddProductsRouteParams(
      item || orderParam || routeOrderId,
      buildManagerPdvRouteParams({singleItemMode: true}),
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

  const orderProductsStore = useStore('order_products')
  const { items: storedOrderProducts } = orderProductsStore.getters

  const currentOrderProductsRef = useRef([])
  const storedOrderProductsRef = useRef([])
  const ordersActionsRef = useRef(ordersActions)
  const orderProductsActionsRef = useRef(orderProductsStore.actions)
  const orderInvoicesActionsRef = useRef(orderInvoicesActions)
  const commitResolvedOrderProductsRef = useRef(null)
  const loadOrderInvoicesRef = useRef(null)
  const refreshCurrentOrderInFlightRef = useRef(null)
  const refreshCurrentOrderFingerprintRef = useRef('')
  const showErrorRef = useRef(showError)
  const currentDisplayOrderId = Number(item?.id || orderParam?.id || routeOrderId || 0)
  const filteredStoredOrderProducts = useMemo(
    () => filterOrderProductsByOrderId(storedOrderProducts, currentDisplayOrderId),
    [currentDisplayOrderId, storedOrderProducts],
  )
  const {materializeOrderWithProducts} = usePosOrderMaterialization({
    interactionParams: route?.params,
    navigation,
  })

  useEffect(() => {
    ordersActionsRef.current = ordersActions
  }, [ordersActions])

  useEffect(() => {
    orderProductsActionsRef.current = orderProductsStore.actions
  }, [orderProductsStore.actions])

  useEffect(() => {
    orderInvoicesActionsRef.current = orderInvoicesActions
  }, [orderInvoicesActions])

  useEffect(() => {
    showErrorRef.current = showError
  }, [showError])

  useEffect(() => {
    const currentOrderInvoicesActions = orderInvoicesActionsRef.current

    currentOrderInvoicesActions?.setItems?.([])
    currentOrderInvoicesActions?.setError?.('')
  }, [routeOrderIri])

  const orderInvoices = useMemo(
    () =>
      (Array.isArray(storedOrderInvoiceItems) ? storedOrderInvoiceItems : [])
        .map(orderInvoice => {
          const rawInvoice = orderInvoice?.invoice
          const invoice =
            rawInvoice && typeof rawInvoice === 'object' ? rawInvoice : null
          const invoiceId = getEntityId(rawInvoice)

          if (!invoice && !invoiceId) {
            return null
          }

          return {
            ...(invoice || {}),
            id: invoice?.id || invoiceId,
            '@id': invoice?.['@id'] || (invoiceId ? `/invoices/${invoiceId}` : undefined),
            orderInvoiceId: orderInvoice?.id,
            realPrice:
              orderInvoice?.realPrice ??
              orderInvoice?.real_price ??
              invoice?.realPrice ??
              invoice?.real_price ??
              null,
          }
        })
        .filter(Boolean),
    [storedOrderInvoiceItems],
  )

  const loadOrderInvoices = useCallback(async ({silent = false} = {}) => {
    const currentOrderInvoicesActions = orderInvoicesActionsRef.current

    if (
      !currentOrderInvoicesActions ||
      typeof currentOrderInvoicesActions.getItems !== 'function'
    ) {
      return []
    }

    if (!routeOrderIri) {
      currentOrderInvoicesActions?.setItems?.([])
      currentOrderInvoicesActions?.setError?.('')
      return []
    }

    try {
      const response = await currentOrderInvoicesActions.getItems({
        order: routeOrderIri,
      })

      return Array.isArray(response) ? response : []
    } catch (invoiceError) {
      currentOrderInvoicesActions?.setItems?.([])
      if (!silent) {
        showErrorRef.current?.(formatApiError(invoiceError))
      }
      return []
    }
  }, [routeOrderIri])

  const commitResolvedOrderProducts = useCallback(sourceOrder => {
    const {hasOwnOrderProducts, orderProducts} = resolveEmbeddedOrderProducts(sourceOrder)
    const sourceOrderId = getEntityId(sourceOrder) || currentDisplayOrderId
    const preferredOrderProducts = choosePreferredOrderProducts({
      primaryOrderProducts: orderProducts,
      primaryHasOwnOrderProducts: hasOwnOrderProducts,
      fallbackOrderProducts: filterOrderProductsByOrderId(
        storedOrderProductsRef.current,
        sourceOrderId,
      ),
    })

    if (!hasOwnOrderProducts) {
      return currentOrderProductsRef.current
    }

    currentOrderProductsRef.current = preferredOrderProducts

    if (
      !areOrderProductCollectionsEquivalent(
        storedOrderProductsRef.current,
        preferredOrderProducts,
      )
    ) {
      orderProductsActionsRef.current.setItems(preferredOrderProducts)
    }

    return preferredOrderProducts
  }, [
    currentDisplayOrderId,
  ])

  useEffect(() => {
    commitResolvedOrderProductsRef.current = commitResolvedOrderProducts
  }, [commitResolvedOrderProducts])

  useEffect(() => {
    loadOrderInvoicesRef.current = loadOrderInvoices
  }, [loadOrderInvoices])

  const resolveCurrentOrderRefreshFingerprint = useCallback(
    sourceOrder => {
      const resolvedOrder = sourceOrder || item || orderParam || null

      if (!resolvedOrder) {
        return String(routeOrderId || '')
      }

      const resolvedOrderId = String(getEntityId(resolvedOrder) || routeOrderId || '')
      const resolvedOrderDate = String(
        resolvedOrder?.alterDate ||
          resolvedOrder?.alter_date ||
          resolvedOrder?.updatedAt ||
          resolvedOrder?.updated_at ||
          resolvedOrder?.orderDate ||
          resolvedOrder?.order_date ||
          '',
      ).trim()
      const resolvedOrderStatus = String(
        resolvedOrder?.status?.realStatus ||
          resolvedOrder?.status?.real_status ||
          resolvedOrder?.status?.status ||
          '',
      ).trim()
      const resolvedOrderProducts = Array.isArray(resolvedOrder?.orderProducts)
        ? resolvedOrder.orderProducts
        : []

      return [
        resolvedOrderId,
        resolvedOrderDate,
        resolvedOrderStatus,
        resolvedOrderProducts.length,
      ].join('|')
    },
    [item, orderParam, routeOrderId],
  )

  useEffect(() => {
    storedOrderProductsRef.current = filteredStoredOrderProducts

    if (!hasDetailedOrderProductsPayload(filteredStoredOrderProducts)) {
      return
    }

    currentOrderProductsRef.current = filteredStoredOrderProducts
  }, [filteredStoredOrderProducts])

  useFocusEffect(
    useCallback(() => {
      void loadOrderInvoicesRef.current?.({silent: true})

      return undefined
    }, []),
  )

  const refreshCurrentOrder = useCallback(async ({force = false} = {}) => {
    if (!routeOrderId) {
      return null
    }

    const lastRefreshStart = recentOrderDetailRefreshStarts.get(routeOrderId) || 0
    if (Date.now() - lastRefreshStart < ORDER_DETAIL_REFRESH_COOLDOWN_MS) {
      return item || orderParam || null
    }

    const currentFingerprint = resolveCurrentOrderRefreshFingerprint()
    if (
      !force &&
      refreshCurrentOrderFingerprintRef.current &&
      refreshCurrentOrderFingerprintRef.current === currentFingerprint
    ) {
      return item || orderParam || null
    }

    const pendingRefresh = pendingOrderDetailRefreshes.get(routeOrderId)
    if (pendingRefresh) {
      return pendingRefresh
    }

    if (refreshCurrentOrderInFlightRef.current) {
      return refreshCurrentOrderInFlightRef.current
    }

    const request = ordersActionsRef.current
      .get({
        id: routeOrderId,
        __storeMeta: {
          preserveItem: true,
        },
      })
      .then(refreshedOrder => {
        recentOrderDetailRefreshStarts.set(routeOrderId, Date.now())
        refreshCurrentOrderFingerprintRef.current =
          resolveCurrentOrderRefreshFingerprint(refreshedOrder)
        commitResolvedOrderProductsRef.current?.(refreshedOrder)
        return refreshedOrder
      })
      .finally(() => {
        if (pendingOrderDetailRefreshes.get(routeOrderId) === request) {
          pendingOrderDetailRefreshes.delete(routeOrderId)
        }
        refreshCurrentOrderInFlightRef.current = null
      })

    pendingOrderDetailRefreshes.set(routeOrderId, request)
    refreshCurrentOrderInFlightRef.current = request
    return request
  }, [
    item,
    orderParam,
    resolveCurrentOrderRefreshFingerprint,
    routeOrderId,
  ])
  const refreshIntegrationFinancialData = useCallback(
    async () => loadOrderInvoices({silent: true}),
    [loadOrderInvoices],
  )

  const marketplaceSummary = useOrderMarketplaceSummary({
    order: item,
    initialOrder: orderParam,
    refreshOrder: () => refreshCurrentOrder({force: true}),
    onFinancialGenerated: refreshIntegrationFinancialData,
    isKds,
    navigation,
    showError,
    showSuccess,
  })
  const hasMarketplaceIntegration = marketplaceSummary.hasMarketplaceIntegration

  const buildOrderUpdatePayload = useCallback(changes => {
    const baseOrder = item || orderParam
    const orderId = getEntityId(baseOrder)

    if (!orderId) {
      throw new Error(
        global.t?.t('orders', 'message', 'unableCompleteOperation') ||
          'Não foi possível identificar o pedido para atualizar.',
      )
    }

    const providerIri =
      toEntityIri(baseOrder?.provider, 'people') ||
      orderCompanyIri
    const statusIri = toEntityIri(baseOrder?.status, 'statuses')

    return {
      id: Number(orderId),
      app: baseOrder?.app || 'POS',
      orderType: resolveEditableOrderType(baseOrder?.orderType),
      ...(providerIri ? { provider: providerIri } : {}),
      ...(statusIri ? { status: statusIri } : {}),
      ...changes,
    }
  }, [item, orderParam, orderCompanyIri])

  const canEditItems =
    !hasMarketplaceIntegration &&
    !isTerminalOrderStatus(localRealStatusKey)
  // Item mutations are cart-only; sale and terminal orders stay read-only here.
  const canMutateOrderProducts =
    !hasMarketplaceIntegration &&
    localOrderTypeKey === DRAFT_SALE_ORDER_TYPE &&
    !isLocallyTerminalOrder

  useEffect(() => {
    if (Array.isArray(item?.orderProducts)) {
      commitResolvedOrderProducts(item)
      return
    }

    if (Array.isArray(orderParam?.orderProducts)) {
      commitResolvedOrderProducts(orderParam)
    }
  }, [
    commitResolvedOrderProducts,
    item,
    item?.orderProducts,
    orderParam?.orderProducts,
  ])

  const syncCurrentOrderProducts = useCallback(nextOrderProducts => {
    const normalizedOrderProducts = Array.isArray(nextOrderProducts) ? nextOrderProducts : []
    const baseOrder = item?.id ? item : orderParam

    currentOrderProductsRef.current = normalizedOrderProducts
    orderProductsActionsRef.current.setItems(normalizedOrderProducts)

    if (!baseOrder) {
      return normalizedOrderProducts
    }

    ordersActionsRef.current.syncOrder(
      mergeOrderWithOrderProducts(baseOrder, normalizedOrderProducts),
    )

    return normalizedOrderProducts
  }, [item, orderParam])

  const {
    flushAllChanges: flushPendingOrderProductChanges,
    getScheduledQuantity,
    isOrderProductCommitting,
    scheduleQuantityChange,
  } = useDebouncedOrderProductQuantitySync({
    delay: 1000,
    onOptimisticUpdate: (orderProduct, nextQuantity) => {
      const nextOrderProducts =
        nextQuantity <= 0
          ? removeOrderProductFromList(currentOrderProductsRef.current, orderProduct)
          : mergeOrderProductIntoList(
              currentOrderProductsRef.current,
              withOrderProductQuantity(orderProduct, nextQuantity),
            )

      syncCurrentOrderProducts(nextOrderProducts)
    },
    onCommit: async (orderProduct, targetQuantity) => {
      const orderProductId = String(
        orderProduct?.id || String(orderProduct?.['@id'] || '').replace(/\D/g, ''),
      )

      if (!orderProductId) return

      if (targetQuantity <= 0) {
        await orderProductsActionsRef.current.remove(orderProductId)
        return
      }

      const savedOrderProduct = await orderProductsActionsRef.current.save({
        '@id': orderProduct?.['@id'],
        id: Number(orderProductId),
        quantity: targetQuantity,
      })

      syncCurrentOrderProducts(
        mergeOrderProductIntoList(currentOrderProductsRef.current, savedOrderProduct),
      )
    },
    onError: async error => {
      await refreshCurrentOrder({force: true})
      showError(formatApiError(error))
    },
  })

  const updateCurrentOrder = useCallback(async changes => {
    await flushPendingOrderProductChanges()

    const savedOrder = await ordersActions.save(
      buildOrderUpdatePayload(changes),
    )

    if (savedOrder) {
      if (typeof ordersActions.syncOrder === 'function') {
        ordersActions.syncOrder(savedOrder)
      } else {
        ordersActions.setItem(savedOrder)
      }
    }

    await refreshCurrentOrder({force: true})

    return savedOrder
  }, [
    flushPendingOrderProductChanges,
    ordersActions,
    buildOrderUpdatePayload,
    refreshCurrentOrder,
  ])

  const {
    primaryActionLoading,
    handleAddProduct,
    handleAddPayment,
    handleProduceOrder,
    handlePrimaryAction,
    currentOrderSnapshot,
    primaryActionMode,
    primaryActionLabel,
    primaryActionIcon,
  } = useOrderDetailsPrimaryActions({
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
  })

  const {
    confirmRemoveItemId,
    setConfirmRemoveItemId,
    handleUpdateOpQuantity,
    handleIncreaseOpQuantity,
    handleDecreaseOpQuantity,
    handleRemoveOp,
    handleEditCustomizableOrderProduct,
  } = useOrderDetailsProductMutations({
    scheduleQuantityChange,
    getScheduledQuantity,
    canMutateOrderProducts,
    navigation,
    route,
    isSingleItemOperationMode,
    showError,
  })

  const resolvedDisplayOrderProducts = useMemo(() => {
    const currentOrderProductsPayload = resolveEmbeddedOrderProducts(item)
    const initialOrderProductsPayload = resolveEmbeddedOrderProducts(orderParam)
    const marketplaceOrderProducts = Array.isArray(marketplaceSummary.fallbackOrderProducts)
      ? marketplaceSummary.fallbackOrderProducts
      : []

    return choosePreferredOrderProducts({
      primaryOrderProducts: currentOrderProductsPayload.orderProducts,
      primaryHasOwnOrderProducts: currentOrderProductsPayload.hasOwnOrderProducts,
      fallbackOrderProducts: choosePreferredOrderProducts({
        primaryOrderProducts: filteredStoredOrderProducts,
        fallbackOrderProducts: choosePreferredOrderProducts({
          primaryOrderProducts: initialOrderProductsPayload.orderProducts,
          primaryHasOwnOrderProducts: initialOrderProductsPayload.hasOwnOrderProducts,
          fallbackOrderProducts: marketplaceOrderProducts,
        }),
      }),
    })
  }, [
    item?.orderProducts,
    filteredStoredOrderProducts,
    marketplaceSummary.fallbackOrderProducts,
    orderParam?.orderProducts,
  ])
  const resolvedProductCandidatesById = useMemo(() => {
    const candidates = {}

    ;[
      item?.orderProducts,
      orderParam?.orderProducts,
      storedOrderProducts,
      marketplaceSummary.fallbackOrderProducts,
    ].forEach(orderProductsList => {
      ;(Array.isArray(orderProductsList) ? orderProductsList : []).forEach(orderProduct => {
        const productId = getEntityId(orderProduct?.product)
        const candidateProduct = orderProduct?.product

        if (!productId || !candidateProduct) return

        const currentCandidate = candidates[productId]
        const currentHasUnit = currentCandidate ? !!resolveProductUnitLabel(currentCandidate) : false
        const nextHasUnit = !!resolveOrderItemUnitLabel(orderProduct)

        if (!currentCandidate || (nextHasUnit && !currentHasUnit)) {
          candidates[productId] = candidateProduct
        }
      })
    })

    return candidates
  }, [
    marketplaceSummary.fallbackOrderProducts,
    item?.orderProducts,
    orderParam?.orderProducts,
    storedOrderProducts,
  ])

  const resolvedDisplayOrderProductsWithProductDetails = useMemo(
    () => resolvedDisplayOrderProducts.map(orderProduct => {
      const productId = getEntityId(orderProduct?.product)
      return mergeOrderProductWithResolvedProduct(
        orderProduct,
        productId ? resolvedProductCandidatesById[productId] : null,
      )
    }),
    [resolvedDisplayOrderProducts, resolvedProductCandidatesById],
  )
  const shouldShowOrderAddress =
    !isPurchaseOrder &&
    shouldShowOrderPartyDetails
  const effectiveDisplayedOperationalStatus = useMemo(
    () => ({
      status: localStatusNameKey,
      realStatus: localRealStatusKey,
    }),
    [localRealStatusKey, localStatusNameKey],
  )
  const effectiveLocalStatusNameKey = effectiveDisplayedOperationalStatus.status
  const effectiveLocalRealStatusKey = effectiveDisplayedOperationalStatus.realStatus
  const displayOrderStatusColor = resolvePreferredText(
    item?.status?.color,
    orderParam?.status?.color,
    '#0EA5E9',
  )
  const translatedLocalStatusLabel = translateOrderStatus(
    effectiveLocalStatusNameKey || item?.status?.status || '',
  )
  const translatedLocalRealStatusLabel = translateOrderStatus(
    effectiveLocalRealStatusKey || item?.status?.realStatus || '',
  )
  const resolvedDisplayOrder = useMemo(() => {
    const baseOrder = item || orderParam
    if (!baseOrder) return null

    return {
      ...baseOrder,
      orderProducts: resolvedDisplayOrderProductsWithProductDetails,
      status: {
        ...(baseOrder?.status || {}),
        status: effectiveLocalStatusNameKey || baseOrder?.status?.status || '',
        realStatus: effectiveLocalRealStatusKey || baseOrder?.status?.realStatus || '',
        real_status: effectiveLocalRealStatusKey || baseOrder?.status?.real_status || '',
        color: displayOrderStatusColor,
      },
    }
  }, [
    displayOrderStatusColor,
    effectiveLocalRealStatusKey,
    effectiveLocalStatusNameKey,
    item,
    orderParam,
    resolvedDisplayOrderProductsWithProductDetails,
  ])
  const orderIdentitySource = resolvedDisplayOrder || item || orderParam || null
  const orderAdditionalInfoEntries = useMemo(
    () => extractVisibleOrderExtraEntries(orderIdentitySource),
    [orderIdentitySource],
  )
  const normalizedOrderRealStatus = String(
    effectiveLocalRealStatusKey || '',
  ).toLowerCase()
  const hasTerminalOrderState =
    isLocallyTerminalOrder ||
    isTerminalOrderStatus(normalizedOrderRealStatus)
  const isTerminalOrder = hasTerminalOrderState
  const {
    activeLocalInvoices,
    localFinancialCompanyId,
    localInvoiceCards,
    localPaidAmount,
    localReceivedAmount,
    groupedInvoiceSections,
    hasAuthoritativeEmptyOrderProducts,
    localOrderTotal,
    localPendingAmount,
    localDisplayAmount,
    localDisplayLabel,
    shouldShowInlineOrderTotal,
  } = useOrderDetailsFinancials({
    orderInvoices,
    item,
    orderParam,
    defaultCompany,
    hasMarketplaceIntegration,
    resolvedDisplayOrderProductsWithProductDetails,
    resolvedDisplayOrder,
    useUnifiedKdsLayout,
    isKds,
    isTvDisplay,
  })

  const canAddProductsToOrder = canMutateOrderProducts
  const addProductsButtonLabel =
    global.t?.t('orders', 'button', 'addProducts') || 'Adicionar produtos'

  const {
    productSearchText,
    setProductSearchText,
    productSearchResults,
    productSearchLoading,
    productSearchSelectionId,
    handleQuickAddProductFromSearch,
    handleCustomizeProductFromSearch,
  } = useOrderDetailsProductSearch({
    canAddProductsToOrder,
    orderCompanyId,
    flushPendingOrderProductChanges,
    materializeOrderWithProducts,
    ordersActions,
    commitResolvedOrderProducts,
    refreshCurrentOrder,
    navigation,
    interactionMode: route?.params?.interactionMode,
    isSingleItemOperationMode,
    showError,
    showSuccess,
  })

  const canAddOrderPayment =
    !hasMarketplaceIntegration &&
    !!item?.id &&
    localPendingAmount > 0 &&
    !isTerminalOrder
  // The same primary slot can render Pagar or Produzir; the action helper
  // decides which CTA the current cart should expose.
  const showInlinePrimaryAction =
    canAddOrderPayment &&
    !useUnifiedKdsLayout
  const primaryActionDisabled = !canAddOrderPayment || primaryActionLoading
  const resolvedOrderDateValue = resolveOrderDateValue(item || orderParam)
  const orderWaitingMinutes = resolvedOrderDateValue
    ? Math.max(0, Math.floor((Date.now() - new Date(resolvedOrderDateValue).getTime()) / 60000))
    : null
  const orderWaitingLabel =
    orderWaitingMinutes === null
      ? ''
      : `${orderWaitingMinutes} min`
  const localOrderClient = item?.client || orderParam?.client || null
  const localOrderAddress = item?.addressDestination || orderParam?.addressDestination || null
  const localOrderObservationSource = resolvePreferredText(
    item?.comments,
    item?.remark,
    orderParam?.comments,
    orderParam?.remark,
    orderParam?.description,
  )
  const baseOrderObservationText = localOrderObservationSource
  const showBaseOrderObservationCard =
    shouldShowOrderPartyDetails &&
    (!!baseOrderObservationText || canEditItems)
  const {
    customerModalVisible,
    setCustomerModalVisible,
    customerCreateModalVisible,
    setCustomerCreateModalVisible,
    customerSearch,
    setCustomerSearch,
    customerSearchResults,
    customerSearchLoading,
    customerLinkingId,
    addressModalVisible,
    addressModalMode,
    setAddressModalMode,
    addressOptions,
    addressOptionsLoading,
    addressForm,
    addressSaveLoading,
    addressSelectingId,
    observationDraft,
    setObservationDraft,
    observationEditing,
    observationSaving,
    orderCustomerName,
    orderCustomerPhone,
    localOrderCustomerDocument,
    orderCustomerDocumentLabel,
    orderAddressPrimary,
    orderAddressSecondary,
    selectedOrderClientIri,
    selectedOrderAddressIri,
    closeCustomerModal,
    openCustomerModal,
    orderHeaderActionProps,
    openCustomerCreateModal,
    closeAddressModal,
    openAddressCreateMode,
    openAddressModal,
    handleAddressFormFieldChange,
    handleStartObservationEdit,
    handleCancelObservationEdit,
    handleSaveObservation,
    handleSelectCustomer,
    handleCustomerCreated,
    handleSelectAddress,
    handleCreateAddress,
  } = useOrderDetailsParty({
    canEditItems,
    isKds,
    isPosSelfServiceOperationMode,
    isPurchaseOrder,
    shouldShowOrderPartyDetails,
    localOrderClient,
    localOrderAddress,
    localOrderObservationSource,
    orderCompanyIri,
    peopleActions,
    addressActions,
    updateCurrentOrder,
    showError,
    showSuccess,
  })

  const localInvoicesEmptyText =
    global.t?.t('orders', 'message', 'noInvoicesLinkedToOrder') ||
    'Nenhuma invoice vinculada a este pedido.'
  const localInvoicesSectionTitle =
    global.t?.t('orders', 'label', 'payment') ||
    global.t?.t('orders', 'title', 'payments') ||
    'Pagamentos'
  const shouldShowPreparationTime = !isTerminalOrder && !!orderWaitingLabel
  const summaryInformationEntries = (() => {
    const entries = orderAdditionalInfoEntries.map(entry => ({
      key: entry.id,
      label: formatHumanLabel(entry.label || entry.name || entry.context) || 'Campo',
      value: entry.value,
    }))

    if (!shouldShowPreparationTime && orderWaitingLabel) {
      entries.unshift({
        key: 'preparation-time',
        label: global.t?.t('orders', 'label', 'preparationTime') || 'Tempo de preparo',
        value: orderWaitingLabel,
      })
    }

    return entries
  })()
  const orderAppLabel = useMemo(() => {
    const resolvedApp = resolveMarketplaceAppLabel(item || orderParam)
    if (resolvedApp) {
      return resolvedApp
    }

    return String(app_type || '').trim().toUpperCase()
  }, [item, orderParam])
  const compactOrderSummary = useMemo(
    () => ({
      accessibilityLabel: [
        `${localDisplayLabel}: ${Formatter.formatMoney(localDisplayAmount || 0)}`,
      ].join('. '),
      totalValue: Formatter.formatMoney(localDisplayAmount || 0),
    }),
    [localDisplayAmount, localDisplayLabel],
  )
  const closeDetailsModal = useCallback(() => {
    setDetailsModalVisible(false)
  }, [])
  const closeFinancialDetailsModal = useCallback(() => {
    setFinancialDetailsVisible(false)
  }, [])

  const topBarOrderId = item?.id || orderParam?.id || routeOrderId

  const {
    handleOpenFinancialDetails,
    handleOpenInvoiceDetails,
    handleOrderTools,
    handleOrderAttachments,
    handleOrderLogs,
    handleOrderLogistics,
  } = useOrderDetailsToolbarActions({
    canShowDebugActions,
    localInvoiceCards,
    loadOrderInvoices,
    setFinancialDetailsVisible,
    closeFinancialDetailsModal,
    invoiceActions,
    navigation,
    marketplaceSummary,
    setDetailsModalVisible,
    setAttachmentsVisible,
    topBarOrderId,
    itemId: item?.id,
    orderParamId: orderParam?.id,
  })

  const renderers = useOrderDetailsRenderers({
    canMutateOrderProducts,
    confirmRemoveItemId,
    handleDecreaseOpQuantity,
    handleEditCustomizableOrderProduct,
    handleIncreaseOpQuantity,
    handleRemoveOp,
    isOrderProductCommitting,
    localStyles,
    ppcColors,
    viewportWidth,
    useUnifiedKdsLayout,
    shouldShowBottomNavigation,
    insets,
    shouldShowMobilePaymentBar,
    topBarOrderId,
    canShowDebugActions,
    isKds,
    selectedDisplay,
    isTvDisplay,
    appType,
    isPosSelfServiceOperationMode,
    handleOrderLogistics,
    handleOrderAttachments,
    handleOrderTools,
    handleOrderLogs,
    orderIdentitySource,
    orderHeaderActionProps,
    navigation,
    localInvoiceCards,
    item,
    orderParam,
    canEditItems,
    canAddProductsToOrder,
    handleAddProduct,
    productSearchText,
    setProductSearchText,
    isLoading,
    isPurchaseOrder,
    shouldShowOrderPartyDetails,
    orderCustomerName,
    orderCustomerPhone,
    localOrderCustomerDocument,
    orderCustomerDocumentLabel,
    openCustomerModal,
    customerLinkingId,
    openAddressModal,
    shouldShowOrderAddress,
    observationEditing,
    observationDraft,
    setObservationDraft,
    handleStartObservationEdit,
    handleCancelObservationEdit,
    handleSaveObservation,
    observationSaving,
    baseOrderObservationText,
    compactOrderSummary,
    addressSaveLoading,
    addressSelectingId,
    shouldShowInlineOrderTotal,
    orderAddressPrimary,
    orderAddressSecondary,
    selectedOrderClientIri,
    showBaseOrderObservationCard,
    orderAppLabel,
    translatedLocalStatusLabel,
    translatedLocalRealStatusLabel,
    resolvedOrderDateValue,
    localDisplayLabel,
    localDisplayAmount,
    localOrderAddressParts,
    summaryInformationEntries,
    marketplaceSummary,
    hasMarketplaceIntegration,
    formatOrderDateTime,
  })

  return (
    <OrderDetailsView
      {...renderers}
      localStyles={localStyles}
      ppcColors={ppcColors}
      useUnifiedKdsLayout={useUnifiedKdsLayout}
      showBarcodeInput={showBarcodeInput}
      isPosSelfServiceOperationMode={isPosSelfServiceOperationMode}
      isPurchaseOrder={isPurchaseOrder}
      shouldShowOrderPartyDetails={shouldShowOrderPartyDetails}
      customerModalVisible={customerModalVisible}
      closeCustomerModal={closeCustomerModal}
      customerLinkingId={customerLinkingId}
      orderCustomerName={orderCustomerName}
      customerSearch={customerSearch}
      setCustomerSearch={setCustomerSearch}
      customerSearchLoading={customerSearchLoading}
      customerSearchResults={customerSearchResults}
      handleSelectCustomer={handleSelectCustomer}
      openCustomerCreateModal={openCustomerCreateModal}
      customerCreateModalVisible={customerCreateModalVisible}
      setCustomerCreateModalVisible={setCustomerCreateModalVisible}
      handleCustomerCreated={handleCustomerCreated}
      addressModalVisible={addressModalVisible}
      closeAddressModal={closeAddressModal}
      addressModalMode={addressModalMode}
      setAddressModalMode={setAddressModalMode}
      handleAddressFormFieldChange={handleAddressFormFieldChange}
      orderIdentitySource={orderIdentitySource}
      orderHeaderActionProps={orderHeaderActionProps}
      navigation={navigation}
      isKds={isKds}
      detailsModalVisible={detailsModalVisible}
      closeDetailsModal={closeDetailsModal}
      financialDetailsVisible={financialDetailsVisible}
      closeFinancialDetailsModal={closeFinancialDetailsModal}
      attachmentsVisible={attachmentsVisible}
      setAttachmentsVisible={setAttachmentsVisible}
      topBarOrderId={topBarOrderId}
      item={item}
      handleAddProduct={handleAddProduct}
      handlePrimaryAction={handlePrimaryAction}
      primaryActionLoading={primaryActionLoading}
      primaryActionDisabled={primaryActionDisabled}
      primaryActionLabel={primaryActionLabel}
      primaryActionIcon={primaryActionIcon}
      canAddOrderPayment={canAddOrderPayment}
      handleOpenFinancialDetails={handleOpenFinancialDetails}
      localOrderTotal={localOrderTotal}
      localReceivedAmount={localReceivedAmount}
      hasMarketplaceIntegration={hasMarketplaceIntegration}
      shouldShowMobilePaymentBar={shouldShowMobilePaymentBar}
      shouldShowBottomNavigation={shouldShowBottomNavigation}
      canAddProductsToOrder={canAddProductsToOrder}
      isLoading={isLoading}
      error={error}
      shouldShowInlineOrderTotal={shouldShowInlineOrderTotal}
      localDisplayLabel={localDisplayLabel}
      localDisplayAmount={localDisplayAmount}
      shouldShowPreparationTime={shouldShowPreparationTime}
      orderWaitingLabel={orderWaitingLabel}
    />
  )
}

export default OrderDetails
