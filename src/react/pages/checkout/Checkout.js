import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
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
import CieloCheckout from '@controleonline/ui-orders/src/react/services/Cielo/Checkout';
import InfinitePay from '@controleonline/ui-orders/src/react/services/InfinitePay/Checkout';
import {
  buildWalletIdsForGateway,
  filterDeviceConfigsByCompany,
  getPaymentGatewayLabel,
  resolveRemotePaymentDeviceOptions,
  supportsLocalCardPayment,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {useStore} from '@store';

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
      matchedStatus?.['@id'] || buildStatusIriFromId(matchedStatus?.id) || fallbackIri;

    if (resolvedIri) {
      posPaidInvoiceStatusIriCache = resolvedIri;
    }

    return resolvedIri;
  } catch (error) {
    return fallbackIri;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    color: '#000',
    elevation: 4,
    padding: 20,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    color: '#000',
  },
  remoteCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  remoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  remoteIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remoteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  remoteSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  remoteCurrent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  remoteButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0EA5E9',
  },
  remoteButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  modalItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  modalItemActive: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalItemSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: '#0EA5E9',
    fontWeight: '700',
  },
  installmentsItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  installmentsText: {
    color: '#0F172A',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
});

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
  const {isLoading: orderProductsIsloading, isSaving: orderProductsIsSaving} =
    orderProductsGetters;
  const {
    items: availablePayments = [],
    isLoading: paymentTypesLoading,
    error: paymentTypesError,
  } = walletPaymentTypeGetters;

  const [companyDeviceConfigs, setCompanyDeviceConfigs] = useState([]);
  const [loadingRemoteDevices, setLoadingRemoteDevices] = useState(false);
  const [remoteDeviceModalVisible, setRemoteDeviceModalVisible] = useState(false);
  const [remoteValueModalVisible, setRemoteValueModalVisible] = useState(false);
  const [remoteInstallmentsModalVisible, setRemoteInstallmentsModalVisible] =
    useState(false);
  const [remoteSubmitting, setRemoteSubmitting] = useState(false);
  const [selectedRemotePayment, setSelectedRemotePayment] = useState({});
  const [selectedRemoteDeviceId, setSelectedRemoteDeviceId] = useState('');

  const effectiveCompanyConfigs = useMemo(() => {
    if (companyConfigs && typeof companyConfigs === 'object') {
      return companyConfigs;
    }

    if (currentCompany?.configs && typeof currentCompany.configs === 'object') {
      return currentCompany.configs;
    }

    return {};
  }, [companyConfigs, currentCompany?.configs]);

  const isLocalPaymentDevice = useMemo(
    () =>
      supportsLocalCardPayment({
        deviceConfig: device,
        platform: Platform.OS,
      }),
    [device],
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

  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id || isLocalPaymentDevice) {
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
    }, [currentCompany?.id, deviceConfigActions, isLocalPaymentDevice]),
  );

  useEffect(() => {
    if (isLocalPaymentDevice) {
      return;
    }

    if (!remotePaymentDevices.length) {
      setSelectedRemoteDeviceId('');
      return;
    }

    setSelectedRemoteDeviceId(current =>
      remotePaymentDevices.some(deviceOption => deviceOption.deviceId === current)
        ? current
        : remotePaymentDevices[0].deviceId,
    );
  }, [isLocalPaymentDevice, remotePaymentDevices]);

  useEffect(() => {
    if (isLocalPaymentDevice) {
      return;
    }

    setSelectedRemotePayment({});
    setRemoteValueModalVisible(false);
    setRemoteInstallmentsModalVisible(false);
  }, [isLocalPaymentDevice, selectedRemoteDeviceId]);

  useEffect(() => {
    if (isLocalPaymentDevice) {
      return;
    }

    if (!currentCompany?.id || !selectedRemoteDevice?.gateway) {
      walletPaymentTypeActions.setItems([]);
      return;
    }

    const wallets = buildWalletIdsForGateway({
      gateway: selectedRemoteDevice.gateway,
      companyConfigs: effectiveCompanyConfigs,
      includeCashWallet: true,
    });

    if (!wallets.length) {
      walletPaymentTypeActions.setItems([]);
      return;
    }

    walletPaymentTypeActions.getItems({
      people: '/people/' + currentCompany.id,
      wallet: wallets,
    });
  }, [
    currentCompany?.id,
    effectiveCompanyConfigs,
    isLocalPaymentDevice,
    selectedRemoteDevice?.gateway,
    walletPaymentTypeActions,
  ]);

  const createInvoice = useCallback(
    async (selectedPayment, total) => {
      const paidStatusIri = await resolvePosPaidInvoiceStatusIri(
        defaultCompany?.configs['pos-paid-status'],
      );

      if (!paidStatusIri) {
        invoiceActions.setError(
          'Nao foi possivel resolver o status pago da invoice do PDV.',
        );
        return;
      }

      const payload = {
        dueDate: Formatter.getCurrentDate(),
        status: paidStatusIri,
        destinationWallet: selectedPayment.wallet['@id'],
        paymentType: selectedPayment.paymentType['@id'],
        price: total,
        receiver: '/people/' + currentCompany.id,
        order: order['@id'],
      };

      invoiceActions.save(payload).then(data => {
        if (device?.configs?.['pos-type'] == 'simple') {
          let p = payable + data.price;
          if (p < 0) {
            let i = [...(invoices || [])];
            i.push(data);
            invoiceActions.setItems(i);
            ordersActions.setPayable(p);
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
          let i = [...(invoices || [])];
          i.push(data);
          invoiceActions.setItems(i);
          ordersActions.syncOrder?.(order);
          navigation.navigate('OrderDetails', buildOrderDetailsRouteParams(order));
        }
      });
    },
    [
      currentCompany?.id,
      defaultCompany?.configs,
      device?.configs,
      invoiceActions,
      invoices,
      navigation,
      order,
      ordersActions,
      payable,
      printActions,
    ],
  );

  const cancelOperation = () => {};

  const handleEdit = orderItem => {
    ordersActions.syncOrder?.(orderItem);
    navigation.navigate('OrderDetails', buildOrderDetailsRouteParams(orderItem));
  };

  const handleRemotePay = useCallback(() => {
    if (
      !selectedRemotePayment ||
      !selectedRemotePayment.wallet ||
      !selectedRemotePayment.paymentType
    ) {
      invoiceActions.setError(
        global.t?.t('orders', 'message', 'selectPaymentMethod'),
      );
      return;
    }

    if (!selectedRemoteDevice?.deviceId) {
      invoiceActions.setError(
        'Configure um device de pagamento remoto para continuar.',
      );
      return;
    }

    if (
      selectedRemotePayment.paymentCode &&
      selectedRemotePayment.installments === 'split' &&
      selectedRemoteDevice.gateway === 'infinite-pay'
    ) {
      setRemoteInstallmentsModalVisible(true);
      return;
    }

    setRemoteValueModalVisible(true);
  }, [invoiceActions, selectedRemoteDevice, selectedRemotePayment]);

  useEffect(() => {
    if (
      isLocalPaymentDevice ||
      !selectedRemotePayment ||
      Object.keys(selectedRemotePayment).length === 0
    ) {
      return;
    }

    handleRemotePay();
  }, [handleRemotePay, isLocalPaymentDevice, selectedRemotePayment]);

  const dispatchRemotePayment = useCallback(
    async (selectedPayment, total) => {
      if (!selectedPayment?.paymentCode) {
        createInvoice(selectedPayment, total);
        return;
      }

      if (!selectedRemoteDevice?.deviceId || !order?.id) {
        return;
      }

      setRemoteSubmitting(true);
      try {
        await websocketActions.send({
          destination: selectedRemoteDevice.deviceId,
          store: 'invoice',
          action: 'pay',
          order: order.id,
          total,
          wallet_payment_type: selectedPayment,
          'master-device': storagedDevice?.id,
        });

        Alert.alert(
          'Pagamento enviado',
          `Pagamento enviado para ${selectedRemoteDevice.alias}. A conclusao da fatura sera feita no device remoto.`,
        );
      } catch (error) {
        invoiceActions.setError(
          error?.message || 'Nao foi possivel enviar o pagamento remoto.',
        );
      } finally {
        setRemoteSubmitting(false);
        setRemoteValueModalVisible(false);
        setRemoteInstallmentsModalVisible(false);
      }
    },
    [
      createInvoice,
      invoiceActions,
      order,
      selectedRemoteDevice,
      storagedDevice?.id,
      websocketActions,
    ],
  );

  const handleConfirmRemoteValue = useCallback(
    async inputValue => {
      await dispatchRemotePayment(selectedRemotePayment, inputValue);
    },
    [dispatchRemotePayment, selectedRemotePayment],
  );

  const handleInstallmentsSelect = useCallback(
    async installments => {
      await dispatchRemotePayment(
        {
          ...selectedRemotePayment,
          installments,
        },
        remainingAmount,
      );
    },
    [dispatchRemotePayment, remainingAmount, selectedRemotePayment],
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

  const remoteTopContent = !isLocalPaymentDevice ? (
    <View style={styles.remoteCard}>
      <View style={styles.remoteHeader}>
        <View style={styles.remoteIconWrap}>
          <Icon name="credit-card" size={18} color="#7C3AED" />
        </View>
        <View style={{flex: 1}}>
          <Text style={styles.remoteTitle}>Pagamento remoto</Text>
          <Text style={styles.remoteSubtitle}>
            Este device nao processa cartao localmente, entao o pedido sera
            enviado por websocket para um terminal compatível.
          </Text>
        </View>
      </View>

      {loadingRemoteDevices ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#7C3AED" />
          <Text style={styles.loadingText}>Carregando devices de pagamento...</Text>
        </View>
      ) : selectedRemoteDevice ? (
        <>
          <Text style={styles.remoteCurrent}>
            Usando {selectedRemoteDevice.alias} ({getPaymentGatewayLabel(selectedRemoteDevice.gateway)})
          </Text>
          {remotePaymentDevices.length > 1 && (
            <TouchableOpacity
              style={styles.remoteButton}
              activeOpacity={0.85}
              onPress={() => setRemoteDeviceModalVisible(true)}>
              <Icon name="list" size={18} color="#fff" />
              <Text style={styles.remoteButtonText}>Selecionar equipamento</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <Text style={styles.remoteSubtitle}>
          Configure pelo menos um device de pagamento remoto na empresa ou neste
          device para continuar.
        </Text>
      )}
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => handleEdit(order)}
          style={{marginRight: 16}}>
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
          {isLocalPaymentDevice && device?.configs?.['pos-gateway'] == 'cielo' && (
            <CieloCheckout
              cancelOperation={cancelOperation}
              createInvoice={createInvoice}
              remoteCheckoutMode={false}
            />
          )}

          {isLocalPaymentDevice &&
            device?.configs?.['pos-gateway'] == 'infinite-pay' && (
              <InfinitePay
                cancelOperation={cancelOperation}
                createInvoice={createInvoice}
                remoteCheckoutMode={false}
              />
            )}

          {!isLocalPaymentDevice && (
            <>
              <PaymentCheckoutPanel
                payments={availablePayments}
                selectedPayment={selectedRemotePayment}
                onSelectPayment={setSelectedRemotePayment}
                onPay={handleRemotePay}
                payDisabled={
                  remoteSubmitting ||
                  !selectedRemoteDevice ||
                  !selectedRemotePayment ||
                  Object.keys(selectedRemotePayment).length === 0
                }
                invoiceIsSaving={remoteSubmitting || paymentTypesLoading}
                invoiceError={invoiceError}
                error={paymentTypesError}
                topContent={remoteTopContent}
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
                visible={remoteValueModalVisible}
                onRequestClose={() => setRemoteValueModalVisible(false)}>
                <Calculate
                  handleCancel={() => setRemoteValueModalVisible(false)}
                  handleConfirmValue={handleConfirmRemoteValue}
                />
              </Modal>

              <Modal
                animationType="slide"
                transparent={true}
                visible={remoteInstallmentsModalVisible}
                onRequestClose={() => setRemoteInstallmentsModalVisible(false)}>
                <View style={styles.modalContainer}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>
                      {global.t?.t('orders', 'title', 'chooseInstallments')}
                    </Text>
                    <FlatList
                      data={Array.from({length: 9}, (_, i) => i + 2)}
                      keyExtractor={item => String(item)}
                      renderItem={({item}) => (
                        <TouchableOpacity
                          style={styles.installmentsItem}
                          onPress={() => handleInstallmentsSelect(item)}>
                          <Text style={styles.installmentsText}>
                            {item}x -{' '}
                            {Formatter.formatMoney((remainingAmount || 0) / item)}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => setRemoteInstallmentsModalVisible(false)}>
                      <Text style={styles.closeButtonText}>
                        {global.t?.t('orders', 'button', 'cancel')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </>
          )}
        </>
      ) : null}
    </View>
  );
};

export default Checkout;
