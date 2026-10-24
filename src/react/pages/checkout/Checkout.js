import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import usePosCartSession from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';
import {resolveLoyaltyCardProgress, resolvePeopleId} from '@controleonline/ui-orders/src/react/utils/checkoutLoyaltyCpf';
import {parseMoneyInputValue, resolveCashPaymentDetails} from '@controleonline/ui-common/src/react/utils/cashPayment';
import {SHOP_LOYALTY_GIFT_PRODUCT_ID_CONFIG_KEY} from '@controleonline/ui-common/src/react/utils/shopConfig';
import {useStore} from '@store';
import useCheckoutPaymentRunners from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutPaymentRunners';
import useCheckoutPayFlow from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutPayFlow';
import useCheckoutLoyaltyEffects from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutLoyaltyEffects';
import useRemotePaymentResult from '@controleonline/ui-orders/src/react/pages/checkout/useRemotePaymentResult';
import useCheckoutPaymentOptionsLoader from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutPaymentOptionsLoader';
import useCheckoutNavigation from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutNavigation';
import useCheckoutOrderLifecycle from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutOrderLifecycle';
import CheckoutView from '@controleonline/ui-orders/src/react/pages/checkout/CheckoutView';
import useWaiterTabCheckoutBalance from './useWaiterTabCheckoutBalance';
import useCheckoutContextState from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutContextState';
import useCheckoutPaymentSelection from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutPaymentSelection';
import useCheckoutLoyaltyUi from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutLoyaltyUi';
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
  const orderProductsActions = orderProductsStore.actions;
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

  const {currentCompany, mainCompany} = peopleGetters;
  const themeColors = themeGetters?.colors || {};
  const {items: companyConfigs} = configsGetters;
  const {item: order, payable} = ordersGetters;
  const {
    items: invoices,
    error: invoiceError,
    message: invoiceMessage,
    messages: invoiceMessages,
  } = invoiceGetters;
  const {items: storedOrderInvoices = []} = orderInvoicesGetters;
  const {items: orderProducts = []} = orderProductsGetters;

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
    canUseRemoteOperationalPayment,
    waiterConsultationCheckout,
    isLocalPaymentDevice,
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
    mainCompany,
    device,
    order,
    route,
    selectedRemoteDeviceId,
    storeStatus: {invoiceGetters, orderProductsGetters, ordersGetters},
  });
  const returnToWaiterTab = useCallback(() => {
    const params = {rootOrderId: routeOrderId, orderType: 'tab', interactionMode: 'pdv', showBottomCart: false,
      ...(route.params?.waiterTabCloseRequested === true ? {waiterTabFinalize: true, waiterTabDiscardDraftIds: route.params.waiterTabDiscardDraftIds || []} : {})};
    if (typeof navigation.popTo === 'function') navigation.popTo('LinkedOrderSettlementPage', params);
    else navigation.navigate('LinkedOrderSettlementPage', params);
  }, [navigation, routeOrderId, route.params?.waiterTabCloseRequested, route.params?.waiterTabDiscardDraftIds]);
  const waiterTabReturn = waiterConsultationCheckout ? returnToWaiterTab : null;
  const waiterBalance = useWaiterTabCheckoutBalance({enabled: waiterConsultationCheckout, rootOrderId: routeOrderId,
    companyId: currentCompany?.id, ordersActions, invoiceActions});
  const {clearStoredDraftOrderId, ensureActiveOrder} =
    usePosCartSession({
      companyId: currentCompany?.id,
      deviceId: storagedDevice?.id,
      defaultStatusId: mainCompany?.configs?.['pos-default-status'],
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
    canRenderHydratedCheckout,
    checkoutPaymentOrder,
    checkoutOrderProducts,
    checkoutOrderProductsError,
    closeRewardableLoyaltyParentOrder,
    effectiveRemainingAmount,
    remainingAmount,
    reloadCheckoutOrderProducts,
    resetCompletedOrderState,
    resolveCheckoutOrderForPayment,
    resolveNextPayableAfterPayment,
    resolveOrderRemainingAmount,
    syncLoyaltySelectionToOrder,
  } = useCheckoutOrderLifecycle({
    waiterConsultationCheckout,
    waiterPendingAmount: waiterBalance.pendingAmount,
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
    orderProductsActions,
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
      resolvePeopleId(mainCompany?.id || mainCompany?.['@id']) ||
      resolvePeopleId(currentCompany?.id || currentCompany?.['@id']) ||
      null,
    [currentCompany?.['@id'], currentCompany?.id, mainCompany?.['@id'], mainCompany?.id],
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
      ...(route.params?.waiterTabConsultationRootId ? {waiterTabConsultationRootId: route.params.waiterTabConsultationRootId} : {}),
      ...(route.params?.waiterTabCloseRequested === true ? {waiterTabCloseRequested: true, waiterTabDiscardDraftIds: route.params.waiterTabDiscardDraftIds || []} : {}),
      ...(route.params?.interactionMode
        ? {interactionMode: route.params.interactionMode}
        : {}),
      showBottomToolBar: false,
    });
  }, [
    navigation,
    route.params?.interactionMode,
    route.params?.waiterTabConsultationRootId,
    route.params?.waiterTabCloseRequested,
    route.params?.waiterTabDiscardDraftIds,
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
    mainCompany,
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
    waiterTabReturn,
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
    canUseRemoteOperationalPayment,
    waiterConsultationCheckout,
    isLocalPaymentDevice,
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
    waiterTabReturn,
    verifyChargeChannel: waiterBalance.verifyChargeChannel,
    canUseLocalOperationalPayment: !waiterConsultationCheckout || canUseLocalOperationalPayment,
    canUseRemoteOperationalPayment,
    appendInvoiceToStore,
    appendOrderInvoiceToStore,
    buildOrderDetailsNavigationParams,
    cashPaymentContext,
    cashReceivedValue,
    checkoutPaymentOrder,
    closeRewardableLoyaltyParentOrder,
    currentCompany,
    mainCompany,
    device,
    effectiveRemainingAmount,
    invoiceActions,
    isCounterMode,
    isSelfServiceMode,
    isSingleItemMode,
    localGateway,
    navigation,
    order,
    orderProducts: checkoutOrderProducts,
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
    orderProducts: checkoutOrderProducts,
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

  const viewProps = {
    activeSelectedPaymentOption, allPaymentOptions, amountEntryModalMode,
    canChangePaymentDeviceDuringCheckout, canRenderCheckout: canRenderCheckout && canRenderHydratedCheckout && waiterBalance.ready, cashPaymentDetails,
    cashPaymentContext, cashReceivedValue, checkoutOrderProductsError,
    continueSelectedPayment, effectiveLocalPaymentOptions, effectiveRemotePaymentOptions,
    handleCashReceivedInputChange, handleConfirmAmountEntry, handleContinueAfterLoyaltyCpf,
    handleInstallmentsSelect, handleLoyaltyCpfInputChange, handlePay,
    handleSelectLoyaltyPerson, handleSkipLoyaltyCpfStep, installmentsModalVisible,
    invoiceError, isCashAmountEntry, isLoyaltyPreviewSelected,
    isRemotePaymentSelected, loadingLoyaltySnapshot, loadingPaymentOptions,
    loyaltyCpfDigits, loyaltyCpfInput, loyaltyCpfLoading,
    loyaltyCpfResults, loyaltyPreviewCpf, loyaltyPreviewFullName,
    loyaltyPreviewPerson, loyaltyRewardOnlyMode, loyaltySnapshotError,
    order, paymentExplanationVisible, paymentOptionsError,
    remoteDeviceModalVisible, remotePaymentDevices, remainingAmount,
    reloadCheckoutOrderProducts, rewardableLoyaltyProgress, selectedLoyaltyPerson,
    selectedPayment, selectedRemoteDevice, setAmountEntryModalMode,
    setInstallmentsModalVisible, setLoyaltyCpfResults, setLoyaltyCpfStepCompleted,
    setLoyaltyCpfStepSkipped, setPaymentExplanationVisible, setRemoteDeviceModalVisible,
    setSelectedPaymentOption, setSelectedRemoteDeviceId, showLoyaltySummary: requiresLoyaltyCpfStep && loyaltyCpfStepCompleted,
    shouldRenderLoyaltyCpfStep, submittingPayment, themeColors,
  };

  return (
    <CheckoutView {...viewProps} />
  );
};

export default Checkout;
