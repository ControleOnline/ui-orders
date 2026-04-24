import {useCallback, useMemo, useState} from 'react';
import {Linking} from 'react-native';
import {api} from '@controleonline/ui-common/src/api';
import {
  formatPhoneDisplay,
  normalizeText,
  resolveAddressDisplayParts,
} from '@controleonline/ui-common/src/react/utils/entityDisplay';
import {buildFood99OrderSummary} from '@controleonline/ui-orders/src/react/services/food99OrderSummary';
import {
  getOrderChannelKey,
  getPlatformCapabilities,
} from '@assets/ppc/channels';

const formatApiError = error => {
  if (!error) {
    return global.t?.t('orders', 'message', 'unableCompleteOperation');
  }

  if (typeof error === 'string') {
    return error;
  }

  if (Array.isArray(error?.message)) {
    return error.message
      .map(item => item?.message || item?.title || String(item))
      .filter(Boolean)
      .join('\n');
  }

  return (
    error?.message ||
    error?.description ||
    error?.errmsg ||
    global.t?.t('orders', 'message', 'unableCompleteOperation')
  );
};

const normalizeKey = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const normalizeErrno = value => String(value ?? '').trim();
const TERMINAL_ORDER_STATUSES = ['closed', 'canceled', 'cancelled'];
const isTerminalOrderStatus = value =>
  TERMINAL_ORDER_STATUSES.includes(String(value ?? '').trim().toLowerCase());

const toCamelCase = value =>
  String(value ?? '').replace(/_([a-z])/g, (_, char) => char.toUpperCase());

const resolvePreferredText = (...values) => {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) {
      return normalized;
    }
  }

  return '';
};

const weakPaymentLabels = new Set([
  'nao informado',
  'não informado',
  'nao informado pela 99',
  'não informado pela 99',
  'nao informado pelo ifood',
  'não informado pelo ifood',
  'canal nao mapeado',
  'canal não mapeado',
  'metodo nao mapeado',
  'método não mapeado',
  'pagamento nao mapeado',
  'pagamento não mapeado',
]);

const resolvePreferredMeaningfulText = (...values) => {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized && !weakPaymentLabels.has(normalized.toLowerCase())) {
      return normalized;
    }
  }

  return '';
};

const readBooleanFlag = value => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  const normalized = normalizeKey(value).replace(/\s+/g, '');
  if (!normalized) {
    return null;
  }

  if (['1', 'true', 'yes', 'y', 'sim'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'n', 'nao'].includes(normalized)) {
    return false;
  }

  return null;
};

const hasMeaningfulValue = value => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  return normalizeText(value) !== '';
};

const resolvePreferredMoney = (primary, fallback) => {
  const primaryPresent = hasMeaningfulValue(primary);
  const fallbackPresent = hasMeaningfulValue(fallback);

  if (!primaryPresent) {
    return fallbackPresent ? Number(fallback) : 0;
  }

  const primaryNumber = Number(primary);
  const fallbackNumber = Number(fallback);

  if (
    Number.isFinite(primaryNumber) &&
    fallbackPresent &&
    Number.isFinite(fallbackNumber) &&
    primaryNumber === 0 &&
    fallbackNumber !== 0
  ) {
    return fallbackNumber;
  }

  if (Number.isFinite(primaryNumber)) {
    return primaryNumber;
  }

  return fallbackPresent && Number.isFinite(fallbackNumber) ? fallbackNumber : 0;
};

const resolveDocumentLabel = (documentType, documentNumber) => {
  const normalizedType = normalizeText(documentType).toUpperCase();
  if (normalizedType) return normalizedType;

  const digits = String(documentNumber ?? '').replace(/\D/g, '');
  if (digits.length === 14) return 'CNPJ';
  if (digits.length === 11) return 'CPF';

  return 'Documento';
};

const readCapabilityValue = (capabilities, ...keys) => {
  if (!capabilities || typeof capabilities !== 'object') {
    return undefined;
  }

  for (const key of keys) {
    const normalizedKey = String(key ?? '').trim();
    if (!normalizedKey) continue;

    const candidates = [normalizedKey, toCamelCase(normalizedKey)];

    for (const candidate of candidates) {
      if (Object.prototype.hasOwnProperty.call(capabilities, candidate)) {
        return capabilities[candidate];
      }
    }
  }

  return undefined;
};

const normalizeDigits = (value, maxLength) =>
  String(value ?? '')
    .replace(/\D+/g, '')
    .slice(0, maxLength);

const hasErrnoError = value => {
  const normalized = normalizeErrno(value);
  if (!normalized) return false;
  return normalized !== '0';
};

const normalizeCancelReasonId = value => {
  const normalizedText = resolvePreferredText(value);
  if (!normalizedText) return null;

  const normalizedNumber = Number(normalizedText);
  if (Number.isFinite(normalizedNumber) && normalizedNumber > 0) {
    return String(Math.trunc(normalizedNumber));
  }

  return String(normalizedText).trim();
};

const formatAgeMinutes = value => {
  if (value === null || value === undefined || value === '') return '';

  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 0) return '';
  if (minutes === 0) return global.t?.t('orders', 'message', 'now');
  if (minutes === 1) return global.t?.t('orders', 'message', 'oneMinuteAgo');
  return `${global.t?.t('orders', 'message', 'minutesAgo')} ${minutes} min`;
};

const formatScheduledDate = raw => {
  if (!raw) return null;

  try {
    const d = new Date(raw);
    const pad = value => String(value).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return raw;
  }
};

const formatEta = value => {
  if (value === null || value === undefined || value === '') return '';

  const normalized = String(value).trim();
  if (!normalized) return '';

  if (/^\d+$/.test(normalized)) {
    const timestamp = Number(normalized);
    const date = new Date(
      timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp,
    );

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('pt-BR');
    }
  }

  return normalized;
};

const formatRiderEta = value => {
  if (value === null || value === undefined || value === '') return '';

  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 0) {
    return String(value).trim();
  }

  if (minutes === 0) return global.t?.t('orders', 'message', 'arrivingNow');
  if (minutes === 1) return global.t?.t('orders', 'message', 'arrivesInOneMinute');
  return `${global.t?.t('orders', 'message', 'arrivesIn')} ${minutes} min`;
};

const formatCodeLabel = (label, code) => {
  const normalizedLabel = resolvePreferredText(label);
  const normalizedCode = resolvePreferredText(code);

  if (normalizedLabel && normalizedCode) {
    return `${normalizedLabel} (${normalizedCode})`;
  }

  return normalizedLabel || normalizedCode;
};

const copyTextToClipboard = async text => {
  const normalizedText = String(text ?? '').trim();
  if (!normalizedText) return false;

  if (
    typeof navigator !== 'undefined' &&
    navigator?.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    await navigator.clipboard.writeText(normalizedText);
    return true;
  }

  return false;
};

const buildLocatorShareMessage = ({locator, url, platformLabel}) => {
  const parts = [
    `${global.t?.t('orders', 'message', 'deliveryConfirmation')} ${platformLabel}`,
  ];

  if (locator) {
    parts.push(`${global.t?.t('orders', 'label', 'locator')}: ${locator}`);
  }

  if (url) {
    parts.push(`${global.t?.t('orders', 'label', 'officialLink')}: ${url}`);
  }

  return parts.join('\n');
};

const buildOrderSnapshot = (order, initialOrder) => {
  if (!order && !initialOrder) return null;

  const currentOrder = order || {};
  const baseOrder = initialOrder || {};
  const currentExtraData = Array.isArray(currentOrder?.extraData)
    ? currentOrder.extraData
    : [];
  const initialExtraData = Array.isArray(baseOrder?.extraData)
    ? baseOrder.extraData
    : [];

  return {
    ...baseOrder,
    ...currentOrder,
    app: resolvePreferredText(currentOrder?.app, baseOrder?.app),
    otherInformations: resolvePreferredText(
      currentOrder?.otherInformations,
      currentOrder?.other_information,
      currentOrder?.otherInformation,
      baseOrder?.otherInformations,
      baseOrder?.other_information,
      baseOrder?.otherInformation,
    ),
    extraData: currentExtraData.length ? currentExtraData : initialExtraData,
    comments: resolvePreferredText(currentOrder?.comments, baseOrder?.comments),
    remark: resolvePreferredText(currentOrder?.remark, baseOrder?.remark),
    description: resolvePreferredText(
      currentOrder?.description,
      baseOrder?.description,
    ),
  };
};

const buildFallbackOrderProducts = (summary, order, initialOrder) => {
  if (!Array.isArray(summary?.items) || !summary.items.length) {
    return [];
  }

  return summary.items.map((entry, idx) => ({
    id: `remote-item-${idx}-${normalizeText(entry?.name || 'item')}`,
    name: normalizeText(entry?.name),
    quantity: Number(entry?.quantity || 0),
    value: Number(entry?.unitPrice || 0),
    price: Number(entry?.unitPrice || 0),
    comments: normalizeText(entry?.observation),
    observation: normalizeText(entry?.observation),
    remark: normalizeText(entry?.observation),
    note: normalizeText(entry?.observation),
    description: normalizeText(entry?.description),
    product: {
      name: normalizeText(entry?.name),
      product: normalizeText(entry?.name) || `Item #${idx + 1}`,
      description: normalizeText(entry?.description),
      type: normalizeText(entry?.type || 'product'),
    },
    orderProducts: [],
    order: order || initialOrder || null,
  }));
};

const buildSchedulingWindowLabel = (scheduledStartRaw, scheduledEndRaw) => {
  if (!scheduledStartRaw) return null;

  try {
    const start = new Date(scheduledStartRaw);
    const pad = value => String(value).padStart(2, '0');
    const datePart = `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()}`;
    const timePart = `${pad(start.getHours())}:${pad(start.getMinutes())}`;

    if (scheduledEndRaw) {
      const end = new Date(scheduledEndRaw);
      const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
      return `${datePart} das ${timePart} ate ${endTime}`;
    }

    return `${datePart} as ${timePart}`;
  } catch {
    return scheduledStartRaw;
  }
};

