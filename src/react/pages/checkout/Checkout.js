import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {api} from '@controleonline/ui-common/src/api';
import {env} from '@env';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import OrderIdentityLabel from '@controleonline/ui-orders/src/react/components/OrderIdentityLabel';
import {
  buildManagerPdvRouteParams,
  buildOrderDetailsRouteParams,
  getOrderRouteId,
  isPdvRouteContext,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import {isPosKioskMode} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import PaymentCheckoutPanel from '@controleonline/ui-orders/src/react/components/PaymentCheckoutPanel';
import Calculate from '@controleonline/ui-orders/src/react/components/cart/Calculate';

import {
  buildWalletIdsForGateway,
  filterDeviceConfigsByCompany,
  getPaymentGatewayFromConfigs,
  getPaymentGatewayLabel,
  isOrderChargeOnDeliveryEnabled,
  isOrderPaymentDeviceChangeAllowed,
  PAYMENT_GATEWAY_CIELO,
  PAYMENT_GATEWAY_INFINITE_PAY,
  resolveRemotePaymentDeviceOptions,
  supportsLocalCardPayment,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {
  getPaymentOptionId,
  getPaymentOptionLabel,
  getPaymentOptionWalletId,
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
const PAYMENT_CHANNEL_DELIVERY = 'delivery';

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

const getPaymentOptionKey = payment =>
  [
    getPaymentOptionId(payment),
    getPaymentOptionWalletId(payment),
    String(payment?.paymentCode || '').trim(),
  ]
    .filter(Boolean)
    .join(':');

let posPaidInvoiceStatusIriCache = null;
let posPendingInvoiceStatusIriCache = null;

const resolvePosPaidInvoiceStatusIri = async fallbackStatusId => {
  if (posPaidInvoiceStatusIriCache) return posPaidInvoiceStatusIriCache;

  const fallbackIri = buildStatusIriFromId(fallbackStatusId);

  try {
    const response = await api.fetch('statuses', {
      params: {
        context: 'invoice',
        realStatus: 'closed',
        status: 'paid',
        itemsPerPage: 10,
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

const resolvePosPendingInvoiceStatusIri = async () => {
  if (posPendingInvoiceStatusIriCache) return posPendingInvoiceStatusIriCache;

  try {
    const response = await api.fetch('statuses', {
      params: {
        context: 'invoice',
        realStatus: 'pending',
        itemsPerPage: 20,
      },
    });
    const items = extractCollectionItems(response);
    const matchedStatus =
      items.find(item => {
        const realStatus = normalizeStatusKey(item?.realStatus);
        const status = normalizeStatusKey(item?.status);

        return (
          realStatus === 'pending' &&
          (status.includes('waiting') || status.includes('aguard'))
        );
      }) || items.find(item => normalizeStatusKey(item?.realStatus) === 'pending');

    const resolvedIri =
      matchedStatus?.['@id'] || buildStatusIriFromId(matchedStatus?.id) || null;

    if (resolvedIri) {
      posPendingInvoiceStatusIriCache = resolvedIri;
    }

    return resolvedIri;
  } catch {
    return null;
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

  const orderProductsStore = useStore('order_products');
  const orderProductsGetters = orderProductsStore.getters;

  const walletPaymentTypeStore = useStore('walletPaymentType');
  const walletPaymentTypeGetters = walletPaymentTypeStore.getters;
  const walletPaymentTypeActions = walletPaymentTypeStore.actions;

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
  const {
    items: orderProducts = [],
    isLoading: orderProductsIsloading,
    isSaving: orderProductsIsSaving,
  } = orderProductsGetters;
  const {
    items: availablePayments = [],
    isLoading: paymentTypesLoading,
    error: paymentTypesError,
  } = walletPaymentTypeGetters;

  const [companyDeviceConfigs, setCompanyDeviceConfigs] = useState([]);
  const [loadingRemoteDevices, setLoadingRemoteDevices] = useState(false);
  const [remoteDeviceModalVisible, setRemoteDeviceModalVisible] =
    useState(false);
  const [deliveryDeviceModalVisible, setDeliveryDeviceModalVisible] =
    useState(false);
  const [amountEntryModalMode, setAmountEntryModalMode] = useState('');
  const [installmentsModalVisible, setInstallmentsModalVisible] =
    useState(false);
  const [cashReceivedValue, setCashReceivedValue] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState({});
  const [selectedRemoteDeviceId, setSelectedRemoteDeviceId] = useState('');
  const [selectedDeliveryDeviceId, setSelectedDeliveryDeviceId] = useState('');
  const [paymentChannel, setPaymentChannel] = useState('');
  const [pendingRemotePaymentRequest, setPendingRemotePaymentRequest] =
    useState(null);

  const effectiveCompanyConfigs = useMemo(() => {
    if (companyConfigs && typeof companyConfigs === 'object') {
      return companyConfigs;
    }

    if (currentCompany?.configs && typeof currentCompany.configs === 'object') {
      return currentCompany.configs;
    }

    return {};
  }, [companyConfigs, currentCompany?.configs]);

  const localGateway = useMemo(
    () => getPaymentGatewayFromConfigs(device),
    [device],
  );
  const deviceType = useMemo(
    () => String(device?.type || device?.device?.type || '').trim().toUpperCase(),
    [device?.device?.type, device?.type],
  );
  const isManagerApp = useMemo(
    () => String(env.APP_TYPE || '').trim().toUpperCase() === 'MANAGER',
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
  const isCieloPdv =
    !isManagerApp &&
    deviceType === 'PDV' &&
    localGateway === PAYMENT_GATEWAY_CIELO;
  const isPdvInteractionMode = useMemo(
    () => isPdvRouteContext(route?.params),
    [route?.params],
  );
  const isKioskMode = useMemo(() => isPosKioskMode(device?.configs), [device?.configs]);
  const canUseLocalOperationalPayment = useMemo(
    () =>
      !isManagerApp &&
      (isLocalPaymentDevice || deviceType === 'PDV' || isPdvInteractionMode),
    [deviceType, isLocalPaymentDevice, isManagerApp, isPdvInteractionMode],
  );
  const orderChargeOnDeliveryEnabled = useMemo(
    () => isOrderChargeOnDeliveryEnabled(effectiveCompanyConfigs),
    [effectiveCompanyConfigs],
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
  const selectedDeliveryDevice = useMemo(
    () =>
      remotePaymentDevices.find(
        remoteDevice => remoteDevice.deviceId === selectedDeliveryDeviceId,
      ) ||
      remotePaymentDevices[0] ||
      null,
    [remotePaymentDevices, selectedDeliveryDeviceId],
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
  const paidAmount = useMemo(
    () => Math.max(Number(order?.price || 0) - remainingAmount, 0),
    [order?.price, remainingAmount],
  );
  const cashPaymentContext = useMemo(() => {
    if (amountEntryModalMode === 'cash-local') {
      return PAYMENT_CHANNEL_LOCAL;
    }

    if (amountEntryModalMode === 'cash-delivery') {
      return PAYMENT_CHANNEL_DELIVERY;
    }

    return '';
  }, [amountEntryModalMode]);
  const isCashAmountEntry = useMemo(
    () =>
      amountEntryModalMode === 'cash-local' ||
      amountEntryModalMode === 'cash-delivery',
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
  const resetToKioskCatalog = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{name: 'AddProductScreen'}],
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
      ...(typeof route.params?.showBottomToolBar === 'boolean'
        ? {showBottomToolBar: route.params.showBottomToolBar}
        : {}),
    });
  }, [
    navigation,
    route.params?.interactionMode,
    route.params?.order,
    route.params?.showBottomToolBar,
    routeOrderId,
  ]);

  const paymentChannelOptions = useMemo(() => {
    const options = [];

    if (canUseLocalOperationalPayment) {
      options.push({
        key: PAYMENT_CHANNEL_LOCAL,
        label: 'Neste device',
        description:
          localGateway === PAYMENT_GATEWAY_CIELO
            ? 'Cobrar diretamente nesta maquina Cielo.'
            : 'Cobrar neste PDV com as carteiras locais configuradas, incluindo dinheiro.',
      });
    }

    if (!isCieloPdv && remotePaymentDevices.length > 0) {
      options.push({
        key: PAYMENT_CHANNEL_REMOTE,
        label: 'Remoto',
        description:
          'Enviar a cobranca para o equipamento remoto configurado da empresa.',
      });
    }

    if (
      !isCieloPdv &&
      orderChargeOnDeliveryEnabled &&
      remotePaymentDevices.length > 0
    ) {
      options.push({
        key: PAYMENT_CHANNEL_DELIVERY,
        label: 'Na entrega',
        description:
          'Usar o equipamento configurado da entrega e registrar a cobranca pendente.',
      });
    }

    return options;
  }, [
    canUseLocalOperationalPayment,
    isCieloPdv,
    localGateway,
    orderChargeOnDeliveryEnabled,
    remotePaymentDevices.length,
  ]);
  const activePaymentChannel = useMemo(() => {
    if (paymentChannelOptions.some(option => option.key === paymentChannel)) {
      return paymentChannel;
    }

    return paymentChannelOptions[0]?.key || '';
  }, [paymentChannel, paymentChannelOptions]);

  const visiblePayments = useMemo(() => {
    if (activePaymentChannel === PAYMENT_CHANNEL_DELIVERY) {
      return availablePayments;
    }

    return availablePayments;
  }, [activePaymentChannel, availablePayments]);
  const isAwaitingRemotePayment = useMemo(
    () => !!pendingRemotePaymentRequest?.requestKey,
    [pendingRemotePaymentRequest?.requestKey],
  );

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

  useFocusEffect(
    useCallback(() => {
      if (!routeOrderId || String(order?.id || '') === String(routeOrderId)) {
        return;
      }

      ordersActions.get(routeOrderId);
    }, [order?.id, ordersActions, routeOrderId]),
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
          if (invoiceMessage?.invoice) {
            appendInvoiceToStore(invoiceMessage.invoice);
          }

          if (routeOrderId) {
            await ordersActions.get(routeOrderId).catch(() => null);
          }

          navigation.navigate(
            'OrderDetails',
            buildOrderDetailsNavigationParams(
              invoiceMessage?.order || routeOrderId || order,
            ),
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
    buildOrderDetailsNavigationParams,
    invoiceActions,
    invoiceMessage,
    navigation,
    order,
    ordersActions,
    pendingRemotePaymentRequest?.requestKey,
    routeOrderId,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id || isCieloPdv) {
        setCompanyDeviceConfigs([]);
        setLoadingRemoteDevices(false);
        return;
      }

      setLoadingRemoteDevices(true);
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
        })
        .finally(() => {
          setLoadingRemoteDevices(false);
        });
    }, [currentCompany?.id, deviceConfigActions, isCieloPdv]),
  );

  useEffect(() => {
    if (!remotePaymentDevices.length) {
      setSelectedRemoteDeviceId('');
      setSelectedDeliveryDeviceId('');
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
    setSelectedDeliveryDeviceId(current =>
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
    setPaymentChannel(current =>
      paymentChannelOptions.some(option => option.key === current)
        ? current
        : paymentChannelOptions[0]?.key || '',
    );
  }, [paymentChannelOptions]);

  useEffect(() => {
    setSelectedPayment(current => {
      const currentKey = getPaymentOptionKey(current);

      if (!visiblePayments.length) {
        return {};
      }

      return (
        visiblePayments.find(
          payment => getPaymentOptionKey(payment) === currentKey,
        ) || visiblePayments[0]
      );
    });
  }, [visiblePayments]);

  useEffect(() => {
    if (!currentCompany?.id) {
      walletPaymentTypeActions.setItems([]);
      return;
    }

    let walletIds = [];

    if (activePaymentChannel === PAYMENT_CHANNEL_DELIVERY) {
      if (selectedDeliveryDevice?.gateway) {
        walletIds = buildWalletIdsForGateway({
          gateway: selectedDeliveryDevice.gateway,
          companyConfigs: effectiveCompanyConfigs,
          includeCashWallet: true,
        });
      }
    } else {
      const targetGateway =
        activePaymentChannel === PAYMENT_CHANNEL_REMOTE
          ? selectedRemoteDevice?.gateway
          : localGateway;

      if (targetGateway) {
        walletIds = buildWalletIdsForGateway({
          gateway: targetGateway,
          companyConfigs: effectiveCompanyConfigs,
          includeCashWallet: true,
        });
      }
    }

    if (!walletIds.length) {
      walletPaymentTypeActions.setItems([]);
      return;
    }

    walletPaymentTypeActions.getItems({
      people: '/people/' + currentCompany.id,
      wallet: walletIds,
    });
  }, [
    currentCompany?.id,
    effectiveCompanyConfigs,
    localGateway,
    activePaymentChannel,
    selectedDeliveryDevice?.gateway,
    selectedRemoteDevice?.gateway,
    walletPaymentTypeActions,
  ]);

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

        if (device?.configs?.['pos-type'] == 'simple') {
          const nextPayable = Number(payable || 0) + Number(createdInvoice.price || 0);

          if (nextPayable < 0) {
            appendInvoiceToStore(createdInvoice);
            ordersActions.setPayable(nextPayable);
            ordersActions.syncOrder?.(order);
            navigation.navigate(
              'OrderDetails',
              buildOrderDetailsNavigationParams(order),
            );
          } else {
            ordersActions.setItem(null);
            invoiceActions.setItems([]);
            ordersActions.setPayable(0);
            printActions.setReload(true);
            if (isKioskMode) {
              resetToKioskCatalog();
            } else {
              navigation.navigate('OrderHistoryPage');
            }
          }
        } else {
          const nextPayable = Number(payable || 0) + Number(createdInvoice.price || 0);
          appendInvoiceToStore(createdInvoice);
          if (isKioskMode && nextPayable >= 0) {
            ordersActions.setItem(null);
            invoiceActions.setItems([]);
            ordersActions.setPayable(0);
            printActions.setReload(true);
            resetToKioskCatalog();
          } else {
            ordersActions.syncOrder?.(order);
            navigation.navigate(
              'OrderDetails',
              buildOrderDetailsNavigationParams(order),
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
      buildOrderDetailsNavigationParams,
      currentCompany?.id,
      defaultCompany?.configs,
      device?.configs,
      invoiceActions,
      isKioskMode,
      navigation,
      order,
      ordersActions,
      payable,
      printActions,
      resetToKioskCatalog,
    ],
  );

  const createPendingInvoice = useCallback(
    async (payment, total, additionalInfo = null) => {
      try {
        const payload = {
          dueDate: Formatter.getCurrentDate(),
          destinationWallet: payment?.wallet?.['@id'],
          paymentType: payment?.paymentType?.['@id'],
          price: total,
          receiver: '/people/' + currentCompany.id,
          order: order?.['@id'],
        };
        if (additionalInfo && typeof additionalInfo === 'object') {
          payload.otherInformations = additionalInfo;
        }

        const pendingStatusIri = await resolvePosPendingInvoiceStatusIri();
        if (pendingStatusIri) {
          payload.status = pendingStatusIri;
        }

        const createdInvoice = await invoiceActions.save(payload);

        if (!createdInvoice) {
          return null;
        }

        appendInvoiceToStore(createdInvoice);
        ordersActions.syncOrder?.(order);
        navigation.navigate(
          'OrderDetails',
          buildOrderDetailsNavigationParams(order),
        );
        return createdInvoice;
      } catch (error) {
        invoiceActions.setError(
          normalizeGatewayPaymentError(
            error,
            'Nao foi possivel registrar o pagamento na entrega.',
          ),
        );
        return null;
      }
    },
    [
      appendInvoiceToStore,
      buildOrderDetailsNavigationParams,
      currentCompany?.id,
      invoiceActions,
      navigation,
      order,
      ordersActions,
    ],
  );

  const buildDeliveryPaymentMetadata = useCallback(
    ({payment, receivedAmount = null, changeAmount = 0}) => ({
      channel: PAYMENT_CHANNEL_DELIVERY,
      paymentLabel: getPaymentOptionLabel(payment),
      paymentMode: isCashPaymentOption(payment)
        ? 'cash'
        : isIntegratedPaymentOption(payment)
          ? 'machine'
          : 'manual',
      needsChange: Number(changeAmount || 0) > 0.009,
      changeFor:
        Number(changeAmount || 0) > 0.009 ? Number(receivedAmount || 0) : null,
      receivedAmount: Number(receivedAmount || 0) > 0 ? Number(receivedAmount) : null,
      changeAmount: Number(changeAmount || 0) > 0 ? Number(changeAmount) : 0,
      targetDeviceId: selectedDeliveryDevice?.deviceId || null,
      targetDeviceLabel: selectedDeliveryDevice?.alias || null,
      targetGateway: selectedDeliveryDevice?.gateway || null,
    }),
    [selectedDeliveryDevice],
  );

  const registerDeliveryInvoice = useCallback(
    async ({payment, total, receivedAmount = null, changeAmount = 0}) => {
      setSubmittingPayment(true);
      try {
        await createPendingInvoice(
          payment,
          total,
          buildDeliveryPaymentMetadata({payment, receivedAmount, changeAmount}),
        );
      } finally {
        setSubmittingPayment(false);
      }
    },
    [buildDeliveryPaymentMetadata, createPendingInvoice],
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

    if (
      cashPaymentContext === PAYMENT_CHANNEL_DELIVERY &&
      resolvedCashPaymentDetails.missingAmount > 0.009
    ) {
      invoiceActions.setError(
        'O valor recebido nao pode ser menor que o total do pedido na entrega.',
      );
      return;
    }

    setAmountEntryModalMode('');
    if (cashPaymentContext === PAYMENT_CHANNEL_LOCAL) {
      await runLocalPayment({
        payment: selectedPayment,
        total: resolvedCashPaymentDetails.appliedAmount,
      });
      return;
    }

    await registerDeliveryInvoice({
      payment: selectedPayment,
      total: remainingAmount,
      receivedAmount: resolvedCashPaymentDetails.receivedAmount,
      changeAmount: resolvedCashPaymentDetails.changeAmount,
    });
  }, [
    cashReceivedValue,
    cashPaymentContext,
    invoiceActions,
    registerDeliveryInvoice,
    remainingAmount,
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

  const handlePay = useCallback(async () => {
    if (!selectedPayment?.wallet || !selectedPayment?.paymentType) {
      invoiceActions.setError(
        global.t?.t('orders', 'message', 'selectPaymentMethod'),
      );
      return;
    }

    if (
      activePaymentChannel === PAYMENT_CHANNEL_REMOTE &&
      !selectedRemoteDevice?.deviceId
    ) {
      invoiceActions.setError(
        'Configure um device de pagamento remoto para continuar.',
      );
      return;
    }

    if (activePaymentChannel === PAYMENT_CHANNEL_DELIVERY) {
      if (!selectedDeliveryDevice?.deviceId) {
        invoiceActions.setError(
          'Selecione o equipamento que vai cobrar na entrega.',
        );
        return;
      }

      if (isCashPaymentOption(selectedPayment)) {
        setCashReceivedValue('');
        setAmountEntryModalMode('cash-delivery');
        return;
      }

      await registerDeliveryInvoice({
        payment: selectedPayment,
        total: remainingAmount,
      });
      return;
    }

    if (
      isCashPaymentOption(selectedPayment) &&
      activePaymentChannel !== PAYMENT_CHANNEL_REMOTE
    ) {
      setCashReceivedValue('');
      setAmountEntryModalMode(
        activePaymentChannel === PAYMENT_CHANNEL_DELIVERY
          ? 'cash-delivery'
          : 'cash-local',
      );
      return;
    }

    if (
      activePaymentChannel === PAYMENT_CHANNEL_REMOTE &&
      selectedRemoteDevice?.gateway === PAYMENT_GATEWAY_INFINITE_PAY &&
      selectedPayment.paymentCode &&
      selectedPayment.installments === 'split'
    ) {
      setInstallmentsModalVisible(true);
      return;
    }

    if (
      activePaymentChannel === PAYMENT_CHANNEL_LOCAL &&
      localGateway === PAYMENT_GATEWAY_INFINITE_PAY &&
      selectedPayment.paymentCode &&
      selectedPayment.installments === 'split'
    ) {
      setInstallmentsModalVisible(true);
      return;
    }

    setAmountEntryModalMode('payment');
  }, [
    activePaymentChannel,
    invoiceActions,
    registerDeliveryInvoice,
    localGateway,
    remainingAmount,
    selectedDeliveryDevice,
    selectedPayment,
    selectedRemoteDevice,
  ]);

  const handleConfirmAmountEntry = useCallback(
    async inputValue => {
      if (isCashAmountEntry) {
        await handleConfirmCashAmountEntry(inputValue);
        return;
      }

      setAmountEntryModalMode('');

      if (activePaymentChannel === PAYMENT_CHANNEL_REMOTE) {
        await dispatchRemotePayment({
          payment: selectedPayment,
          total: inputValue,
        });
        return;
      }

      await runLocalPayment({
        payment: selectedPayment,
        total: inputValue,
      });
    },
    [
      activePaymentChannel,
      dispatchRemotePayment,
      handleConfirmCashAmountEntry,
      isCashAmountEntry,
      runLocalPayment,
      selectedPayment,
    ],
  );

  const handleInstallmentsSelect = useCallback(
    async installments => {
      setInstallmentsModalVisible(false);

      if (activePaymentChannel === PAYMENT_CHANNEL_REMOTE) {
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
      activePaymentChannel,
      dispatchRemotePayment,
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
  const renderDeliveryDeviceOption = ({item}) => {
    const active = item.deviceId === selectedDeliveryDevice?.deviceId;

    return (
      <TouchableOpacity
        style={[styles.modalItem, active && styles.modalItemActive]}
        disabled={submittingPayment}
        onPress={() => {
          setSelectedDeliveryDeviceId(item.deviceId);
          setDeliveryDeviceModalVisible(false);
        }}>
        <Text style={styles.modalItemTitle}>{item.alias}</Text>
        <Text style={styles.modalItemSubtitle}>
          {getPaymentGatewayLabel(item.gateway)} • {item.deviceId}
        </Text>
      </TouchableOpacity>
    );
  };

  const paymentTopContent = (
    <View>
      <View style={styles.modeCard}>
        <Text style={styles.modeTitle}>Barra unica de pagamento</Text>
        <Text style={styles.modeSubtitle}>
          Escolha onde o pedido sera cobrado antes de selecionar o meio de
          pagamento.
        </Text>

        <View style={styles.modeOptions}>
          {paymentChannelOptions.map(option => {
            const active = option.key === activePaymentChannel;

            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.modeChip, active && styles.modeChipActive]}
                activeOpacity={submittingPayment ? 1 : 0.85}
                disabled={submittingPayment}
                onPress={() => setPaymentChannel(option.key)}>
                <Text style={styles.modeChipTitle}>{option.label}</Text>
                <Text style={styles.modeChipDescription}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {activePaymentChannel === PAYMENT_CHANNEL_LOCAL && (
        <View style={styles.remoteCard}>
          <View style={styles.remoteHeader}>
            <View style={styles.remoteIconWrap}>
              <Icon name="smartphone" size={18} color="#0EA5E9" />
            </View>
            <View style={inlineStyle_491_14}>
              <Text style={styles.remoteTitle}>Pagamento no proprio device</Text>
              <Text style={styles.remoteSubtitle}>
                Este pedido sera cobrado aqui usando o gateway{' '}
                {getPaymentGatewayLabel(localGateway)} e as carteiras ligadas a
                este PDV.
              </Text>
            </View>
          </View>
        </View>
      )}

      {activePaymentChannel === PAYMENT_CHANNEL_REMOTE && (
        <View style={styles.remoteCard}>
          <View style={styles.remoteHeader}>
            <View style={styles.remoteIconWrap}>
              <Icon name="credit-card" size={18} color="#7C3AED" />
            </View>
            <View style={inlineStyle_491_14}>
              <Text style={styles.remoteTitle}>Pagamento remoto</Text>
              <Text style={styles.remoteSubtitle}>
                Use esse modo para enviar a cobranca para um terminal remoto
                compatível da empresa, como Cielo ou Infinite Pay.
              </Text>
            </View>
          </View>

          {loadingRemoteDevices ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text style={styles.loadingText}>
                Carregando devices de pagamento...
              </Text>
            </View>
          ) : selectedRemoteDevice ? (
            <>
              <View style={styles.remoteCurrentRow}>
                <Text style={styles.remoteCurrent}>
                  {canChangePaymentDeviceDuringCheckout
                    ? 'Equipamento selecionado'
                    : 'Equipamento padrao'}
                  : {selectedRemoteDevice.alias} (
                  {getPaymentGatewayLabel(selectedRemoteDevice.gateway)})
                </Text>
                {canChangePaymentDeviceDuringCheckout &&
                  remotePaymentDevices.length > 1 && (
                    <TouchableOpacity
                      style={styles.remoteSwapButton}
                      activeOpacity={submittingPayment ? 1 : 0.85}
                      disabled={submittingPayment}
                      onPress={() => setRemoteDeviceModalVisible(true)}>
                      <Icon name="swap-horiz" size={14} color="#0EA5E9" />
                      <Text style={styles.remoteSwapButtonText}>Trocar</Text>
                    </TouchableOpacity>
                  )}
              </View>
              {!canChangePaymentDeviceDuringCheckout && (
                <Text style={styles.remoteSubtitle}>
                  Equipamento padrao definido no configurador geral.
                </Text>
              )}
              {isAwaitingRemotePayment ? (
                <Text style={styles.remotePendingText}>
                  Aguardando resposta de{' '}
                  {pendingRemotePaymentRequest?.targetDeviceLabel ||
                    selectedRemoteDevice.alias}{' '}
                  para {pendingRemotePaymentRequest?.paymentLabel || 'o pagamento'}.
                </Text>
              ) : (
                <Text style={styles.remoteSubtitle}>
                  Os meios mostrados abaixo seguem as carteiras configuradas
                  para este equipamento remoto.
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.remoteSubtitle}>
              Configure pelo menos um device remoto com Cielo ou Infinite Pay
              para continuar.
            </Text>
          )}
        </View>
      )}

      {activePaymentChannel === PAYMENT_CHANNEL_DELIVERY && (
        <View style={styles.remoteCard}>
          <View style={styles.remoteHeader}>
            <View style={styles.remoteIconWrap}>
              <Icon name="local-shipping" size={18} color="#16A34A" />
            </View>
            <View style={inlineStyle_491_14}>
              <Text style={styles.remoteTitle}>Cobrar na entrega</Text>
              <Text style={styles.remoteSubtitle}>
                Escolha o equipamento da entrega para liberar maquininha e
                dinheiro corretos antes de registrar a cobranca pendente.
              </Text>
            </View>
          </View>

          {loadingRemoteDevices ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#16A34A" />
              <Text style={styles.loadingText}>
                Carregando equipamentos da entrega...
              </Text>
            </View>
          ) : selectedDeliveryDevice ? (
            <>
              <View style={styles.remoteCurrentRow}>
                <Text style={styles.remoteCurrent}>
                  {canChangePaymentDeviceDuringCheckout
                    ? 'Equipamento da entrega'
                    : 'Equipamento padrao da entrega'}
                  : {selectedDeliveryDevice.alias} (
                  {getPaymentGatewayLabel(selectedDeliveryDevice.gateway)})
                </Text>
                {canChangePaymentDeviceDuringCheckout &&
                  remotePaymentDevices.length > 1 && (
                    <TouchableOpacity
                      style={[styles.remoteSwapButton, styles.deliverySwapButton]}
                      activeOpacity={submittingPayment ? 1 : 0.85}
                      disabled={submittingPayment}
                      onPress={() => setDeliveryDeviceModalVisible(true)}>
                      <Icon name="swap-horiz" size={14} color="#16A34A" />
                      <Text
                        style={[
                          styles.remoteSwapButtonText,
                          styles.deliverySwapButtonText,
                        ]}>
                        Trocar
                      </Text>
                    </TouchableOpacity>
                  )}
              </View>
              {!canChangePaymentDeviceDuringCheckout && (
                <Text style={styles.remoteSubtitle}>
                  Equipamento padrao definido no configurador geral.
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.remoteSubtitle}>
              Configure pelo menos um device remoto com Cielo ou Infinite Pay
              para usar o pagamento na entrega.
            </Text>
          )}
        </View>
        )}

      {isCashPaymentOption(selectedPayment) &&
        activePaymentChannel !== PAYMENT_CHANNEL_REMOTE && (
          <View style={styles.remoteCard}>
            <View style={styles.remoteHeader}>
              <View style={styles.remoteIconWrap}>
                <Icon name="payments" size={18} color="#D97706" />
              </View>
              <View style={inlineStyle_491_14}>
                <Text style={styles.remoteTitle}>Valor recebido e troco</Text>
                <Text style={styles.remoteSubtitle}>
                  {activePaymentChannel === PAYMENT_CHANNEL_DELIVERY
                    ? 'Ao tocar em Cobrar na entrega, informe quanto o cliente vai entregar em dinheiro para calcular o troco.'
                    : 'Ao tocar em Pagar, informe quanto o cliente entregou, por exemplo R$ 50,00. O sistema mostra o troco antes de confirmar.'}
                </Text>
              </View>
            </View>
          </View>
        )}
    </View>
  );

  const emptyTitle =
    activePaymentChannel === PAYMENT_CHANNEL_REMOTE
      ? 'Nenhum meio remoto disponivel'
      : activePaymentChannel === PAYMENT_CHANNEL_DELIVERY
        ? 'Nenhum meio manual disponivel'
        : 'Nenhum meio local disponivel';
  const emptyText =
    activePaymentChannel === PAYMENT_CHANNEL_REMOTE
      ? 'Configure um terminal remoto e vincule as carteiras de pagamento para usar o pagamento remoto.'
      : activePaymentChannel === PAYMENT_CHANNEL_DELIVERY
        ? 'Selecione um equipamento da entrega com carteira configurada para liberar maquininha e dinheiro.'
        : 'Verifique a configuracao das carteiras do gateway local deste device.';
  const payDisabled =
    submittingPayment ||
    paymentTypesLoading ||
    !selectedPayment?.wallet ||
    !selectedPayment?.paymentType ||
    !visiblePayments.length ||
    (activePaymentChannel === PAYMENT_CHANNEL_REMOTE && !selectedRemoteDevice) ||
    (activePaymentChannel === PAYMENT_CHANNEL_DELIVERY && !selectedDeliveryDevice);
  const actionLabel =
    activePaymentChannel === PAYMENT_CHANNEL_DELIVERY && selectedDeliveryDevice
      ? `Cobrar na entrega com ${selectedDeliveryDevice.alias}`
      : activePaymentChannel === PAYMENT_CHANNEL_DELIVERY
        ? 'Cobrar na entrega'
      : activePaymentChannel === PAYMENT_CHANNEL_REMOTE && selectedRemoteDevice
        ? `Pagar em ${selectedRemoteDevice.alias}`
      : 'Pagar';
  const amountEntryTitle =
    amountEntryModalMode === 'cash-local'
      ? 'Pagamento em dinheiro'
      : amountEntryModalMode === 'cash-delivery'
        ? 'Dinheiro na entrega'
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
        cashPaymentContext === PAYMENT_CHANNEL_LOCAL
          ? `Valor pago agora: ${Formatter.formatMoney(
              cashPaymentDetails.appliedAmount,
            )}`
          : `Valor do pedido: ${Formatter.formatMoney(remainingAmount)}`,
        `Troco: ${Formatter.formatMoney(cashPaymentDetails.changeAmount)}`,
        cashPaymentContext === PAYMENT_CHANNEL_LOCAL &&
        cashPaymentDetails.missingAmount > 0.009
          ? `Restara pendente: ${Formatter.formatMoney(
              cashPaymentDetails.missingAmount,
            )}`
          : null,
      ]
    : [];

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
          <PaymentCheckoutPanel
            actionLabel={actionLabel}
            emptyText={emptyText}
            emptyTitle={emptyTitle}
            error={paymentTypesError}
            invoiceError={invoiceError}
            invoiceIsSaving={submittingPayment || paymentTypesLoading}
            onPay={handlePay}
            onSelectPayment={setSelectedPayment}
            paidAmount={paidAmount}
            payDisabled={payDisabled}
            payments={visiblePayments}
            pendingAmount={remainingAmount}
            selectedPayment={selectedPayment}
            topContent={paymentTopContent}
            totalAmount={Number(order?.price || 0)}
          />

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
            visible={deliveryDeviceModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setDeliveryDeviceModalVisible(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Equipamento da entrega</Text>
                <Text style={styles.modalSubtitle}>
                  Escolha qual equipamento deve ser considerado para mostrar
                  maquininha e dinheiro na barra de pagamento da entrega.
                </Text>
                <FlatList
                  data={remotePaymentDevices}
                  keyExtractor={item => `delivery-${item.deviceId}`}
                  renderItem={renderDeliveryDeviceOption}
                />
                <TouchableOpacity
                  style={styles.closeButton}
                  disabled={submittingPayment}
                  onPress={() => setDeliveryDeviceModalVisible(false)}>
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
