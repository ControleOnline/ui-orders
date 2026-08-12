import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import usePosCartSession from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';
import {resolveLoyaltyCardProgress, resolvePeopleId} from '@controleonline/ui-orders/src/react/utils/checkoutLoyaltyCpf';
import useCheckoutPaymentRunners from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutPaymentRunners';
import useCheckoutPayFlow from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutPayFlow';
import useCheckoutLoyaltyEffects from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutLoyaltyEffects';
import useRemotePaymentResult from '@controleonline/ui-orders/src/react/pages/checkout/useRemotePaymentResult';
import useCheckoutPaymentOptionsLoader from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutPaymentOptionsLoader';
import useCheckoutNavigation from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutNavigation';
import useCheckoutOrderLifecycle from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutOrderLifecycle';
import CheckoutView from '@controleonline/ui-orders/src/react/pages/checkout/CheckoutView';
import useCheckoutContextState from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutContextState';
import useCheckoutPaymentSelection from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutPaymentSelection';
import useCheckoutLoyaltyUi from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutLoyaltyUi';
import {parseMoneyInputValue, resolveCashPaymentDetails} from '@controleonline/ui-common/src/react/utils/cashPayment';
import {SHOP_LOYALTY_GIFT_PRODUCT_ID_CONFIG_KEY} from '@controleonline/ui-common/src/react/utils/shopConfig';
import {useStore} from '@store';
const PAYMENT_CHANNEL_LOCAL = 'local';

