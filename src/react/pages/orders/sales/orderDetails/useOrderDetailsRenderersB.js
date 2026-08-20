/**
 * Render helpers for OrderDetails (useOrderDetailsRenderersB).
 * @param {Object} ctx shared model context (mutated with render* functions)
 */
export function useOrderDetailsRenderersB(ctx) {
                            <Text style={localStyles.orderInvoiceInfoValue}>
                              {detail.value}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </InvoiceCardContainer>
                  )
                })}
              </View>
            </View>
          ))}
        </View>
      )
    },
    [
      handleOpenInvoiceDetails,
      groupedInvoiceSections,
      localInvoiceCards,
      localInvoicesEmptyText,
      localStyles.detailsSection,
      localStyles.detailsSectionTitle,
      localStyles.detailsTabStack,
      localStyles.detailsInfoText,
      localStyles.mobileInfoSubtitle,
      localStyles.orderInvoiceAmount,
      localStyles.orderInvoiceCard,
      localStyles.orderInvoiceCardInteractive,
      localStyles.orderInvoiceCardDetails,
      localStyles.orderInvoiceCardHeader,
      localStyles.orderInvoiceCardHeaderActions,
      localStyles.orderInvoiceInfoCard,
      localStyles.orderInvoiceInfoCardWide,
      localStyles.orderInvoiceInfoGrid,
      localStyles.orderInvoiceInfoLabel,
      localStyles.orderInvoiceInfoValue,
      localStyles.orderInvoiceList,
      localStyles.orderInvoiceStatusBadge,
      localStyles.orderInvoiceStatusText,
      localStyles.orderInvoiceSubtitle,
      localStyles.orderInvoiceTitle,
      localStyles.orderInvoiceTitleWrap,
      ppcColors.textSecondary,
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
    <ScrollView
      contentContainerStyle={[
        localStyles.mobileOrderScrollContent,
        { paddingBottom: mobileOrderBottomSpacing },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={localStyles.mobileOrderLayout}>
      {!isPosSelfServiceOperationMode && shouldShowOrderPartyDetails && (
        <View style={localStyles.mobileInfoCard}>
          <View style={localStyles.mobileInfoHeader}>
            <View style={localStyles.mobileInfoIconWrap}>
              <Icon name={isPurchaseOrder ? 'local-shipping' : 'person'} size={16} color={ppcColors.accentInfo} />
            </View>
            <View style={localStyles.mobileInfoTextWrap}>
              <Text style={localStyles.mobileInfoLabel}>{isPurchaseOrder ? global.t?.t('orders', 'label', 'supplier') : global.t?.t('orders', 'label', 'customer')}</Text>
              <Text style={localStyles.mobileInfoTitle}>
                {isPurchaseOrder
                  ? (item?.client?.alias || item?.client?.name || orderParam?.client?.alias || orderParam?.client?.name || global.t?.t('orders', 'message', 'supplierNotInformed'))
                  : (orderCustomerName || global.t?.t('orders', 'message', 'customerNotIdentified'))
                }
              </Text>
              {!isPurchaseOrder && !!orderCustomerPhone && (
                <Text style={localStyles.mobileInfoSubtitle}>{orderCustomerPhone}</Text>
              )}
              {!isPurchaseOrder && !!localOrderCustomerDocument && (
                <Text style={localStyles.mobileInfoSubtitle}>
                  {orderCustomerDocumentLabel}: {localOrderCustomerDocument}
                </Text>
              )}
            </View>
          </View>

          {!isPurchaseOrder && canEditItems && (
            <View style={localStyles.inlineActionRow}>
              <TouchableOpacity
                onPress={openCustomerModal}
                disabled={!!customerLinkingId}
                style={[
                  localStyles.inlineActionButton,
                  localStyles.inlineActionButtonPrimary,
                  !!customerLinkingId &&
                    localStyles.inlineActionButtonDisabled,
                ]}
              >
                <Icon name="search" size={15} color={ppcColors.accentInfo} />
                <Text style={localStyles.inlineActionButtonText}>
                  {orderCustomerName ? 'Trocar cliente' : 'Vincular cliente'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {shouldShowOrderAddress && (
            <View style={localStyles.mobileAddressCard}>
              <Icon name="place" size={15} color={ppcColors.accentInfo} />
              <View style={localStyles.mobileAddressTextWrap}>
                <Text style={localStyles.mobileAddressPrimary}>
                  {orderAddressPrimary || global.t?.t('orders', 'message', 'addressNotInformed')}
                </Text>
                {!!orderAddressSecondary && (
                  <Text style={localStyles.mobileAddressSecondary}>{orderAddressSecondary}</Text>
                )}
              </View>
            </View>
          )}

          {!isPurchaseOrder && shouldShowOrderAddress && canEditItems && (
            <View style={localStyles.inlineActionRow}>
              <TouchableOpacity
                onPress={openAddressModal}
                disabled={addressSaveLoading || !!addressSelectingId}
                style={[
                  localStyles.inlineActionButton,
                  localStyles.inlineActionButtonPrimary,
                  (addressSaveLoading || !!addressSelectingId) &&
                    localStyles.inlineActionButtonDisabled,
                ]}
              >
                <Icon
                  name={selectedOrderClientIri ? 'place' : 'add-location'}
                  size={15}
                  color={ppcColors.accentInfo}
                />
                <Text style={localStyles.inlineActionButtonText}>
                  {selectedOrderClientIri ? 'Escolher endereço' : 'Novo endereço'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isPurchaseOrder && showBaseOrderObservationCard && (
            <View style={localStyles.mobileNoteCard}>
              <View style={localStyles.mobileNoteHeader}>
                <Icon name="info" size={14} color={ppcColors.accent} />
                <Text style={localStyles.mobileNoteLabel}>{global.t?.t('orders', 'label', 'customerObservation')}</Text>
              </View>
              {observationEditing ? (
                <>
                  <TextInput
                    value={observationDraft}
                    onChangeText={setObservationDraft}
                    editable={!observationSaving}
                    multiline
                    numberOfLines={3}
                    placeholder={global.t?.t('orders', 'label', 'customerObservation')}
                    placeholderTextColor={ppcColors.textSecondary}
                    style={[
                      localStyles.assignmentFormInput,
                      {minHeight: 96, textAlignVertical: 'top', marginBottom: 8},
                    ]}
                  />

                  <View style={localStyles.inlineActionRow}>
                    <TouchableOpacity
                      onPress={handleCancelObservationEdit}
                      disabled={observationSaving}
                      style={[
                        localStyles.inlineActionButton,
                        observationSaving && localStyles.inlineActionButtonDisabled,
                      ]}
                    >
                      <Icon name="close" size={15} color={ppcColors.textSecondary} />
                      <Text style={[localStyles.inlineActionButtonText, {color: ppcColors.textSecondary}]}>
                        {global.t?.t('orders', 'button', 'close') || 'Cancelar'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleSaveObservation}
                      disabled={observationSaving}
                      style={[
                        localStyles.inlineActionButton,
                        localStyles.inlineActionButtonPrimary,
                        observationSaving && localStyles.inlineActionButtonDisabled,
                      ]}
                    >
                      {observationSaving ? (
                        <InlineLoadingText color={ppcColors.accentInfo}>Salvando...</InlineLoadingText>
                      ) : (
                        <>
                          <Icon name="check" size={15} color={ppcColors.accentInfo} />
                          <Text style={localStyles.inlineActionButtonText}>
                            {global.t?.t('orders', 'button', 'save') || 'Salvar'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : !!baseOrderObservationText ? (
                <>
                  <Text style={localStyles.mobileNoteText}>{baseOrderObservationText}</Text>
                  {canEditItems && (
                    <View style={[localStyles.inlineActionRow, {marginTop: 8}]}>
                      <TouchableOpacity
                        onPress={handleStartObservationEdit}
                        style={[
                          localStyles.inlineActionButton,
                          localStyles.inlineActionButtonPrimary,
                        ]}
                      >
                        <Icon name="edit" size={15} color={ppcColors.accentInfo} />
                        <Text style={localStyles.inlineActionButtonText}>
                          {global.t?.t('orders', 'button', 'edit') || 'Editar'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : canEditItems ? (
                <View style={localStyles.inlineActionRow}>
                  <TouchableOpacity
                    onPress={handleStartObservationEdit}
                    style={[
                      localStyles.inlineActionButton,
                      localStyles.inlineActionButtonPrimary,
                    ]}
                  >
                    <Icon name="add-comment" size={15} color={ppcColors.accentInfo} />
                    <Text style={localStyles.inlineActionButtonText}>
                      {global.t?.t('orders', 'button', 'addObservation') || 'Adicionar observacao'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}
        </View>
      )}

      {shouldShowInlineOrderTotal && (
        <View style={localStyles.mobileCompactSummaryCard}>
          <View style={localStyles.mobileCompactSummaryGrid}>
            <View
              accessible
              accessibilityLabel={compactOrderSummary.accessibilityLabel}
              style={localStyles.mobileCompactSummaryItem}
            >
              <View
                style={[
                  localStyles.mobileCompactSummaryTopRow,
                  {justifyContent: 'flex-end'},
                ]}
              >
                <View style={localStyles.mobileCompactSummaryMetric}>
                  <Icon name="payments" size={15} color={ppcColors.accentInfo} />
                  <Text
                    style={[
                      localStyles.mobileCompactSummaryValue,
                      localStyles.mobileCompactSummaryValueStrong,
                    ]}
                    numberOfLines={1}
                  >
                    {compactOrderSummary.totalValue}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      <View style={localStyles.mobileInfoCard}>
        {renderItemsTab('main')}
      </View>
      </View>
    </ScrollView>
  )


  return ctx;
}
