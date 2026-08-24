import React, { useCallback, useLayoutEffect, useMemo } from 'react'
import { Text, View } from 'react-native'
import OrderTopBarActions, {
  ORDER_TOP_BAR_ACTIONS,
} from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderTopBarActions'
import OrderStackedTopBar from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderStackedTopBar'
import { getOwnedBottomBarOffset } from '@controleonline/ui-layout/src/react/utils/posBottomNavigation'
import OrderDetailsProductActions from './OrderDetailsProductActions'
import OrderDetailsInvoiceCards from './OrderDetailsInvoiceCards'
import OrderDetailsKdsContent from './OrderDetailsKdsContent'
import OrderItemsTab from '../OrderItemsTab'
import OrderInvoices from '../OrderInvoices'
import { buildOrderSummaryData } from './buildOrderSummaryData'
import Formatter from '@controleonline/ui-common/src/utils/formatter'

export default function useOrderDetailsRenderers(p) {
  const {
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
    // kds content
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
    // summary
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
    groupedInvoiceSections = [],
    localInvoicesEmptyText = '',
    handleOpenInvoiceDetails = () => {},
    orderInvoicesLoading = false,
    localInvoicesSectionTitle = '',
    addProductsButtonLabel = global.t?.t('orders', 'button', 'addProduct') || 'Adicionar produto',
    handleCustomizeProductFromSearch = () => {},
    handleQuickAddProductFromSearch = () => {},
    resolvedDisplayOrder = null,
    resolvedDisplayOrderProductsWithProductDetails = [],
    productSearchLoading = false,
    productSearchResults = [],
    productSearchSelectionId = null,
    routeOrderId = null,
  } = p

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
      buttons.push(ORDER_TOP_BAR_ACTIONS.NF)
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
        onPressNf={handleOrderNf}
        logisticsDisabled={!topBarOrderId}
        attachmentsDisabled={!topBarOrderId}
        logsDisabled={!topBarOrderId}
        nfDisabled={!topBarOrderId}
      />
    ),
    [
      handleOrderLogs,
      handleOrderTools,
      handleOrderAttachments,
      handleOrderLogistics,
      handleOrderNf,
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
      onPressNf={handleOrderNf}
      logisticsDisabled={!topBarOrderId}
      attachmentsDisabled={!topBarOrderId}
      logsDisabled={!topBarOrderId}
      nfDisabled={!topBarOrderId}
      showActions={!shouldHideCompactTopBarActions}
    />
  ), [
    shouldHideCompactTopBarActions,
    handleOrderLogs,
    handleOrderTools,
    handleOrderAttachments,
    handleOrderLogistics,
    handleOrderNf,
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

  const orderSummaryData = buildOrderSummaryData({
    orderIdentitySource,
    hasMarketplaceIntegration,
    orderAppLabel,
    translatedLocalStatusLabel,
    translatedLocalRealStatusLabel,
    localInvoiceCards,
    resolvedOrderDateValue,
    item,
    orderParam,
    localDisplayLabel,
    localDisplayAmount,
    shouldShowOrderPartyDetails,
    orderCustomerName,
    orderCustomerPhone,
    orderCustomerDocument: localOrderCustomerDocument,
    orderCustomerDocumentLabel,
    shouldShowOrderAddress,
    localOrderAddressParts,
    summaryInformationEntries,
    marketplaceSummary,
    formatOrderDateTime,
    Formatter,
  })
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


  return {
    renderOrderProductActions,
    isCompactMobileViewport,
    shouldStackHeaderActions,
    mobileBottomCartOffset,
    mobileOrderBottomSpacing,
    topBarButtons,
    topBarPrintJob,
    topBarPrinterSelection,
    shouldHideCompactTopBarActions,
    renderTopBarActions,
    renderCompactInlineTopBar,
    renderLocalInvoiceCards,
    renderInvoiceListOnly,
    renderItemsTab,
    orderSummaryData,
    renderKdsMobileContent,
    modalBottomInset,
  }
}