const useOrderMarketplaceSummary = ({
  order,
  initialOrder,
  refreshOrder,
  isKds,
  navigation,
  showError,
  showSuccess,
}) => {
  const currentOrder = order || initialOrder || null;
  const orderId = currentOrder?.id;
  const channelKey = getOrderChannelKey(currentOrder);
  const is99FoodOrder = channelKey === '99food';
  const isiFoodOrder = channelKey === 'ifood';
  const hasMarketplaceIntegration = is99FoodOrder || isiFoodOrder;
  const platformLabel = isiFoodOrder ? 'iFood' : '99Food';
  const platformCapabilities = getPlatformCapabilities(currentOrder);

  const [remoteActionLoading, setRemoteActionLoading] = useState('');
  const [remoteState, setRemoteState] = useState(null);
  const [remoteStateLoading, setRemoteStateLoading] = useState(false);
  const [cancelReasonsLoading, setCancelReasonsLoading] = useState(false);
  const [cancelReasons, setCancelReasons] = useState([]);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedCancelReasonId, setSelectedCancelReasonId] = useState(null);
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);
  const [deliveryFlowStep, setDeliveryFlowStep] = useState('locator');
  const [deliveryLocator, setDeliveryLocator] = useState('');
  const [deliveryConfirmationCode, setDeliveryConfirmationCode] = useState('');

  const localStatusNameKey = String(
    order?.status?.status || initialOrder?.status?.status || '',
  )
    .trim()
    .toLowerCase();
  const localRealStatusKey = String(
    order?.status?.realStatus || initialOrder?.status?.realStatus || '',
  )
    .trim()
    .toLowerCase();
  const isLocallyTerminalOrder =
    isTerminalOrderStatus(order?.status?.realStatus) ||
    isTerminalOrderStatus(initialOrder?.status?.realStatus);

  const orderSnapshot = useMemo(
    () => buildOrderSnapshot(order, initialOrder),
    [initialOrder, order],
  );
  const fallbackSummary = useMemo(
    () => buildFood99OrderSummary(orderSnapshot),
    [orderSnapshot],
  );
  const fallbackOrderProducts = useMemo(
    () => buildFallbackOrderProducts(fallbackSummary, order, initialOrder),
    [fallbackSummary, initialOrder, order],
  );

  const localOrderClient = order?.client || initialOrder?.client || null;
  const localOrderAddress = order?.addressDestination || initialOrder?.addressDestination || null;
  const localAddressParts = useMemo(
    () => resolveAddressDisplayParts(localOrderAddress),
    [localOrderAddress],
  );

  const localCustomerName = resolvePreferredText(
    localOrderClient?.alias,
    localOrderClient?.name,
  );
  const localCustomerPhone = resolvePreferredText(
    formatPhoneDisplay(localOrderClient?.phone?.[0]),
    Array.isArray(localOrderClient?.phone)
      ? localOrderClient.phone.map(formatPhoneDisplay).find(Boolean)
      : formatPhoneDisplay(localOrderClient?.phone),
  );
  const localCustomerDocument = resolvePreferredText(
    localOrderClient?.document?.[0]?.document,
    Array.isArray(localOrderClient?.document)
      ? localOrderClient.document
          .map(document => normalizeText(document?.document))
          .find(Boolean)
      : normalizeText(localOrderClient?.document),
  );
  const localCustomerDocumentType = resolvePreferredText(
    localOrderClient?.document?.[0]?.documentType?.documentType,
    Array.isArray(localOrderClient?.document)
      ? localOrderClient.document
          .map(document => normalizeText(document?.documentType?.documentType))
          .find(Boolean)
      : normalizeText(localOrderClient?.documentType?.documentType),
  );

  const loadMarketplaceState = useCallback(
    async ({silent = false} = {}) => {
      if (!orderId || !hasMarketplaceIntegration) {
        setRemoteState(null);
        return null;
      }

      const statePath = is99FoodOrder
        ? `/marketplace/integrations/99food/orders/${orderId}/state`
        : `/marketplace/integrations/ifood/orders/${orderId}/state`;

      try {
        setRemoteStateLoading(true);
        const response = await api.fetch(statePath);
        setRemoteState(response || null);
        return response || null;
      } catch (stateError) {
        setRemoteState(null);
        if (!silent) {
          showError(formatApiError(stateError));
        }
        return null;
      } finally {
        setRemoteStateLoading(false);
      }
    },
    [hasMarketplaceIntegration, is99FoodOrder, orderId, showError],
  );

  const ensureMarketplaceSummary = useCallback(async () => {
    if (
      !orderId ||
      !hasMarketplaceIntegration ||
      remoteState ||
      remoteStateLoading
    ) {
      return;
    }

    await loadMarketplaceState({silent: true});
  }, [
    hasMarketplaceIntegration,
    loadMarketplaceState,
    orderId,
    remoteState,
    remoteStateLoading,
  ]);

  const resetCancelFlow = useCallback(() => {
    setCancelModalVisible(false);
    setSelectedCancelReasonId(null);
    setCancelReasonText('');
    setCancelReasons([]);
  }, []);

  const closeDeliveryFlow = useCallback(() => {
    if (remoteActionLoading) {
      return;
    }

    setDeliveryModalVisible(false);
    setDeliveryFlowStep('locator');
    setDeliveryConfirmationCode('');
  }, [remoteActionLoading]);

  const remoteDelivery = useMemo(() => {
    const fallbackDelivery = fallbackSummary?.delivery
      ? {
          delivery_label: fallbackSummary.delivery.deliveryLabel || '',
          remote_delivery_status:
            fallbackSummary.delivery.remoteDeliveryStatus || '',
          expected_arrived_eta:
            fallbackSummary.delivery.expectedArrivedEta || '',
          pickup_code: fallbackSummary.delivery.pickupCode || '',
          delivered_by: fallbackSummary.delivery.deliveredBy || '',
          delivery_mode: fallbackSummary.delivery.deliveryMode || '',
          handover_code: fallbackSummary.delivery.handoverCode || '',
          locator: fallbackSummary.delivery.localizer || '',
          handover_page_url: fallbackSummary.delivery.handoverPageUrl || '',
          handover_confirmation_url:
            fallbackSummary.delivery.handoverConfirmationUrl || '',
          virtual_phone_number:
            fallbackSummary.delivery.virtualPhoneNumber || '',
          rider_name: fallbackSummary.delivery.riderName || '',
          rider_phone: fallbackSummary.delivery.riderPhone || '',
          rider_to_store_eta: fallbackSummary.delivery.riderToStoreEta || '',
          is_store_delivery:
            fallbackSummary.delivery.isStoreDelivery ?? false,
          is_platform_delivery:
            fallbackSummary.delivery.isPlatformDelivery ?? false,
          allows_manual_delivery_completion:
            fallbackSummary.delivery.allowsManualDeliveryCompletion ?? false,
        }
      : null;

    const stateDelivery = remoteState?.delivery || null;
    if (!stateDelivery) return fallbackDelivery;
    if (!fallbackDelivery) return stateDelivery;

    return {
      ...fallbackDelivery,
      ...stateDelivery,
    };
  }, [fallbackSummary?.delivery, remoteState?.delivery]);

  const remoteFulfillment = useMemo(() => {
    const fallbackFulfillment = fallbackSummary?.fulfillment
      ? {
          order_type:
            fallbackSummary.fulfillment.orderType ||
            fallbackSummary.fulfillment.order_type ||
            '',
          order_type_label:
            fallbackSummary.fulfillment.orderTypeLabel ||
            fallbackSummary.fulfillment.order_type_label ||
            '',
          fulfillment_label:
            fallbackSummary.fulfillment.fulfillmentLabel ||
            fallbackSummary.fulfillment.fulfillment_label ||
            '',
        }
      : null;

    const stateFulfillment = remoteState?.fulfillment || null;
    if (!stateFulfillment) return fallbackFulfillment;
    if (!fallbackFulfillment) return stateFulfillment;

    return {
      ...fallbackFulfillment,
      ...stateFulfillment,
    };
  }, [fallbackSummary?.fulfillment, remoteState?.fulfillment]);

  const remoteTakeout = useMemo(() => {
    const fallbackTakeout = fallbackSummary?.takeout
      ? {
          mode: fallbackSummary.takeout.mode || '',
          mode_label:
            fallbackSummary.takeout.modeLabel ||
            fallbackSummary.takeout.mode_label ||
            '',
          takeout_date_time:
            fallbackSummary.takeout.takeoutDateTime ||
            fallbackSummary.takeout.takeout_date_time ||
            '',
          pickup_code:
            fallbackSummary.takeout.pickupCode ||
            fallbackSummary.takeout.pickup_code ||
            '',
          pickup_area_code:
            fallbackSummary.takeout.pickupAreaCode ||
            fallbackSummary.takeout.pickup_area_code ||
            '',
          pickup_area_type:
            fallbackSummary.takeout.pickupAreaType ||
            fallbackSummary.takeout.pickup_area_type ||
            '',
          pickup_area_type_label:
            fallbackSummary.takeout.pickupAreaTypeLabel ||
            fallbackSummary.takeout.pickup_area_type_label ||
            '',
        }
      : null;

    const stateTakeout = remoteState?.takeout || null;
    if (!stateTakeout) return fallbackTakeout;
    if (!fallbackTakeout) return stateTakeout;

    return {
      ...fallbackTakeout,
      ...stateTakeout,
    };
  }, [fallbackSummary?.takeout, remoteState?.takeout]);

  const remoteDineIn = useMemo(() => {
    const fallbackDineIn = fallbackSummary?.dineIn || fallbackSummary?.dine_in;
    const stateDineIn = remoteState?.dine_in || remoteState?.dineIn || null;

    if (!stateDineIn && !fallbackDineIn) return null;
    if (!stateDineIn) return fallbackDineIn;
    if (!fallbackDineIn) return stateDineIn;

    return {
      ...fallbackDineIn,
      ...stateDineIn,
    };
  }, [fallbackSummary?.dineIn, fallbackSummary?.dine_in, remoteState?.dineIn, remoteState?.dine_in]);

  const remoteIntegration = remoteState?.integration || null;
  const remoteObservability = remoteState?.observability || null;
  const remoteFinancial = useMemo(() => {
    const fallbackFinancial = fallbackSummary?.financial
      ? {
          currency: 'BRL',
          items_total: fallbackSummary.financial.itemsTotal ?? 0,
          delivery_fee: fallbackSummary.financial.deliveryFee ?? 0,
          service_fee: fallbackSummary.financial.serviceFee ?? 0,
          small_order_fee: fallbackSummary.financial.smallOrderFee ?? 0,
          meal_top_up_fee: fallbackSummary.financial.mealTopUpFee ?? 0,
          discount_total: fallbackSummary.financial.discountTotal ?? 0,
          store_discount_total:
            fallbackSummary.financial.storeDiscountTotal ?? 0,
          platform_discount_total:
            fallbackSummary.financial.platformDiscountTotal ?? 0,
          items_discount_total:
            fallbackSummary.financial.itemsDiscountTotal ?? 0,
          delivery_discount_total:
            fallbackSummary.financial.deliveryDiscountTotal ?? 0,
          coupon_discount_total:
            fallbackSummary.financial.couponDiscountTotal ?? 0,
          customer_total: fallbackSummary.financial.customerTotal ?? 0,
          customer_need_paying_money:
            fallbackSummary.financial.customerNeedPayingMoney ?? 0,
          shop_paid_money: fallbackSummary.financial.shopPaidMoney ?? 0,
          store_charged_delivery_price:
            fallbackSummary.financial.storeChargedDeliveryPrice ?? 0,
          merchant_subsidy: fallbackSummary.financial.storeDiscountTotal ?? 0,
          ifood_subsidy:
            fallbackSummary.financial.platformDiscountTotal ?? 0,
          voucher_code: fallbackSummary.financial.voucherCode ?? '',
          payment_brand: '',
          change_for: 0,
        }
      : null;

    const stateFinancial = remoteState?.financial || null;
    if (!stateFinancial) return fallbackFinancial;
    if (!fallbackFinancial) return stateFinancial;

    return {
      ...fallbackFinancial,
      ...stateFinancial,
      items_total: resolvePreferredMoney(
        stateFinancial.items_total,
        fallbackFinancial.items_total,
      ),
      delivery_fee: resolvePreferredMoney(
        stateFinancial.delivery_fee,
        fallbackFinancial.delivery_fee,
      ),
      service_fee: resolvePreferredMoney(
        stateFinancial.service_fee,
        fallbackFinancial.service_fee,
      ),
      small_order_fee: resolvePreferredMoney(
        stateFinancial.small_order_fee,
        fallbackFinancial.small_order_fee,
      ),
      meal_top_up_fee: resolvePreferredMoney(
        stateFinancial.meal_top_up_fee,
        fallbackFinancial.meal_top_up_fee,
      ),
      discount_total: resolvePreferredMoney(
        stateFinancial.discount_total,
        fallbackFinancial.discount_total,
      ),
      store_discount_total: resolvePreferredMoney(
        stateFinancial.store_discount_total,
        fallbackFinancial.store_discount_total,
      ),
      platform_discount_total: resolvePreferredMoney(
        stateFinancial.platform_discount_total,
        fallbackFinancial.platform_discount_total,
      ),
      items_discount_total: resolvePreferredMoney(
        stateFinancial.items_discount_total,
        fallbackFinancial.items_discount_total,
      ),
      delivery_discount_total: resolvePreferredMoney(
        stateFinancial.delivery_discount_total,
        fallbackFinancial.delivery_discount_total,
      ),
      coupon_discount_total: resolvePreferredMoney(
        stateFinancial.coupon_discount_total,
        fallbackFinancial.coupon_discount_total,
      ),
      customer_total: resolvePreferredMoney(
        stateFinancial.customer_total,
        fallbackFinancial.customer_total,
      ),
      customer_need_paying_money: resolvePreferredMoney(
        stateFinancial.customer_need_paying_money,
        fallbackFinancial.customer_need_paying_money,
      ),
      shop_paid_money: resolvePreferredMoney(
        stateFinancial.shop_paid_money,
        fallbackFinancial.shop_paid_money,
      ),
      store_charged_delivery_price: resolvePreferredMoney(
        stateFinancial.store_charged_delivery_price,
        fallbackFinancial.store_charged_delivery_price,
      ),
    };
  }, [fallbackSummary?.financial, remoteState?.financial]);
  const remoteNegotiation = remoteState?.negotiation || null;

  const remotePayment = useMemo(() => {
    const fallbackPayment = fallbackSummary?.payment
      ? {
          pay_type: fallbackSummary.payment.payType || '',
          pay_type_label: fallbackSummary.payment.payTypeLabel || '',
          pay_method: fallbackSummary.payment.payMethod || '',
          pay_method_label: fallbackSummary.payment.payMethodLabel || '',
          pay_channel: fallbackSummary.payment.payChannel || '',
          pay_channel_label: fallbackSummary.payment.payChannelLabel || '',
          selected_payment_label:
            fallbackSummary.payment.selectedPaymentLabel || '',
          amount_paid: fallbackSummary.payment.amountPaid ?? 0,
          amount_pending: fallbackSummary.payment.amountPending ?? 0,
          customer_need_paying_money:
            fallbackSummary.payment.customerNeedPayingMoney ?? 0,
          collect_on_delivery_amount:
            fallbackSummary.payment.collectOnDeliveryAmount ?? 0,
          shop_paid_money: fallbackSummary.payment.shopPaidMoney ?? 0,
          change_for: fallbackSummary.payment.changeFor ?? 0,
          change_amount: fallbackSummary.payment.changeAmount ?? 0,
          needs_change: !!fallbackSummary.payment.needsChange,
          is_fully_paid: !!fallbackSummary.payment.isFullyPaid,
          is_paid_online: !!fallbackSummary.payment.isPaidOnline,
        }
      : null;

    const statePayment = remoteState?.payment || null;
    if (!statePayment) return fallbackPayment;
    if (!fallbackPayment) return statePayment;

    return {
      ...fallbackPayment,
      ...statePayment,
      pay_method_label: resolvePreferredMeaningfulText(
        statePayment.pay_method_label,
        fallbackPayment.pay_method_label,
      ),
      pay_channel_label: resolvePreferredMeaningfulText(
        statePayment.pay_channel_label,
        fallbackPayment.pay_channel_label,
      ),
      selected_payment_label: resolvePreferredMeaningfulText(
        statePayment.selected_payment_label,
        fallbackPayment.selected_payment_label,
      ),
      amount_paid: resolvePreferredMoney(
        statePayment.amount_paid,
        fallbackPayment.amount_paid,
      ),
      amount_pending: resolvePreferredMoney(
        statePayment.amount_pending,
        fallbackPayment.amount_pending,
      ),
      customer_need_paying_money: resolvePreferredMoney(
        statePayment.customer_need_paying_money,
        fallbackPayment.customer_need_paying_money,
      ),
      collect_on_delivery_amount: resolvePreferredMoney(
        statePayment.collect_on_delivery_amount,
        fallbackPayment.collect_on_delivery_amount,
      ),
      shop_paid_money: resolvePreferredMoney(
        statePayment.shop_paid_money,
        fallbackPayment.shop_paid_money,
      ),
      change_for: resolvePreferredMoney(
        statePayment.change_for,
        fallbackPayment.change_for,
      ),
      change_amount: resolvePreferredMoney(
        statePayment.change_amount,
        fallbackPayment.change_amount,
      ),
    };
  }, [fallbackSummary?.payment, remoteState?.payment]);

  const remoteCustomer = useMemo(() => {
    const fallbackCustomer = fallbackSummary?.customer || null;
    const stateCustomer = remoteState?.customer || null;
    const stateTaxDocumentRequested = readBooleanFlag(
      stateCustomer?.tax_document_requested ?? stateCustomer?.taxDocumentRequested,
    );
    const fallbackTaxDocumentRequested = readBooleanFlag(
      fallbackCustomer?.tax_document_requested ?? fallbackCustomer?.taxDocumentRequested,
    );

    if (!stateCustomer && !fallbackCustomer) return null;

    return {
      ...(fallbackCustomer || {}),
      ...(stateCustomer || {}),
      name: resolvePreferredText(stateCustomer?.name, fallbackCustomer?.name),
      phone: resolvePreferredText(
        stateCustomer?.phone,
        fallbackCustomer?.phone,
      ),
      document_number: resolvePreferredText(
        stateCustomer?.document_number,
        stateCustomer?.documentNumber,
        fallbackCustomer?.document_number,
        fallbackCustomer?.documentNumber,
      ),
      document_type: resolvePreferredText(
        stateCustomer?.document_type,
        stateCustomer?.documentType,
        fallbackCustomer?.document_type,
        fallbackCustomer?.documentType,
      ),
      tax_document_requested:
        stateTaxDocumentRequested !== null
          ? stateTaxDocumentRequested
          : fallbackTaxDocumentRequested,
    };
  }, [fallbackSummary?.customer, remoteState?.customer]);

  const remoteAddress = useMemo(() => {
    const fallbackAddress = fallbackSummary?.address || null;
    const stateAddress = remoteState?.address || null;
    if (!stateAddress && !fallbackAddress) return null;

    return {
      ...(fallbackAddress || {}),
      ...(stateAddress || {}),
      display: resolvePreferredText(
        stateAddress?.display,
        fallbackAddress?.display,
      ),
      street_name: resolvePreferredText(
        stateAddress?.street_name,
        stateAddress?.streetName,
        fallbackAddress?.street_name,
        fallbackAddress?.streetName,
      ),
      street_number: resolvePreferredText(
        stateAddress?.street_number,
        stateAddress?.streetNumber,
        fallbackAddress?.street_number,
        fallbackAddress?.streetNumber,
      ),
      district: resolvePreferredText(
        stateAddress?.district,
        fallbackAddress?.district,
      ),
      city: resolvePreferredText(stateAddress?.city, fallbackAddress?.city),
      state: resolvePreferredText(stateAddress?.state, fallbackAddress?.state),
      postal_code: resolvePreferredText(
        stateAddress?.postal_code,
        stateAddress?.postalCode,
        fallbackAddress?.postal_code,
        fallbackAddress?.postalCode,
      ),
      reference: resolvePreferredText(
        stateAddress?.reference,
        fallbackAddress?.reference,
      ),
      complement: resolvePreferredText(
        stateAddress?.complement,
        fallbackAddress?.complement,
      ),
      poi_address: resolvePreferredText(
        stateAddress?.poi_address,
        stateAddress?.poiAddress,
        fallbackAddress?.poi_address,
        fallbackAddress?.poiAddress,
      ),
    };
  }, [fallbackSummary?.address, remoteState?.address]);

  const remoteNotes = useMemo(() => {
    const fallbackNotes = fallbackSummary?.notes || null;
    const stateNotes = remoteState?.notes || null;
    const remark = resolvePreferredText(
      stateNotes?.remark,
      fallbackNotes?.remark,
    );
    const itemRemarks = resolvePreferredText(
      stateNotes?.item_remarks,
      stateNotes?.itemRemarks,
      fallbackNotes?.item_remarks,
      fallbackNotes?.itemRemarks,
    );
    const needCutlery =
      stateNotes?.need_cutlery ??
      fallbackNotes?.need_cutlery ??
      fallbackNotes?.needCutlery ??
      null;

    if (!remark && !itemRemarks && needCutlery === null) {
      return null;
    }

    return {
      remark,
      item_remarks: itemRemarks,
      need_cutlery: needCutlery,
    };
  }, [fallbackSummary?.notes, remoteState?.notes]);

  const remoteIdentifiers = useMemo(() => {
    const fallbackIdentifiers = fallbackSummary?.identifiers || null;
    const stateIdentifiers = remoteState?.identifiers || null;
    if (!stateIdentifiers && !fallbackIdentifiers) return null;

    return {
      ...(fallbackIdentifiers || {}),
      ...(stateIdentifiers || {}),
      order_index: resolvePreferredText(
        stateIdentifiers?.order_index,
        fallbackIdentifiers?.order_index,
        fallbackIdentifiers?.orderIndex,
      ),
      pickup_code: resolvePreferredText(
        stateIdentifiers?.pickup_code,
        fallbackIdentifiers?.pickup_code,
        fallbackIdentifiers?.pickupCode,
      ),
      handover_code: resolvePreferredText(
        stateIdentifiers?.handover_code,
        fallbackIdentifiers?.handover_code,
        fallbackIdentifiers?.handoverCode,
      ),
      handover_page_url: resolvePreferredText(
        stateIdentifiers?.handover_page_url,
        stateIdentifiers?.handoverPageUrl,
        fallbackIdentifiers?.handover_page_url,
        fallbackIdentifiers?.handoverPageUrl,
      ),
    };
  }, [fallbackSummary?.identifiers, remoteState?.identifiers]);

  const remoteCapabilities = useMemo(() => {
    const capabilities = remoteState?.capabilities || {};
    const canCancel = readCapabilityValue(capabilities, 'can_cancel', 'canCancel');
    const canReady = readCapabilityValue(capabilities, 'can_ready', 'canReady');
    const canDelivered = readCapabilityValue(
      capabilities,
      'can_delivered',
      'canDelivered',
    );
    const requiresDeliveryLocator = readCapabilityValue(
      capabilities,
      'requires_delivery_locator',
      'requiresDeliveryLocator',
    );
    const canOpenHandoverFlow = readCapabilityValue(
      capabilities,
      'can_open_handover_flow',
      'canOpenHandoverFlow',
    );
    const isTerminal = readCapabilityValue(
      capabilities,
      'is_terminal',
      'isTerminal',
    );
    const isDelivering = readCapabilityValue(
      capabilities,
      'is_delivering',
      'isDelivering',
    );
    const deliveryLocatorLength = Number(
      readCapabilityValue(
        capabilities,
        'delivery_locator_length',
        'deliveryLocatorLength',
      ) || 8,
    );
    const deliveryCodeLength = Number(
      readCapabilityValue(
        capabilities,
        'delivery_code_length',
        'deliveryCodeLength',
      ) || 4,
    );

    return {
      canCancel: typeof canCancel === 'boolean' ? canCancel : !!platformCapabilities.canCancel,
      canReady: typeof canReady === 'boolean' ? canReady : !!platformCapabilities.canReady,
      canDelivered:
        typeof canDelivered === 'boolean'
          ? canDelivered
          : !!platformCapabilities.canDeliver,
      requiresDeliveryLocator:
        typeof requiresDeliveryLocator === 'boolean'
          ? requiresDeliveryLocator
          : false,
      canOpenHandoverFlow:
        typeof canOpenHandoverFlow === 'boolean'
          ? canOpenHandoverFlow
          : false,
      isTerminal: typeof isTerminal === 'boolean' ? isTerminal : false,
      isDelivering: typeof isDelivering === 'boolean' ? isDelivering : false,
      deliveryLocatorLength:
        Number.isFinite(deliveryLocatorLength) && deliveryLocatorLength > 0
          ? deliveryLocatorLength
          : 8,
      deliveryCodeLength:
        Number.isFinite(deliveryCodeLength) && deliveryCodeLength > 0
          ? deliveryCodeLength
          : 4,
    };
  }, [platformCapabilities.canCancel, platformCapabilities.canDeliver, platformCapabilities.canReady, remoteState?.capabilities]);

  const remoteScheduling = remoteState?.scheduling || null;
  const isScheduledOrder = readBooleanFlag(remoteScheduling?.is_scheduled) === true;
  const scheduledStartRaw = remoteScheduling?.scheduled_start || null;
  const scheduledEndRaw = remoteScheduling?.scheduled_end || null;
  const scheduledDeliveryDateTimeRaw =
    remoteScheduling?.delivery_date_time || null;
  const scheduledPreparationStartRaw =
    remoteScheduling?.preparation_start || null;
  const scheduledWindowLabel = useMemo(
    () => buildSchedulingWindowLabel(scheduledStartRaw, scheduledEndRaw),
    [scheduledEndRaw, scheduledStartRaw],
  );

  const remoteOrderType = String(
    resolvePreferredText(
      remoteFulfillment?.order_type,
      remoteFulfillment?.orderType,
      remoteIntegration?.order_type,
      remoteIntegration?.orderType,
    ) || '',
  ).toUpperCase();
  const isiFoodTakeoutOrder = isiFoodOrder && remoteOrderType === 'TAKEOUT';
  const isiFoodDineInOrder =
    isiFoodOrder && ['DINE_IN', 'INDOOR'].includes(remoteOrderType);
  const isPickupLikeOrder = isiFoodTakeoutOrder || isiFoodDineInOrder;
  const remoteFulfillmentLabel = resolvePreferredText(
    remoteFulfillment?.fulfillment_label,
    remoteFulfillment?.fulfillmentLabel,
    remoteFulfillment?.order_type_label,
    remoteFulfillment?.orderTypeLabel,
    remoteDelivery?.delivery_label,
  );
  const remoteContextLabel = isPickupLikeOrder
    ? global.t?.t('orders', 'label', 'orderType') || 'Tipo do pedido'
    : global.t?.t('orders', 'label', 'delivery') || 'Entrega';
  const takeoutModeLabel = resolvePreferredText(
    remoteTakeout?.mode_label,
    remoteTakeout?.modeLabel,
    remoteTakeout?.mode,
  );
  const takeoutDateTime = resolvePreferredText(
    remoteTakeout?.takeout_date_time,
    remoteTakeout?.takeoutDateTime,
  );
  const dineInDateTime = resolvePreferredText(
    remoteDineIn?.delivery_date_time,
    remoteDineIn?.deliveryDateTime,
  );
  const pickupCode = resolvePreferredText(
    remoteTakeout?.pickup_code,
    remoteTakeout?.pickupCode,
    remoteDelivery?.pickup_code,
    remoteIdentifiers?.pickup_code,
  );
  const pickupAreaCode = resolvePreferredText(
    remoteTakeout?.pickup_area_code,
    remoteTakeout?.pickupAreaCode,
  );
  const pickupAreaTypeLabel = resolvePreferredText(
    remoteTakeout?.pickup_area_type_label,
    remoteTakeout?.pickupAreaTypeLabel,
    remoteTakeout?.pickup_area_type,
    remoteTakeout?.pickupAreaType,
  );
  const remoteOrderStateKey = String(
    remoteIntegration?.remote_order_state || '',
  ).toLowerCase();
  const lastEventType = String(
    remoteIntegration?.last_event_type ||
      fallbackSummary?.integration?.latestEventType ||
      '',
  ).toLowerCase();
  const lastActionType = String(remoteIntegration?.last_action || '').toLowerCase();
  const isMerchantDelivery =
    isiFoodOrder &&
    !isPickupLikeOrder &&
    (normalizeText(remoteDelivery?.delivered_by).toUpperCase() === 'MERCHANT' ||
      remoteDelivery?.is_store_delivery === true ||
      normalizeText(remoteDelivery?.delivery_label).toLowerCase().includes('loja'));
  const isRiderAssigned =
    isiFoodOrder &&
    !!(
      normalizeText(remoteDelivery?.rider_name).trim() ||
      normalizeText(remoteDelivery?.rider_phone).trim() ||
      Number(remoteDelivery?.rider_to_store_eta || 0) > 0
    );
  const isDispatchLifecycle =
    isiFoodOrder &&
    ['dispatching', 'delivering', 'courier_to_store', 'picked_up', 'arriving'].includes(
      remoteOrderStateKey || lastEventType,
    );
  const isHandoverFlow = isiFoodOrder && isMerchantDelivery && (isDispatchLifecycle || isRiderAssigned);
  const requiresDeliveryLocator =
    is99FoodOrder &&
    (remoteCapabilities.requiresDeliveryLocator ||
      !!remoteDelivery?.is_store_delivery);
  const activeLocator = String(deliveryLocator || remoteDelivery?.locator || '').trim();
  const handoverCode = String(
    remoteDelivery?.handover_code || remoteIdentifiers?.handover_code || '',
  ).trim();
  const handoverLink = String(
    remoteDelivery?.handover_confirmation_url ||
      remoteDelivery?.handover_page_url ||
      remoteIdentifiers?.handover_page_url ||
      (isiFoodOrder ? 'https://confirmacao-entrega-propria.ifood.com.br/' : ''),
  ).trim();
  const isRemoteTerminal =
    isLocallyTerminalOrder ||
    remoteCapabilities.isTerminal ||
    isTerminalOrderStatus(localRealStatusKey);
  const canCancelRemoteOrder =
    hasMarketplaceIntegration &&
    !isRemoteTerminal &&
    remoteCapabilities.canCancel;
  const canReadyRemoteOrder =
    hasMarketplaceIntegration &&
    !isRemoteTerminal &&
    remoteCapabilities.canReady &&
    localRealStatusKey === 'open' &&
    localStatusNameKey === 'preparing';
  const canDeliverRemoteOrder =
    hasMarketplaceIntegration &&
    !isRemoteTerminal &&
    remoteCapabilities.canDelivered &&
    (isiFoodOrder
      ? isHandoverFlow
      : !!remoteDelivery?.allows_manual_delivery_completion);
  const remotePaymentMethod = isiFoodOrder
    ? resolvePreferredMeaningfulText(
        remotePayment?.pay_method_label,
        remotePayment?.pay_method,
      )
    : formatCodeLabel(remotePayment?.pay_method_label, remotePayment?.pay_method);
  const remotePaymentChannel = isiFoodOrder
    ? resolvePreferredMeaningfulText(
        remotePayment?.pay_channel_label,
        remotePayment?.pay_channel,
      )
    : formatCodeLabel(
        remotePayment?.pay_channel_label,
        remotePayment?.pay_channel,
      );
  const selectedPaymentLabel = resolvePreferredMeaningfulText(
    remotePayment?.selected_payment_label,
    remotePayment?.pay_method_label,
    remotePayment?.pay_channel_label,
  );
  const changeFor = resolvePreferredMoney(remotePayment?.change_for);
  const changeAmount = resolvePreferredMoney(remotePayment?.change_amount);
  const shopPaidMoney = resolvePreferredMoney(
    remotePayment?.shop_paid_money,
    remoteFinancial?.shop_paid_money,
  );
  const collectOnDeliveryAmount = resolvePreferredMoney(
    remotePayment?.customer_need_paying_money ??
      remoteFinancial?.customer_need_paying_money,
    resolvePreferredMoney(
      remotePayment?.collect_on_delivery_amount,
      remotePayment?.amount_pending,
    ),
  );
  const paymentChannelLower = normalizeText(
    remotePayment?.pay_channel_label || selectedPaymentLabel,
  ).toLowerCase();
  const isCashPayment =
    String(remotePayment?.pay_channel || '').trim() === '153' ||
    paymentChannelLower.includes('dinheiro');
  const showCollectOnDelivery =
    !remotePayment?.is_paid_online && collectOnDeliveryAmount > 0.009;
  const showDeliveryPaymentSection =
    showCollectOnDelivery ||
    isCashPayment ||
    changeAmount > 0.009 ||
    changeFor > 0 ||
    shopPaidMoney > 0;
  const hasCancellationInfo =
    ['cancel_requested', 'partial_cancel', 'canceled'].includes(
      remoteOrderStateKey,
    ) ||
    !!remoteIntegration?.cancel_code ||
    !!remoteIntegration?.cancel_reason;
  const cancellationSourceLabel =
    lastActionType === 'cancel' &&
    !hasErrnoError(remoteIntegration?.last_action_errno)
      ? global.t?.t('orders', 'label', 'store')
      : /(ordercancelapply|ordercancelrequest|cancelapply|cancelrequest)/.test(
            lastEventType,
          )
        ? global.t?.t('orders', 'label', 'customer')
        : hasCancellationInfo
          ? `${global.t?.t('orders', 'label', 'customer')} / ${platformLabel}`
          : '';

  const customerName = resolvePreferredText(localCustomerName, remoteCustomer?.name);
  const customerPhone = resolvePreferredText(localCustomerPhone, remoteCustomer?.phone);
  const customerDocument = resolvePreferredText(
    localCustomerDocument,
    remoteCustomer?.document_number,
  );
  const customerDocumentType = resolvePreferredText(
    localCustomerDocumentType,
    remoteCustomer?.document_type,
  );
  const customerDocumentLabel = resolveDocumentLabel(
    customerDocumentType,
    customerDocument,
  );
  const fallbackObservation = resolvePreferredText(
    order?.comments,
    order?.remark,
    order?.description,
    initialOrder?.comments,
    initialOrder?.remark,
    initialOrder?.description,
  );
  const orderObservationText = resolvePreferredText(
    remoteNotes?.remark,
    fallbackObservation,
  );
  const itemRemarksText = resolvePreferredText(
    remoteNotes?.item_remarks,
    remoteNotes?.itemRemarks,
  );
  const shouldShowItemRemarks =
    !!itemRemarksText &&
    normalizeKey(itemRemarksText) !== normalizeKey(orderObservationText);
  const taxDocumentRequested =
    isiFoodOrder &&
    (() => {
      const explicitFlag = readBooleanFlag(
        remoteCustomer?.tax_document_requested ??
          remoteCustomer?.taxDocumentRequested,
      );
      if (explicitFlag !== null) return explicitFlag;
      return !!resolvePreferredText(remoteCustomer?.document_number);
    })();

  const applicableCancelReasons = useMemo(
    () =>
      Array.isArray(cancelReasons)
        ? cancelReasons.filter(reason => reason?.applicable !== false)
        : [],
    [cancelReasons],
  );
  const selectedCancelReason = applicableCancelReasons.find(
    reason =>
      normalizeCancelReasonId(reason?.reason_id) ===
      normalizeCancelReasonId(selectedCancelReasonId),
  );
  const requiresCancelReasonText = !!selectedCancelReason?.requires_description;

  const runRemoteAction = useCallback(
    async (action, options = {}) => {
      if (!orderId || remoteActionLoading || !hasMarketplaceIntegration) {
        return;
      }

      const actionMap = {
        ready: {
          path: `/orders/${orderId}/ready`,
          success: global.t?.t('orders', 'message', 'orderReady'),
        },
        cancel: {
          path: `/orders/${orderId}/cancel`,
          success: global.t?.t('orders', 'message', 'orderCanceled'),
        },
        delivered: {
          path: `/orders/${orderId}/delivered`,
          success: global.t?.t('orders', 'message', 'orderDelivered'),
        },
      };

      const actionConfig = actionMap[action];
      if (!actionConfig) return;

      try {
        setRemoteActionLoading(action);

        const response = await api.fetch(actionConfig.path, {
          method: 'POST',
          body: {
            ...(options?.body || {}),
            ...(options?.locator ? {locator: options.locator} : {}),
            ...(options?.deliveryCode
              ? {delivery_code: options.deliveryCode}
              : {}),
          },
        });

        const actionResult = response?.result || response;
        if (normalizeErrno(actionResult?.errno) !== '0') {
          throw actionResult || response;
        }

        if (response?.state) {
          setRemoteState(response.state);
        }

        await refreshOrder();
        await loadMarketplaceState({silent: true});

        if (action === 'delivered') {
          setDeliveryModalVisible(false);
          setDeliveryFlowStep('locator');
          setDeliveryConfirmationCode('');
        }

        if (action === 'cancel') {
          resetCancelFlow();
        }

        showSuccess(actionConfig.success);

        if (isKds && (action === 'cancel' || action === 'delivered')) {
          navigation.goBack();
        }
      } catch (actionError) {
        showError(formatApiError(actionError));
      } finally {
        setRemoteActionLoading('');
      }
    },
    [
      hasMarketplaceIntegration,
      is99FoodOrder,
      isKds,
      loadMarketplaceState,
      navigation,
      orderId,
      refreshOrder,
      remoteActionLoading,
      resetCancelFlow,
      showError,
      showSuccess,
    ],
  );

  const handleOpenCancelFlow = useCallback(async () => {
    if (!orderId || !canCancelRemoteOrder || remoteActionLoading || cancelReasonsLoading) {
      return;
    }

    try {
      setCancelReasonsLoading(true);
      const response = await api.fetch(`/orders/${orderId}/cancel-reasons`);
      const result = response?.result || response;

      if (normalizeErrno(result?.errno) !== '0') {
        throw result || response;
      }

      const reasons = Array.isArray(result?.data?.reasons)
        ? result.data.reasons
        : Array.isArray(result?.reasons)
          ? result.reasons
          : [];

      if (!reasons.length) {
        showError(
          global.t?.t('orders', 'message', 'noOfficialCancelReasonAvailable') ||
            `A plataforma ${platformLabel} nao retornou motivos oficiais de cancelamento para este pedido.`,
        );
        return;
      }

      setCancelReasons(reasons);
      setCancelModalVisible(true);
      setSelectedCancelReasonId(null);
      setCancelReasonText('');
    } catch (cancelReasonError) {
      showError(formatApiError(cancelReasonError));
    } finally {
      setCancelReasonsLoading(false);
    }
  }, [
    canCancelRemoteOrder,
    cancelReasonsLoading,
    orderId,
    platformLabel,
    remoteActionLoading,
    showError,
  ]);

  const handleConfirmCancel = useCallback(async () => {
    const reasonId = normalizeCancelReasonId(selectedCancelReasonId);
    if (!reasonId) {
      showError(global.t?.t('orders', 'message', 'selectCancelReasonToContinue'));
      return;
    }

    const reasonText = String(cancelReasonText || '').trim();
    if (requiresCancelReasonText && !reasonText) {
      showError(
        global.t?.t('orders', 'message', 'describeCancelReasonToContinue'),
      );
      return;
    }

    await runRemoteAction('cancel', {
      body: {
        reason_id: reasonId,
        ...(reasonText ? {reason: reasonText} : {}),
      },
    });
  }, [
    cancelReasonText,
    requiresCancelReasonText,
    runRemoteAction,
    selectedCancelReasonId,
    showError,
  ]);

  const handleCopyLocator = useCallback(async () => {
    if (!activeLocator) {
      showError(global.t?.t('orders', 'message', 'noLocatorAvailable'));
      return;
    }

    try {
      const copied = await copyTextToClipboard(activeLocator);

      if (!copied) {
        showError(global.t?.t('orders', 'message', 'copyNotSupportedUseCode'));
        return;
      }

      showSuccess(global.t?.t('orders', 'message', 'locatorCopied'));
    } catch (copyError) {
      showError(formatApiError(copyError));
    }
  }, [activeLocator, showError, showSuccess]);

  const handleOpenHandoverLink = useCallback(async () => {
    if (!handoverLink) {
      showError(
        isiFoodOrder
          ? global.t?.t('orders', 'message', 'ifoodDidNotSendConfirmationLink')
          : global.t?.t('orders', 'message', 'food99DidNotSendConfirmationLink'),
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(handoverLink);
      if (!supported) {
        throw new Error(global.t?.t('orders', 'message', 'unableOpenConfirmationLink'));
      }

      await Linking.openURL(handoverLink);
    } catch (linkError) {
      showError(formatApiError(linkError));
    }
  }, [handoverLink, isiFoodOrder, showError]);

  const handleCopyHandoverLink = useCallback(async () => {
    if (!handoverLink) {
      showError(
        isiFoodOrder
          ? global.t?.t('orders', 'message', 'ifoodDidNotSendConfirmationLink')
          : global.t?.t('orders', 'message', 'food99DidNotSendConfirmationLink'),
      );
      return;
    }

    try {
      const copied = await copyTextToClipboard(handoverLink);
      if (!copied) {
        showError(
          global.t?.t('orders', 'message', 'copyNotSupportedOpenInBrowser'),
        );
        return;
      }

      showSuccess(global.t?.t('orders', 'message', 'confirmationLinkCopied'));
    } catch (copyError) {
      showError(formatApiError(copyError));
    }
  }, [handoverLink, isiFoodOrder, showError, showSuccess]);

  const handleShareHandoverWhatsapp = useCallback(async () => {
    if (!handoverLink) {
      showError(
        isiFoodOrder
          ? global.t?.t('orders', 'message', 'ifoodDidNotSendConfirmationLink')
          : global.t?.t('orders', 'message', 'food99DidNotSendConfirmationLink'),
      );
      return;
    }

    const message = buildLocatorShareMessage({
      locator: activeLocator,
      url: handoverLink,
      platformLabel,
    });
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (!supported) {
        throw new Error(global.t?.t('orders', 'message', 'whatsAppUnavailable'));
      }

      await Linking.openURL(whatsappUrl);
    } catch (shareError) {
      showError(formatApiError(shareError));
    }
  }, [activeLocator, handoverLink, platformLabel, showError]);

  const openDeliveryFlow = useCallback(() => {
    setDeliveryLocator(
      normalizeDigits(remoteDelivery?.locator, remoteCapabilities.deliveryLocatorLength),
    );
    setDeliveryConfirmationCode('');
    setDeliveryFlowStep('locator');
    setDeliveryModalVisible(true);
  }, [
    remoteCapabilities.deliveryLocatorLength,
    remoteDelivery?.locator,
  ]);

  const handleVerifyLocator = useCallback(async () => {
    if (!orderId || !is99FoodOrder || remoteActionLoading) {
      return;
    }

    const normalizedLocator = normalizeDigits(
      deliveryLocator,
      remoteCapabilities.deliveryLocatorLength,
    );
    if (normalizedLocator.length !== remoteCapabilities.deliveryLocatorLength) {
      showError(
        `${global.t?.t('orders', 'message', 'enterLocatorWith')} ${remoteCapabilities.deliveryLocatorLength} ${global.t?.t('orders', 'label', 'digits')}.`,
      );
      return;
    }

    try {
      setRemoteActionLoading('locator_verify');

      const response = await api.fetch(
        `/marketplace/integrations/99food/orders/${orderId}/delivery-locator/verify`,
        {
          method: 'POST',
          body: {
            locator: normalizedLocator,
          },
        },
      );

      if (normalizeErrno(response?.result?.errno) !== '0') {
        throw response?.result || response;
      }

      if (response?.state) {
        setRemoteState(response.state);
      }

      const flow = response?.flow || {};
      const nextStep = String(flow?.step || '').toLowerCase();
      setDeliveryLocator(flow?.locator || normalizedLocator);

      await refreshOrder();
      await loadMarketplaceState({silent: true});

      if (nextStep === 'completed') {
        setDeliveryModalVisible(false);
        setDeliveryFlowStep('locator');
        showSuccess(global.t?.t('orders', 'message', 'deliveryConfirmed99Food'));

        if (isKds) {
          navigation.goBack();
        }
        return;
      }

      if (nextStep === 'delivery_code') {
        setDeliveryFlowStep('delivery_code');
        showSuccess(
          global.t?.t('orders', 'message', 'locatorValidatedNowConfirmCustomerCode'),
        );
        return;
      }

      throw (
        response?.result || {
          message: global.t?.t('orders', 'message', 'unexpectedLocatorFlow99Food'),
        }
      );
    } catch (actionError) {
      showError(formatApiError(actionError));
    } finally {
      setRemoteActionLoading('');
    }
  }, [
    deliveryLocator,
    is99FoodOrder,
    isKds,
    loadMarketplaceState,
    navigation,
    orderId,
    refreshOrder,
    remoteActionLoading,
    remoteCapabilities.deliveryLocatorLength,
    showError,
    showSuccess,
  ]);

  const handleConfirmDelivery = useCallback(async () => {
    const normalizedLocator = normalizeDigits(
      deliveryLocator,
      remoteCapabilities.deliveryLocatorLength,
    );

    if (normalizedLocator.length !== remoteCapabilities.deliveryLocatorLength) {
      showError(
        `${global.t?.t('orders', 'message', 'enterLocatorWith')} ${remoteCapabilities.deliveryLocatorLength} ${global.t?.t('orders', 'label', 'digits')}.`,
      );
      setDeliveryFlowStep('locator');
      return;
    }

    if (isiFoodOrder) {
      await runRemoteAction('delivered', {
        locator: normalizedLocator,
      });
      return;
    }

    const normalizedCode = normalizeDigits(
      deliveryConfirmationCode,
      remoteCapabilities.deliveryCodeLength,
    );
    if (normalizedCode.length !== remoteCapabilities.deliveryCodeLength) {
      showError(
        `${global.t?.t('orders', 'message', 'enterCustomerCodeWith')} ${remoteCapabilities.deliveryCodeLength} ${global.t?.t('orders', 'label', 'digits')}.`,
      );
      return;
    }

    await runRemoteAction('delivered', {
      locator: normalizedLocator,
      deliveryCode: normalizedCode,
    });
  }, [
    deliveryConfirmationCode,
    deliveryLocator,
    isiFoodOrder,
    remoteCapabilities.deliveryCodeLength,
    remoteCapabilities.deliveryLocatorLength,
    runRemoteAction,
    showError,
  ]);

  const handleDeliverPress = useCallback(() => {
    if (requiresDeliveryLocator || isHandoverFlow) {
      openDeliveryFlow();
      return;
    }

    void runRemoteAction('delivered');
  }, [isHandoverFlow, openDeliveryFlow, requiresDeliveryLocator, runRemoteAction]);

  const handleRespondNegotiation = useCallback(async decision => {
    const normalizedDecision = decision === 'reject' ? 'reject' : 'accept';
    if (!orderId || !isiFoodOrder || remoteActionLoading || !remoteNegotiation?.dispute_id) {
      return;
    }

    try {
      setRemoteActionLoading(`negotiation_${normalizedDecision}`);

      const response = await api.fetch(
        `/marketplace/integrations/ifood/orders/${orderId}/negotiation/${normalizedDecision}`,
        {
          method: 'POST',
          body: normalizedDecision === 'reject'
            ? {reason: 'UNKNOWN_ISSUE'}
            : {},
        },
      );

      const actionResult = response?.result || response;
      if (normalizeErrno(actionResult?.errno) !== '0') {
        throw actionResult || response;
      }

      if (response?.state) {
        setRemoteState(response.state);
      }

      await refreshOrder();
      await loadMarketplaceState({silent: true});

      showSuccess(
        normalizedDecision === 'reject'
          ? global.t?.t('orders', 'message', 'ifoodNegotiationRejected') ||
            'Negociacao iFood rejeitada.'
          : global.t?.t('orders', 'message', 'ifoodNegotiationAccepted') ||
            'Negociacao iFood aceita.',
      );
    } catch (actionError) {
      showError(formatApiError(actionError));
    } finally {
      setRemoteActionLoading('');
    }
  }, [
    isiFoodOrder,
    loadMarketplaceState,
    orderId,
    refreshOrder,
    remoteActionLoading,
    remoteNegotiation?.dispute_id,
    showError,
    showSuccess,
  ]);

  const actionButtons = useMemo(() => {
    const actions = [];

    if (canCancelRemoteOrder) {
      actions.push({
        key: 'marketplace-cancel',
        label: 'Cancelar pedido',
        icon: 'close',
        tone: 'danger',
        loading: remoteActionLoading === 'cancel' || cancelReasonsLoading,
        disabled: !!remoteActionLoading || cancelReasonsLoading,
        onPress: handleOpenCancelFlow,
      });
    }

    if (canDeliverRemoteOrder) {
      actions.push({
        key: 'marketplace-deliver',
        label: global.t?.t('orders', 'button', 'deliverOrder') || 'Entregar pedido',
        icon: 'local-shipping',
        tone: 'success',
        loading: remoteActionLoading === 'delivered',
        disabled: !!remoteActionLoading,
        onPress: handleDeliverPress,
      });
    }

    if (!isiFoodOrder || !remoteNegotiation?.has_open_dispute || !remoteNegotiation?.dispute_id) {
      return actions;
    }

    actions.push(
      {
        key: 'ifood-accept-negotiation',
        label: 'Aceitar cancelamento',
        icon: 'check',
        tone: 'danger',
        loading: remoteActionLoading === 'negotiation_accept',
        disabled: !!remoteActionLoading,
        onPress: () => handleRespondNegotiation('accept'),
      },
      {
        key: 'ifood-reject-negotiation',
        label: 'Rejeitar cancelamento',
        icon: 'close',
        tone: 'neutral',
        loading: remoteActionLoading === 'negotiation_reject',
        disabled: !!remoteActionLoading,
        onPress: () => handleRespondNegotiation('reject'),
      },
    );

    return actions;
  }, [
    canCancelRemoteOrder,
    canDeliverRemoteOrder,
    cancelReasonsLoading,
    handleDeliverPress,
    handleOpenCancelFlow,
    handleRespondNegotiation,
    isiFoodOrder,
    remoteActionLoading,
    remoteNegotiation?.dispute_id,
    remoteNegotiation?.has_open_dispute,
  ]);

  const summary = useMemo(() => {
    if (!hasMarketplaceIntegration) {
      return null;
    }

    const operationLines = [];
    const courierLines = [];
    const financialLines = [];
    const paymentCards = [];
    const deliveryPaymentLines = [];
    const schedulingLines = [];
    const taxDocumentLines = [];
    const customerLines = [];
    const addressLines = [];
    const codesLines = [];
    const observationLines = [];

    if (!!remoteIdentifiers?.order_index) {
      operationLines.push({
        key: 'order-index',
        label: isiFoodOrder
          ? global.t?.t('orders', 'label', 'ifoodNumber')
          : global.t?.t('orders', 'label', 'food99Number'),
        value: `#${remoteIdentifiers.order_index}`,
      });
    }

    if (remoteFulfillmentLabel) {
      operationLines.push({
        key: 'fulfillment',
        label: remoteContextLabel,
        value: remoteFulfillmentLabel,
      });
    }

    const formattedEta = formatEta(remoteDelivery?.expected_arrived_eta);
    if (!isPickupLikeOrder && formattedEta) {
      operationLines.push({
        key: 'eta',
        label: global.t?.t('orders', 'label', 'estimatedEta'),
        value: formattedEta,
      });
    }

    if (isiFoodTakeoutOrder && takeoutModeLabel) {
      operationLines.push({
        key: 'takeout-mode',
        label: global.t?.t('orders', 'label', 'mode') || 'Modo',
        value: takeoutModeLabel,
      });
    }

    if (isiFoodTakeoutOrder && takeoutDateTime) {
      operationLines.push({
        key: 'takeout-time',
        label:
          global.t?.t('orders', 'label', 'takeoutTime') ||
          'Horario da retirada',
        value: formatScheduledDate(takeoutDateTime),
      });
    }

    if (isiFoodDineInOrder && dineInDateTime) {
      operationLines.push({
        key: 'service-time',
        label:
          global.t?.t('orders', 'label', 'serviceTime') || 'Horario previsto',
        value: formatScheduledDate(dineInDateTime),
      });
    }

    if (pickupCode) {
      operationLines.push({
        key: 'pickup-code',
        label: global.t?.t('orders', 'label', 'pickupCode') || 'Codigo de retirada',
        value: pickupCode,
      });
    }

    if (pickupAreaCode) {
      operationLines.push({
        key: 'pickup-area',
        label:
          pickupAreaTypeLabel ||
          (global.t?.t('orders', 'label', 'pickupArea') || 'Area de retirada'),
        value: pickupAreaCode,
      });
    }

    if (selectedPaymentLabel) {
      operationLines.push({
        key: 'selected-payment',
        label: global.t?.t('orders', 'label', 'selectedPaymentMethod'),
        value: selectedPaymentLabel,
        strong: true,
      });
    }

    if (remotePaymentMethod) {
      operationLines.push({
        key: 'payment-method',
        label: global.t?.t('orders', 'label', 'paymentMethod'),
        value: remotePaymentMethod,
      });
    }

    if (remotePaymentChannel) {
      operationLines.push({
        key: 'payment-channel',
        label: global.t?.t('orders', 'label', 'paymentChannel'),
        value: remotePaymentChannel,
      });
    }

    if (cancellationSourceLabel) {
      operationLines.push({
        key: 'cancellation-origin',
        label: global.t?.t('orders', 'label', 'cancellationOrigin'),
        value: cancellationSourceLabel,
      });
    }

    if (remoteIntegration?.cancel_code) {
      operationLines.push({
        key: 'cancellation-code',
        label: global.t?.t('orders', 'label', 'cancellationCode'),
        value: remoteIntegration.cancel_code,
      });
    }

    if (remoteIntegration?.cancel_reason) {
      operationLines.push({
        key: 'cancellation-reason',
        label: global.t?.t('orders', 'label', 'cancellationReason'),
        value: remoteIntegration.cancel_reason,
      });
    }

    if (remoteIntegration?.cancellation_requested) {
      operationLines.push({
        key: 'cancellation-requested',
        label: global.t?.t('orders', 'label', 'status') || 'Status',
        value:
          global.t?.t('orders', 'message', 'cancellationRequestedByPlatform') ||
          'Cancelamento solicitado pela plataforma',
        strong: true,
      });
    }

    if (remoteNegotiation?.has_open_dispute) {
      operationLines.push({
        key: 'ifood-negotiation',
        label: global.t?.t('orders', 'label', 'status') || 'Status',
        value:
          remoteNegotiation.message ||
          global.t?.t('orders', 'message', 'ifoodNegotiationRequested') ||
          'Negociacao iFood solicitada',
        strong: true,
      });

      if (remoteNegotiation.expires_at) {
        operationLines.push({
          key: 'ifood-negotiation-expires',
          label: global.t?.t('orders', 'label', 'expiresAt') || 'Expira em',
          value: formatScheduledDate(remoteNegotiation.expires_at),
        });
      }
    }

    const remoteStateAgeLabel = formatAgeMinutes(
      remoteObservability?.remote_state_age_minutes,
    );
    const lastActionAgeLabel = formatAgeMinutes(
      remoteObservability?.last_action_age_minutes,
    );
    const lastReconcileAgeLabel = formatAgeMinutes(
      remoteObservability?.last_reconcile_age_minutes,
    );

    if (remoteStateAgeLabel) {
      operationLines.push({
        key: 'remote-update',
        label: global.t?.t('orders', 'label', 'remoteUpdate'),
        value: remoteStateAgeLabel,
      });
    }

    if (lastActionAgeLabel) {
      operationLines.push({
        key: 'last-action',
        label: global.t?.t('orders', 'label', 'lastAction'),
        value: lastActionAgeLabel,
      });
    }

    if (lastReconcileAgeLabel) {
      operationLines.push({
        key: 'last-reconciliation',
        label: global.t?.t('orders', 'label', 'lastReconciliation'),
        value: lastReconcileAgeLabel,
      });
    }

    if (remoteDelivery?.is_platform_delivery) {
      operationLines.push({
        key: 'platform-delivery',
        label: '',
        value: global.t?.t('orders', 'message', 'platformHandlesDeliveryAfterReady'),
      });
    }

    if (remoteObservability?.is_healthy === false) {
      operationLines.push({
        key: 'integration-divergence',
        label: '',
        value: global.t?.t('orders', 'message', 'integrationDivergenceTapRefresh'),
      });
    }

    const riderName = resolvePreferredText(remoteDelivery?.rider_name);
    const riderPhone = resolvePreferredText(remoteDelivery?.rider_phone);
    const riderEta = formatRiderEta(remoteDelivery?.rider_to_store_eta);

    if (riderName) {
      courierLines.push({
        key: 'courier-name',
        label: global.t?.t('orders', 'label', 'name'),
        value: riderName,
      });
    }

    if (riderPhone) {
      courierLines.push({
        key: 'courier-phone',
        label: global.t?.t('orders', 'label', 'phone'),
        value: riderPhone,
      });
    }

    if (riderEta) {
      courierLines.push({
        key: 'courier-eta-store',
        label: global.t?.t('orders', 'label', 'etaToStore'),
        value: riderEta,
      });
    }

    if (remoteFinancial) {
      financialLines.push(
        {
          key: 'items-total',
          label: global.t?.t('orders', 'label', 'items'),
          value: remoteFinancial.items_total || 0,
          money: true,
        },
        {
          key: 'delivery-fee',
          label: global.t?.t('orders', 'label', 'delivery'),
          value: remoteFinancial.delivery_fee || 0,
          money: true,
        },
      );

      if (Number(remoteFinancial.service_fee || 0)) {
        financialLines.push({
          key: 'service-fee',
          label: global.t?.t('orders', 'label', 'serviceFee'),
          value: remoteFinancial.service_fee || 0,
          money: true,
        });
      }

      if (Number(remoteFinancial.small_order_fee || 0)) {
        financialLines.push({
          key: 'small-order-fee',
          label: global.t?.t('orders', 'label', 'minimumOrderFee'),
          value: remoteFinancial.small_order_fee || 0,
          money: true,
        });
      }

      if (Number(remoteFinancial.meal_top_up_fee || 0)) {
        financialLines.push({
          key: 'meal-top-up-fee',
          label: global.t?.t('orders', 'label', 'topUpFee'),
          value: remoteFinancial.meal_top_up_fee || 0,
          money: true,
        });
      }

      if (Number(remoteFinancial.discount_total || 0)) {
        financialLines.push(
          {
            key: 'discount-total',
            label: global.t?.t('orders', 'label', 'totalDiscounts'),
            value: remoteFinancial.discount_total || 0,
            money: true,
          },
          {
            key: 'items-discount-total',
            label: global.t?.t('orders', 'label', 'itemDiscount'),
            value: remoteFinancial.items_discount_total || 0,
            money: true,
          },
          {
            key: 'delivery-discount-total',
            label: global.t?.t('orders', 'label', 'deliveryDiscount'),
            value: remoteFinancial.delivery_discount_total || 0,
            money: true,
          },
          {
            key: 'coupon-discount-total',
            label: global.t?.t('orders', 'label', 'couponDiscount'),
            value: remoteFinancial.coupon_discount_total || 0,
            money: true,
          },
        );
      }

      if (isiFoodOrder && remoteFinancial.voucher_code) {
        financialLines.push({
          key: 'ifood-voucher-code',
          label: global.t?.t('orders', 'label', 'coupon') || 'Cupom',
          value: remoteFinancial.voucher_code,
        });
      }

      if (Number(remoteFinancial.store_discount_total || 0)) {
        financialLines.push({
          key: 'store-discount-total',
          label: global.t?.t(
            'orders',
            'label',
            isiFoodOrder ? 'storeSubsidy' : 'storeSubsidizedDiscount',
          ),
          value: isiFoodOrder
            ? remoteFinancial.merchant_subsidy ||
              remoteFinancial.store_discount_total ||
              0
            : remoteFinancial.store_discount_total || 0,
          money: true,
        });
      }

      if (Number(remoteFinancial.platform_discount_total || 0)) {
        financialLines.push({
          key: 'platform-discount-total',
          label: global.t?.t(
            'orders',
            'label',
            isiFoodOrder ? 'ifoodSubsidy' : 'platformSubsidizedDiscount',
          ),
          value: isiFoodOrder
            ? remoteFinancial.ifood_subsidy ||
              remoteFinancial.platform_discount_total ||
              0
            : remoteFinancial.platform_discount_total || 0,
          money: true,
        });
      }

      if (isiFoodOrder && !!remoteFinancial.payment_brand) {
        financialLines.push({
          key: 'payment-brand',
          label: global.t?.t('orders', 'label', 'brand'),
          value: remoteFinancial.payment_brand,
        });
      }

      if (isiFoodOrder && Number(remoteFinancial.change_for || 0) > 0) {
        financialLines.push({
          key: 'change-for',
          label: global.t?.t('orders', 'label', 'changeFor'),
          value: remoteFinancial.change_for || 0,
          money: true,
        });
      }

      if (Number(remoteFinancial.store_charged_delivery_price || 0)) {
        financialLines.push({
          key: 'original-delivery-fee',
          label: global.t?.t('orders', 'label', 'originalDeliveryFee'),
          value: remoteFinancial.store_charged_delivery_price || 0,
          money: true,
        });
      }

      financialLines.push({
        key: 'customer-total',
        label: global.t?.t('orders', 'label', 'customerTotal'),
        value: remoteFinancial.customer_total || 0,
        money: true,
        strong: true,
      });

      if (showCollectOnDelivery) {
        financialLines.push({
          key: 'collect-from-customer',
          label: global.t?.t('orders', 'label', 'collectFromCustomer'),
          value: collectOnDeliveryAmount || 0,
          money: true,
          strong: true,
        });
      }
    }

    if (remotePayment) {
      paymentCards.push(
        {
          key: 'amount-paid',
          label: global.t?.t('orders', 'label', 'paid'),
          value: remotePayment.amount_paid || 0,
        },
        {
          key: 'amount-pending',
          label: global.t?.t('orders', 'label', 'pending'),
          value: remotePayment.amount_pending || 0,
        },
      );

      if (showCollectOnDelivery) {
        paymentCards.push({
          key: 'collect-customer',
          label: global.t?.t('orders', 'label', 'collectCustomer'),
          value: collectOnDeliveryAmount || 0,
        });
      }
    }

    if (remotePayment && showDeliveryPaymentSection) {
      if (showCollectOnDelivery) {
        deliveryPaymentLines.push({
          key: 'delivery-collect',
          label: isCashPayment
            ? global.t?.t('orders', 'label', 'collectCashOnDelivery')
            : global.t?.t('orders', 'label', 'collectOnDelivery'),
          value: collectOnDeliveryAmount || 0,
          strong: true,
        });
      }

      if (changeFor > 0) {
        deliveryPaymentLines.push({
          key: 'delivery-change-for',
          label: global.t?.t('orders', 'label', 'changeFor'),
          value: changeFor,
        });
      }

      if (changeAmount > 0.009) {
        deliveryPaymentLines.push({
          key: 'delivery-change-amount',
          label: global.t?.t('orders', 'label', 'changeToReturn'),
          value: changeAmount,
        });
      }

      if (shopPaidMoney > 0) {
        deliveryPaymentLines.push({
          key: 'delivery-shop-paid',
          label: global.t?.t('orders', 'label', 'courierTransferToMerchant'),
          value: shopPaidMoney,
        });
      }
    }

    if (isScheduledOrder) {
      if (scheduledWindowLabel) {
        schedulingLines.push({
          key: 'schedule-window',
          label: global.t?.t('orders', 'label', 'window'),
          value: scheduledWindowLabel,
        });
      }

      if (scheduledDeliveryDateTimeRaw) {
        schedulingLines.push({
          key: 'schedule-delivery',
          label: global.t?.t('orders', 'label', 'delivery'),
          value: formatScheduledDate(scheduledDeliveryDateTimeRaw),
        });
      }

      if (scheduledPreparationStartRaw) {
        schedulingLines.push({
          key: 'schedule-preparation',
          label: global.t?.t('orders', 'label', 'startPreparation'),
          value: formatScheduledDate(scheduledPreparationStartRaw),
        });
      }
    }

    if (taxDocumentRequested) {
      taxDocumentLines.push({
        key: 'tax-document-requested',
        label: '',
        value:
          global.t?.t('orders', 'message', 'customerRequestedTaxDocument') ||
          'Cliente solicitou documento fiscal neste pedido.',
      });

      if (customerDocument) {
        taxDocumentLines.push({
          key: 'tax-document-value',
          label: customerDocumentLabel,
          value: customerDocument,
        });
      }
    }

    if (customerName) {
      customerLines.push({
        key: 'customer-name',
        label: '',
        value: customerName,
      });
    }

    if (customerPhone) {
      customerLines.push({
        key: 'customer-phone',
        label: global.t?.t('orders', 'label', 'phone'),
        value: customerPhone,
      });
    }

    if (customerDocument) {
      customerLines.push({
        key: 'customer-document',
        label: customerDocumentLabel,
        value: customerDocument,
      });
    }

    if (localAddressParts.primary) {
      addressLines.push({
        key: 'address-primary',
        label: '',
        value: localAddressParts.primary,
      });
    } else if (remoteAddress?.display || remoteAddress?.poi_address) {
      addressLines.push({
        key: 'address-primary',
        label: '',
        value: resolvePreferredText(
          remoteAddress?.display,
          remoteAddress?.poi_address,
        ),
      });
    }

    if (localAddressParts.streetLine) {
      addressLines.push({
        key: 'address-street-line',
        label: global.t?.t('orders', 'label', 'streetNumber'),
        value: localAddressParts.streetLine,
      });
    } else {
      const remoteStreetLine = [remoteAddress?.street_name, remoteAddress?.street_number]
        .map(normalizeText)
        .filter(Boolean)
        .join(', ');

      if (remoteStreetLine) {
        addressLines.push({
          key: 'address-street-line',
          label: global.t?.t('orders', 'label', 'streetNumber'),
          value: remoteStreetLine,
        });
      }
    }

    if (localAddressParts.district || remoteAddress?.district) {
      addressLines.push({
        key: 'address-district',
        label: global.t?.t('orders', 'label', 'district'),
        value: localAddressParts.district || remoteAddress?.district,
      });
    }

    const localCityStateLine =
      localAddressParts.cityStateLine ||
      [remoteAddress?.city, remoteAddress?.state]
        .map(normalizeText)
        .filter(Boolean)
        .join(' / ');

    if (localCityStateLine) {
      addressLines.push({
        key: 'address-city-state',
        label: global.t?.t('orders', 'label', 'cityState'),
        value: localCityStateLine,
      });
    }

    if (localAddressParts.postalCode || remoteAddress?.postal_code) {
      addressLines.push({
        key: 'address-postal-code',
        label: global.t?.t('orders', 'label', 'zipCode'),
        value: localAddressParts.postalCode || remoteAddress?.postal_code,
      });
    }

    if (localAddressParts.nickname || remoteAddress?.reference) {
      addressLines.push({
        key: 'address-reference',
        label: global.t?.t('orders', 'label', 'reference'),
        value: localAddressParts.nickname || remoteAddress?.reference,
      });
    }

    if (localAddressParts.complement || remoteAddress?.complement) {
      addressLines.push({
        key: 'address-complement',
        label: global.t?.t('orders', 'label', 'complement'),
        value: localAddressParts.complement || remoteAddress?.complement,
      });
    }

    if (pickupCode) {
      codesLines.push({
        key: 'code-pickup',
        label: global.t?.t('orders', 'label', 'pickupCode'),
        value: pickupCode,
      });
    }

    if (handoverCode) {
      codesLines.push({
        key: 'code-handover',
        label: global.t?.t('orders', 'label', 'handoverCode'),
        value: handoverCode,
      });
    }

    if (remoteDelivery?.locator) {
      codesLines.push({
        key: 'code-locator',
        label: global.t?.t('orders', 'label', 'locator'),
        value: remoteDelivery.locator,
      });
    }

    if (remoteDelivery?.virtual_phone_number) {
      codesLines.push({
        key: 'code-virtual-phone',
        label: global.t?.t('orders', 'label', 'virtualPhone'),
        value: remoteDelivery.virtual_phone_number,
      });
    }

    if (orderObservationText) {
      observationLines.push({
        key: 'observation-main',
        label: '',
        value: orderObservationText,
      });
    }

    if (shouldShowItemRemarks) {
      observationLines.push({
        key: 'observation-items',
        label:
          global.t?.t('orders', 'label', 'itemsObservation') ||
          'Observações dos itens',
        value: itemRemarksText,
      });
    }

    if (
      remoteNotes?.need_cutlery !== null &&
      remoteNotes?.need_cutlery !== undefined
    ) {
      observationLines.push({
        key: 'observation-cutlery',
        label: global.t?.t('orders', 'label', 'needCutlery'),
        value: remoteNotes.need_cutlery
          ? global.t?.t('orders', 'label', 'yes')
          : global.t?.t('orders', 'label', 'no'),
      });
    }

    return {
      enabled: true,
      isFood99: is99FoodOrder,
      isIfood: isiFoodOrder,
      platformLabel,
      isLoading: remoteStateLoading,
      hasVisualData: !!(remoteState || fallbackSummary),
      usingFallback: !remoteState && !!fallbackSummary,
      operationTitle: isiFoodOrder
        ? global.t?.t('orders', 'title', 'ifoodOperation')
        : global.t?.t('orders', 'title', 'food99Operation'),
      courierTitle: isiFoodOrder
        ? global.t?.t('orders', 'title', 'ifoodCourier')
        : global.t?.t('orders', 'title', 'food99Courier'),
      financeTitle: isiFoodOrder
        ? global.t?.t('orders', 'title', 'ifoodFinance')
        : global.t?.t('orders', 'title', 'food99Finance'),
      taxDocumentTitle:
        global.t?.t('orders', 'title', 'taxDocumentRequested') ||
        'Documento para nota fiscal',
      operationLines,
      courierLines,
      financial: financialLines,
      paymentCards,
      deliveryPaymentLines,
      schedulingLines,
      taxDocumentLines,
      customerLines,
      addressLines,
      codesLines,
      observationLines,
      actionButtons,
      cancelFlow: {
        visible: cancelModalVisible,
        channelLabel: platformLabel,
        reasonsLoading: cancelReasonsLoading,
        selectedReasonId: selectedCancelReasonId,
        reasons: applicableCancelReasons,
        requiresReasonText: requiresCancelReasonText,
        reasonText: cancelReasonText,
        actionLoading: remoteActionLoading,
        onOpen: handleOpenCancelFlow,
        onClose: resetCancelFlow,
        onSelectReason: setSelectedCancelReasonId,
        onChangeReasonText: setCancelReasonText,
        onSubmit: handleConfirmCancel,
      },
      deliveryFlow: {
        visible: deliveryModalVisible,
        platformLabel,
        actionLoading: remoteActionLoading,
        isHandoverFlow,
        isFood99: is99FoodOrder,
        isIfood: isiFoodOrder,
        step: deliveryFlowStep,
        locator: activeLocator,
        remoteLocator: resolvePreferredText(remoteDelivery?.locator),
        handoverLink,
        pickupCode,
        handoverCode,
        locatorLength: remoteCapabilities.deliveryLocatorLength,
        confirmationCodeLength: remoteCapabilities.deliveryCodeLength,
        confirmationCode: deliveryConfirmationCode,
        onClose: closeDeliveryFlow,
        onBack: () => {
          setDeliveryFlowStep('locator');
          setDeliveryConfirmationCode('');
        },
        onChangeLocator: value => {
          setDeliveryLocator(
            normalizeDigits(value, remoteCapabilities.deliveryLocatorLength),
          );
        },
        onChangeConfirmationCode: value => {
          setDeliveryConfirmationCode(
            normalizeDigits(value, remoteCapabilities.deliveryCodeLength),
          );
        },
        onCopyLocator: handleCopyLocator,
        onOpenLink: handleOpenHandoverLink,
        onCopyLink: handleCopyHandoverLink,
        onShareWhatsapp: handleShareHandoverWhatsapp,
        onVerifyLocator: handleVerifyLocator,
        onOpen: handleDeliverPress,
        onSubmit: handleConfirmDelivery,
      },
    };
  }, [
    actionButtons,
    activeLocator,
    applicableCancelReasons,
    cancelModalVisible,
    cancelReasonText,
    cancelReasonsLoading,
    closeDeliveryFlow,
    collectOnDeliveryAmount,
    customerDocument,
    customerDocumentLabel,
    customerName,
    customerPhone,
    deliveryConfirmationCode,
    deliveryFlowStep,
    deliveryModalVisible,
    fallbackSummary,
    handleConfirmCancel,
    handleConfirmDelivery,
    handleCopyHandoverLink,
    handleCopyLocator,
    handleDeliverPress,
    handleOpenCancelFlow,
    handleOpenHandoverLink,
    handleShareHandoverWhatsapp,
    handleVerifyLocator,
    handoverCode,
    handoverLink,
    hasMarketplaceIntegration,
    is99FoodOrder,
    isHandoverFlow,
    isPickupLikeOrder,
    isScheduledOrder,
    isiFoodDineInOrder,
    isiFoodOrder,
    isiFoodTakeoutOrder,
    itemRemarksText,
    localAddressParts,
    orderObservationText,
    pickupAreaCode,
    pickupAreaTypeLabel,
    pickupCode,
    platformLabel,
    remoteCapabilities.deliveryCodeLength,
    remoteCapabilities.deliveryLocatorLength,
    remoteDelivery,
    remoteFinancial,
    remoteFulfillmentLabel,
    remoteIntegration,
    remoteNegotiation,
    remoteNotes,
    remoteObservability,
    remotePayment,
    remotePaymentChannel,
    remotePaymentMethod,
    remoteState,
    remoteStateLoading,
    resetCancelFlow,
    selectedCancelReasonId,
    selectedPaymentLabel,
    shopPaidMoney,
    shouldShowItemRemarks,
    showCollectOnDelivery,
    showDeliveryPaymentSection,
    takeoutDateTime,
    takeoutModeLabel,
    taxDocumentRequested,
    scheduledDeliveryDateTimeRaw,
    scheduledPreparationStartRaw,
    scheduledWindowLabel,
    dineInDateTime,
    changeAmount,
    changeFor,
    cancellationSourceLabel,
    remoteContextLabel,
  ]);

  return {
    hasMarketplaceIntegration,
    ensureMarketplaceSummary,
    fallbackOrderProducts,
    summary,
  };
};

export default useOrderMarketplaceSummary;
