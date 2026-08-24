import React from 'react'
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import StateStore from '@controleonline/ui-common/src/react/components/StateStore'
import BarcodeInput from '@controleonline/ui-orders/src/react/pages/checkout/BarcodeInput'
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader'
import BottomCart from '@controleonline/ui-orders/src/react/components/cart/BottomCart'
import OrderMarketplaceOverlayHost from '../components/OrderMarketplaceOverlayHost'
import OrderSummaryModal from '../components/OrderSummaryModal'
import OrderFinancialDetailsModal from '../components/OrderFinancialDetailsModal'
import OrderAttachmentManager from '../components/OrderAttachmentManager'
import OrderDetailsAssignmentModals from './OrderDetailsAssignmentModals'
import { InlineLoadingText } from './InlineLoadingText'
import Icon from 'react-native-vector-icons/MaterialIcons'
import {
  shouldRenderOrderDetailsPaymentAction,
} from '../orderDetailsPaymentBar'
import css from '@controleonline/ui-orders/src/react/css/orders'

export default function OrderDetailsView(p) {
  const {
    cssStyles = css?.orders || css,
    localStyles,
    ppcColors,
    useUnifiedKdsLayout,
    shouldStackHeaderActions,
    renderCompactInlineTopBar,
    renderInvoiceListOnly,
    renderLocalInvoiceCards,
    renderItemsTab,
    renderTopBarActions,
    renderKdsMobileContent,
    orderSummaryData,
    modalBottomInset,
    mobileBottomCartOffset,
    mobileOrderBottomSpacing,
    showBarcodeInput,
    isPosSelfServiceOperationMode,
    isPurchaseOrder,
    shouldShowOrderPartyDetails,
    customerModalVisible,
    closeCustomerModal,
    customerLinkingId,
    orderCustomerName,
    customerSearch,
    setCustomerSearch,
    customerSearchLoading,
    customerSearchResults,
    handleSelectCustomer,
    openCustomerCreateModal,
    customerCreateModalVisible,
    setCustomerCreateModalVisible,
    handleCustomerCreated,
    addressModalVisible,
    closeAddressModal,
    addressModalMode,
    setAddressModalMode,
    handleAddressFormFieldChange,
    addressOptions = [],
    addressOptionsLoading = false,
    addressSelectingId = null,
    handleSelectAddress = () => {},
    addressForm = {},
    handleCreateAddress = () => {},
    addressSaveLoading = false,
    peopleStore = null,
    orderIdentitySource,
    orderHeaderActionProps,
    navigation,
    isKds,
    detailsModalVisible,
    closeDetailsModal,
    financialDetailsVisible,
    closeFinancialDetailsModal,
    attachmentsVisible,
    setAttachmentsVisible,
    topBarOrderId,
    item,
    handleAddProduct,
    handlePrimaryAction,
    handleOrderNf,
    primaryActionLoading,
    primaryActionDisabled,
    primaryActionLabel,
    primaryActionIcon,
    canAddOrderPayment,
    handleOpenFinancialDetails,
    localOrderTotal,
    localReceivedAmount,
    hasMarketplaceIntegration,
    shouldShowMobilePaymentBar,
    shouldShowBottomNavigation,
    canAddProductsToOrder,
    isLoading,
    error,
    shouldShowInlineOrderTotal,
    localDisplayLabel,
    localDisplayAmount,
    shouldShowPreparationTime,
    orderWaitingLabel,
    currentCompany = null,
    defaultCompany = null,
    refreshCurrentOrder = () => {},
    marketplaceSummary = {},
    globalStyles = {},
    addProductsButtonLabel = global.t?.t('orders', 'button', 'addProduct') || 'Adicionar produto',
    showInlinePrimaryAction = true,
    canShowDebugActions = false,
    handleOrderLogs = () => {},
    handleOrderTools = () => {},
    orderParam = null,
    localPendingAmount = 0,
  } = p

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
      <OrderMarketplaceOverlayHost marketplace={marketplaceSummary?.summary} />
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

                {/* NF belongs to the visible sales action bar; the header icon is only a secondary shortcut. */}
                {!!topBarOrderId && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={global.t?.t('orders', 'button', 'orderNf') || 'NF'}
                    testID="order-nf-action"
                    onPress={handleOrderNf}
                    style={[globalStyles.button, { marginRight: 5 }]}
                  >
                    <Icon name="receipt" size={24} color="#fff" />
                    <Text style={inlineStyle_2737_26}>
                      {global.t?.t('orders', 'button', 'orderNf') || 'NF'}
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

