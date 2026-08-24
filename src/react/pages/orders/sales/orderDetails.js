import React from 'react'

import {
  resolveOrderDateValue,
  resolvePreferredText,
  formatOrderDateTime,
} from './orderDetails/helpers'
import useOrderDetailsBootstrap from './orderDetails/useOrderDetailsBootstrap'
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
  const bootstrap = useOrderDetailsBootstrap({ route, navigation })
  const {
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
    peopleActions,
    defaultCompany,
    addressActions,
    ppcColors,
    localStyles,
    globalStyles,
    currentCompany,
    cssStyles,
    orderInvoicesLoading,
    viewportWidth,
    selectedDisplay,
    orderCompanyId,
    orderCompanyIri,
    isPosSelfServiceOperationMode,
    isSingleItemOperationMode,
    shouldShowBottomNavigation,
    canShowDebugActions,
    showBarcodeInput,
    localStatusNameKey,
    localRealStatusKey,
    isLocallyTerminalOrder,
    isPurchaseOrder,
    shouldShowOrderPartyDetails,
    localOrderTypeKey,
  } = bootstrap

  const {
    filteredStoredOrderProducts,
    materializeOrderWithProducts,
    orderInvoices,
    loadOrderInvoices,
    commitResolvedOrderProducts,
    refreshCurrentOrder,
    marketplaceSummary,
    canEditItems,
    canMutateOrderProducts,
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
    orderCompanyIri,
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
    isKds,
  })

  const {
    primaryActionLoading,
    handleAddProduct,
    handlePrimaryAction,
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
    resolvedDisplayOrderProductsWithProductDetails,
    resolvedDisplayOrder,
    orderIdentitySource,
    orderAdditionalInfoEntries,
    isTerminalOrder,
    shouldShowOrderAddress,
    translatedLocalStatusLabel,
    translatedLocalRealStatusLabel,
    localOrderAddressParts,
    localOrderAddress,
  } = useOrderDetailsProductDisplay({
    item,
    orderParam,
    marketplaceSummary,
    filteredStoredOrderProducts,
    isLocallyTerminalOrder,
    localRealStatusKey,
    localStatusNameKey,
    isPurchaseOrder,
    shouldShowOrderPartyDetails,
  })

  const {
    localInvoiceCards,
    localReceivedAmount,
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
    addressSaveLoading,
    addressSelectingId,
    addressOptions,
    addressOptionsLoading,
    addressForm,
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
    closeCustomerModal,
    openCustomerModal,
    orderHeaderActionProps,
    openCustomerCreateModal,
    closeAddressModal,
    openAddressModal,
    handleAddressFormFieldChange,
    handleSelectAddress,
    handleCreateAddress,
    handleStartObservationEdit,
    handleCancelObservationEdit,
    handleSaveObservation,
    handleSelectCustomer,
    handleCustomerCreated,
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
    handleOrderNf,
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
    handleOrderNf,
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
    handleOpenInvoiceDetails,
    orderInvoicesLoading,
    routeOrderId,
    productSearchLoading,
    productSearchResults,
    productSearchSelectionId,
    handleCustomizeProductFromSearch,
    handleQuickAddProductFromSearch,
    resolvedDisplayOrder,
    resolvedDisplayOrderProductsWithProductDetails,
  })

  return (
    <OrderDetailsView
      {...renderers}
      cssStyles={cssStyles}
      localStyles={localStyles}
      globalStyles={globalStyles}
      ppcColors={ppcColors}
      useUnifiedKdsLayout={useUnifiedKdsLayout}
      showBarcodeInput={showBarcodeInput}
      isPosSelfServiceOperationMode={isPosSelfServiceOperationMode}
      productSearchText={productSearchText}
      setProductSearchText={setProductSearchText}
      productSearchResults={productSearchResults}
      productSearchLoading={productSearchLoading}
      productSearchSelectionId={productSearchSelectionId}
      handleQuickAddProductFromSearch={handleQuickAddProductFromSearch}
      handleCustomizeProductFromSearch={handleCustomizeProductFromSearch}
      resolvedDisplayOrderProductsWithProductDetails={resolvedDisplayOrderProductsWithProductDetails}
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
      addressOptions={addressOptions}
      addressOptionsLoading={addressOptionsLoading}
      addressSelectingId={addressSelectingId}
      handleSelectAddress={handleSelectAddress}
      addressForm={addressForm}
      handleCreateAddress={handleCreateAddress}
      addressSaveLoading={addressSaveLoading}
      peopleStore={null}
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
      handleOrderNf={handleOrderNf}
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
      currentCompany={currentCompany}
      defaultCompany={defaultCompany}
      refreshCurrentOrder={refreshCurrentOrder}
      marketplaceSummary={marketplaceSummary}
      addProductsButtonLabel={global.t?.t('orders', 'button', 'addProduct') || 'Adicionar produto'}
      showInlinePrimaryAction={canAddOrderPayment}
      canShowDebugActions={canShowDebugActions}
      handleOrderLogs={handleOrderLogs}
      handleOrderTools={handleOrderTools}
      orderParam={orderParam}
      localPendingAmount={localPendingAmount}
    />
  )
}

export default OrderDetails