const Checkout = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const deviceConfigStore = useStore('device_config');
  const deviceConfigGetters = deviceConfigStore.getters;
  const deviceConfigActions = deviceConfigStore.actions;
  const {item: device} = deviceConfigGetters;
  const deviceStore = useStore('device');
  const {item: storagedDevice} = deviceStore.getters;
  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const invoiceStore = useStore('invoice');
  const invoiceGetters = invoiceStore.getters;
  const invoiceActions = invoiceStore.actions;
  const orderInvoicesStore = useStore('order_invoices');
  const orderInvoicesGetters = orderInvoicesStore.getters;
  const orderInvoicesActions = orderInvoicesStore.actions;
  const orderProductsStore = useStore('order_products');
  const orderProductsGetters = orderProductsStore.getters;
  const configsStore = useStore('configs');
  const configsGetters = configsStore.getters;
  const printStore = useStore('print');
  const printActions = printStore.actions;
  const websocketStore = useStore('websocket');
  const websocketActions = websocketStore.actions;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const themeStore = useStore('theme');
  const themeGetters = themeStore.getters;

  const {currentCompany, defaultCompany} = peopleGetters;
  const themeColors = themeGetters?.colors || {};
  const {items: companyConfigs} = configsGetters;
  const {
    item: order,
    payable,
  } = ordersGetters;
  const {
    items: invoices,
    error: invoiceError,
    message: invoiceMessage,
    messages: invoiceMessages,
  } = invoiceGetters;
  const {items: storedOrderInvoices = []} = orderInvoicesGetters;
  const {
    items: orderProducts = [],
  } = orderProductsGetters;

  const [companyDeviceConfigs, setCompanyDeviceConfigs] = useState([]);
  const [remoteDeviceModalVisible, setRemoteDeviceModalVisible] = useState(false);
  const [amountEntryModalMode, setAmountEntryModalMode] = useState('');
  const [installmentsModalVisible, setInstallmentsModalVisible] = useState(false);
  const [paymentExplanationVisible, setPaymentExplanationVisible] = useState(false);
  const [cashReceivedValue, setCashReceivedValue] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [loadingPaymentOptions, setLoadingPaymentOptions] = useState(false);
  const [paymentOptionsError, setPaymentOptionsError] = useState('');
  const [localPaymentOptions, setLocalPaymentOptions] = useState([]);
  const [remotePaymentOptions, setRemotePaymentOptions] = useState([]);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState(null);
  const [materializedCheckoutOrder, setMaterializedCheckoutOrder] = useState(null);
  const [selectedRemoteDeviceId, setSelectedRemoteDeviceId] = useState('');
  const [pendingRemotePaymentRequest, setPendingRemotePaymentRequest] = useState(null);
  const [loyaltyCpfInput, setLoyaltyCpfInput] = useState('');
  const [loyaltyCpfResults, setLoyaltyCpfResults] = useState([]);
  const [loyaltyCpfLoading, setLoyaltyCpfLoading] = useState(false);
  const [selectedLoyaltyPerson, setSelectedLoyaltyPerson] = useState(null);
  const [loyaltyCpfStepCompleted, setLoyaltyCpfStepCompleted] = useState(true);
  const [loyaltyCpfStepSkipped, setLoyaltyCpfStepSkipped] = useState(false);
  const [loadingLoyaltySnapshot, setLoadingLoyaltySnapshot] = useState(false);
  const [loyaltySnapshotError, setLoyaltySnapshotError] = useState('');
  const [rewardableLoyaltyCard, setRewardableLoyaltyCard] = useState(null);

  const {
    canChangePaymentDeviceDuringCheckout,
    canRenderCheckout,
    canUseLocalOperationalPayment,
    checkoutOrderId,
    effectiveCompanyConfigs,
    isAutoPrintEnabled,
    isCounterMode,
    isLocalCieloPdv,
    isPdvInteractionMode,
    isSelfServiceMode,
    isSingleItemMode,
    localGateway,
    remotePaymentDevices,
    requiresLoyaltyCpfStep,
    routeOrderId,
    selectedRemoteDevice,
  } = useCheckoutContextState({
    companyConfigs,
    companyDeviceConfigs,
    currentCompany,
    defaultCompany,
    device,
    order,
    route,
    selectedRemoteDeviceId,
    storeStatus: {invoiceGetters, orderProductsGetters, ordersGetters},
  });
  const {clearStoredDraftOrderId, ensureActiveOrder} =
    usePosCartSession({
      companyId: currentCompany?.id,
      deviceId: storagedDevice?.id,
      defaultStatusId: defaultCompany?.configs?.['pos-default-status'],
      companyConfigs: currentCompany?.configs,
    });
  const {
    buildOrderDetailsNavigationParams,
    resetToCounterDestination,
    resetToOrderHistory,
    resetToSelfServiceCatalog,
  } = useCheckoutNavigation({
    checkoutOrderId,
    isPdvInteractionMode,
    isSingleItemMode,
    navigation,
  });
  const {
    appendInvoiceToStore,
    appendOrderInvoiceToStore,
    checkoutPaymentOrder,
    closeRewardableLoyaltyParentOrder,
    effectiveRemainingAmount,
    remainingAmount,
    resetCompletedOrderState,
    resolveCheckoutOrderForPayment,
    resolveNextPayableAfterPayment,
    resolveOrderRemainingAmount,
    syncLoyaltySelectionToOrder,
  } = useCheckoutOrderLifecycle({
    clearStoredDraftOrderId,
    ensureActiveOrder,
    invoiceActions,
    invoiceMessage,
    invoiceMessages,
    invoices,
    isAutoPrintEnabled,
    loyaltyCpfStepSkipped,
    materializedCheckoutOrder,
    order,
    orderInvoicesActions,
    orderProducts,
    ordersActions,
    ordersGetters,
    payable,
    printActions,
    requiresLoyaltyCpfStep,
    rewardableLoyaltyCard,
    routeOrderId,
    selectedLoyaltyPerson,
    setMaterializedCheckoutOrder,
    storedOrderInvoices,
  });

  const {
    handleContinueAfterLoyaltyCpf,
    handleLoyaltyCpfInputChange,
    handleSelectLoyaltyPerson,
    handleSkipLoyaltyCpfStep,
    isLoyaltyPreviewSelected,
    loyaltyCpfDigits,
    loyaltyPreviewCpf,
    loyaltyPreviewFullName,
    loyaltyPreviewPerson,
    shouldRenderLoyaltyCpfStep,
  } = useCheckoutLoyaltyUi({
    invoiceActions,
    loadingLoyaltySnapshot,
    loyaltyCpfInput,
    loyaltyCpfResults,
    loyaltyCpfStepCompleted,
    loyaltySnapshotError,
    requiresLoyaltyCpfStep,
    selectedLoyaltyPerson,
    setLoyaltyCpfInput,
    setLoyaltyCpfResults,
    setLoyaltyCpfStepCompleted,
    setLoyaltyCpfStepSkipped,
    setSelectedLoyaltyPerson,
  });

  const loyaltyGiftProductId = useMemo(
    () =>
      resolvePeopleId(
        rewardableLoyaltyCard?.card?.otherInformations?.loyalty_gift_product_id ||
          effectiveCompanyConfigs?.[SHOP_LOYALTY_GIFT_PRODUCT_ID_CONFIG_KEY],
      ),
    [
      effectiveCompanyConfigs,
      rewardableLoyaltyCard?.card?.otherInformations?.loyalty_gift_product_id,
    ],
  );
  const loyaltySearchCompanyId = useMemo(
    () =>
      resolvePeopleId(defaultCompany?.id || defaultCompany?.['@id']) ||
      resolvePeopleId(currentCompany?.id || currentCompany?.['@id']) ||
      null,
    [currentCompany?.['@id'], currentCompany?.id, defaultCompany?.['@id'], defaultCompany?.id],
  );
  const rewardableLoyaltyProgress = useMemo(
    () =>
      rewardableLoyaltyCard
        ? resolveLoyaltyCardProgress(rewardableLoyaltyCard)
        : null,
    [rewardableLoyaltyCard],
  );
  const cashPaymentContext = useMemo(() => {
    if (amountEntryModalMode === 'cash-local') {
      return PAYMENT_CHANNEL_LOCAL;
    }

    return '';
  }, [amountEntryModalMode]);
  const isCashAmountEntry = useMemo(
    () => amountEntryModalMode === 'cash-local',
    [amountEntryModalMode],
  );
  const cashPaymentDetails = useMemo(
    () =>
      resolveCashPaymentDetails({
        allowPartial: cashPaymentContext === PAYMENT_CHANNEL_LOCAL,
        receivedAmount: parseMoneyInputValue(cashReceivedValue),
        totalAmount: remainingAmount,
      }),
    [cashPaymentContext, cashReceivedValue, remainingAmount],
  );
  useEffect(() => {
    if (!routeOrderId || typeof route.params?.order !== 'object') {
      return;
    }

    navigation.replace('Checkout', {
      id: routeOrderId,
      showBottomCart: false,
      ...(route.params?.interactionMode
        ? {interactionMode: route.params.interactionMode}
        : {}),
      showBottomToolBar: false,
    });
  }, [
    navigation,
    route.params?.interactionMode,
    route.params?.order,
    routeOrderId,
  ]);

  useEffect(() => {
    if (route.params?.showBottomToolBar !== true) {
      return;
    }

    navigation.setParams({showBottomToolBar: false});
  }, [navigation, route.params?.showBottomToolBar]);

  const {
    activeSelectedPaymentOption,
    allPaymentOptions,
    effectiveLocalPaymentOptions,
    effectiveRemotePaymentOptions,
    isRemotePaymentSelected,
    loyaltyRewardOnlyMode,
    selectedPayment,
    selectedPaymentChannel,
  } = useCheckoutPaymentSelection({
    localPaymentOptions,
    loyaltyCpfStepCompleted,
    remotePaymentOptions,
    requiresLoyaltyCpfStep,
    rewardableLoyaltyCard,
    selectedPaymentOption,
  });

  useCheckoutLoyaltyEffects({
    currentCompany,
    defaultCompany,
    loadingLoyaltySnapshot,
    loyaltyCpfDigits,
    loyaltyCpfStepCompleted,
    loyaltyCpfStepSkipped,
    loyaltySearchCompanyId,
    loyaltySnapshotError,
    order,
    ordersActions,
    requiresLoyaltyCpfStep,
    selectedLoyaltyPerson,
    setLoadingLoyaltySnapshot,
    setLoyaltyCpfInput,
    setLoyaltyCpfLoading,
    setLoyaltyCpfResults,
    setLoyaltyCpfStepCompleted,
    setLoyaltyCpfStepSkipped,
    setLoyaltySnapshotError,
    setRewardableLoyaltyCard,
    setSelectedLoyaltyPerson,
  });

  useRemotePaymentResult({
    appendInvoiceToStore,
    appendOrderInvoiceToStore,
    buildOrderDetailsNavigationParams,
    invoiceActions,
    invoiceMessage,
    isSingleItemMode,
    navigation,
    order,
    ordersActions,
    pendingRemotePaymentRequest,
    resetCompletedOrderState,
    resetToOrderHistory,
    resolveNextPayableAfterPayment,
    routeOrderId,
    setPendingRemotePaymentRequest,
    setSubmittingPayment,
    syncLoyaltySelectionToOrder,
  });

  useCheckoutPaymentOptionsLoader({
    allPaymentOptions,
    canChangePaymentDeviceDuringCheckout,
    canUseLocalOperationalPayment,
    currentCompany,
    device,
    deviceConfigActions,
    isLocalCieloPdv,
    remotePaymentDevices,
    selectedRemoteDevice,
    setCompanyDeviceConfigs,
    setLoadingPaymentOptions,
    setLocalPaymentOptions,
    setPaymentOptionsError,
    setRemotePaymentOptions,
    setSelectedPaymentOption,
    setSelectedRemoteDeviceId,
  });

  const {
    createPaidInvoice,
    dispatchRemotePayment,
    handleCashReceivedInputChange,
    handleConfirmCashAmountEntry,
    runLocalPayment,
  } = useCheckoutPaymentRunners({
    appendInvoiceToStore,
    appendOrderInvoiceToStore,
    buildOrderDetailsNavigationParams,
    cashPaymentContext,
    cashReceivedValue,
    checkoutPaymentOrder,
    closeRewardableLoyaltyParentOrder,
    currentCompany,
    defaultCompany,
    device,
    effectiveRemainingAmount,
    invoiceActions,
    isCounterMode,
    isSelfServiceMode,
    isSingleItemMode,
    localGateway,
    navigation,
    order,
    orderProducts,
    ordersActions,
    resetCompletedOrderState,
    resetToCounterDestination,
    resetToOrderHistory,
    resetToSelfServiceCatalog,
    resolveNextPayableAfterPayment,
    routeOrderId,
    selectedPayment,
    selectedRemoteDevice,
    setAmountEntryModalMode,
    setCashReceivedValue,
    setPendingRemotePaymentRequest,
    setSubmittingPayment,
    storagedDevice,
    syncLoyaltySelectionToOrder,
    websocketActions,
  });

  const {
    continueSelectedPayment,
    handleConfirmAmountEntry,
    handleInstallmentsSelect,
    handlePay,
  } = useCheckoutPayFlow({
    checkoutPaymentOrder,
    dispatchRemotePayment,
    effectiveRemainingAmount,
    handleConfirmCashAmountEntry,
    invoiceActions,
    isCashAmountEntry,
    isRemotePaymentSelected,
    localGateway,
    loyaltyGiftProductId,
    order,
    orderProducts,
    ordersActions,
    resolveCheckoutOrderForPayment,
    resolveOrderRemainingAmount,
    runLocalPayment,
    selectedPayment,
    selectedPaymentChannel,
    selectedRemoteDevice,
    setAmountEntryModalMode,
    setInstallmentsModalVisible,
    setMaterializedCheckoutOrder,
    setPaymentExplanationVisible,
  });

  return (
    <CheckoutView
      activeSelectedPaymentOption={activeSelectedPaymentOption}
      allPaymentOptions={allPaymentOptions}
      amountEntryModalMode={amountEntryModalMode}
      canChangePaymentDeviceDuringCheckout={canChangePaymentDeviceDuringCheckout}
      canRenderCheckout={canRenderCheckout}
      cashPaymentDetails={cashPaymentDetails}
      cashPaymentContext={cashPaymentContext}
      cashReceivedValue={cashReceivedValue}
      continueSelectedPayment={continueSelectedPayment}
      effectiveLocalPaymentOptions={effectiveLocalPaymentOptions}
      effectiveRemotePaymentOptions={effectiveRemotePaymentOptions}
      handleCashReceivedInputChange={handleCashReceivedInputChange}
      handleConfirmAmountEntry={handleConfirmAmountEntry}
      handleContinueAfterLoyaltyCpf={handleContinueAfterLoyaltyCpf}
      handleInstallmentsSelect={handleInstallmentsSelect}
      handleLoyaltyCpfInputChange={handleLoyaltyCpfInputChange}
      handlePay={handlePay}
      handleSelectLoyaltyPerson={handleSelectLoyaltyPerson}
      handleSkipLoyaltyCpfStep={handleSkipLoyaltyCpfStep}
      installmentsModalVisible={installmentsModalVisible}
      invoiceError={invoiceError}
      isCashAmountEntry={isCashAmountEntry}
      isLoyaltyPreviewSelected={isLoyaltyPreviewSelected}
      isRemotePaymentSelected={isRemotePaymentSelected}
      loadingLoyaltySnapshot={loadingLoyaltySnapshot}
      loadingPaymentOptions={loadingPaymentOptions}
      loyaltyCpfDigits={loyaltyCpfDigits}
      loyaltyCpfInput={loyaltyCpfInput}
      loyaltyCpfLoading={loyaltyCpfLoading}
      loyaltyCpfResults={loyaltyCpfResults}
      loyaltyPreviewCpf={loyaltyPreviewCpf}
      loyaltyPreviewFullName={loyaltyPreviewFullName}
      loyaltyPreviewPerson={loyaltyPreviewPerson}
      loyaltyRewardOnlyMode={loyaltyRewardOnlyMode}
      loyaltySnapshotError={loyaltySnapshotError}
      order={order}
      paymentExplanationVisible={paymentExplanationVisible}
      paymentOptionsError={paymentOptionsError}
      remoteDeviceModalVisible={remoteDeviceModalVisible}
      remotePaymentDevices={remotePaymentDevices}
      remainingAmount={remainingAmount}
      rewardableLoyaltyProgress={rewardableLoyaltyProgress}
      selectedLoyaltyPerson={selectedLoyaltyPerson}
      selectedPayment={selectedPayment}
      selectedRemoteDevice={selectedRemoteDevice}
      setAmountEntryModalMode={setAmountEntryModalMode}
      setInstallmentsModalVisible={setInstallmentsModalVisible}
      setLoyaltyCpfResults={setLoyaltyCpfResults}
      setLoyaltyCpfStepCompleted={setLoyaltyCpfStepCompleted}
      setLoyaltyCpfStepSkipped={setLoyaltyCpfStepSkipped}
      setPaymentExplanationVisible={setPaymentExplanationVisible}
      setRemoteDeviceModalVisible={setRemoteDeviceModalVisible}
      setSelectedPaymentOption={setSelectedPaymentOption}
      setSelectedRemoteDeviceId={setSelectedRemoteDeviceId}
      showLoyaltySummary={requiresLoyaltyCpfStep && loyaltyCpfStepCompleted}
      shouldRenderLoyaltyCpfStep={shouldRenderLoyaltyCpfStep}
      submittingPayment={submittingPayment}
      themeColors={themeColors}
    />
  );
};

export default Checkout;
