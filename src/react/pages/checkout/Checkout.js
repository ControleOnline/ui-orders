import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {api} from '@controleonline/ui-common/src/api';
import {env} from '@env';
import {app_type} from '@appType';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import OrderIdentityLabel from '@controleonline/ui-orders/src/react/components/OrderIdentityLabel';
import {
  buildManagerPdvRouteParams,
  buildOrderDetailsRouteParams,
  getOrderRouteId,
  isPdvRouteContext,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import {
  isPosAutoPrintEnabled,
  isPosCounterMode,
  isPosSelfServiceMode,
  isPosSingleItemMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import usePosCartSession from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import PaymentCheckoutPanel from '@controleonline/ui-orders/src/react/components/PaymentCheckoutPanel';
import BottomCart from '@controleonline/ui-orders/src/react/components/cart/BottomCart';
import Calculate from '@controleonline/ui-orders/src/react/components/cart/Calculate';
import {
  buildPaymentSections,
  buildPaymentSelectionOption,
} from '@controleonline/ui-orders/src/react/pages/checkout/CheckoutPaymentOptions';
import {
  appendSyntheticOrderInvoice,
  resolveNextOperationalPayable,
} from '@controleonline/ui-orders/src/react/utils/checkoutInvoices';
import {
  buildLoyaltyCpfSearchParams,
  buildLoyaltyCpfSearchResults,
  digitsOnly,
  isLoyaltyCouponsEnabledForCheckout,
  LOYALTY_CPF_MIN_SEARCH_LENGTH,
  resolveCheckoutCompanyConfigs,
  resolveCheckoutLoyaltySelection,
  resolvePeopleId,
} from '@controleonline/ui-orders/src/react/utils/checkoutLoyaltyCpf';

import {
  filterDeviceConfigsByCompany,
  filterWalletPaymentTypesByAllowedIds,
  getPaymentGatewayFromConfigs,
  getPaymentGatewayLabel,
  isOrderPaymentDeviceChangeAllowed,
  PAYMENT_GATEWAY_CIELO,
  PAYMENT_GATEWAY_INFINITE_PAY,
  resolveRemotePaymentDeviceOptions,
  resolveDevicePaymentTypeIds,
  supportsLocalCardPayment,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {
  getPaymentOptionLabel,
  isCashPaymentOption,
  isIntegratedPaymentOption,
} from '@controleonline/ui-common/src/react/utils/paymentOptions';
import {
  createInvoiceForGatewayFreePayment,
  normalizeMoneyInputText,
  parseMoneyInputValue,
  resolveCashPaymentDetails,
} from '@controleonline/ui-common/src/react/utils/cashPayment';
import {
  normalizeGatewayPaymentError,
  runConfiguredGatewayPayment,
} from '@controleonline/ui-common/src/react/utils/paymentGatewayExecution';
import {
  buildRemotePaymentRequestKey,
  isRemotePaymentResultMessage,
  normalizeRemotePaymentRequestKey,
  REMOTE_PAYMENT_MESSAGE_STORE,
  REMOTE_PAYMENT_REQUEST_ACTION,
} from '@controleonline/ui-common/src/react/utils/remotePayment';

import {useStore} from '@store';
import styles from './Checkout.styles';
import {inlineStyle_491_14, inlineStyle_534_10} from './Checkout.styles';

const PAYMENT_CHANNEL_LOCAL = 'local';
const PAYMENT_CHANNEL_REMOTE = 'remote';
const IS_WEB_PLATFORM = Platform.OS === 'web';

const normalizeStatusKey = value => String(value || '').trim().toLowerCase();

const extractCollectionItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const buildStatusIriFromId = value => {
  const normalizedId = String(value || '').replace(/\D/g, '');
  return normalizedId ? `/statuses/${normalizedId}` : null;
};

let posPaidInvoiceStatusIriCache = null;

const resolvePosPaidInvoiceStatusIri = async fallbackStatusId => {
  if (posPaidInvoiceStatusIriCache) return posPaidInvoiceStatusIriCache;

  const fallbackIri = buildStatusIriFromId(fallbackStatusId);

  try {
    const response = await api.fetch('statuses', {
      params: {
        context: 'invoice',
        realStatus: 'closed',
        status: 'paid',
      },
    });
    const items = extractCollectionItems(response);
    const matchedStatus =
      items.find(
        item =>
          normalizeStatusKey(item?.realStatus) === 'closed' &&
          normalizeStatusKey(item?.status) === 'paid',
      ) || items[0];
    const resolvedIri =
      matchedStatus?.['@id'] ||
      buildStatusIriFromId(matchedStatus?.id) ||
      fallbackIri;

    if (resolvedIri) {
      posPaidInvoiceStatusIriCache = resolvedIri;
    }

    return resolvedIri;
  } catch {
    return fallbackIri;
  }
};

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

  const {currentCompany, defaultCompany} = peopleGetters;
  const routeOrderId = useMemo(
    () => getOrderRouteId(route.params?.id || route.params?.order),
    [route.params?.id, route.params?.order],
  );
  const {items: companyConfigs} = configsGetters;
  const {
    item: order,
    payable,
    isLoading: orderIsloading,
    isSaving: orderIsSaving,
  } = ordersGetters;
  const {
    items: invoices,
    isLoading: invoiceIsloading,
    isSaving: invoiceIsSaving,
    error: invoiceError,
    message: invoiceMessage,
    messages: invoiceMessages,
  } = invoiceGetters;
  const {items: storedOrderInvoices = []} = orderInvoicesGetters;
  const {
    items: orderProducts = [],
    isLoading: orderProductsIsloading,
    isSaving: orderProductsIsSaving,
  } = orderProductsGetters;

  const [companyDeviceConfigs, setCompanyDeviceConfigs] = useState([]);
  const [remoteDeviceModalVisible, setRemoteDeviceModalVisible] =
    useState(false);
  const [amountEntryModalMode, setAmountEntryModalMode] = useState('');
  const [installmentsModalVisible, setInstallmentsModalVisible] =
    useState(false);
  const [paymentExplanationVisible, setPaymentExplanationVisible] =
    useState(false);
  const [cashReceivedValue, setCashReceivedValue] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [loadingPaymentOptions, setLoadingPaymentOptions] = useState(false);
  const [paymentOptionsError, setPaymentOptionsError] = useState('');
  const [localPaymentOptions, setLocalPaymentOptions] = useState([]);
  const [remotePaymentOptions, setRemotePaymentOptions] = useState([]);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState(null);
  const [selectedRemoteDeviceId, setSelectedRemoteDeviceId] = useState('');
  const [pendingRemotePaymentRequest, setPendingRemotePaymentRequest] =
    useState(null);
  const [loyaltyCpfInput, setLoyaltyCpfInput] = useState('');
  const [loyaltyCpfResults, setLoyaltyCpfResults] = useState([]);
  const [loyaltyCpfLoading, setLoyaltyCpfLoading] = useState(false);
  const [selectedLoyaltyPerson, setSelectedLoyaltyPerson] = useState(null);
  const [loyaltyCpfStepCompleted, setLoyaltyCpfStepCompleted] = useState(true);
  const [loyaltyCpfStepSkipped, setLoyaltyCpfStepSkipped] = useState(false);

  const effectiveCompanyConfigs = useMemo(
    () =>
      resolveCheckoutCompanyConfigs({
        companyConfigs,
        currentCompanyConfigs: currentCompany?.configs,
        defaultCompanyConfigs: defaultCompany?.configs,
      }),
    [companyConfigs, currentCompany?.configs, defaultCompany?.configs],
  );

  const localGateway = useMemo(
    () => getPaymentGatewayFromConfigs(device),
    [device],
  );
  const deviceType = useMemo(
    () => String(device?.type || device?.device?.type || '').trim().toUpperCase(),
    [device?.device?.type, device?.type],
  );
  const isManagerApp = useMemo(
    () => String(app_type || '').trim().toUpperCase() === 'MANAGER',
    [],
  );
  const isPosApp = useMemo(
    () => String(app_type || '').trim().toUpperCase() === 'POS',
    [],
  );
  const isLocalPaymentDevice = useMemo(
    () =>
      supportsLocalCardPayment({
        deviceConfig: device,
        platform: Platform.OS,
      }),
    [device],
  );
  const isLocalCieloPdv =
    !isManagerApp &&
    !IS_WEB_PLATFORM &&
    deviceType === 'PDV' &&
    localGateway === PAYMENT_GATEWAY_CIELO;
  const isPdvInteractionMode = useMemo(
    () => isPdvRouteContext(route?.params),
    [route?.params],
  );
  const isSelfServiceMode = useMemo(
    () => isPosSelfServiceMode(device?.configs),
    [device?.configs],
  );
  const isCounterMode = useMemo(
    () => isPosCounterMode(device?.configs),
    [device?.configs],
  );
  const isSingleItemMode = useMemo(
    () => isPosSingleItemMode(device?.configs),
    [device?.configs],
  );
  const isAutoPrintEnabled = useMemo(
    () => isPosAutoPrintEnabled(device?.configs),
    [device?.configs],
  );
  const {clearStoredDraftOrderId} =
    usePosCartSession({
      companyId: currentCompany?.id,
      deviceId: storagedDevice?.id,
      defaultStatusId: defaultCompany?.configs?.['pos-default-status'],
    });
  const canUseLocalOperationalPayment = useMemo(
    () =>
      !isManagerApp &&
      (isLocalPaymentDevice || deviceType === 'PDV' || isPdvInteractionMode),
    [deviceType, isLocalPaymentDevice, isManagerApp, isPdvInteractionMode],
  );
  const loyaltyCouponsEnabled = useMemo(
    () => isLoyaltyCouponsEnabledForCheckout(effectiveCompanyConfigs),
    [effectiveCompanyConfigs],
  );
  const requiresLoyaltyCpfStep = useMemo(
    () =>
      loyaltyCouponsEnabled &&
      (isPosApp || deviceType === 'PDV' || isPdvInteractionMode),
    [deviceType, isPdvInteractionMode, isPosApp, loyaltyCouponsEnabled],
  );
  const canChangePaymentDeviceDuringCheckout = useMemo(
    () => isOrderPaymentDeviceChangeAllowed(effectiveCompanyConfigs),
    [effectiveCompanyConfigs],
  );

  const remotePaymentDevices = useMemo(
    () =>
      resolveRemotePaymentDeviceOptions({
        deviceConfig: device,
        deviceConfigs: companyDeviceConfigs,
        companyConfigs: effectiveCompanyConfigs,
      }),
    [companyDeviceConfigs, device, effectiveCompanyConfigs],
  );

  const selectedRemoteDevice = useMemo(
    () =>
      remotePaymentDevices.find(
        remoteDevice => remoteDevice.deviceId === selectedRemoteDeviceId,
      ) ||
      remotePaymentDevices[0] ||
      null,
    [remotePaymentDevices, selectedRemoteDeviceId],
  );

  const canRenderCheckout =
    !orderIsloading &&
    !orderIsSaving &&
    !invoiceIsloading &&
    !orderProductsIsloading &&
    !invoiceIsSaving &&
    !orderProductsIsSaving;

  const remainingAmount = useMemo(() => {
    const payableValue = Math.abs(Number(payable || 0));
    if (payableValue > 0) {
      return payableValue;
    }

    return Number(order?.price || 0);
  }, [order?.price, payable]);
  const loyaltyCpfDigits = useMemo(
    () => digitsOnly(loyaltyCpfInput).slice(0, 11),
    [loyaltyCpfInput],
  );
  const loyaltySearchCompanyId = useMemo(
    () =>
      resolvePeopleId(defaultCompany?.id || defaultCompany?.['@id']) ||
      resolvePeopleId(currentCompany?.id || currentCompany?.['@id']) ||
      null,
    [currentCompany?.['@id'], currentCompany?.id, defaultCompany?.['@id'], defaultCompany?.id],
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
  const buildOrderDetailsNavigationParams = useCallback(
    orderItem =>
      buildOrderDetailsRouteParams(
        orderItem,
        isPdvInteractionMode
          ? buildManagerPdvRouteParams({showBottomCart: false})
          : {},
      ),
    [isPdvInteractionMode],
  );
  const resetToSelfServiceCatalog = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{name: 'AddProductScreen'}],
    });
  }, [navigation]);
  const resetToCounterDestination = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'OrderHistoryPage',
          params: {resumeCounterFlow: true},
        },
      ],
    });
  }, [
    navigation,
  ]);

  const resetToOrderHistory = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{name: 'OrderHistoryPage'}],
    });
  }, [navigation]);

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

  const selectedPayment = selectedPaymentOption?.payment || {};
  const selectedPaymentChannel = selectedPaymentOption?.channel || '';
  const allPaymentOptions = useMemo(
    () => [...localPaymentOptions, ...remotePaymentOptions],
    [localPaymentOptions, remotePaymentOptions],
  );
  const isRemotePaymentSelected = useMemo(
    () => selectedPaymentChannel === PAYMENT_CHANNEL_REMOTE,
    [selectedPaymentChannel],
  );

  useEffect(() => {
    if (!requiresLoyaltyCpfStep) {
      setLoyaltyCpfInput('');
      setLoyaltyCpfResults([]);
      setLoyaltyCpfLoading(false);
      setSelectedLoyaltyPerson(null);
      setLoyaltyCpfStepCompleted(true);
      setLoyaltyCpfStepSkipped(false);
      return;
    }

    const restoredSelection = resolveCheckoutLoyaltySelection(order);

    if (restoredSelection?.id) {
      setSelectedLoyaltyPerson(restoredSelection);
      setLoyaltyCpfInput(restoredSelection.cpfDisplay || restoredSelection.cpf || '');
      setLoyaltyCpfResults([]);
      setLoyaltyCpfLoading(false);
      setLoyaltyCpfStepCompleted(true);
      setLoyaltyCpfStepSkipped(false);
      return;
    }

    setSelectedLoyaltyPerson(null);
    setLoyaltyCpfInput('');
    setLoyaltyCpfResults([]);
    setLoyaltyCpfLoading(false);
    setLoyaltyCpfStepCompleted(false);
    setLoyaltyCpfStepSkipped(false);
  }, [order, requiresLoyaltyCpfStep]);

  useEffect(() => {
    if (!requiresLoyaltyCpfStep || loyaltyCpfStepCompleted) {
      setLoyaltyCpfLoading(false);
      setLoyaltyCpfResults([]);
      return undefined;
    }

    if (loyaltyCpfDigits.length < LOYALTY_CPF_MIN_SEARCH_LENGTH) {
      setLoyaltyCpfLoading(false);
      setLoyaltyCpfResults([]);
      return undefined;
    }

    const selectedCpfDigits = digitsOnly(
      selectedLoyaltyPerson?.cpf || selectedLoyaltyPerson?.cpfDisplay || '',
    );

    if (selectedCpfDigits && selectedCpfDigits === loyaltyCpfDigits) {
      setLoyaltyCpfLoading(false);
      setLoyaltyCpfResults([]);
      return undefined;
    }

    let isActive = true;
    const timeoutId = setTimeout(async () => {
      setLoyaltyCpfLoading(true);

      try {
        const response = await api.fetch('people', {
          params: buildLoyaltyCpfSearchParams({
            companyId: loyaltySearchCompanyId,
            query: loyaltyCpfDigits,
          }),
        });

        if (!isActive) {
          return;
        }

        setLoyaltyCpfResults(
          buildLoyaltyCpfSearchResults(
            extractCollectionItems(response),
            loyaltyCpfDigits,
          ),
        );
      } catch {
        if (!isActive) {
          return;
        }

        setLoyaltyCpfResults([]);
      } finally {
        if (isActive) {
          setLoyaltyCpfLoading(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [
    loyaltyCpfDigits,
    loyaltySearchCompanyId,
    loyaltyCpfStepCompleted,
    requiresLoyaltyCpfStep,
    selectedLoyaltyPerson?.cpf,
    selectedLoyaltyPerson?.cpfDisplay,
  ]);

  const appendInvoiceToStore = useCallback(
    invoiceData => {
      if (!invoiceData) {
        return;
      }

      const nextInvoices = [
        ...(Array.isArray(invoices) ? invoices : []).filter(
          item => item?.id !== invoiceData?.id,
        ),
        invoiceData,
      ];

      invoiceActions.setItems(nextInvoices);
    },
    [invoiceActions, invoices],
  );

  const appendOrderInvoiceToStore = useCallback(
    (invoiceData, realPrice = null) => {
      if (!invoiceData) {
        return;
      }

      orderInvoicesActions.setItems(
        appendSyntheticOrderInvoice(storedOrderInvoices, {
          invoice: invoiceData,
          orderIri: order?.['@id'] || (routeOrderId ? `/orders/${routeOrderId}` : ''),
          realPrice,
        }),
      );
    },
    [order?.['@id'], orderInvoicesActions, routeOrderId, storedOrderInvoices],
  );

  const resolveNextPayableAfterPayment = useCallback(
    paidAmount =>
      resolveNextOperationalPayable({
        paidAmount,
        payable,
        remainingAmount,
      }),
    [payable, remainingAmount],
  );

  const syncLoyaltySelectionToOrder = useCallback(
    async currentOrder => {
      if (!requiresLoyaltyCpfStep) {
        return currentOrder || order;
      }

      const targetOrderId = resolvePeopleId(currentOrder?.id) || routeOrderId;

      if (!targetOrderId) {
        return currentOrder || order;
      }

      const selectedPeopleId = resolvePeopleId(selectedLoyaltyPerson?.id);
      const nextClient = selectedPeopleId ? `/people/${selectedPeopleId}` : null;
      const nextPayer = selectedPeopleId ? `/people/${selectedPeopleId}` : null;
      const currentClientId = resolvePeopleId(currentOrder?.client || order?.client);
      const currentPayerId = resolvePeopleId(currentOrder?.payer || order?.payer);
      const shouldClearSelection =
        loyaltyCpfStepSkipped && !selectedPeopleId && (currentClientId || currentPayerId);
      const hasSameSelection =
        currentClientId === selectedPeopleId && currentPayerId === selectedPeopleId;

      if (!shouldClearSelection && hasSameSelection) {
        return currentOrder || order;
      }

      try {
        const updatedOrder = await ordersActions.save({
          id: targetOrderId,
          client: nextClient,
          payer: nextPayer,
        });

        if (updatedOrder) {
          ordersActions.syncOrder?.(updatedOrder);
          return updatedOrder;
        }
      } catch (error) {
        invoiceActions.setError(
          error?.message ||
            'Pagamento confirmado, mas nao foi possivel vincular o CPF ao pedido.',
        );
      }

      return currentOrder || order;
    },
    [
      invoiceActions,
      loyaltyCpfStepSkipped,
      order,
      ordersActions,
      requiresLoyaltyCpfStep,
      routeOrderId,
      selectedLoyaltyPerson?.id,
    ],
  );

  const resetCompletedOrderState = useCallback(() => {
    clearStoredDraftOrderId();
    ordersActions.setItem(null);
    invoiceActions.setItems([]);
    orderInvoicesActions.setItems([]);
    ordersActions.setPayable(0);

    if (isAutoPrintEnabled) {
      printActions.setReload(true);
    }
  }, [
    clearStoredDraftOrderId,
    invoiceActions,
    isAutoPrintEnabled,
    orderInvoicesActions,
    ordersActions,
    printActions,
  ]);

  useFocusEffect(
    useCallback(() => {
      invoiceActions.setError('');
      invoiceActions.setMessage(null);

      if (!routeOrderId || String(order?.id || '') === String(routeOrderId)) {
        return;
      }

      ordersActions.get(routeOrderId);
    }, [invoiceActions, order?.id, ordersActions, routeOrderId]),
  );

  useEffect(() => {
    if (
      invoiceMessages &&
      invoiceMessages.length > 0 &&
      (!invoiceMessage || Object.keys(invoiceMessage).length === 0)
    ) {
      const nextMessages = [...invoiceMessages];
      invoiceActions.setMessage(nextMessages.pop());
      invoiceActions.setMessages(nextMessages);
    }
  }, [invoiceActions, invoiceMessage, invoiceMessages]);

  useEffect(() => {
    if (!isRemotePaymentResultMessage(invoiceMessage)) {
      return;
    }

    const messageRequestKey = normalizeRemotePaymentRequestKey(
      invoiceMessage?.requestKey,
    );

    if (!messageRequestKey) {
      invoiceActions.setMessage(null);
      return;
    }

    if (pendingRemotePaymentRequest?.requestKey !== messageRequestKey) {
      invoiceActions.setMessage(null);
      return;
    }

    const handleRemotePaymentResult = async () => {
      try {
        if (String(invoiceMessage?.status || '').trim().toLowerCase() === 'success') {
          const paidAmount = Number(
            invoiceMessage?.paidAmount ??
            invoiceMessage?.invoice?.price ??
            0,
          );
          const nextPayable = resolveNextPayableAfterPayment(paidAmount);

          if (invoiceMessage?.invoice) {
            appendInvoiceToStore(invoiceMessage.invoice);
            appendOrderInvoiceToStore(invoiceMessage.invoice, paidAmount);
          }

          ordersActions.setPayable(nextPayable < 0 ? nextPayable : 0);

          let resolvedOrder = invoiceMessage?.order || order;

          if (routeOrderId) {
            const fetchedOrder = await ordersActions.get(routeOrderId).catch(() => null);
            if (fetchedOrder) {
              resolvedOrder = fetchedOrder;
            }
          }

          const syncedOrder = await syncLoyaltySelectionToOrder(resolvedOrder);
          const navigationOrder =
            syncedOrder || resolvedOrder || invoiceMessage?.order || routeOrderId || order;

          if (isSingleItemMode && nextPayable >= 0) {
            resetCompletedOrderState();
            resetToOrderHistory();
            return;
          }

          navigation.navigate(
            'OrderDetails',
            buildOrderDetailsNavigationParams(navigationOrder),
          );
          return;
        }

        invoiceActions.setError(
          invoiceMessage?.error || 'Nao foi possivel concluir o pagamento remoto.',
        );
      } finally {
        setPendingRemotePaymentRequest(null);
        setSubmittingPayment(false);
        invoiceActions.setMessage(null);
      }
    };

    handleRemotePaymentResult();
  }, [
    appendInvoiceToStore,
    appendOrderInvoiceToStore,
    buildOrderDetailsNavigationParams,
    invoiceActions,
    invoiceMessage,
    navigation,
    order,
    ordersActions,
    pendingRemotePaymentRequest?.requestKey,
    resolveNextPayableAfterPayment,
    syncLoyaltySelectionToOrder,
    routeOrderId,
    isSingleItemMode,
    resetCompletedOrderState,
    resetToOrderHistory,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id || isLocalCieloPdv) {
        setCompanyDeviceConfigs([]);
        return;
      }

      deviceConfigActions
        .getItems({
          people: '/people/' + currentCompany.id,
        })
        .then(data => {
          setCompanyDeviceConfigs(
            filterDeviceConfigsByCompany(data, currentCompany?.id),
          );
        })
        .catch(() => {
          setCompanyDeviceConfigs([]);
        });
    }, [currentCompany?.id, deviceConfigActions, isLocalCieloPdv]),
  );

  useEffect(() => {
    if (!remotePaymentDevices.length) {
      setSelectedRemoteDeviceId('');
      return;
    }

    const defaultDeviceId = remotePaymentDevices[0].deviceId;

    setSelectedRemoteDeviceId(current =>
      !canChangePaymentDeviceDuringCheckout
        ? defaultDeviceId
        : remotePaymentDevices.some(
              deviceOption => deviceOption.deviceId === current,
            )
          ? current
          : defaultDeviceId,
    );
  }, [canChangePaymentDeviceDuringCheckout, remotePaymentDevices]);

  useEffect(() => {
    let isMounted = true;

    const loadPaymentOptions = async () => {
      if (!currentCompany?.id) {
        setLoadingPaymentOptions(false);
        setLocalPaymentOptions([]);
        setRemotePaymentOptions([]);
        setPaymentOptionsError('');
        return;
      }

      const localPaymentTypeIds = canUseLocalOperationalPayment
        ? resolveDevicePaymentTypeIds(device?.configs)
        : [];
      const remotePaymentTypeIds = selectedRemoteDevice?.config
        ? resolveDevicePaymentTypeIds(selectedRemoteDevice.config?.configs)
        : [];

      if (!localPaymentTypeIds.length && !remotePaymentTypeIds.length) {
        setLoadingPaymentOptions(false);
        setLocalPaymentOptions([]);
        setRemotePaymentOptions([]);
        setPaymentOptionsError('');
        return;
      }

      setLoadingPaymentOptions(true);
      setPaymentOptionsError('');

      try {
        const paymentTypeResponse = await api.fetch('wallet_payment_types', {
          params: {
            people: '/people/' + currentCompany.id,
          },
        });

        if (!isMounted) {
          return;
        }

        const allPaymentTypes = extractCollectionItems(paymentTypeResponse);
        setLocalPaymentOptions(
          filterWalletPaymentTypesByAllowedIds(
            allPaymentTypes,
            localPaymentTypeIds,
          ).map(payment =>
            buildPaymentSelectionOption({
              channel: PAYMENT_CHANNEL_LOCAL,
              payment,
            }),
          ),
        );
        setRemotePaymentOptions(
          filterWalletPaymentTypesByAllowedIds(
            allPaymentTypes,
            remotePaymentTypeIds,
          )
            .filter(isIntegratedPaymentOption)
            .map(payment =>
            buildPaymentSelectionOption({
              channel: PAYMENT_CHANNEL_REMOTE,
              payment,
              targetDeviceId: selectedRemoteDevice?.deviceId,
              targetDeviceLabel: selectedRemoteDevice?.alias || 'Device principal',
            }),
            ),
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLocalPaymentOptions([]);
        setRemotePaymentOptions([]);
        setPaymentOptionsError(
          normalizeGatewayPaymentError(
            error,
            'Nao foi possivel carregar os meios de pagamento.',
          ),
        );
      } finally {
        if (isMounted) {
          setLoadingPaymentOptions(false);
        }
      }
    };

    loadPaymentOptions();

    return () => {
      isMounted = false;
    };
  }, [
    canUseLocalOperationalPayment,
    currentCompany?.id,
    effectiveCompanyConfigs,
    device?.configs,
    selectedRemoteDevice?.alias,
    selectedRemoteDevice?.deviceId,
    selectedRemoteDevice?.config?.configs,
  ]);

  useEffect(() => {
    setSelectedPaymentOption(current => {
      const currentKey = current?.key || '';

      if (!allPaymentOptions.length) {
        return null;
      }

      return (
        allPaymentOptions.find(option => option.key === currentKey) ||
        allPaymentOptions[0]
      );
    });
  }, [allPaymentOptions]);

  const createPaidInvoice = useCallback(
    async (payment, total) => {
      const paidStatusIri = await resolvePosPaidInvoiceStatusIri(
        defaultCompany?.configs['pos-paid-status'],
      );

      if (!paidStatusIri) {
        invoiceActions.setError(
          'Nao foi possivel resolver o status pago da invoice do PDV.',
        );
        return null;
      }

      try {
        const payload = {
          dueDate: Formatter.getCurrentDate(),
          status: paidStatusIri,
          destinationWallet: payment?.wallet?.['@id'],
          paymentType: payment?.paymentType?.['@id'],
          price: total,
          receiver: '/people/' + currentCompany.id,
          order: order?.['@id'],
        };

        const createdInvoice = await invoiceActions.save(payload);

        if (!createdInvoice) {
          return null;
        }

        const paidAmount = Number(createdInvoice.price || 0);
        const nextPayable = resolveNextPayableAfterPayment(paidAmount);
        const syncedOrder = await syncLoyaltySelectionToOrder(order);
        const resolvedOrder = syncedOrder || order;

        if (isSingleItemMode && nextPayable >= 0) {
          resetCompletedOrderState();
          resetToOrderHistory();
          return createdInvoice;
        }

        if (device?.configs?.['pos-type'] == 'simple') {
          if (nextPayable < 0) {
            appendInvoiceToStore(createdInvoice);
            appendOrderInvoiceToStore(createdInvoice, paidAmount);
            ordersActions.setPayable(nextPayable);
            ordersActions.syncOrder?.(resolvedOrder);
            navigation.navigate(
              'OrderDetails',
              buildOrderDetailsNavigationParams(resolvedOrder),
            );
          } else {
            resetCompletedOrderState();
            if (isCounterMode) {
              resetToCounterDestination();
            } else if (isSelfServiceMode) {
              resetToSelfServiceCatalog();
            } else {
              navigation.navigate('OrderHistoryPage');
            }
          }
        } else {
          appendInvoiceToStore(createdInvoice);
          appendOrderInvoiceToStore(createdInvoice, paidAmount);
          ordersActions.setPayable(nextPayable < 0 ? nextPayable : 0);
          if ((isSelfServiceMode || isCounterMode) && nextPayable >= 0) {
            resetCompletedOrderState();
            if (isCounterMode) {
              resetToCounterDestination();
            } else {
              resetToSelfServiceCatalog();
            }
          } else {
            ordersActions.syncOrder?.(resolvedOrder);
            navigation.navigate(
              'OrderDetails',
              buildOrderDetailsNavigationParams(resolvedOrder),
            );
          }
        }

        return createdInvoice;
      } catch (error) {
        invoiceActions.setError(
          normalizeGatewayPaymentError(
            error,
            'Nao foi possivel registrar o pagamento do pedido.',
          ),
        );
        return null;
      }
    },
    [
      appendInvoiceToStore,
      appendOrderInvoiceToStore,
      buildOrderDetailsNavigationParams,
      currentCompany?.id,
      defaultCompany?.configs,
      device?.configs,
      invoiceActions,
      isCounterMode,
      isSelfServiceMode,
      isSingleItemMode,
      navigation,
      order,
      ordersActions,
      resetToCounterDestination,
      resetToOrderHistory,
      resetCompletedOrderState,
      resetToSelfServiceCatalog,
      resolveNextPayableAfterPayment,
      syncLoyaltySelectionToOrder,
    ],
  );

  const handleCashReceivedInputChange = useCallback(text => {
    setCashReceivedValue(normalizeMoneyInputText(text));
  }, []);

  const runLocalPayment = useCallback(
    async ({payment, total, installments = null}) => {
      if (!payment?.wallet || !payment?.paymentType) {
        invoiceActions.setError(
          global.t?.t('orders', 'message', 'selectPaymentMethod'),
        );
        return;
      }

      setSubmittingPayment(true);
      try {
        if (
          await createInvoiceForGatewayFreePayment({
            payment,
            total,
            createInvoice: createPaidInvoice,
          })
        ) {
          return;
        }
        const {paidAmount} = await runConfiguredGatewayPayment({
          gateway: localGateway,
          installments,
          order,
          orderProducts,
          payment,
          total,
        });

        await createPaidInvoice(payment, paidAmount);
      } catch (error) {
        invoiceActions.setError(
          normalizeGatewayPaymentError(
            error,
            'Nao foi possivel processar o pagamento local.',
          ),
        );
      } finally {
        setSubmittingPayment(false);
      }
    },
    [
      createPaidInvoice,
      invoiceActions,
      localGateway,
      order,
      order?.['@id'],
      orderProducts,
    ],
  );

  const handleConfirmCashAmountEntry = useCallback(async receivedAmount => {
    const resolvedCashPaymentDetails = resolveCashPaymentDetails({
      allowPartial: cashPaymentContext === PAYMENT_CHANNEL_LOCAL,
      receivedAmount:
        receivedAmount ?? parseMoneyInputValue(cashReceivedValue),
      totalAmount: remainingAmount,
    });

    if (resolvedCashPaymentDetails.receivedAmount <= 0.009) {
      invoiceActions.setError('Informe o valor recebido para continuar.');
      return;
    }

    setAmountEntryModalMode('');
    await runLocalPayment({
      payment: selectedPayment,
      total: resolvedCashPaymentDetails.appliedAmount,
    });
  }, [
    cashReceivedValue,
    cashPaymentContext,
    invoiceActions,
    runLocalPayment,
    selectedPayment,
  ]);

  const dispatchRemotePayment = useCallback(
    async ({payment, total, installments = null}) => {
      if (!payment?.wallet || !payment?.paymentType) {
        invoiceActions.setError(
          global.t?.t('orders', 'message', 'selectPaymentMethod'),
        );
        return;
      }

      if (!selectedRemoteDevice?.deviceId || !order?.id) {
        invoiceActions.setError(
          'Configure um device de pagamento remoto para continuar.',
        );
        return;
      }

      const requestKey = buildRemotePaymentRequestKey({
        orderId: order?.id,
        payment,
        targetDeviceId: selectedRemoteDevice.deviceId,
      });

      setSubmittingPayment(true);
      setPendingRemotePaymentRequest({
        paymentLabel: getPaymentOptionLabel(payment),
        requestKey,
        targetDeviceId: selectedRemoteDevice.deviceId,
        targetDeviceLabel: selectedRemoteDevice.alias,
      });
      try {
        invoiceActions.setError('');
        await websocketActions.send({
          destination: selectedRemoteDevice.deviceId,
          store: REMOTE_PAYMENT_MESSAGE_STORE,
          action: REMOTE_PAYMENT_REQUEST_ACTION,
          requestKey,
          order: order.id,
          total,
          wallet_payment_type: {
            ...payment,
            ...(installments ? {installments} : {}),
          },
          'master-device': storagedDevice?.id,
        });
      } catch (error) {
        setPendingRemotePaymentRequest(null);
        setSubmittingPayment(false);
        invoiceActions.setError(
          normalizeGatewayPaymentError(
            error,
            'Nao foi possivel enviar o pagamento remoto.',
          ),
        );
      }
    },
    [
      invoiceActions,
      order?.id,
      selectedRemoteDevice,
      storagedDevice?.id,
      websocketActions,
    ],
  );

  const handleEdit = orderItem => {
    ordersActions.syncOrder?.(orderItem);
    navigation.navigate(
      'OrderDetails',
      buildOrderDetailsNavigationParams(orderItem),
    );
  };

  const continueSelectedPayment = useCallback(async () => {
    if (!selectedPayment?.wallet || !selectedPayment?.paymentType) {
      invoiceActions.setError(
        global.t?.t('orders', 'message', 'selectPaymentMethod'),
      );
      return;
    }

    if (selectedPaymentChannel === PAYMENT_CHANNEL_REMOTE && !selectedRemoteDevice?.deviceId) {
      invoiceActions.setError(
        'Configure um device de pagamento remoto para continuar.',
      );
      return;
    }

    if (isCashPaymentOption(selectedPayment) && !isRemotePaymentSelected) {
      setCashReceivedValue('');
      setAmountEntryModalMode('cash-local');
      return;
    }

    if (
      isRemotePaymentSelected &&
      selectedRemoteDevice?.gateway === PAYMENT_GATEWAY_INFINITE_PAY &&
      selectedPayment.paymentCode &&
      selectedPayment.installments === 'split'
    ) {
      setInstallmentsModalVisible(true);
      return;
    }

    if (isRemotePaymentSelected) {
      await dispatchRemotePayment({
        payment: selectedPayment,
        total: remainingAmount,
      });
      return;
    }

    if (
      !isRemotePaymentSelected &&
      localGateway === PAYMENT_GATEWAY_INFINITE_PAY &&
      selectedPayment.paymentCode &&
      selectedPayment.installments === 'split'
    ) {
      setInstallmentsModalVisible(true);
      return;
    }

    setAmountEntryModalMode('payment');
  }, [
    invoiceActions,
    isRemotePaymentSelected,
    localGateway,
    selectedPayment,
    selectedPaymentChannel,
    selectedRemoteDevice,
  ]);

  const handlePay = useCallback(async () => {
    if (!selectedPayment?.wallet || !selectedPayment?.paymentType) {
      invoiceActions.setError(
        global.t?.t('orders', 'message', 'selectPaymentMethod'),
      );
      return;
    }

    if (isRemotePaymentSelected) {
      setPaymentExplanationVisible(true);
      return;
    }

    await continueSelectedPayment();
  }, [
    continueSelectedPayment,
    invoiceActions,
    isRemotePaymentSelected,
    selectedPayment,
  ]);

  const handleConfirmAmountEntry = useCallback(
    async inputValue => {
      if (isCashAmountEntry) {
        await handleConfirmCashAmountEntry(inputValue);
        return;
      }

      setAmountEntryModalMode('');

      await runLocalPayment({
        payment: selectedPayment,
        total: inputValue,
      });
    },
    [
      handleConfirmCashAmountEntry,
      isCashAmountEntry,
      runLocalPayment,
      selectedPayment,
    ],
  );

  const handleInstallmentsSelect = useCallback(
    async installments => {
      setInstallmentsModalVisible(false);

      if (isRemotePaymentSelected) {
        await dispatchRemotePayment({
          payment: selectedPayment,
          total: remainingAmount,
          installments,
        });
        return;
      }

      await runLocalPayment({
        payment: selectedPayment,
        total: remainingAmount,
        installments,
      });
    },
    [
      dispatchRemotePayment,
      isRemotePaymentSelected,
      remainingAmount,
      runLocalPayment,
      selectedPayment,
    ],
  );

  const renderRemoteDeviceOption = ({item}) => {
    const active = item.deviceId === selectedRemoteDevice?.deviceId;

    return (
      <TouchableOpacity
        style={[styles.modalItem, active && styles.modalItemActive]}
        disabled={submittingPayment}
        onPress={() => {
          setSelectedRemoteDeviceId(item.deviceId);
          setRemoteDeviceModalVisible(false);
        }}>
        <Text style={styles.modalItemTitle}>{item.alias}</Text>
        <Text style={styles.modalItemSubtitle}>
          {getPaymentGatewayLabel(item.gateway)} • {item.deviceId}
        </Text>
      </TouchableOpacity>
    );
  };
  const paymentSections = useMemo(() => {
    return buildPaymentSections({
      canChangeRemoteDevice:
        canChangePaymentDeviceDuringCheckout && remotePaymentDevices.length > 1,
      localPaymentOptions,
      onPressRemoteAction: () => setRemoteDeviceModalVisible(true),
      remotePaymentOptions,
      remoteSectionTitle: selectedRemoteDevice?.alias || 'Equipamento principal',
    });
  }, [
    canChangePaymentDeviceDuringCheckout,
    localPaymentOptions,
    remotePaymentDevices.length,
    remotePaymentOptions,
    selectedRemoteDevice,
  ]);

  const handleLoyaltyCpfInputChange = useCallback(value => {
    const nextDigits = digitsOnly(value).slice(0, 11);
    const selectedCpfDigits = digitsOnly(
      selectedLoyaltyPerson?.cpf || selectedLoyaltyPerson?.cpfDisplay || '',
    );

    setLoyaltyCpfInput(Formatter.maskCPF(nextDigits));
    setLoyaltyCpfStepSkipped(false);

    if (selectedCpfDigits && selectedCpfDigits !== nextDigits) {
      setSelectedLoyaltyPerson(null);
    }
  }, [selectedLoyaltyPerson?.cpf, selectedLoyaltyPerson?.cpfDisplay]);

  const handleSelectLoyaltyPerson = useCallback(person => {
    setSelectedLoyaltyPerson(person);
    setLoyaltyCpfInput(person?.cpfDisplay || Formatter.maskCPF(person?.cpf || ''));
    setLoyaltyCpfResults([]);
    setLoyaltyCpfStepSkipped(false);
  }, []);

  const handleSkipLoyaltyCpfStep = useCallback(() => {
    setSelectedLoyaltyPerson(null);
    setLoyaltyCpfInput('');
    setLoyaltyCpfResults([]);
    setLoyaltyCpfStepSkipped(true);
    setLoyaltyCpfStepCompleted(true);
  }, []);

  const handleContinueAfterLoyaltyCpf = useCallback(() => {
    if (!resolvePeopleId(selectedLoyaltyPerson?.id)) {
      invoiceActions.setError(
        'Selecione um CPF da lista ou toque em pular para seguir sem identificar o cliente.',
      );
      return;
    }

    setLoyaltyCpfStepSkipped(false);
    setLoyaltyCpfStepCompleted(true);
  }, [invoiceActions, selectedLoyaltyPerson?.id]);

  const shouldRenderLoyaltyCpfStep =
    requiresLoyaltyCpfStep && !loyaltyCpfStepCompleted;

  const paymentTopContent =
    requiresLoyaltyCpfStep && loyaltyCpfStepCompleted ? (
      <View style={styles.loyaltySummaryCard}>
        <View style={styles.loyaltySummaryHeader}>
          <Text style={styles.loyaltySummaryTitle}>CPF fidelidade</Text>
          <TouchableOpacity
            disabled={submittingPayment}
            onPress={() => {
              setLoyaltyCpfStepCompleted(false);
              setLoyaltyCpfStepSkipped(false);
              setLoyaltyCpfResults([]);
            }}
            style={styles.loyaltySecondaryAction}>
            <Text style={styles.loyaltySecondaryActionText}>Alterar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.loyaltySummaryText}>
          {selectedLoyaltyPerson?.id
            ? `${selectedLoyaltyPerson.label} - ${
                selectedLoyaltyPerson.cpfDisplay || selectedLoyaltyPerson.cpf || ''
              }`
            : 'Venda seguindo sem CPF informado.'}
        </Text>
      </View>
    ) : null;

  const emptyTitle = 'Nenhum meio de pagamento disponível';
  const emptyText =
    'Verifique as carteiras configuradas neste equipamento ou no equipamento remoto principal.';
  const payDisabled =
    submittingPayment ||
    loadingPaymentOptions ||
    !selectedPayment?.wallet ||
    !selectedPayment?.paymentType ||
    !allPaymentOptions.length ||
    (isRemotePaymentSelected && !selectedRemoteDevice);
  const actionLabel = !selectedPayment?.paymentType
    ? 'Pagar'
    : isRemotePaymentSelected && selectedRemoteDevice?.alias
      ? `Enviar para ${selectedRemoteDevice.alias}`
      : isCashPaymentOption(selectedPayment)
        ? 'Receber em dinheiro'
        : `Pagar com ${getPaymentOptionLabel(selectedPayment)}`;
  const actionIcon = isRemotePaymentSelected
    ? 'credit-card'
    : isCashPaymentOption(selectedPayment)
      ? 'dollar-sign'
      : 'credit-card';
  const amountEntryTitle =
    amountEntryModalMode === 'cash-local'
      ? 'Pagamento em dinheiro'
      : 'Valor a cobrar';
  const amountEntryDescription = isCashAmountEntry
    ? [
        `Total a cobrar: ${Formatter.formatMoney(remainingAmount)}`,
        'Informe quanto o cliente entregou em dinheiro para calcular o troco automaticamente.',
      ]
    : 'Confirme o valor deste pagamento antes de continuar.';
  const amountEntryFieldLabel = isCashAmountEntry
    ? 'Valor recebido do cliente'
    : 'Valor a cobrar';
  const amountEntryDetails = isCashAmountEntry
    ? [
        `Valor pago agora: ${Formatter.formatMoney(
          cashPaymentDetails.appliedAmount,
        )}`,
        `Troco: ${Formatter.formatMoney(cashPaymentDetails.changeAmount)}`,
        cashPaymentContext === PAYMENT_CHANNEL_LOCAL &&
        cashPaymentDetails.missingAmount > 0.009
          ? `Restara pendente: ${Formatter.formatMoney(
              cashPaymentDetails.missingAmount,
            )}`
          : null,
      ]
    : [];
  const paymentExplanationTitle = selectedRemoteDevice
    ? `Enviar para ${selectedRemoteDevice.alias}`
    : 'Enviar pagamento remoto';
  const paymentExplanationDescription = selectedRemoteDevice
    ? [
        `O pagamento sera enviado para ${selectedRemoteDevice.alias}.`,
        'Esta tela permanece aguardando a resposta do equipamento remoto antes de concluir o pedido.',
      ]
    : ['Selecione um equipamento remoto antes de continuar.'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => handleEdit(order)}
          style={inlineStyle_534_10}>
          <Icon name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <OrderIdentityLabel
          order={order}
          containerStyle={styles.headerTitleWrap}
          primaryTextStyle={styles.headerTitle}
          secondaryTextStyle={styles.headerTitleSecondary}
        />
      </View>

      <StateStore
        stores={[
          'invoice',
          'orders',
          'order_products',
          'walletPaymentType',
          'device_config',
          'websocket',
        ]}
      />

      {canRenderCheckout ? (
        <>
          {shouldRenderLoyaltyCpfStep ? (
            <>
              <View style={inlineStyle_491_14}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.loyaltyStepScrollContent}>
                  <View style={styles.loyaltyCard}>
                    <Text style={styles.loyaltyTitle}>Identificar cliente</Text>
                    <Text style={styles.loyaltySubtitle}>
                      Informe o CPF antes do pagamento quando a fidelidade estiver habilitada.
                      Se preferir, você pode pular esta etapa e seguir direto para o pagamento.
                    </Text>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="number-pad"
                      maxLength={14}
                      onChangeText={handleLoyaltyCpfInputChange}
                      placeholder="Digite o CPF"
                      style={styles.loyaltyInput}
                      value={loyaltyCpfInput}
                    />
                    <Text style={styles.loyaltyHint}>
                      A busca começa após 5 dígitos e uma pausa curta de digitação.
                    </Text>

                    {selectedLoyaltyPerson?.id ? (
                      <View style={styles.loyaltySelectedPill}>
                        <Text style={styles.loyaltySelectedTitle}>Selecionado</Text>
                        <Text style={styles.loyaltySelectedValue}>
                          {selectedLoyaltyPerson.label}
                        </Text>
                        <Text style={styles.loyaltyResultSubtitle}>
                          {selectedLoyaltyPerson.cpfDisplay || selectedLoyaltyPerson.cpf || ''}
                        </Text>
                      </View>
                    ) : null}

                    {loyaltyCpfLoading ? (
                      <View style={styles.loyaltyInlineRow}>
                        <ActivityIndicator size="small" color="#1B5587" />
                        <Text style={styles.loyaltyHint}>Buscando CPFs cadastrados...</Text>
                      </View>
                    ) : null}

                    {!loyaltyCpfLoading &&
                    loyaltyCpfDigits.length >= LOYALTY_CPF_MIN_SEARCH_LENGTH &&
                    !loyaltyCpfResults.length ? (
                      <Text style={styles.loyaltyHint}>
                        Nenhum CPF encontrado com os dígitos informados.
                      </Text>
                    ) : null}

                    {loyaltyCpfResults.map(person => {
                      const isActive =
                        String(person?.id || '') === String(selectedLoyaltyPerson?.id || '');

                      return (
                        <TouchableOpacity
                          key={String(person.id)}
                          activeOpacity={0.85}
                          onPress={() => handleSelectLoyaltyPerson(person)}
                          style={[
                            styles.loyaltyResultItem,
                            isActive && styles.loyaltyResultItemActive,
                          ]}>
                          <Text style={styles.loyaltyResultTitle}>{person.label}</Text>
                          <Text style={styles.loyaltyResultSubtitle}>
                            {person.cpfDisplay || person.cpf || ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleSkipLoyaltyCpfStep}
                      style={styles.loyaltySecondaryAction}>
                      <Text style={styles.loyaltySecondaryActionText}>
                        Pular e ir para pagamento
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                <BottomCart
                  actionDisabled={!resolvePeopleId(selectedLoyaltyPerson?.id)}
                  actionIcon="arrow-right"
                  actionLabel="Continuar para pagamento"
                  bottomOffset={-8}
                  collapsePayableWhenPaid={false}
                  onActionPress={handleContinueAfterLoyaltyCpf}
                  paymentPaidLabel="Pago"
                  paymentPendingAmount={remainingAmount}
                  paymentPendingLabel="Pendente"
                  showPayableBadge={false}
                  variant="payment-status"
                />
              </View>
            </>
          ) : (
            <>
              <PaymentCheckoutPanel
                actionLabel={actionLabel}
                actionIcon={actionIcon}
                actionLoading={submittingPayment}
                emptyText={emptyText}
                emptyTitle={emptyTitle}
                error={paymentOptionsError}
                invoiceError={invoiceError}
                isLoadingPayments={loadingPaymentOptions}
                onPay={handlePay}
                onSelectPayment={option => {
                  setSelectedPaymentOption(option);
                  setPaymentExplanationVisible(false);
                }}
                paymentSections={paymentSections}
                payDisabled={payDisabled}
                pendingAmount={remainingAmount}
                selectedPaymentKey={selectedPaymentOption?.key}
                topContent={paymentTopContent}
              />
            </>
          )}

          <Modal
            visible={remoteDeviceModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setRemoteDeviceModalVisible(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecionar equipamento</Text>
                <Text style={styles.modalSubtitle}>
                  O primeiro device configurado na empresa vira o fallback
                  padrao quando este device nao tem destino proprio.
                </Text>
                <FlatList
                  data={remotePaymentDevices}
                  keyExtractor={item => item.deviceId}
                  renderItem={renderRemoteDeviceOption}
                />
                <TouchableOpacity
                  style={styles.closeButton}
                  disabled={submittingPayment}
                  onPress={() => setRemoteDeviceModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            animationType="slide"
            transparent={true}
            visible={amountEntryModalMode !== ''}
            onRequestClose={() => setAmountEntryModalMode('')}>
            <Calculate
              closeOnInvalid={false}
              defaultValue={isCashAmountEntry ? null : remainingAmount}
              description={amountEntryDescription}
              details={amountEntryDetails}
              fieldLabel={amountEntryFieldLabel}
              handleCancel={() => setAmountEntryModalMode('')}
              handleConfirmValue={handleConfirmAmountEntry}
              invalidValueMessage={
                isCashAmountEntry
                  ? 'Informe o valor recebido para continuar.'
                  : global.t?.t('orders', 'message', 'enterValidAmount')
              }
              onChangeText={
                isCashAmountEntry ? handleCashReceivedInputChange : undefined
              }
              placeholder={
                isCashAmountEntry
                  ? 'Ex.: 50,00'
                  : global.t?.t('orders', 'placeholder', 'enterValue')
              }
              title={amountEntryTitle}
              value={isCashAmountEntry ? cashReceivedValue : undefined}
            />
          </Modal>

          <Modal
            animationType="fade"
            transparent={true}
            visible={paymentExplanationVisible}
            onRequestClose={() => setPaymentExplanationVisible(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{paymentExplanationTitle}</Text>
                {paymentExplanationDescription.map(item => (
                  <Text key={item} style={styles.modalSubtitle}>
                    {item}
                  </Text>
                ))}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setPaymentExplanationVisible(false)}>
                    <Text style={styles.secondaryButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    disabled={!selectedRemoteDevice?.deviceId}
                    onPress={async () => {
                      setPaymentExplanationVisible(false);
                      await continueSelectedPayment();
                    }}>
                    <Text style={styles.primaryButtonText}>Continuar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            animationType="slide"
            transparent={true}
            visible={installmentsModalVisible}
            onRequestClose={() => setInstallmentsModalVisible(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  Escolher parcelamento
                </Text>
                <Text style={styles.modalSubtitle}>
                  Selecione em quantas parcelas o terminal deve processar o
                  valor restante do pedido.
                </Text>

                {Array.from({length: 9}, (_, index) => index + 2).map(
                  installments => (
                    <TouchableOpacity
                      key={String(installments)}
                      style={styles.installmentsItem}
                      activeOpacity={0.85}
                      onPress={() =>
                        handleInstallmentsSelect(installments)
                      }>
                      <Text style={styles.installmentsText}>
                        {installments}x -{' '}
                        {Formatter.formatMoney(remainingAmount / installments)}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setInstallmentsModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      ) : null}
    </View>
  );
};

export default Checkout;
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
