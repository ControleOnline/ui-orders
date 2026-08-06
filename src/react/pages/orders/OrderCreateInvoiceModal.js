/**
 * Modal "Criar fatura" from Order History.
 * Prefills dueDate=today, status=paid; value from order (non-editable).
 * Allows selecting wallet/payment and navigating to add products.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { api } from '@controleonline/ui-common/src/api';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import { useStore } from '@store';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import { getPaymentOptionLabel } from '@controleonline/ui-common/src/react/utils/paymentOptions';
import {
  filterWalletPaymentTypesByAllowedIds,
  resolveDevicePaymentTypeIds,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import { createModalStyles } from './OrderHistoryPage.styles';

import {
  extractCollectionItems,
  getEntityId,
  resolveOrderIri,
  resolveOrderPrice,
  resolvePaidInvoiceStatusIri,
  normalizeText,
  buildStatusIriFromId,
  normalizeStatusKey,
} from './orderCreateInvoiceHelpers';

const OrderCreateInvoiceModal = ({
  order,
  visible,
  onClose,
  onSuccess,
  onAddProducts,
}) => {
  const { showError, showSuccess } = useMessage();
  const themeStore = useStore('theme');
  const themeColors = themeStore.getters?.colors || {};
  const styles = useMemo(() => createModalStyles(themeColors), [themeColors]);

  const peopleStore = useStore('people');
  const { currentCompany, defaultCompany } = peopleStore.getters || {};

  const invoiceStore = useStore('invoice');
  const invoiceActions = invoiceStore.actions;

  const deviceConfigStore = useStore('device_config');
  const device = deviceConfigStore.getters?.item;

  const walletPaymentTypeStore = useStore('wallet_payment_type');
  const walletPaymentTypeActions = walletPaymentTypeStore?.actions;

  const orderProductsStore = useStore('order_products');
  const orderProductsActions = orderProductsStore?.actions;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [paymentOptions, setPaymentOptions] = useState([]);
  const [selectedPaymentKey, setSelectedPaymentKey] = useState('');
  const [statusOptions, setStatusOptions] = useState([]);
  const [selectedStatusIri, setSelectedStatusIri] = useState('');

  const orderPrice = resolveOrderPrice(order);
  const hasProductsAndValue = products.length > 0 && orderPrice > 0.009;
  const dueDateLabel = Formatter.getCurrentDate
    ? Formatter.getCurrentDate()
    : new Date().toISOString().slice(0, 10);

  const selectedPayment = useMemo(
    () => paymentOptions.find(opt => opt.key === selectedPaymentKey) || paymentOptions[0] || null,
    [paymentOptions, selectedPaymentKey],
  );

  const loadProducts = useCallback(async () => {
    const orderId = getEntityId(order);
    if (!orderId || typeof orderProductsActions?.getItems !== 'function') {
      setProducts([]);
      return;
    }
    try {
      const response = await orderProductsActions.getItems({
        order: `/orders/${orderId}`,
        itemsPerPage: 100,
      });
      setProducts(extractCollectionItems(response));
    } catch {
      setProducts([]);
    }
  }, [order, orderProductsActions]);

  const loadPaymentOptions = useCallback(async () => {
    if (!currentCompany?.id || typeof walletPaymentTypeActions?.getItems !== 'function') {
      setPaymentOptions([]);
      return;
    }
    try {
      const response = await walletPaymentTypeActions.getItems({
        'wallet.people': `/people/${currentCompany.id}`,
        itemsPerPage: 50,
      });
      let items = extractCollectionItems(response);
      const allowedIds = resolveDevicePaymentTypeIds(device?.configs);
      if (allowedIds?.length) {
        items = filterWalletPaymentTypesByAllowedIds(items, allowedIds);
      }
      const options = items
        .filter(item => item?.wallet && item?.paymentType)
        .map(item => ({
          key: String(item?.id || item?.['@id'] || ''),
          label: getPaymentOptionLabel(item) || item?.paymentType?.paymentType || 'Pagamento',
          payment: item,
        }));
      setPaymentOptions(options);
      setSelectedPaymentKey(prev => {
        if (prev && options.some(o => o.key === prev)) return prev;
        return options[0]?.key || '';
      });
    } catch {
      setPaymentOptions([]);
    }
  }, [currentCompany?.id, device?.configs, walletPaymentTypeActions]);

  const loadStatusOptions = useCallback(async () => {
    try {
      const paidIri = await resolvePaidInvoiceStatusIri(
        api,
        defaultCompany?.configs?.['pos-paid-status'],
      );
      const response = await api.fetch('statuses', {
        params: { context: 'invoice', itemsPerPage: 30 },
      });
      const items = extractCollectionItems(response);
      const options = items
        .map(item => ({
          iri: item?.['@id'] || buildStatusIriFromId(item?.id),
          label: normalizeText(item?.status || item?.realStatus || item?.id),
          realStatus: item?.realStatus,
          status: item?.status,
        }))
        .filter(item => item.iri);
      setStatusOptions(options);
      const preferred =
        options.find(o => o.iri === paidIri) ||
        options.find(
          o =>
            normalizeStatusKey(o.realStatus) === 'closed' &&
            normalizeStatusKey(o.status) === 'paid',
        ) ||
        options[0];
      setSelectedStatusIri(preferred?.iri || paidIri || '');
    } catch {
      const paidIri = await resolvePaidInvoiceStatusIri(
        api,
        defaultCompany?.configs?.['pos-paid-status'],
      );
      setSelectedStatusIri(paidIri || '');
      setStatusOptions(paidIri ? [{ iri: paidIri, label: 'paid' }] : []);
    }
  }, [defaultCompany?.configs]);

  useEffect(() => {
    if (!visible || !order) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadProducts(), loadPaymentOptions(), loadStatusOptions()]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, order, loadProducts, loadPaymentOptions, loadStatusOptions]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    if (!hasProductsAndValue) {
      showError(
        global.t?.t('orders', 'message', 'invoiceRequiresProducts') ||
          'A fatura so pode ser criada quando o pedido tiver produto e valor.',
      );
      return;
    }
    if (!selectedPayment?.payment?.wallet || !selectedPayment?.payment?.paymentType) {
      showError(
        global.t?.t('orders', 'message', 'selectPaymentMethod') ||
          'Selecione wallet e forma de pagamento.',
      );
      return;
    }
    if (!selectedStatusIri) {
      showError('Nao foi possivel resolver o status da fatura.');
      return;
    }
    if (!currentCompany?.id) {
      showError('Empresa atual nao identificada.');
      return;
    }

    const orderIri = resolveOrderIri(order);
    if (!orderIri) {
      showError('Pedido invalido.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        dueDate: dueDateLabel,
        status: selectedStatusIri,
        destinationWallet:
          selectedPayment.payment.wallet?.['@id'] ||
          selectedPayment.payment.wallet,
        paymentType:
          selectedPayment.payment.paymentType?.['@id'] ||
          selectedPayment.payment.paymentType,
        price: orderPrice,
        receiver: `/people/${currentCompany.id}`,
        order: orderIri,
      };

      const created = await invoiceActions.save(payload);
      if (!created) {
        showError('Nao foi possivel criar a fatura.');
        return;
      }

      showSuccess(
        global.t?.t('orders', 'message', 'invoiceCreated') ||
          'Fatura criada com sucesso.',
      );
      onSuccess?.(created, order);
      onClose?.();
    } catch (error) {
      showError(
        error?.message ||
          global.t?.t('orders', 'message', 'invoiceCreateFailed') ||
          'Falha ao criar a fatura.',
      );
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    hasProductsAndValue,
    selectedPayment,
    selectedStatusIri,
    currentCompany?.id,
    order,
    dueDateLabel,
    orderPrice,
    invoiceActions,
    showError,
    showSuccess,
    onSuccess,
    onClose,
  ]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!saving) onClose?.();
      }}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          if (!saving) onClose?.();
        }}
      >
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalSheet,
                Platform.OS === 'web' ? { maxWidth: 520, width: '100%' } : null,
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {global.t?.t('orders', 'button', 'createInvoice') || 'Criar fatura'}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => {
                    if (!saving) onClose?.();
                  }}
                  disabled={saving}
                >
                  <Icon name="x" size={20} color={themeColors.text || '#111'} />
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <ActivityIndicator color={themeColors.buttonBackground} />
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 420 }}>
                  <Text style={styles.cancelInfoLabel}>
                    Pedido #{getEntityId(order) || '-'}
                  </Text>
                  <Text style={[styles.cancelInfoLabel, { marginTop: 8 }]}>
                    Vencimento: {dueDateLabel}
                  </Text>
                  <Text style={[styles.cancelInfoLabel, { marginTop: 8 }]}>
                    Valor:{' '}
                    {Formatter.formatMoney
                      ? Formatter.formatMoney(orderPrice)
                      : `R$ ${orderPrice.toFixed(2)}`}{' '}
                    (nao editavel)
                  </Text>

                  <Text style={[styles.cancelInfoLabel, { marginTop: 16 }]}>Status</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {statusOptions.map(option => {
                      const selected = option.iri === selectedStatusIri;
                      return (
                        <TouchableOpacity
                          key={option.iri}
                          style={[
                            styles.manageReasonsButton,
                            selected
                              ? {
                                  backgroundColor: themeColors.buttonBackground,
                                  borderColor: themeColors.buttonBackground,
                                }
                              : null,
                          ]}
                          onPress={() => setSelectedStatusIri(option.iri)}
                          disabled={saving}
                        >
                          <Text
                            style={[
                              styles.manageReasonsButtonText,
                              selected ? { color: themeColors.buttonText || '#fff' } : null,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.cancelInfoLabel, { marginTop: 16 }]}>
                    Wallet / forma de pagamento
                  </Text>
                  {paymentOptions.length === 0 ? (
                    <Text style={styles.cancelInfoValue}>
                      Nenhuma opcao de pagamento disponivel para este device.
                    </Text>
                  ) : (
                    paymentOptions.map(option => {
                      const selected = option.key === (selectedPayment?.key || '');
                      return (
                        <TouchableOpacity
                          key={option.key}
                          style={[
                            styles.cancelInfo,
                            selected
                              ? {
                                  borderColor: themeColors.buttonBackground,
                                  backgroundColor: `${themeColors.buttonBackground}22`,
                                }
                              : null,
                          ]}
                          onPress={() => setSelectedPaymentKey(option.key)}
                          disabled={saving}
                        >
                          <Text style={styles.cancelInfoValue}>{option.label}</Text>
                        </TouchableOpacity>
                      );
                    })
                  )}

                  <View
                    style={{
                      marginTop: 16,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={styles.cancelInfoLabel}>
                      Produtos ({products.length})
                    </Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => onAddProducts?.(order)}
                      disabled={saving}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {global.t?.t('orders', 'button', 'addProducts') ||
                          'Adicionar / trocar produtos'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {products.length === 0 ? (
                    <Text style={styles.cancelInfoValue}>
                      Pedido sem produtos. Adicione produtos antes de criar a fatura.
                    </Text>
                  ) : (
                    products.slice(0, 12).map((product, index) => {
                      const name =
                        product?.product?.product ||
                        product?.product?.name ||
                        product?.description ||
                        `Item ${index + 1}`;
                      const qty = product?.quantity ?? product?.amount ?? 1;
                      return (
                        <Text key={product?.id || product?.['@id'] || index} style={styles.cancelInfoValue}>
                          {qty}x {name}
                        </Text>
                      );
                    })
                  )}
                </ScrollView>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    if (!saving) onClose?.();
                  }}
                  disabled={saving}
                >
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.addReasonButton,
                    (!hasProductsAndValue || saving) && { opacity: 0.5 },
                  ]}
                  onPress={handleSave}
                  disabled={!hasProductsAndValue || saving}
                >
                  {saving ? (
                    <ActivityIndicator color={themeColors.buttonText || '#fff'} />
                  ) : (
                    <Text style={styles.addReasonButtonText}>
                      {global.t?.t('orders', 'button', 'createInvoice') || 'Criar fatura'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default OrderCreateInvoiceModal;
