import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useStore} from '@store';
import {api} from '@controleonline/ui-common/src/api';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {resolvePosPaidInvoiceStatusIri} from '@controleonline/ui-orders/src/react/pages/checkout/checkoutStatusHelpers';

const extractItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const extractId = value => {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const raw = typeof value === 'string' ? value : value?.id || value?.['@id'];
  const match = String(raw || '').match(/(\d+)/);
  return match ? match[1] : null;
};

const resolveProductPrice = product => {
  const candidates = [
    product?.price,
    product?.salePrice,
    product?.unitPrice,
    product?.productPrice,
    product?.amount,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
};

const resolveProductLabel = product =>
  String(
    product?.product ||
      product?.name ||
      product?.sku ||
      product?.description ||
      `Produto ${extractId(product) || ''}`.trim(),
  ).trim();

const resolveOrderPrice = order => {
  const n = Number(order?.price ?? order?.total ?? order?.amount);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Sum closed/paid invoices already linked to the order (when present on the row). */
const resolvePaidInvoicesTotal = order => {
  const lists = [
    order?.invoice,
    order?.invoices,
    order?.orderInvoices,
    order?.order_invoices,
  ];
  let total = 0;
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const inv = entry?.invoice && typeof entry.invoice === 'object' ? entry.invoice : entry;
      const rs = String(inv?.status?.realStatus || '').toLowerCase();
      const st = String(inv?.status?.status || '').toLowerCase();
      if (!(rs === 'closed' || st === 'paid' || st === 'pago')) continue;
      const amount = Number(entry?.realPrice ?? entry?.price ?? inv?.price ?? 0);
      if (Number.isFinite(amount) && amount > 0) total += amount;
    }
  }
  return total;
};

const resolveRemainingBalance = order => {
  const price = resolveOrderPrice(order);
  const paid = resolvePaidInvoicesTotal(order);
  // When invoice list is absent on the row, charge full order price.
  if (price > 0 && paid === 0 && !Array.isArray(order?.invoice) && !Array.isArray(order?.invoices) && !Array.isArray(order?.orderInvoices)) {
    return price;
  }
  return Math.max(0, Math.round((price - paid) * 100) / 100);
};


/**
 * Modal flow: product (single) → payment type → confirm → paid invoice.
 * Reuses products list, wallet_payment_types and invoice save (createPaidInvoice contract).
 */
