import OrderHistoryMarkAsPaidModalView from './OrderHistoryMarkAsPaidModalView';
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
import {buildMarkAsPaidRequest} from '../../utils/markAsPaidRequest';

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
  if (
    price > 0 &&
    paid === 0 &&
    !Array.isArray(order?.invoice) &&
    !Array.isArray(order?.invoices) &&
    !Array.isArray(order?.orderInvoices)
  ) {
    return price;
  }
  return Math.max(0, Math.round((price - paid) * 100) / 100);
};

/**
 * Modal: product → payment → confirm.
 * Settlement goes through the dedicated server-authorized endpoint so the backend
 * owns order status, tenant checks and invoice associations.
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
  const peopleStore = useStore('people');
  const peopleCompany = peopleStore?.getters?.currentCompany;
  const currentCompany = peopleCompany || null;
  const companyId =
    extractId(currentCompanyId) ||
    extractId(currentCompany?.id) ||
    extractId(currentCompany);

  const [step, setStep] = useState('product');
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
  const displayBalance = resolveRemainingBalance(order) || productPrice;

  const handleConfirm = useCallback(async () => {
    if (!orderId || !selectedProduct || !selectedPayment || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const request = buildMarkAsPaidRequest({
        order,
        selectedProduct,
        selectedPayment,
        amount: displayBalance > 0 ? displayBalance : productPrice,
      });
      if (!request) throw new Error('Pedido nao informado.');

      const result = await api.fetch(request.endpoint, request.options);

      if (result?.outcome && result.outcome !== 'success') {
        throw new Error(result?.message || 'Nao foi possivel marcar o pedido como pago.');
      }

      onSuccess?.(result, order);
      onClose?.();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.detail ||
          e?.message ||
          e?.description ||
          'Nao foi possivel marcar o pedido como pago.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    displayBalance,
    onClose,
    onSuccess,
    order,
    orderId,
    productPrice,
    selectedPayment,
    selectedProduct,
    submitting,
  ]);

  const primary = themeColors.buttonBackground || themeColors.primary || '#0F172A';
  const primaryText = themeColors.buttonText || '#fff';
  const danger = themeColors.textDanger || '#B91C1C';

  return (
    <OrderHistoryMarkAsPaidModalView {...{visible, onClose, orderLabel, step, error, danger, loading, primary, search, setSearch, filteredProducts, extractId, selectedProduct, resolveProductLabel, setSelectedProduct, resolveProductPrice, paymentOptions, selectedPayment, setSelectedPayment, displayBalance, setError, setStep, submitting, primaryText, handleConfirm}} />
  );
}
