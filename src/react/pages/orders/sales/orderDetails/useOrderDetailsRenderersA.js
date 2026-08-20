/**
 * Render helpers for OrderDetails (useOrderDetailsRenderersA).
 * @param {Object} ctx shared model context (mutated with render* functions)
 */
export function useOrderDetailsRenderersA(ctx) {
  const renderOrderProductActions = useCallback(({
    card,
    orderProduct,
    entryType,
  }) => {
    if (!canMutateOrderProducts || !orderProduct) {
      return null
    }

    const isChildEntry = entryType === 'group' || !!card?.parentCardKey
    if (entryType === 'group') {
      return null
    }

    const editableOrderProduct = isChildEntry
      ? orderProduct
      : card?.rootItem || orderProduct
    if (isOrderProductProductionCompleted(editableOrderProduct)) {
      return null
    }

    const orderProductId = String(
      orderProduct?.id ||
      String(orderProduct?.['@id'] || '').replace(/\D/g, ''),
    )
    const quantity = Number(orderProduct?.quantity || 0)
    const isOpLoading = orderProductId ? isOrderProductCommitting(orderProductId) : false
    const isConfirming = orderProductId && confirmRemoveItemId === orderProductId
    const canEditCustomization = canReopenOrderProductCustomization(
      editableOrderProduct,
    )
    if (
      !canEditCustomization &&
      (!orderProductId || isChildEntry)
    ) {
      return null
    }

    return (
      <View style={localStyles.orderProductActionStack}>
        {canEditCustomization && (
          <TouchableOpacity
            accessibilityLabel={`Personalizar ${editableOrderProduct?.product?.product || 'item'}`}
            onPress={() => handleEditCustomizableOrderProduct(editableOrderProduct)}
            style={localStyles.orderProductCustomizeButton}
            disabled={isOpLoading}
          >
            <Icon name="tune" size={16} color={ppcColors.textPrimary} />
          </TouchableOpacity>
        )}

        {!isChildEntry && orderProductId ? (
          isConfirming ? (
            <View style={localStyles.editConfirmRow}>
              <Text style={localStyles.editConfirmText}>Remover?</Text>
              <TouchableOpacity
                onPress={() => handleRemoveOp(orderProduct)}
                style={localStyles.editConfirmYes}
                disabled={isOpLoading}
              >
                {isOpLoading
                  ? <InlineLoadingText color="#fff">...</InlineLoadingText>
                  : <Icon name="check" size={15} color="#fff" />}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setConfirmRemoveItemId(null)}
                style={localStyles.editConfirmNo}
                disabled={isOpLoading}
              >
                <Icon name="close" size={15} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={localStyles.editQtyRow}>
              <TouchableOpacity
                onPress={() => handleDecreaseOpQuantity(orderProduct)}
                style={localStyles.editQtyBtn}
              >
                <Icon
                  name={quantity <= 1 ? 'delete' : 'remove'}
                  size={18}
                  color={quantity <= 1 ? '#c10015' : ppcColors.textPrimary}
                />
              </TouchableOpacity>
              <View style={localStyles.editQtyBox}>
                <Text style={localStyles.editQtyText}>{quantity}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleIncreaseOpQuantity(orderProduct)}
                style={localStyles.editQtyBtn}
              >
                <Icon name="add" size={18} color={ppcColors.textPrimary} />
              </TouchableOpacity>
            </View>
          )
        ) : null}
      </View>
    )
  }, [
    canMutateOrderProducts,
    confirmRemoveItemId,
    handleDecreaseOpQuantity,
    handleEditCustomizableOrderProduct,
    handleIncreaseOpQuantity,
    handleRemoveOp,
    isOrderProductCommitting,
    localStyles.editConfirmNo,
    localStyles.editConfirmRow,
    localStyles.editConfirmText,
    localStyles.editConfirmYes,
    localStyles.editQtyBox,
    localStyles.editQtyBtn,
    localStyles.editQtyRow,
    localStyles.editQtyText,
    localStyles.orderProductActionStack,
    localStyles.orderProductCustomizeButton,
    ppcColors.textPrimary,
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
    variant => {
      const isDetailsVariant = variant === 'details'

      if (!localInvoiceCards.length) {
        return (
          <Text style={isDetailsVariant ? localStyles.detailsInfoText : localStyles.mobileInfoSubtitle}>
            {localInvoicesEmptyText}
          </Text>
        )
      }

      return (
        <View style={localStyles.detailsTabStack}>
          {groupedInvoiceSections.map(section => (
            <View
              key={section.key}
              style={section.label ? localStyles.detailsSection : null}>
              {!!section.label && (
                <Text style={localStyles.detailsSectionTitle}>{section.label}</Text>
              )}
              <View style={localStyles.orderInvoiceList}>
                {section.cards.map(invoiceCard => {
                  const canOpenInvoiceDetails = Number(invoiceCard?.invoiceId || 0) > 0
                  const InvoiceCardContainer = canOpenInvoiceDetails ? TouchableOpacity : View
                  const invoiceInfoCards = [
                    {
                      key: 'type',
                      label: global.t?.t('orders', 'label', 'invoiceType') || 'Tipo',
                      value: invoiceCard.kindLabel,
                    },
                    {
                      key: 'paymentType',
                      label:
                        global.t?.t('orders', 'label', 'paymentMethod') ||
                        'Forma de pagamento',
                      value: invoiceCard.paymentTypeLabel,
                    },
                    {
                      key: 'description',
                      label: global.t?.t('orders', 'label', 'description') || 'Descrição',
                      value: invoiceCard.descriptionLabel,
                      wide: true,
                    },
                    {
                      key: 'payer',
                      label: global.t?.t('orders', 'label', 'payer') || 'Pagador',
                      value: invoiceCard.payerLabel,
                    },
                    {
                      key: 'receiver',
                      label: global.t?.t('orders', 'label', 'receiver') || 'Recebedor',
                      value: invoiceCard.receiverLabel,
                    },
                  ].filter(detail => detail.value)

                  return (
                    <InvoiceCardContainer
                      key={invoiceCard.id}
                      {...(canOpenInvoiceDetails
                        ? {
                            activeOpacity: 0.88,
                            onPress: () => handleOpenInvoiceDetails(invoiceCard),
                            accessibilityRole: 'button',
                          }
                        : {})}
                      style={[
                        localStyles.orderInvoiceCard,
                        canOpenInvoiceDetails && localStyles.orderInvoiceCardInteractive,
                        isDetailsVariant && localStyles.orderInvoiceCardDetails,
                      ]}
                    >
                      <View style={localStyles.orderInvoiceCardHeader}>
                        <View style={localStyles.orderInvoiceTitleWrap}>
                          <Text style={localStyles.orderInvoiceTitle}>{invoiceCard.title}</Text>
                          {!!invoiceCard.subtitle && (
                            <Text style={localStyles.orderInvoiceSubtitle}>
                              {invoiceCard.subtitle}
                            </Text>
                          )}
                        </View>

                        <View style={localStyles.orderInvoiceCardHeaderActions}>
                          <View
                            style={[
                              localStyles.orderInvoiceStatusBadge,
                              {
                                borderColor: invoiceCard.statusColor,
                                backgroundColor: invoiceCard.statusBackgroundColor,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                localStyles.orderInvoiceStatusText,
                                {color: invoiceCard.statusColor},
                              ]}
                            >
                              {invoiceCard.statusLabel}
                            </Text>
                          </View>

                          {canOpenInvoiceDetails ? (
                            <Icon
                              name="chevron-right"
                              size={20}
                              color={ppcColors.textSecondary}
                            />
                          ) : null}
                        </View>
                      </View>

                      <Text style={localStyles.orderInvoiceAmount}>
                        {Formatter.formatMoney(invoiceCard.amount || 0)}
                      </Text>
                      <View style={localStyles.orderInvoiceInfoGrid}>
                        {invoiceInfoCards.map(detail => (
                          <View
                            key={`${invoiceCard.id}-${detail.key}`}
                            style={[
                              localStyles.orderInvoiceInfoCard,
                              detail.wide && localStyles.orderInvoiceInfoCardWide,
                            ]}>
                            <Text style={localStyles.orderInvoiceInfoLabel}>
                              {detail.label}
                            </Text>

  return ctx;
}
