import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useFocusEffect } from '@react-navigation/native'
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
  searchCompanyProducts,
  toEntityIri,
} from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders'

import {
  normalizeText,
} from '@controleonline/ui-common/src/react/utils/entityDisplay'
import {
  formatInvoiceTypeLabel,
  getInvoicePaymentTypeLabel,
} from '@controleonline/ui-common/src/react/utils/invoicePresentation'

import {
  buildAddProductsRouteParams,
  buildManagerPdvRouteParams,
  getOrderRouteId,
} from '@controleonline/ui-orders/src/react/utils/orderRoute'
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
  POS_DELIVERY_ENABLED_CONFIG_KEY,
  isTerminalOrderStatus,
  resolveEditableOrderType,
  translateOrderStatus,
  getEntityId,
  resolveDocumentLabel,
  formatOrderDateTime,
  resolveOrderDateValue,
} from './orderDetails/helpers';
import useOrderDetailsParty from './orderDetails/useOrderDetailsParty'
import useOrderDetailsProductSearch from './orderDetails/useOrderDetailsProductSearch'
import useOrderDetailsFinancials from './orderDetails/useOrderDetailsFinancials'
import useOrderDetailsProductMutations from './orderDetails/useOrderDetailsProductMutations'
import useOrderDetailsToolbarActions from './orderDetails/useOrderDetailsToolbarActions'
import useOrderDetailsPrimaryActions from './orderDetails/useOrderDetailsPrimaryActions'
import useOrderDetailsOrderSync from './orderDetails/useOrderDetailsOrderSync'
import useOrderDetailsProductDisplay from './orderDetails/useOrderDetailsProductDisplay'
import useOrderDetailsSummaryLabels from './orderDetails/useOrderDetailsSummaryLabels'
import useOrderDetailsRenderers from './orderDetails/useOrderDetailsRenderers'
import OrderDetailsView from './orderDetails/OrderDetailsView'

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

  const {
    orderProductsStore,
    currentOrderProductsRef,
    filteredStoredOrderProducts,
    materializeOrderWithProducts,
    orderInvoices,
    loadOrderInvoices,
    commitResolvedOrderProducts,
    refreshCurrentOrder,
    refreshIntegrationFinancialData,
    marketplaceSummary,
    buildOrderUpdatePayload,
    canEditItems,
    canMutateOrderProducts,
    syncCurrentOrderProducts,
    flushPendingOrderProductChanges,
    getScheduledQuantity,
    isOrderProductCommitting,
    scheduleQuantityChange,
    updateCurrentOrder,
    hasMarketplaceIntegration,
  } = useOrderDetailsOrderSync({
    item,
    orderParam,
    routeOrderId,
    routeOrderIri,
    route,
    navigation,
    ordersActions,
    ordersGetters,
    orderInvoicesActions,
    storedOrderInvoiceItems,
    showError,
    showSuccess,
    localRealStatusKey,
    localOrderTypeKey,
    isLocallyTerminalOrder,
  })

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

  const {
    resolvedDisplayOrderProducts,
    resolvedProductCandidatesById,
    resolvedDisplayOrderProductsWithProductDetails,
    effectiveDisplayedOperationalStatus,
    effectiveLocalStatusNameKey,
    effectiveLocalRealStatusKey,
    resolvedDisplayOrder,
    orderIdentitySource,
    orderAdditionalInfoEntries,
    normalizedOrderRealStatus,
    hasTerminalOrderState,
    isTerminalOrder,
  } = useOrderDetailsProductDisplay({
    item,
    orderParam,
    marketplaceSummary,
    filteredStoredOrderProducts,
    isLocallyTerminalOrder,
    localRealStatusKey,
  })

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

  const {
    localInvoicesEmptyText,
    localInvoicesSectionTitle,
    shouldShowPreparationTime,
    summaryInformationEntries,
    orderAppLabel,
    compactOrderSummary,
    closeDetailsModal,
    closeFinancialDetailsModal,
    topBarOrderId,
  } = useOrderDetailsSummaryLabels({
    orderAdditionalInfoEntries,
    isTerminalOrder,
    orderWaitingLabel,
    item,
    orderParam,
    localDisplayLabel,
    localDisplayAmount,
    setDetailsModalVisible,
    setFinancialDetailsVisible,
    itemId: item?.id,
    orderParamId: orderParam?.id,
    routeOrderId,
  })

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
