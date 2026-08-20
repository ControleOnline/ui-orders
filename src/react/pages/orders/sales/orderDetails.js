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
  buildAddressOptionSummary,
  buildCustomerSearchMeta,
  createEmptyAddressForm,
  formatHumanLabel,
  formatPhoneDisplay,
  normalizePostalCodeInput,
  normalizeText,
  resolveAddressDisplayParts,
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
  canReopenOrderProductCustomization,
  isOrderProductProductionCompleted,
} from '@controleonline/ui-orders/src/react/components/OrderProducts.utils'
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
import { InlineLoadingText } from './orderDetails/InlineLoadingText';
import OrderDetailsInvoiceCards from './orderDetails/OrderDetailsInvoiceCards';
import OrderDetailsProductActions from './orderDetails/OrderDetailsProductActions';
import OrderDetailsKdsContent from './orderDetails/OrderDetailsKdsContent';

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
  const [primaryActionLoading, setPrimaryActionLoading] = useState(false)
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

  const [confirmRemoveItemId, setConfirmRemoveItemId] = useState(null)
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
  const [customerModalVisible, setCustomerModalVisible] = useState(false)
  const [customerCreateModalVisible, setCustomerCreateModalVisible] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState([])
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  const [productSearchText, setProductSearchText] = useState('')
  const [productSearchResults, setProductSearchResults] = useState([])
  const [productSearchLoading, setProductSearchLoading] = useState(false)
  const [productSearchSelectionId, setProductSearchSelectionId] = useState('')
  const [customerLinkingId, setCustomerLinkingId] = useState('')
  const [addressModalVisible, setAddressModalVisible] = useState(false)
  const [addressModalMode, setAddressModalMode] = useState('select')
  const [addressOptions, setAddressOptions] = useState([])
  const [addressOptionsLoading, setAddressOptionsLoading] = useState(false)
  const [addressForm, setAddressForm] = useState(createEmptyAddressForm())
  const [addressSaveLoading, setAddressSaveLoading] = useState(false)
  const [addressSelectingId, setAddressSelectingId] = useState('')
  const [observationDraft, setObservationDraft] = useState('')
  const [observationEditing, setObservationEditing] = useState(false)
  const [observationSaving, setObservationSaving] = useState(false)
  const currentDisplayOrderId = Number(item?.id || orderParam?.id || routeOrderId || 0)
  const filteredStoredOrderProducts = useMemo(
    () => filterOrderProductsByOrderId(storedOrderProducts, currentDisplayOrderId),
    [currentDisplayOrderId, storedOrderProducts],
  )
  const normalizedProductSearch = useMemo(
    () => String(productSearchText || '').trim(),
    [productSearchText],
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

  const handleAddProduct = () => {
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
          : {singleItemMode: isSingleItemOperationMode},
      ),
    )
  }

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
    if (!canMutateOrderProducts) {
      setConfirmRemoveItemId(null)
    }
  }, [canMutateOrderProducts])

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

  const handleAddPayment = useCallback(async () => {
    if (!item?.id || isLocallyTerminalOrder) return
    await flushPendingOrderProductChanges()
    const shouldKeepPdvMode = isPdvRouteContext(route?.params)
    navigation.navigate(
      'Checkout',
      buildCheckoutRouteParams(
        ordersGetters.item || item,
        shouldKeepPdvMode
          ? buildManagerPdvRouteParams({showBottomCart: false})
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
    // The backend confirm endpoint turns cart -> sale and resolves the operational status.
    setPrimaryActionLoading(true)

    try {
      await flushPendingOrderProductChanges()

      const response = await api.post(`/orders/${orderId}/confirm`, {})
      const result = response?.result || response

      if (String(result?.errno ?? '0') !== '0') {
        throw result || response
      }

      await refreshCurrentOrder({force: true})
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
    item,
    isLocallyTerminalOrder,
    currentOrderSnapshot,
    refreshCurrentOrder,
    showError,
    showSuccess,
  ])

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

  const handleUpdateOpQuantity = useCallback((op, newQtyOrUpdater) => {
    const id = String(op?.id || String(op?.['@id'] || '').replace(/\D/g, ''))
    if (!id) return
    scheduleQuantityChange(op, newQtyOrUpdater)
  }, [scheduleQuantityChange])

  const handleIncreaseOpQuantity = useCallback(op => {
    setConfirmRemoveItemId(null)
    handleUpdateOpQuantity(op, currentQuantity => currentQuantity + 1)
  }, [handleUpdateOpQuantity])

  const handleDecreaseOpQuantity = useCallback(op => {
    const id = String(op?.id || String(op?.['@id'] || '').replace(/\D/g, ''))
    if (!id) return

    if (getScheduledQuantity(op) <= 1) {
      setConfirmRemoveItemId(id)
      return
    }

    setConfirmRemoveItemId(null)
    handleUpdateOpQuantity(op, currentQuantity => currentQuantity - 1)
  }, [getScheduledQuantity, handleUpdateOpQuantity])

  const handleRemoveOp = useCallback(op => {
    const id = String(op?.id || String(op?.['@id'] || '').replace(/\D/g, ''))
    if (!id) return
    setConfirmRemoveItemId(null)
    scheduleQuantityChange(op, 0)
  }, [scheduleQuantityChange])

  const handleEditCustomizableOrderProduct = useCallback(orderProduct => {
    if (!canMutateOrderProducts) {
      return
    }

    const rootOrderProduct = orderProduct || null
    const product = rootOrderProduct?.product
    const productId = getEntityId(product)

    if (!rootOrderProduct || !product || !productId) {
      showError('Não foi possível identificar o item customizável deste pedido.')
      return
    }

    if (isOrderProductProductionCompleted(rootOrderProduct)) {
      return
    }

    navigation.navigate('CustomizeScreen', {
      productId,
      orderProductId: getEntityId(rootOrderProduct),
      returnDepth: 1,
      interactionMode: route?.params?.interactionMode,
      singleItemMode: isSingleItemOperationMode,
    })
  }, [
    canMutateOrderProducts,
    navigation,
    route?.params?.interactionMode,
    isSingleItemOperationMode,
    showError,
  ])

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
  const activeLocalInvoices = useMemo(
    () => (
      Array.isArray(orderInvoices)
        ? orderInvoices.filter(invoice => {
            const invoiceStatus = String(
              invoice?.status?.realStatus ||
              invoice?.status?.real_status ||
              invoice?.status?.status ||
              '',
            ).trim().toLowerCase()

            return !['canceled', 'cancelled'].includes(invoiceStatus)
          })
        : []
    ),
    [orderInvoices],
  )
  const localFinancialCompanyId = useMemo(
    () => (
      getEntityId(item?.provider) ||
      getEntityId(orderParam?.provider) ||
      getEntityId(defaultCompany)
    ),
    [defaultCompany, item?.provider, orderParam?.provider],
  )
  const notInformedLabel = global.t?.t('orders', 'label', 'notInformed')
  const localInvoiceCards = useMemo(
    () => activeLocalInvoices
      .map(invoice => {
        const statusPresentation = resolveInvoiceStatusPresentation(invoice)
        const invoiceKind = resolveInvoiceKind(invoice, localFinancialCompanyId)
        const marketplacePresentation = resolveMarketplaceInvoicePresentation(invoice)
        const title = marketplacePresentation?.title || resolveInvoiceTitle(invoice)
        const invoiceId = String(invoice?.id || '').trim()
        const paymentTypeLabel =
          getInvoicePaymentTypeLabel(invoice) ||
          notInformedLabel
        const invoiceAmount = resolveInvoiceDisplayAmount(invoice)
        const invoiceType = resolvePreferredText(invoice?.invoiceType, invoice?.invoice_type)

        return {
          id: invoiceId || `${title}-${invoice?.invoice_date || invoice?.dueDate || 'local'}`,
          invoiceId,
          invoice,
          invoiceLinkLabel: invoiceId ? `Invoice #${invoiceId}` : '',
          title,
          subtitle: invoiceId && title !== `Invoice #${invoiceId}` ? `Invoice #${invoiceId}` : '',
          amount: invoiceAmount,
          descriptionLabel:
            marketplacePresentation?.description ||
            resolvePreferredText(invoice?.description),
          paymentTypeLabel,
          kindLabel:
            marketplacePresentation?.kindLabel ||
            (invoiceType ? formatInvoiceTypeLabel(invoiceType) : invoiceKind.label),
          counterpartyLabel: invoiceKind.counterpartyLabel,
          kindKey:
            marketplacePresentation?.purposeKey ||
            invoiceType ||
            invoiceKind.kind,
          purposeKey: marketplacePresentation?.purposeKey || '',
          sectionKey: marketplacePresentation?.sectionKey || '',
          sectionLabel: marketplacePresentation?.sectionLabel || '',
          sortOrder: Number(marketplacePresentation?.sortOrder ?? 999),
          payerLabel: resolveInvoicePartyLabel(invoice, 'payer'),
          receiverLabel: resolveInvoicePartyLabel(invoice, 'receiver'),
          statusLabel: statusPresentation.label,
          statusColor: statusPresentation.color,
          statusBackgroundColor: statusPresentation.backgroundColor,
        }
      })
      .sort((left, right) => {
        const sortOrderDifference =
          Number(left?.sortOrder ?? 999) - Number(right?.sortOrder ?? 999)

        if (sortOrderDifference !== 0) {
          return sortOrderDifference
        }

        return Number(right?.invoiceId || 0) - Number(left?.invoiceId || 0)
      }),
    [activeLocalInvoices, localFinancialCompanyId, notInformedLabel],
  )
  const localPaidAmount = useMemo(
    () => activeLocalInvoices.reduce((sum, invoice) => {
      const invoiceStatusName = String(invoice?.status?.status || '').trim().toLowerCase()
      const invoiceRealStatus = String(
        invoice?.status?.realStatus ||
        invoice?.status?.real_status ||
        '',
      ).trim().toLowerCase()
      const isInvoicePaid =
        invoiceRealStatus === 'closed' ||
        invoiceStatusName === 'closed' ||
        invoiceStatusName === 'paid'

      const receiverId = getEntityId(invoice?.receiver)
      const companyIsReceiver =
        !!localFinancialCompanyId &&
        !!receiverId &&
        receiverId === localFinancialCompanyId

      return isInvoicePaid && companyIsReceiver
        ? sum + resolveInvoiceDisplayAmount(invoice)
        : sum
    }, 0),
    [activeLocalInvoices, localFinancialCompanyId],
  )
  const localReceivedAmount = useMemo(
    () => (
      hasMarketplaceIntegration
        ? resolveMarketplaceReceivableAmount({
            localInvoiceCards,
            fallbackAmount: localPaidAmount,
          })
        : localPaidAmount
    ),
    [hasMarketplaceIntegration, localInvoiceCards, localPaidAmount],
  )
  const groupedInvoiceSections = useMemo(() => {
    if (!localInvoiceCards.some(invoiceCard => !!invoiceCard?.sectionLabel)) {
      return [
        {
          key: 'default',
          label: '',
          cards: localInvoiceCards,
        },
      ]
    }

    const sectionsMap = localInvoiceCards.reduce((accumulator, invoiceCard) => {
      const sectionKey = invoiceCard?.sectionKey || 'other'
      if (!accumulator[sectionKey]) {
        accumulator[sectionKey] = {
          key: sectionKey,
          label: invoiceCard?.sectionLabel || '',
          cards: [],
        }
      }

      accumulator[sectionKey].cards.push(invoiceCard)
      return accumulator
    }, {})

    return Object.values(sectionsMap)
  }, [localInvoiceCards])
  const hasAuthoritativeEmptyOrderProducts = useMemo(() => {
    const itemOrderProductsPayload = resolveEmbeddedOrderProducts(item)
    if (itemOrderProductsPayload.hasOwnOrderProducts) {
      return !hasOrderProducts(itemOrderProductsPayload.orderProducts)
    }

    const orderParamOrderProductsPayload = resolveEmbeddedOrderProducts(orderParam)
    return (
      orderParamOrderProductsPayload.hasOwnOrderProducts &&
      !hasOrderProducts(orderParamOrderProductsPayload.orderProducts)
    )
  }, [item, item?.orderProducts, orderParam, orderParam?.orderProducts])
  const localOrderTotal = useMemo(() => {
    if (
      hasOrderProducts(resolvedDisplayOrderProductsWithProductDetails) ||
      hasAuthoritativeEmptyOrderProducts
    ) {
      return calculateOrderProductsSubtotal(resolvedDisplayOrderProductsWithProductDetails)
    }

    const fallbackTotal = Number(
      resolvedDisplayOrder?.price ?? item?.price ?? orderParam?.price ?? 0,
    )
    return Number.isFinite(fallbackTotal) ? fallbackTotal : 0
  }, [
    hasAuthoritativeEmptyOrderProducts,
    item?.price,
    orderParam?.price,
    resolvedDisplayOrder?.price,
    resolvedDisplayOrderProductsWithProductDetails,
  ])
  const localPendingAmount = Math.max(localOrderTotal - localPaidAmount, 0)
  const localDisplayAmount = useMemo(
    () => resolveOperationalDisplayAmount({
      orderTotal: localOrderTotal,
      pendingAmount: localPendingAmount,
      receivedAmount: localReceivedAmount,
    }),
    [localOrderTotal, localPendingAmount, localReceivedAmount],
  )
  const localDisplayLabel = (() => {
    const labelKey = resolveOperationalDisplayLabelKey({
      pendingAmount: localPendingAmount,
      receivedAmount: localReceivedAmount,
    })

    if (labelKey === 'pending') {
      return global.t?.t('orders', 'label', 'pending') || 'Pendente'
    }

    if (labelKey === 'paid') {
      return global.t?.t('orders', 'label', 'paid') || 'Paga'
    }

    return global.t?.t('orders', 'label', 'localTotal') || 'Total'
  })()
  const shouldShowInlineOrderTotal = shouldRenderOrderDetailsInlineTotal({
    useUnifiedKdsLayout,
    isKds,
    isTvDisplay,
    displayAmount: localDisplayAmount,
  })
  const canAddProductsToOrder = canMutateOrderProducts
  const addProductsButtonLabel =
    global.t?.t('orders', 'button', 'addProducts') || 'Adicionar produtos'

  useEffect(() => {
    if (!canAddProductsToOrder) {
      setProductSearchText('')
      setProductSearchResults([])
      setProductSearchLoading(false)
      setProductSearchSelectionId('')
      return undefined
    }

    if (!normalizedProductSearch || normalizedProductSearch.length < 2 || !orderCompanyId) {
      setProductSearchResults([])
      setProductSearchLoading(false)
      return undefined
    }

    let isMounted = true
    const timeoutId = setTimeout(async () => {
      try {
        setProductSearchLoading(true)
        const results = await searchCompanyProducts({
          companyId: orderCompanyId,
          query: normalizedProductSearch,
        })

        if (isMounted) {
          setProductSearchResults(Array.isArray(results) ? results : [])
        }
      } catch {
        if (isMounted) {
          setProductSearchResults([])
        }
      } finally {
        if (isMounted) {
          setProductSearchLoading(false)
        }
      }
    }, 180)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [canAddProductsToOrder, normalizedProductSearch, orderCompanyId])

  const handleQuickAddProductFromSearch = useCallback(
    async product => {
      if (!canAddProductsToOrder) {
        return
      }

      const nextProductId = getEntityId(product)
      if (!nextProductId) {
        showError('Não foi possível identificar o produto selecionado.')
        return
      }

      try {
        setProductSearchSelectionId(String(product?.id || product?.['@id'] || nextProductId))
        await flushPendingOrderProductChanges()

        const updatedOrder = await materializeOrderWithProducts({
          products: [{product: nextProductId, quantity: 1}],
        })

        if (updatedOrder) {
          if (typeof ordersActions.syncOrder === 'function') {
            ordersActions.syncOrder(updatedOrder)
          } else {
            ordersActions.setItem(updatedOrder)
          }

          commitResolvedOrderProducts(updatedOrder)
        }

        await refreshCurrentOrder({force: true})

        setProductSearchText('')
        setProductSearchResults([])
        showSuccess('Produto adicionado ao pedido.')
      } catch (error) {
        showError(formatApiError(error))
      } finally {
        setProductSearchSelectionId('')
      }
    },
    [
      canAddProductsToOrder,
      commitResolvedOrderProducts,
      flushPendingOrderProductChanges,
      materializeOrderWithProducts,
      ordersActions,
      refreshCurrentOrder,
      showError,
      showSuccess,
    ],
  )
  const handleCustomizeProductFromSearch = useCallback(
    product => {
      if (!canAddProductsToOrder) {
        return
      }

      const productId = getEntityId(product)
      if (!productId) {
        showError('Não foi possível identificar o produto selecionado.')
        return
      }

      setProductSearchText('')
      setProductSearchResults([])
      setProductSearchSelectionId('')

      navigation.navigate('CustomizeScreen', {
        productId,
        returnDepth: 1,
        interactionMode: route?.params?.interactionMode,
        singleItemMode: isSingleItemOperationMode,
      })
    },
    [
      canAddProductsToOrder,
      isSingleItemOperationMode,
      navigation,
      route?.params?.interactionMode,
      showError,
    ],
  )
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
  const localOrderAddressParts = useMemo(
    () => resolveAddressDisplayParts(localOrderAddress),
    [localOrderAddress],
  )
  const orderCustomerName = resolvePreferredText(
    localOrderClient?.alias,
    localOrderClient?.name,
  )
  const orderCustomerPhone = resolvePreferredText(
    formatPhoneDisplay(localOrderClient?.phone?.[0]),
    Array.isArray(localOrderClient?.phone)
      ? localOrderClient.phone.map(formatPhoneDisplay).find(Boolean)
      : formatPhoneDisplay(localOrderClient?.phone),
  )
  const localOrderCustomerDocument = resolvePreferredText(
    localOrderClient?.document?.[0]?.document,
    Array.isArray(localOrderClient?.document)
      ? localOrderClient.document.map(document => normalizeText(document?.document)).find(Boolean)
      : normalizeText(localOrderClient?.document),
  )
  const orderCustomerDocument = localOrderCustomerDocument
  const orderCustomerDocumentType = resolvePreferredText(
    localOrderClient?.document?.[0]?.documentType?.documentType,
    Array.isArray(localOrderClient?.document)
      ? localOrderClient.document.map(document => normalizeText(document?.documentType?.documentType)).find(Boolean)
      : normalizeText(localOrderClient?.documentType?.documentType),
  )
  const orderCustomerDocumentLabel = resolveDocumentLabel(
    orderCustomerDocumentType,
    orderCustomerDocument,
  )
  const orderAddressPrimary = resolvePreferredText(
    localOrderAddressParts.primary,
  )
  const orderAddressSecondary = resolvePreferredText(
    localOrderAddressParts.secondary,
  )
  const selectedOrderClientIri = useMemo(
    () => toEntityIri(localOrderClient, 'people'),
    [localOrderClient],
  )
  const selectedOrderAddressIri = useMemo(
    () => toEntityIri(localOrderAddress, 'addresses'),
    [localOrderAddress],
  )

  const closeCustomerModal = useCallback(() => {
    if (customerLinkingId) {
      return
    }

    setCustomerModalVisible(false)
    setCustomerSearch('')
    setCustomerSearchResults([])
  }, [customerLinkingId])

  const openCustomerModal = useCallback(() => {
    if (!canEditItems) {
      return
    }

    setCustomerModalVisible(true)
  }, [canEditItems])

  const showTopBarCustomerAction =
    !isPosSelfServiceOperationMode &&
    !isPurchaseOrder &&
    shouldShowOrderPartyDetails &&
    canEditItems
  const orderHeaderActionProps = useMemo(
    () =>
      ({
        showPricing: true,
        showWaitingTime: isKds,
        ...(showTopBarCustomerAction
          ? {
              onCustomerPress: openCustomerModal,
              customerActionLabel: orderCustomerName ? 'Trocar' : 'Vincular',
              customerActionDisabled: !!customerLinkingId,
            }
          : {}),
      }),
    [
      canEditItems,
      customerLinkingId,
      isKds,
      openCustomerModal,
      orderCustomerName,
      shouldShowOrderPartyDetails,
      showTopBarCustomerAction,
    ],
  )

  const openCustomerCreateModal = useCallback(() => {
    setCustomerCreateModalVisible(true)
  }, [])

  const closeAddressModal = useCallback(() => {
    if (addressSaveLoading || addressSelectingId) {
      return
    }

    setAddressModalVisible(false)
    setAddressModalMode('select')
    setAddressOptions([])
    setAddressForm(createEmptyAddressForm())
  }, [addressSaveLoading, addressSelectingId])

  const loadAddressOptions = useCallback(async customer => {
    const customerIri = toEntityIri(customer, 'people')

    if (!customerIri) {
      setAddressOptions([])
      return []
    }

    try {
      setAddressOptionsLoading(true)
      const response = await addressActions.getItems({
        people: customerIri,
      })
      const items = Array.isArray(response) ? response : []

      setAddressOptions(items)
      return items
    } catch (addressError) {
      setAddressOptions([])
      showError(formatApiError(addressError))
      return []
    } finally {
      setAddressOptionsLoading(false)
    }
  }, [addressActions, showError])

  const openAddressCreateMode = useCallback(() => {
    if (!canEditItems) {
      return
    }

    setAddressForm(createEmptyAddressForm())
    setAddressModalMode('create')
    setAddressModalVisible(true)
  }, [canEditItems])

  const openAddressModal = useCallback(async () => {
    if (!canEditItems) {
      return
    }

    setAddressModalVisible(true)

    if (!selectedOrderClientIri) {
      setAddressOptions([])
      setAddressModalMode('create')
      return
    }

    setAddressModalMode('select')
    await loadAddressOptions(localOrderClient)
  }, [canEditItems, loadAddressOptions, localOrderClient, selectedOrderClientIri])

  const handleAddressFormFieldChange = useCallback((field, value) => {
    setAddressForm(previousForm => ({
      ...previousForm,
      [field]:
        field === 'cep'
          ? normalizePostalCodeInput(value)
          : field === 'number'
            ? String(value ?? '').replace(/\D+/g, '')
            : value,
    }))
  }, [])

  useEffect(() => {
    setObservationDraft(localOrderObservationSource || '')
  }, [localOrderObservationSource])

  const handleStartObservationEdit = useCallback(() => {
    if (!canEditItems) {
      return
    }

    setObservationDraft(localOrderObservationSource || '')
    setObservationEditing(true)
  }, [canEditItems, localOrderObservationSource])

  const handleCancelObservationEdit = useCallback(() => {
    if (observationSaving) {
      return
    }

    setObservationDraft(localOrderObservationSource || '')
    setObservationEditing(false)
  }, [localOrderObservationSource, observationSaving])

  const handleSaveObservation = useCallback(async () => {
    if (!canEditItems || observationSaving) {
      return
    }

    try {
      setObservationSaving(true)

      await updateCurrentOrder({
        comments: normalizeText(observationDraft) || null,
      })

      setObservationEditing(false)
      showSuccess(
        normalizeText(observationDraft)
          ? 'Observação do pedido atualizada com sucesso.'
          : 'Observação do pedido removida com sucesso.',
      )
    } catch (observationError) {
      showError(formatApiError(observationError))
    } finally {
      setObservationSaving(false)
    }
  }, [
    canEditItems,
    observationDraft,
    observationSaving,
    showError,
    showSuccess,
    updateCurrentOrder,
  ])

  useEffect(() => {
    if (!customerModalVisible) {
      return undefined
    }

    const normalizedSearch = String(customerSearch || '').trim()

    if (!normalizedSearch || !orderCompanyIri) {
      setCustomerSearchResults([])
      setCustomerSearchLoading(false)
      return undefined
    }

    let isMounted = true
    const timeoutId = setTimeout(async () => {
      try {
        setCustomerSearchLoading(true)
        const response = await peopleActions.getItems({
          'link.company': orderCompanyIri,
          'link.linkType': 'client',
          search: normalizedSearch,
        })

        if (!isMounted) {
          return
        }

        setCustomerSearchResults(Array.isArray(response) ? response : [])
      } catch {
        if (isMounted) {
          setCustomerSearchResults([])
        }
      } finally {
        if (isMounted) {
          setCustomerSearchLoading(false)
        }
      }
    }, 250)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [
    customerModalVisible,
    customerSearch,
    orderCompanyIri,
    peopleActions,
  ])

  const handleSelectCustomer = useCallback(async customer => {
    const nextCustomerIri = toEntityIri(customer, 'people')
    const nextCustomerId = String(getEntityId(customer) || '')

    if (!nextCustomerIri) {
      showError('Nao foi possivel identificar o cliente selecionado.')
      return
    }

    if (selectedOrderClientIri === nextCustomerIri) {
      closeCustomerModal()
      return
    }

    try {
      setCustomerLinkingId(nextCustomerId)
      await updateCurrentOrder({ client: nextCustomerIri })
      closeCustomerModal()
      showSuccess(
        selectedOrderClientIri
          ? 'Cliente do pedido atualizado com sucesso.'
          : 'Cliente vinculado ao pedido com sucesso.',
      )
    } catch (updateError) {
      showError(formatApiError(updateError))
    } finally {
      setCustomerLinkingId('')
    }
  }, [
    closeCustomerModal,
    selectedOrderClientIri,
    showError,
    showSuccess,
    updateCurrentOrder,
  ])

  const handleCustomerCreated = useCallback(async savedCustomer => {
    setCustomerCreateModalVisible(false)

    if (!savedCustomer) {
      return
    }

    await handleSelectCustomer(savedCustomer)
  }, [handleSelectCustomer])

  const handleSelectAddress = useCallback(async address => {
    const nextAddressIri = toEntityIri(address, 'addresses')
    const nextAddressId = String(getEntityId(address) || '')

    if (!nextAddressIri) {
      showError('Nao foi possivel identificar o endereco selecionado.')
      return
    }

    if (selectedOrderAddressIri === nextAddressIri) {
      closeAddressModal()
      return
    }

    try {
      setAddressSelectingId(nextAddressId)
      await updateCurrentOrder({ addressDestination: nextAddressIri })
      closeAddressModal()
      showSuccess('Endereço de entrega atualizado com sucesso.')
    } catch (updateError) {
      showError(formatApiError(updateError))
    } finally {
      setAddressSelectingId('')
    }
  }, [
    closeAddressModal,
    selectedOrderAddressIri,
    showError,
    showSuccess,
    updateCurrentOrder,
  ])

  const handleCreateAddress = useCallback(async () => {
    const street = normalizeText(addressForm.street)
    const district = normalizeText(addressForm.district)
    const city = normalizeText(addressForm.city)
    const state = normalizeText(addressForm.state)
    const country = normalizeText(addressForm.country)
    const number = String(addressForm.number ?? '').replace(/\D+/g, '').trim()
    const cep = normalizePostalCodeInput(addressForm.cep)
    const complement = normalizeText(addressForm.complement)
    const nickname = resolvePreferredText(addressForm.nickname, 'Entrega')

    if (!street || !district || !city || !state || !country || !number || !cep) {
      showError('Rua, número, bairro, cidade, estado, país e CEP são obrigatórios.')
      return
    }

    try {
      setAddressSaveLoading(true)

      const payload = {
        street,
        district,
        city,
        state,
        country,
        number: Number(number),
        cep,
        nickname,
        complement,
        ...(selectedOrderClientIri ? { people: selectedOrderClientIri } : {}),
      }

      const savedAddress = await addressActions.save(payload)
      const savedAddressIri = toEntityIri(savedAddress, 'addresses')

      if (!savedAddressIri) {
        throw new Error('Endereço criado sem identificador válido.')
      }

      await updateCurrentOrder({ addressDestination: savedAddressIri })
      closeAddressModal()
      showSuccess('Endereço de entrega atualizado com sucesso.')
    } catch (saveError) {
      showError(formatApiError(saveError))
    } finally {
      setAddressSaveLoading(false)
    }
  }, [
    addressActions,
    addressForm.cep,
    addressForm.city,
    addressForm.complement,
    addressForm.country,
    addressForm.district,
    addressForm.nickname,
    addressForm.number,
    addressForm.state,
    addressForm.street,
    closeAddressModal,
    selectedOrderClientIri,
    showError,
    showSuccess,
    updateCurrentOrder,
  ])

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

  const handleOpenFinancialDetails = useCallback(async () => {
    setFinancialDetailsVisible(true)
    if (!localInvoiceCards.length) {
      await loadOrderInvoices({silent: true})
    }
  }, [loadOrderInvoices, localInvoiceCards.length])

  const handleOpenInvoiceDetails = useCallback(invoiceCard => {
    const invoiceId = Number(invoiceCard?.invoiceId || 0)
    if (!invoiceId) {
      return
    }

    const storeInvoice =
      invoiceCard?.invoice && typeof invoiceCard.invoice === 'object'
        ? invoiceCard.invoice
        : {
            id: invoiceId,
            '@id': `/invoices/${invoiceId}`,
          }

    invoiceActions?.setItem?.(storeInvoice)
    closeFinancialDetailsModal()

    const openInvoiceDetails = () => {
      navigation.navigate('InvoiceDetailsPage', {
        id: invoiceId,
      })
    }

    const scheduleOpenInvoiceDetails = globalThis?.requestAnimationFrame

    if (typeof scheduleOpenInvoiceDetails === 'function') {
      scheduleOpenInvoiceDetails(openInvoiceDetails)
      return
    }

    setTimeout(openInvoiceDetails, 0)
  }, [closeFinancialDetailsModal, invoiceActions, navigation])

  const handleOrderTools = useCallback(async () => {
    if (!canShowDebugActions) {
      return
    }

    setDetailsModalVisible(true)
    await marketplaceSummary.ensureMarketplaceSummary()
  }, [canShowDebugActions, marketplaceSummary])

  const topBarOrderId = item?.id || orderParam?.id || routeOrderId

  const handleOrderAttachments = useCallback(() => {
    if (!topBarOrderId) {
      return
    }

    setAttachmentsVisible(true)
  }, [topBarOrderId])

  const handleOrderLogs = useCallback(() => {
    if (!canShowDebugActions) {
      return
    }

    const currentOrderId = item?.id || orderParam?.id
    if (!currentOrderId) return

    navigation.navigate('EntityLogPage', {
      id: currentOrderId,
      store: 'orders',
    })
  }, [canShowDebugActions, item?.id, navigation, orderParam?.id])

  const handleOrderLogistics = useCallback(() => {
    if (!topBarOrderId) {
      return
    }

    navigation.navigate('OrderLogisticsPage', {
      id: topBarOrderId,
    })
  }, [navigation, topBarOrderId])

  const renderOrderProductActions = useCallback(({
    card,
    orderProduct,
    entryType,
  }) => (
    <OrderDetailsProductActions
      card={card}
      orderProduct={orderProduct}
      entryType={entryType}
      canMutateOrderProducts={canMutateOrderProducts}
      confirmRemoveItemId={confirmRemoveItemId}
      handleDecreaseOpQuantity={handleDecreaseOpQuantity}
      handleEditCustomizableOrderProduct={handleEditCustomizableOrderProduct}
      handleIncreaseOpQuantity={handleIncreaseOpQuantity}
      handleRemoveOp={handleRemoveOp}
      isOrderProductCommitting={isOrderProductCommitting}
      localStyles={localStyles}
      ppcColors={ppcColors}
    />
  ), [
    canMutateOrderProducts,
    confirmRemoveItemId,
    handleDecreaseOpQuantity,
    handleEditCustomizableOrderProduct,
    handleIncreaseOpQuantity,
    handleRemoveOp,
    isOrderProductCommitting,
    localStyles,
    ppcColors,
  ])

  const isCompactMobileViewport = viewportWidth < 360
  const shouldStackHeaderActions = useUnifiedKdsLayout && viewportWidth <= 600
  const mobileBottomCartOffset = getOwnedBottomBarOffset({
    hasBottomNavigation: shouldShowBottomNavigation,
    bottomInset: insets?.bottom,
  })
  const mobileOrderBottomSpacing = shouldShowMobilePaymentBar
    ? (isCompactMobileViewport ? 148 : 132)
    : 24
  const topBarButtons = useMemo(() => {
    const buttons = [ORDER_TOP_BAR_ACTIONS.PRINT]

    if (topBarOrderId) {
      buttons.push(ORDER_TOP_BAR_ACTIONS.LOGISTICS)
      buttons.push(ORDER_TOP_BAR_ACTIONS.ATTACHMENTS)
    }

    if (canShowDebugActions) {
      buttons.push(ORDER_TOP_BAR_ACTIONS.TOOLS, ORDER_TOP_BAR_ACTIONS.LOGS)
    }

    return buttons
  }, [canShowDebugActions, topBarOrderId])
  const topBarPrintJob = {type: 'order', orderId: topBarOrderId}
  const topBarPrinterSelection = isKds
    ? {
        enabled: true,
        context: 'display',
        display: selectedDisplay,
        displayId: selectedDisplay?.id,
      }
    : {enabled: true}
  const shouldHideCompactTopBarActions =
    appType === 'POS' && isPosSelfServiceOperationMode

  const renderTopBarActions = useCallback(
    containerStyle => (
      <OrderTopBarActions
        buttons={topBarButtons}
        containerStyle={containerStyle}
        iconButtonStyle={localStyles.topBarIconButton}
        iconButtonDisabledStyle={localStyles.topBarIconButtonDisabled}
        iconColor={ppcColors.accentInfo}
        printJob={topBarPrintJob}
        printDisabled={!topBarOrderId}
        printerSelection={topBarPrinterSelection}
        isTvDisplay={isTvDisplay}
        onPressLogistics={handleOrderLogistics}
        onPressAttachments={handleOrderAttachments}
        onPressTools={handleOrderTools}
        onPressLogs={handleOrderLogs}
        logisticsDisabled={!topBarOrderId}
        attachmentsDisabled={!topBarOrderId}
        logsDisabled={!topBarOrderId}
      />
    ),
    [
      handleOrderLogs,
      handleOrderTools,
      handleOrderAttachments,
      handleOrderLogistics,
      isKds,
      isTvDisplay,
      item?.id,
      localStyles.topBarIconButtonDisabled,
      localStyles.topBarIconButton,
      orderParam?.id,
      ppcColors.accentInfo,
      selectedDisplay,
      topBarButtons,
      topBarOrderId,
      topBarPrintJob,
      topBarPrinterSelection,
    ],
  )

  const renderCompactInlineTopBar = useCallback(() => (
      <OrderStackedTopBar
      order={orderIdentitySource}
      isKds
      orderHeaderProps={orderHeaderActionProps}
      onBackPress={() => navigation.goBack()}
      buttons={topBarButtons}
      printJob={topBarPrintJob}
      printDisabled={!topBarOrderId}
      printerSelection={topBarPrinterSelection}
      isTvDisplay={isTvDisplay}
      onPressLogistics={handleOrderLogistics}
      onPressAttachments={handleOrderAttachments}
      onPressTools={handleOrderTools}
      onPressLogs={handleOrderLogs}
      logisticsDisabled={!topBarOrderId}
      attachmentsDisabled={!topBarOrderId}
      logsDisabled={!topBarOrderId}
      showActions={!shouldHideCompactTopBarActions}
    />
  ), [
    shouldHideCompactTopBarActions,
    handleOrderLogs,
    handleOrderTools,
    handleOrderAttachments,
    handleOrderLogistics,
    isTvDisplay,
    navigation,
    orderHeaderActionProps,
    orderIdentitySource,
    topBarButtons,
    topBarOrderId,
    topBarPrintJob,
    topBarPrinterSelection,
  ])

  const orderPageTitle = useUnifiedKdsLayout
    ? ''
    : global.t?.t('orders', 'title', 'order') || 'Pedido'

  useLayoutEffect(() => {
    navigation.setOptions({
      title: orderPageTitle,
      headerShown: !shouldStackHeaderActions,
      headerStyle: shouldStackHeaderActions ? undefined : undefined,
      headerBackVisible: !shouldStackHeaderActions,
      headerLeft: shouldStackHeaderActions ? undefined : undefined,
      headerTitleAlign: shouldStackHeaderActions ? undefined : undefined,
      headerTitle: shouldStackHeaderActions
        ? undefined
        : useUnifiedKdsLayout
        ? () => (
          <View
            style={
              localStyles.topBarTitleWrap
            }
          >
            <OrderHeader
              order={orderIdentitySource}
              isKds
              {...orderHeaderActionProps}
            />
          </View>
        )
        : () => (
          <View style={localStyles.topBarTitleWrap}>
            <View style={localStyles.topBarTitleContent}>
              <Text style={localStyles.topBarTitleText}>
                {orderPageTitle}
              </Text>
            </View>
          </View>
        ),
      headerRight: shouldStackHeaderActions
        ? () => null
        : () => renderTopBarActions(localStyles.topBarActions),
    })
  }, [
    canShowDebugActions,
    handleOrderLogs,
    handleOrderTools,
    item?.id,
    orderParam?.id,
    isKds,
    isTvDisplay,
    localStyles.topBarTitleContent,
    localStyles.topBarActions,
    localStyles.topBarIconButton,
    localStyles.topBarTitleText,
    localStyles.topBarTitleWrap,
    marketplaceSummary.summary,
    navigation,
    orderPageTitle,
    orderHeaderActionProps,
    orderIdentitySource,
    ppcColors.accentInfo,
    renderTopBarActions,
    selectedDisplay,
    shouldStackHeaderActions,
    useUnifiedKdsLayout,
  ])

  const renderLocalInvoiceCards = useCallback(
    variant => (
      <OrderDetailsInvoiceCards
        variant={variant}
        localInvoiceCards={localInvoiceCards}
        groupedInvoiceSections={groupedInvoiceSections}
        localInvoicesEmptyText={localInvoicesEmptyText}
        localStyles={localStyles}
        ppcColors={ppcColors}
        handleOpenInvoiceDetails={handleOpenInvoiceDetails}
      />
    ),
    [
      handleOpenInvoiceDetails,
      groupedInvoiceSections,
      localInvoiceCards,
      localInvoicesEmptyText,
      localStyles,
      ppcColors,
    ],
  )
  const renderInvoiceListOnly = useCallback(
    variant => (
      <OrderInvoices
        isLoadingInvoices={orderInvoicesLoading}
        localInvoiceCards={localInvoiceCards}
        localInvoicesEmptyText={localInvoicesEmptyText}
        localInvoicesSectionTitle={localInvoicesSectionTitle}
        renderLocalInvoiceCards={renderLocalInvoiceCards}
        showFinancialSections={false}
        showInvoicesSectionTitle={false}
        variant={variant}
      />
    ),
    [
      orderInvoicesLoading,
      localInvoiceCards,
      localInvoicesEmptyText,
      localInvoicesSectionTitle,
      renderLocalInvoiceCards,
    ],
  )
  const renderItemsTab = useCallback(
    variant => {
      return (
        <OrderItemsTab
          addProductsButtonLabel={addProductsButtonLabel}
          canAddProductsToOrder={canAddProductsToOrder}
          onAddProduct={handleAddProduct}
          onCustomizeProduct={handleCustomizeProductFromSearch}
          onQuickAddProduct={handleQuickAddProductFromSearch}
          order={resolvedDisplayOrder || item}
          orderProducts={resolvedDisplayOrderProductsWithProductDetails}
          productSearchLoading={productSearchLoading}
          productSearchResults={productSearchResults}
          productSearchSelectionId={productSearchSelectionId}
          productSearchText={productSearchText}
          renderOrderProductActions={canMutateOrderProducts ? renderOrderProductActions : null}
          routeOrderId={routeOrderId}
          setProductSearchText={setProductSearchText}
          showPricing={!isKds && !isTvDisplay}
          variant={variant}
        />
      )
    },
    [
      addProductsButtonLabel,
      canAddProductsToOrder,
      canMutateOrderProducts,
      handleCustomizeProductFromSearch,
      handleQuickAddProductFromSearch,
      handleAddProduct,
      item,
      productSearchLoading,
      productSearchResults,
      productSearchSelectionId,
      productSearchText,
      renderOrderProductActions,
      resolvedDisplayOrder,
      resolvedDisplayOrderProductsWithProductDetails,
      routeOrderId,
      setProductSearchText,
      isKds,
      isTvDisplay,
    ],
  )

  const orderSummaryData = {
    title: global.t?.t('orders', 'title', 'orderSummary'),
    base: {
      order: orderIdentitySource,
      cards: hasMarketplaceIntegration
        ? []
        : [
            {
              key: 'application',
              label: global.t?.t('orders', 'label', 'application'),
              value: orderAppLabel || '-',
            },
            {
              key: 'local-status',
              label: global.t?.t('orders', 'label', 'localStatus'),
              value: translatedLocalStatusLabel || '-',
            },
            {
              key: 'local-real-status',
              label:
                global.t?.t('orders', 'label', 'localRealStatus') ||
                'Real status local',
              value: translatedLocalRealStatusLabel || '-',
            },
            {
              key: 'payments',
              label: global.t?.t('orders', 'title', 'payments') || 'Pagamentos',
              value: localInvoiceCards.length,
            },
          ],
      lines: hasMarketplaceIntegration
        ? []
        : [
            {
              key: 'created-at',
              label: global.t?.t('orders', 'label', 'createdAt'),
              value: formatOrderDateTime(resolvedOrderDateValue),
            },
            {
              key: 'updated-at',
              label: global.t?.t('orders', 'label', 'updatedAt'),
              value: formatOrderDateTime(item?.alterDate || resolvedOrderDateValue),
            },
            {
              key: 'local-order-id',
              label:
                global.t?.t('orders', 'label', 'localOrderNumber') ||
                'Pedido interno',
              value: item?.id || orderParam?.id || '-',
            },
            {
              key: 'local-total',
              label: localDisplayLabel,
              value: Formatter.formatMoney(localDisplayAmount || 0),
            },
            shouldShowOrderPartyDetails && !!orderCustomerName && {
              key: 'customer',
              label: global.t?.t('orders', 'label', 'customer'),
              value: orderCustomerName,
            },
            shouldShowOrderPartyDetails && !!orderCustomerPhone && {
              key: 'customer-phone',
              label: global.t?.t('orders', 'label', 'phone'),
              value: orderCustomerPhone,
            },
            shouldShowOrderPartyDetails && !!orderCustomerDocument && {
              key: 'customer-document',
              label: orderCustomerDocumentLabel,
              value: orderCustomerDocument,
            },
            shouldShowOrderAddress && !!localOrderAddressParts.primary && {
              key: 'address',
              label: global.t?.t('orders', 'label', 'delivery'),
              value: localOrderAddressParts.primary,
            },
            ...summaryInformationEntries,
          ].filter(Boolean),
    },
    tabs: [],
    primaryAction: null,
    marketplace: marketplaceSummary.summary,
  }
  const renderKdsMobileContent = () => (
    <OrderDetailsKdsContent
      localStyles={localStyles}
      ppcColors={ppcColors}
      mobileOrderBottomSpacing={mobileOrderBottomSpacing}
      isPosSelfServiceOperationMode={isPosSelfServiceOperationMode}
      shouldShowOrderPartyDetails={shouldShowOrderPartyDetails}
      isPurchaseOrder={isPurchaseOrder}
      item={item}
      orderParam={orderParam}
      orderCustomerName={orderCustomerName}
      orderCustomerPhone={orderCustomerPhone}
      localOrderCustomerDocument={localOrderCustomerDocument}
      orderCustomerDocumentLabel={orderCustomerDocumentLabel}
      canEditItems={canEditItems}
      openCustomerModal={openCustomerModal}
      customerLinkingId={customerLinkingId}
      openAddressModal={openAddressModal}
      shouldShowOrderAddress={shouldShowOrderAddress}
      observationEditing={observationEditing}
      observationDraft={observationDraft}
      setObservationDraft={setObservationDraft}
      handleStartObservationEdit={handleStartObservationEdit}
      handleCancelObservationEdit={handleCancelObservationEdit}
      handleSaveObservation={handleSaveObservation}
      observationSaving={observationSaving}
      baseOrderObservationText={baseOrderObservationText}
      compactOrderSummary={compactOrderSummary}
      renderItemsTab={renderItemsTab}
      addressSaveLoading={addressSaveLoading}
      addressSelectingId={addressSelectingId}
      shouldShowInlineOrderTotal={shouldShowInlineOrderTotal}
      orderAddressPrimary={orderAddressPrimary}
      orderAddressSecondary={orderAddressSecondary}
      selectedOrderClientIri={selectedOrderClientIri}
      showBaseOrderObservationCard={showBaseOrderObservationCard}
    />
  )


  const modalBottomInset = Math.max(insets?.bottom || 0, 8)

  return (
    <SafeAreaView
      style={[
        cssStyles.container,
        {
          flex: 1,
          paddingBottom: useUnifiedKdsLayout ? 0 : 120,
          backgroundColor: useUnifiedKdsLayout ? ppcColors.appBg : undefined,
        },
        useUnifiedKdsLayout && localStyles.kdsContainer,
      ]}
    >
      {shouldStackHeaderActions && renderCompactInlineTopBar()}
      {showBarcodeInput && <BarcodeInput />}
      <StateStore store={['orders', 'order_file', 'file']} />
      {!isPosSelfServiceOperationMode &&
        !isPurchaseOrder &&
        shouldShowOrderPartyDetails && (
        <>
          <OrderDetailsAssignmentModals
            customerModalVisible={customerModalVisible}
            closeCustomerModal={closeCustomerModal}
            customerLinkingId={customerLinkingId}
            orderCustomerName={orderCustomerName}
            localStyles={localStyles}
            ppcColors={ppcColors}
            modalBottomInset={modalBottomInset}
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
            addressOptions={addressOptions}
            addressOptionsLoading={addressOptionsLoading}
            addressSelectingId={addressSelectingId}
            handleSelectAddress={handleSelectAddress}
            addressForm={addressForm}
            handleAddressFormFieldChange={handleAddressFormFieldChange}
            handleCreateAddress={handleCreateAddress}
            addressSaveLoading={addressSaveLoading}
            peopleStore={peopleStore}
          />
        </>
      )}
      <OrderSummaryModal
        visible={detailsModalVisible}
        onClose={closeDetailsModal}
        summary={orderSummaryData}
      />
      <OrderFinancialDetailsModal
        visible={financialDetailsVisible}
        onClose={closeFinancialDetailsModal}
        order={orderIdentitySource}
        isKds
        orderHeaderProps={orderHeaderActionProps}
        content={renderInvoiceListOnly('details')}
      />
      <OrderAttachmentManager
        visible={attachmentsVisible}
        onClose={() => setAttachmentsVisible(false)}
        order={orderIdentitySource}
        company={currentCompany || defaultCompany}
        onChanged={() => refreshCurrentOrder({force: true})}
      />
      <OrderMarketplaceOverlayHost marketplace={marketplaceSummary.summary} />
      {!isLoading && item && !error && (
        <View style={inlineStyle_2712_14}>
          {useUnifiedKdsLayout ? (
            renderKdsMobileContent()
          ) : (
            <>
              <View style={inlineStyle_2718_20}>
                {canAddProductsToOrder && (
                  <TouchableOpacity
                    onPress={handleAddProduct}
                    style={[globalStyles.button, { marginRight: 5 }]}
                  >
                    <Icon name="add-circle" size={24} color="#fff" />
                    <Text style={inlineStyle_2725_26}>
                      {addProductsButtonLabel}
                    </Text>
                  </TouchableOpacity>
                )}

                {showInlinePrimaryAction && (
                  <TouchableOpacity
                    onPress={handlePrimaryAction}
                    disabled={primaryActionLoading}
                    style={[globalStyles.button, { marginRight: 5 }]}
                  >
                    <Icon name={primaryActionIcon} size={24} color="#fff" />
                    <Text style={inlineStyle_2737_26}>
                      {primaryActionLabel}
                    </Text>
                  </TouchableOpacity>
                )}

                {canShowDebugActions && (
                  <>
                    <TouchableOpacity
                      onPress={handleOrderLogs}
                      disabled={!(item?.id || orderParam?.id)}
                      style={[globalStyles.button, { marginLeft: 5 }]}
                    >
                      <Icon name="history" size={24} color="#fff" />
                      <Text style={inlineStyle_2748_24}>
                        {global.t?.t('orders', 'button', 'logs') || 'Logs'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleOrderTools}
                      style={[globalStyles.button, { marginLeft: 5 }]}
                    >
                      <Icon name="settings" size={24} color="#fff" />
                      <Text style={inlineStyle_2748_24}>
                        {global.t?.t('orders', 'button', 'details')}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}

          {shouldShowMobilePaymentBar && (
            <BottomCart
              bottomOffset={mobileBottomCartOffset}
              actionLabel={primaryActionLabel}
              actionIcon={primaryActionIcon}
              actionDisabled={primaryActionDisabled}
              collapsePayableWhenPaid={false}
              paymentPendingAmount={hasMarketplaceIntegration ? 0 : localPendingAmount}
              paymentPendingLabel={global.t?.t('orders', 'label', 'pending') || 'Pendente'}
              paymentPaidLabel={global.t?.t('orders', 'label', 'paid') || 'Paga'}
              paidDetailsLabel={global.t?.t('orders', 'button', 'details') || 'Detalhes'}
              paidOrderAmount={localOrderTotal}
              paidOrderLabel={
                hasMarketplaceIntegration
                  ? 'Valor do pedido'
                  : global.t?.t('orders', 'label', 'localTotal') || 'Total do pedido'
              }
              paidReceivedAmount={localReceivedAmount}
              paidReceivedLabel={
                hasMarketplaceIntegration
                  ? 'Valor do pagamento'
                  : global.t?.t('orders', 'label', 'paid') || 'Recebido'
              }
              onActionPress={handlePrimaryAction}
              onPaidDetailsPress={handleOpenFinancialDetails}
              showPaidBreakdown
              showActionButton={shouldRenderOrderDetailsPaymentAction({canAddOrderPayment})}
              showPayableBadge={false}
              variant="payment-status"
            />
          )}

        </View>
      )}
    </SafeAreaView>
  );
}

export default OrderDetails