export default function OrderHistoryMarkAsPaidModal({
  visible,
  order,
  onClose,
  onSuccess,
  themeColors = {},
  currentCompanyId = null,
}) {
  const productsStore = useStore('products');
  const orderProductsStore = useStore('order_products');
  const invoiceStore = useStore('invoice');
  const peopleStore = useStore('people');
  const peopleCompany = peopleStore?.getters?.currentCompany;
  const currentCompany = peopleCompany || null;
  const companyId =
    extractId(currentCompanyId) ||
    extractId(currentCompany?.id) ||
    extractId(currentCompany);

  const [step, setStep] = useState('product'); // product | payment | confirm
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [paymentOptions, setPaymentOptions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const orderId = extractId(order);
  const orderLabel = orderId ? `#${orderId}` : 'Pedido';

  const resetState = useCallback(() => {
    setStep('product');
    setLoading(false);
    setSubmitting(false);
    setError('');
    setSearch('');
    setProducts([]);
    setPaymentOptions([]);
    setSelectedProduct(null);
    setSelectedPayment(null);
  }, []);

  useEffect(() => {
    if (!visible) {
      resetState();
    }
  }, [visible, resetState]);

  const loadProducts = useCallback(async () => {
    if (!companyId) {
      setError('Empresa atual nao identificada.');
      setProducts([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      let list = [];

      // Primary: same catalog used by POS (company-scoped showcase)
      try {
        const catalog = await api.fetch('product-showcases/catalog', {
          params: {
            active: 1,
            integration_key: 'pos',
            company: companyId,
            type: ['custom', 'product', 'manufactured', 'service'],
          },
        });
        list = extractItems(catalog);
      } catch (_) {
        list = [];
      }

      // Fallback: products filtered by company
      if (!list.length) {
        const actions = productsStore?.actions;
        if (typeof actions?.getItems === 'function') {
          const response = await actions.getItems({
            company: `/people/${companyId}`,
            itemsPerPage: 200,
            page: 1,
          });
          list = extractItems(response);
        } else {
          const response = await api.fetch('products', {
            params: {
              company: `/people/${companyId}`,
              itemsPerPage: 200,
              page: 1,
            },
          });
          list = extractItems(response);
        }
      }

      setProducts(list);
      if (!list.length) {
        setError('Nenhum produto encontrado para a empresa atual.');
      }
    } catch (e) {
      setError(e?.message || 'Falha ao carregar produtos.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, productsStore?.actions]);

  const loadPayments = useCallback(async () => {
    if (!companyId) {
      setError('Empresa atual nao identificada.');
      setPaymentOptions([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.fetch('wallet_payment_types', {
        params: {
          'wallet.people': `/people/${companyId}`,
          itemsPerPage: 100,
        },
      });
      setPaymentOptions(extractItems(response));
    } catch (e) {
      setError(e?.message || 'Falha ao carregar formas de pagamento.');
      setPaymentOptions([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!visible) return;
    if (step === 'product') void loadProducts();
    if (step === 'payment') void loadPayments();
  }, [visible, step, loadProducts, loadPayments]);

  const filteredProducts = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return products;
    return products.filter(product =>
      resolveProductLabel(product).toLowerCase().includes(q),
    );
  }, [products, search]);

  const productPrice = selectedProduct ? resolveProductPrice(selectedProduct) : 0;

  const handleConfirm = useCallback(async () => {
    if (!orderId || !selectedProduct || !selectedPayment || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const orderIri = order?.['@id'] || `/orders/${orderId}`;
      const productIri =
        selectedProduct?.['@id'] || `/products/${extractId(selectedProduct)}`;
      const paymentTypeIri =
        selectedPayment?.paymentType?.['@id'] ||
        selectedPayment?.paymentType ||
        selectedPayment?.['@id'];
      const walletIri =
        selectedPayment?.wallet?.['@id'] ||
        selectedPayment?.wallet ||
        null;

      // Single item on the order (best-effort; invoice remains source of paid amount)
      const orderProductsActions = orderProductsStore?.actions;
      if (typeof orderProductsActions?.save === 'function') {
        try {
          await orderProductsActions.save({
            order: orderIri,
            product: productIri,
            quantity: 1,
          });
        } catch (_) {
          // Order may already contain items; payment still proceeds with product price
        }
      }

      const paidStatusIri = await resolvePosPaidInvoiceStatusIri(
        currentCompany?.configs?.['pos-paid-status'] || peopleStore?.getters?.defaultCompany?.configs?.['pos-paid-status'],
      );
      if (!paidStatusIri) {
        throw new Error('Nao foi possivel resolver o status pago da invoice.');
      }

      const invoiceActions = invoiceStore?.actions;
      if (typeof invoiceActions?.save !== 'function') {
        throw new Error('Fluxo de invoice indisponivel.');
      }

      // Prefer remaining balance (order total − paid invoices) so status can become paid.
      // Fetch order_invoices when the list row does not carry invoice embeds.
      let chargeAmount = resolveRemainingBalance(order);
      try {
        const invResp = await api.fetch('order_invoices', {
          params: {order: orderIri, itemsPerPage: 100},
        });
        let paid = 0;
        for (const entry of extractItems(invResp)) {
          const inv = entry?.invoice && typeof entry.invoice === 'object' ? entry.invoice : entry;
          const rs = String(inv?.status?.realStatus || '').toLowerCase();
          const st = String(inv?.status?.status || '').toLowerCase();
          if (!(rs === 'closed' || st === 'paid' || st === 'pago')) continue;
          const amount = Number(entry?.realPrice ?? entry?.price ?? inv?.price ?? 0);
          if (Number.isFinite(amount) && amount > 0) paid += amount;
        }
        const orderTotal = resolveOrderPrice(order);
        if (orderTotal > 0) {
          chargeAmount = Math.max(0, Math.round((orderTotal - paid) * 100) / 100);
        }
      } catch (_) {
        // keep resolveRemainingBalance / product fallback
      }
      if (!(chargeAmount > 0)) {
        chargeAmount = productPrice;
      }
      if (!(chargeAmount > 0)) {
        throw new Error('Valor a cobrar invalido (pedido ja pode estar quitado).');
      }

      const createdInvoice = await invoiceActions.save({
        dueDate: Formatter.getCurrentDate(),
        status: paidStatusIri,
        destinationWallet: walletIri,
        paymentType: paymentTypeIri,
        price: chargeAmount,
        receiver: `/people/${companyId}`,
        order: orderIri,
      });

      if (!createdInvoice) {
        throw new Error('Falha ao registrar a cobranca.');
      }

      // Update order status to paid (status id 7 / name paid) so list reflects PAGO.
      try {
        const statusResp = await api.fetch('statuses', {
          params: {context: 'order', itemsPerPage: 50},
        });
        const statuses = extractItems(statusResp);
        const paidStatus =
          statuses.find(
            s =>
              String(s?.status || '').toLowerCase() === 'paid' ||
              String(s?.status || '').toLowerCase() === 'pago',
          ) ||
          statuses.find(s => String(s?.realStatus || '').toLowerCase() === 'closed');
        const paidOrderStatusIri = paidStatus?.['@id'] || (paidStatus?.id ? `/statuses/${paidStatus.id}` : '/statuses/7');
        await api.fetch(`orders/${orderId}`, {
          method: 'PUT',
          body: {status: paidOrderStatusIri},
        });
      } catch (_) {
        // Invoice already created; status update is best-effort.
      }

      onSuccess?.(createdInvoice, order);
      onClose?.();
    } catch (e) {
      setError(
        e?.message ||
          e?.response?.data?.detail ||
          e?.description ||
          'Nao foi possivel marcar o pedido como pago.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    companyId,
    currentCompany,
    invoiceStore?.actions,
    onClose,
    onSuccess,
    order,
    orderId,
    orderProductsStore?.actions,
    peopleStore?.getters?.defaultCompany,
    productPrice,
    selectedPayment,
    selectedProduct,
    submitting,
  ]);

  const primary = themeColors.buttonBackground || themeColors.primary || '#0F172A';
  const primaryText = themeColors.buttonText || '#fff';
  const danger = themeColors.textDanger || '#B91C1C';

  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15,23,42,0.45)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}>
        <View
          style={{
            width: '100%',
            maxWidth: 520,
            maxHeight: '90%',
            backgroundColor: '#fff',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Text style={{fontSize: 16, fontWeight: '700', color: '#0F172A'}}>
              Marcar como pago · {orderLabel}
            </Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Fechar">
              <Text style={{fontSize: 18, color: '#64748B'}}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={{paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6}}>
            <Text style={{color: '#64748B', fontSize: 12}}>
              {step === 'product'
                ? '1/3 · Selecione um produto (item único)'
                : step === 'payment'
                  ? '2/3 · Selecione a forma de pagamento'
                  : '3/3 · Confirme a operação'}
            </Text>
          </View>

          {!!error && (
            <Text style={{color: danger, paddingHorizontal: 16, paddingBottom: 8, fontSize: 13}}>
              {error}
            </Text>
          )}

          <ScrollView style={{paddingHorizontal: 16, maxHeight: 420}}>
            {loading ? (
              <View style={{paddingVertical: 40, alignItems: 'center'}}>
                <ActivityIndicator color={primary} />
              </View>
            ) : null}

            {!loading && step === 'product' ? (
              <View>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar produto"
                  placeholderTextColor="#94A3B8"
                  style={{
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginBottom: 10,
                    color: '#0F172A',
                  }}
                />
                {filteredProducts.length === 0 ? (
                  <Text style={{color: '#64748B', paddingVertical: 16}}>
                    Nenhum produto encontrado para a empresa.
                  </Text>
                ) : (
                  filteredProducts.map(product => {
                    const id = extractId(product);
                    const selected = String(extractId(selectedProduct)) === String(id);
                    return (
                      <TouchableOpacity
                        key={id || resolveProductLabel(product)}
                        onPress={() => setSelectedProduct(product)}
                        style={{
                          borderWidth: 1,
                          borderColor: selected ? primary : '#E2E8F0',
                          backgroundColor: selected ? '#F8FAFC' : '#fff',
                          borderRadius: 8,
                          padding: 12,
                          marginBottom: 8,
                        }}>
                        <Text style={{fontWeight: '600', color: '#0F172A'}}>
                          {resolveProductLabel(product)}
                        </Text>
                        <Text style={{color: '#64748B', marginTop: 4, fontSize: 12}}>
                          {Formatter.formatMoney?.(resolveProductPrice(product)) ||
                            resolveProductPrice(product)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            ) : null}

            {!loading && step === 'payment' ? (
              <View>
                {paymentOptions.length === 0 ? (
                  <Text style={{color: '#64748B', paddingVertical: 16}}>
                    Nenhuma forma de pagamento disponível.
                  </Text>
                ) : (
                  paymentOptions.map((option, index) => {
                    const id =
                      extractId(option) ||
                      extractId(option?.paymentType) ||
                      String(index);
                    const label =
                      option?.paymentType?.paymentType ||
                      option?.paymentType?.name ||
                      option?.name ||
                      option?.paymentType ||
                      `Pagamento ${id}`;
                    const selected =
                      String(extractId(selectedPayment) || extractId(selectedPayment?.paymentType)) ===
                      String(id);
                    return (
                      <TouchableOpacity
                        key={id}
                        onPress={() => setSelectedPayment(option)}
                        style={{
                          borderWidth: 1,
                          borderColor: selected ? primary : '#E2E8F0',
                          backgroundColor: selected ? '#F8FAFC' : '#fff',
                          borderRadius: 8,
                          padding: 12,
                          marginBottom: 8,
                        }}>
                        <Text style={{fontWeight: '600', color: '#0F172A'}}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            ) : null}

            {!loading && step === 'confirm' ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 8,
                  padding: 14,
                  gap: 8,
                }}>
                <Text style={{color: '#0F172A'}}>
                  <Text style={{fontWeight: '700'}}>Pedido: </Text>
                  {orderLabel}
                </Text>
                <Text style={{color: '#0F172A'}}>
                  <Text style={{fontWeight: '700'}}>Produto: </Text>
                  {resolveProductLabel(selectedProduct)}
                </Text>
                <Text style={{color: '#0F172A'}}>
                  <Text style={{fontWeight: '700'}}>Valor: </Text>
                  {Formatter.formatMoney?.(
                    (() => {
                      const rem = resolveRemainingBalance(order);
                      return rem > 0 ? rem : productPrice;
                    })(),
                  ) || productPrice}
                </Text>
                <Text style={{color: '#0F172A'}}>
                  <Text style={{fontWeight: '700'}}>Pagamento: </Text>
                  {selectedPayment?.paymentType?.paymentType ||
                    selectedPayment?.paymentType?.name ||
                    selectedPayment?.name ||
                    '—'}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 8,
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: '#E2E8F0',
            }}>
            {step !== 'product' ? (
              <TouchableOpacity
                onPress={() => {
                  setError('');
                  setStep(step === 'confirm' ? 'payment' : 'product');
                }}
                disabled={submitting}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}>
                <Text style={{color: '#0F172A', fontWeight: '600'}}>Voltar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onClose}
                disabled={submitting}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}>
                <Text style={{color: '#0F172A', fontWeight: '600'}}>Cancelar</Text>
              </TouchableOpacity>
            )}

            {step === 'product' ? (
              <TouchableOpacity
                onPress={() => {
                  if (!selectedProduct) {
                    setError('Selecione um produto.');
                    return;
                  }
                  setError('');
                  setStep('payment');
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: primary,
                }}>
                <Text style={{color: primaryText, fontWeight: '700'}}>Continuar</Text>
              </TouchableOpacity>
            ) : null}

            {step === 'payment' ? (
              <TouchableOpacity
                onPress={() => {
                  if (!selectedPayment) {
                    setError('Selecione a forma de pagamento.');
                    return;
                  }
                  setError('');
                  setStep('confirm');
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: primary,
                }}>
                <Text style={{color: primaryText, fontWeight: '700'}}>Continuar</Text>
              </TouchableOpacity>
            ) : null}

            {step === 'confirm' ? (
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={submitting}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: primary,
                  opacity: submitting ? 0.7 : 1,
                }}>
                {submitting ? (
                  <ActivityIndicator color={primaryText} />
                ) : (
                  <Text style={{color: primaryText, fontWeight: '700'}}>Confirmar pagamento</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
