import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {api} from '@controleonline/ui-common/src/api';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {buildOrderDetailsRouteParams} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import PaymentCheckoutPanel from '@controleonline/ui-orders/src/react/components/PaymentCheckoutPanel';
import Calculate from '@controleonline/ui-orders/src/react/components/cart/Calculate';
import CieloService from '@controleonline/ui-orders/src/react/services/Cielo/Cielo';
import InfinitePayService from '@controleonline/ui-orders/src/react/services/InfinitePay/InfinitePay';

import {
  buildWalletIdsForGateway,
  filterDeviceConfigsByCompany,
  getPaymentGatewayFromConfigs,
  getPaymentGatewayLabel,
  isOrderChargeOnDeliveryEnabled,
  PAYMENT_GATEWAY_CIELO,
  PAYMENT_GATEWAY_INFINITE_PAY,
  resolveRemotePaymentDeviceOptions,
  supportsLocalCardPayment,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';

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
  String(
    payment?.paymentType?.id ||
      payment?.paymentType?.['@id'] ||
      payment?.paymentCode ||
      '',
  ).trim();

const isIntegratedPayment = payment =>
  String(payment?.paymentCode || '').trim() !== '';

const normalizePaymentErrorMessage = (
  error,
  fallback = 'Nao foi possivel concluir o pagamento.',
) => {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  if (typeof error?.result === 'string' && error.result.trim()) {
    return error.result;
  }

  if (typeof error?.error === 'string' && error.error.trim()) {
    return error.error;
  }

  try {
    const serialized = JSON.stringify(error);
    return serialized && serialized !== '{}' ? serialized : fallback;
  } catch {
    return fallback;
  }
};

const buildDeliveryWalletIds = ({
  companyConfigs,
  localGateway,
  remotePaymentDevices,
}) => {
  const walletIds = new Set();

  [
    companyConfigs?.['pos-cash-wallet'],
    localGateway ? companyConfigs?.[`pos-${localGateway}-wallet`] : null,
    companyConfigs?.[`pos-${PAYMENT_GATEWAY_CIELO}-wallet`],
    companyConfigs?.[`pos-${PAYMENT_GATEWAY_INFINITE_PAY}-wallet`],
    ...(Array.isArray(remotePaymentDevices) ? remotePaymentDevices : []).map(
      deviceOption => companyConfigs?.[`pos-${deviceOption?.gateway}-wallet`],
    ),
  ]
    .filter(Boolean)
    .forEach(walletId => walletIds.add(walletId));

  return Array.from(walletIds);
};

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
  const [paymentValueModalVisible, setPaymentValueModalVisible] =
    useState(false);
  const [installmentsModalVisible, setInstallmentsModalVisible] =
    useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState({});
  const [selectedRemoteDeviceId, setSelectedRemoteDeviceId] = useState('');
  const [paymentChannel, setPaymentChannel] = useState('');

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
  const isLocalPaymentDevice = useMemo(
    () =>
      supportsLocalCardPayment({
        deviceConfig: device,
        platform: Platform.OS,
      }),
    [device],
  );
  const isCieloPdv =
    deviceType === 'PDV' && localGateway === PAYMENT_GATEWAY_CIELO;
  const orderChargeOnDeliveryEnabled = useMemo(
    () => isOrderChargeOnDeliveryEnabled(effectiveCompanyConfigs),
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
  const paidAmount = useMemo(
    () => Math.max(Number(order?.price || 0) - remainingAmount, 0),
    [order?.price, remainingAmount],
  );

  const paymentChannelOptions = useMemo(() => {
    const options = [];

    if (isLocalPaymentDevice) {
      options.push({
        key: PAYMENT_CHANNEL_LOCAL,
        label: 'Neste device',
        description:
          localGateway === PAYMENT_GATEWAY_CIELO
            ? 'Cobrar diretamente nesta maquina Cielo.'
            : 'Cobrar neste PDV usando o gateway local configurado.',
      });
    }

    if (!isCieloPdv && remotePaymentDevices.length > 0) {
      options.push({
        key: PAYMENT_CHANNEL_REMOTE,
        label: 'Remoto',
        description: 'Enviar a cobranca para outro terminal da empresa.',
      });
    }

    if (!isCieloPdv && orderChargeOnDeliveryEnabled) {
      options.push({
        key: PAYMENT_CHANNEL_DELIVERY,
        label: 'Na entrega',
        description: 'Registrar o pedido para cobrar manualmente depois.',
      });
    }

    return options;
  }, [
    isCieloPdv,
    isLocalPaymentDevice,
    localGateway,
    orderChargeOnDeliveryEnabled,
    remotePaymentDevices.length,
  ]);

  const integratedPayments = useMemo(
    () => availablePayments.filter(isIntegratedPayment),
    [availablePayments],
  );
  const manualPayments = useMemo(
    () => availablePayments.filter(payment => !isIntegratedPayment(payment)),
    [availablePayments],
  );
  const visiblePayments = useMemo(() => {
    if (paymentChannel === PAYMENT_CHANNEL_REMOTE) {
      return integratedPayments;
    }

    if (paymentChannel === PAYMENT_CHANNEL_DELIVERY) {
      return manualPayments;
    }

    return availablePayments;
  }, [availablePayments, integratedPayments, manualPayments, paymentChannel]);

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

  const formatProducts = useCallback(() => {
    return (Array.isArray(orderProducts) ? orderProducts : []).map(orderProduct => ({
      name: orderProduct?.product?.product,
      quantity: orderProduct?.quantity,
      sku:
        orderProduct?.product?.sku ||
        String(orderProduct?.product?.['@id'] || '').replace(/\D/g, ''),
      unitOfMeasure: 'unidade',
      unitPrice: Math.round(Number(orderProduct?.price || 0) * 100).toString(),
    }));
  }, [orderProducts]);

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
      return;
    }

    setSelectedRemoteDeviceId(current =>
      remotePaymentDevices.some(deviceOption => deviceOption.deviceId === current)
        ? current
        : remotePaymentDevices[0].deviceId,
    );
  }, [remotePaymentDevices]);

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

    if (paymentChannel === PAYMENT_CHANNEL_DELIVERY) {
      walletIds = buildDeliveryWalletIds({
        companyConfigs: effectiveCompanyConfigs,
        localGateway,
        remotePaymentDevices,
      });
    } else {
      const targetGateway =
        paymentChannel === PAYMENT_CHANNEL_REMOTE
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
    paymentChannel,
    remotePaymentDevices,
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
            navigation.navigate('OrderDetails', buildOrderDetailsRouteParams(order));
          } else {
            ordersActions.setItem(null);
            invoiceActions.setItems([]);
            ordersActions.setPayable(0);
            printActions.setReload(true);
            navigation.navigate('OrderHistoryPage');
          }
        } else {
          appendInvoiceToStore(createdInvoice);
          ordersActions.syncOrder?.(order);
          navigation.navigate('OrderDetails', buildOrderDetailsRouteParams(order));
        }

        return createdInvoice;
      } catch (error) {
        invoiceActions.setError(
          normalizePaymentErrorMessage(
            error,
            'Nao foi possivel registrar o pagamento do pedido.',
          ),
        );
        return null;
      }
    },
    [
      appendInvoiceToStore,
      currentCompany?.id,
      defaultCompany?.configs,
      device?.configs,
      invoiceActions,
      navigation,
      order,
      ordersActions,
      payable,
      printActions,
    ],
  );

  const createPendingInvoice = useCallback(
    async (payment, total) => {
      try {
        const payload = {
          dueDate: Formatter.getCurrentDate(),
          destinationWallet: payment?.wallet?.['@id'],
          paymentType: payment?.paymentType?.['@id'],
          price: total,
          receiver: '/people/' + currentCompany.id,
          order: order?.['@id'],
        };

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
        navigation.navigate('OrderDetails', buildOrderDetailsRouteParams(order));
        return createdInvoice;
      } catch (error) {
        invoiceActions.setError(
          normalizePaymentErrorMessage(
            error,
            'Nao foi possivel registrar o pagamento na entrega.',
          ),
        );
        return null;
      }
    },
    [
      appendInvoiceToStore,
      currentCompany?.id,
      invoiceActions,
      navigation,
      order,
      ordersActions,
    ],
  );

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
        if (!payment.paymentCode) {
          await createPaidInvoice(payment, total);
          return;
        }

        if (localGateway === PAYMENT_GATEWAY_CIELO) {
          const response = await new CieloService().payment(
            payment.paymentCode,
            formatProducts(),
            Math.round(Number(total || 0) * 100).toString(),
          );

          if (!response?.success) {
            throw new Error(normalizePaymentErrorMessage(response?.result));
          }

          await createPaidInvoice(payment, total);
          return;
        }

        if (localGateway === PAYMENT_GATEWAY_INFINITE_PAY) {
          const response = await new InfinitePayService().payment(
            payment.paymentCode,
            installments || payment.installments || 1,
            order?.['@id'],
            Math.round(Number(total || 0) * 100).toString(),
          );

          if (!response?.success || response?.code === 1 || response?.code === 2) {
            throw response;
          }

          await createPaidInvoice(
            payment,
            Number(response?.result?.paidAmount || 0) > 0
              ? Number(response.result.paidAmount) / 100
              : total,
          );
          return;
        }

        throw new Error('Gateway local indisponivel neste device.');
      } catch (error) {
        invoiceActions.setError(
          normalizePaymentErrorMessage(
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
      formatProducts,
      invoiceActions,
      localGateway,
      order?.['@id'],
    ],
  );

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

      setSubmittingPayment(true);
      try {
        if (!payment.paymentCode) {
          await createPaidInvoice(payment, total);
          return;
        }

        await websocketActions.send({
          destination: selectedRemoteDevice.deviceId,
          store: 'invoice',
          action: 'pay',
          order: order.id,
          total,
          wallet_payment_type: {
            ...payment,
            ...(installments ? {installments} : {}),
          },
          'master-device': storagedDevice?.id,
        });

        Alert.alert(
          'Pagamento enviado',
          `Pagamento enviado para ${selectedRemoteDevice.alias}. A conclusao da fatura sera feita no device remoto.`,
        );
      } catch (error) {
        invoiceActions.setError(
          normalizePaymentErrorMessage(
            error,
            'Nao foi possivel enviar o pagamento remoto.',
          ),
        );
      } finally {
        setSubmittingPayment(false);
      }
    },
    [
      createPaidInvoice,
      invoiceActions,
      order?.id,
      selectedRemoteDevice,
      storagedDevice?.id,
      websocketActions,
    ],
  );

  const handleEdit = orderItem => {
    ordersActions.syncOrder?.(orderItem);
    navigation.navigate('OrderDetails', buildOrderDetailsRouteParams(orderItem));
  };

  const handlePay = useCallback(async () => {
    if (!selectedPayment?.wallet || !selectedPayment?.paymentType) {
      invoiceActions.setError(
        global.t?.t('orders', 'message', 'selectPaymentMethod'),
      );
      return;
    }

    if (
      paymentChannel === PAYMENT_CHANNEL_REMOTE &&
      !selectedRemoteDevice?.deviceId
    ) {
      invoiceActions.setError(
        'Configure um device de pagamento remoto para continuar.',
      );
      return;
    }

    if (paymentChannel === PAYMENT_CHANNEL_DELIVERY) {
      setSubmittingPayment(true);
      try {
        await createPendingInvoice(selectedPayment, remainingAmount);
      } finally {
        setSubmittingPayment(false);
      }
      return;
    }

    if (
      paymentChannel === PAYMENT_CHANNEL_REMOTE &&
      selectedRemoteDevice?.gateway === PAYMENT_GATEWAY_INFINITE_PAY &&
      selectedPayment.paymentCode &&
      selectedPayment.installments === 'split'
    ) {
      setInstallmentsModalVisible(true);
      return;
    }

    if (
      paymentChannel === PAYMENT_CHANNEL_LOCAL &&
      localGateway === PAYMENT_GATEWAY_INFINITE_PAY &&
      selectedPayment.paymentCode &&
      selectedPayment.installments === 'split'
    ) {
      setInstallmentsModalVisible(true);
      return;
    }

    setPaymentValueModalVisible(true);
  }, [
    createPendingInvoice,
    invoiceActions,
    localGateway,
    paymentChannel,
    remainingAmount,
    selectedPayment,
    selectedRemoteDevice,
  ]);

  const handleConfirmPaymentValue = useCallback(
    async inputValue => {
      setPaymentValueModalVisible(false);

      if (paymentChannel === PAYMENT_CHANNEL_REMOTE) {
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
    [dispatchRemotePayment, paymentChannel, runLocalPayment, selectedPayment],
  );

  const handleInstallmentsSelect = useCallback(
    async installments => {
      setInstallmentsModalVisible(false);

      if (paymentChannel === PAYMENT_CHANNEL_REMOTE) {
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
      paymentChannel,
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
            const active = option.key === paymentChannel;

            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.modeChip, active && styles.modeChipActive]}
                activeOpacity={0.85}
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

      {paymentChannel === PAYMENT_CHANNEL_LOCAL && (
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

      {paymentChannel === PAYMENT_CHANNEL_REMOTE && (
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
              <Text style={styles.remoteCurrent}>
                Usando {selectedRemoteDevice.alias} (
                {getPaymentGatewayLabel(selectedRemoteDevice.gateway)})
              </Text>
              {remotePaymentDevices.length > 1 && (
                <TouchableOpacity
                  style={styles.remoteButton}
                  activeOpacity={0.85}
                  onPress={() => setRemoteDeviceModalVisible(true)}>
                  <Icon name="list" size={18} color="#fff" />
                  <Text style={styles.remoteButtonText}>
                    Selecionar equipamento
                  </Text>
                </TouchableOpacity>
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

      {paymentChannel === PAYMENT_CHANNEL_DELIVERY && (
        <View style={styles.remoteCard}>
          <View style={styles.remoteHeader}>
            <View style={styles.remoteIconWrap}>
              <Icon name="local-shipping" size={18} color="#16A34A" />
            </View>
            <View style={inlineStyle_491_14}>
              <Text style={styles.remoteTitle}>Cobrar na entrega</Text>
              <Text style={styles.remoteSubtitle}>
                Este modo registra o pedido com cobranca pendente para pagamento
                manual na entrega.
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const emptyTitle =
    paymentChannel === PAYMENT_CHANNEL_REMOTE
      ? 'Nenhum meio remoto disponivel'
      : paymentChannel === PAYMENT_CHANNEL_DELIVERY
        ? 'Nenhum meio manual disponivel'
        : 'Nenhum meio local disponivel';
  const emptyText =
    paymentChannel === PAYMENT_CHANNEL_REMOTE
      ? 'Configure um terminal remoto e vincule meios integrados para usar o pagamento remoto.'
      : paymentChannel === PAYMENT_CHANNEL_DELIVERY
        ? 'Cadastre ao menos um meio manual nas carteiras da empresa para liberar o pagamento na entrega.'
        : 'Verifique a configuracao das carteiras do gateway local deste device.';
  const payDisabled =
    submittingPayment ||
    paymentTypesLoading ||
    !selectedPayment?.wallet ||
    !selectedPayment?.paymentType ||
    !visiblePayments.length ||
    (paymentChannel === PAYMENT_CHANNEL_REMOTE && !selectedRemoteDevice);
  const actionLabel =
    paymentChannel === PAYMENT_CHANNEL_DELIVERY ? 'Cobrar na entrega' : 'Pagar';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => handleEdit(order)}
          style={inlineStyle_534_10}>
          <Icon name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order?.id}</Text>
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
                  onPress={() => setRemoteDeviceModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            animationType="slide"
            transparent={true}
            visible={paymentValueModalVisible}
            onRequestClose={() => setPaymentValueModalVisible(false)}>
            <Calculate
              handleCancel={() => setPaymentValueModalVisible(false)}
              handleConfirmValue={handleConfirmPaymentValue}
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
