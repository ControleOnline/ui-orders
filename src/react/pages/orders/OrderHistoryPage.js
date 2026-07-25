import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {app_type} from '@appType';
import { useStore } from '@store';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import DefaultExternalFilters from '@controleonline/ui-default/src/react/components/filters/DefaultExternalFilters';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {
  persistTableFiltersPreference,
  resolveStoredTableFiltersPreference,
} from '@controleonline/ui-default/src/react/utils/tableVisibleColumnsPreferences';
import {
  canDeviceViewCompanyOrders,
  isPosCashRegisterClosed,
  isPosCounterMode,
  isPosSingleItemMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import { getDateRange } from '@controleonline/ui-common/src/react/utils/dateRangeFilter';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import {
  buildAddProductsRouteParams,
  buildManagerPdvRouteParams,
  buildOrderDetailsRouteParams,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import usePosCartSession from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';
import { shouldResumeCounterOrderFlow } from '@controleonline/ui-orders/src/react/utils/counterOrderFlow';
import { resolveHistoryOrderTypeQuery } from '@controleonline/ui-orders/src/react/utils/orderHistoryQuery';
import StateStore from '@controleonline/ui-common/src/react/components/StateStore';
import {
  getCancelReasonLabel,
  OrderCancelModal,
  OrderCancellationDetailsModal,
  OrderCancellationReasonsModal,
} from './OrderCancellationModals';
import createStyles from './OrderHistoryPage.styles';

const ORDER_TYPE_FILTER_KEYS = new Set(['sale', 'purchase', 'transfer', 'loss']);
const SIMPLE_TAB_KEYS = new Set(['transfer', 'loss']);
const TERMINAL_ORDER_STATUSES = new Set(['closed', 'canceled', 'cancelled']);
const ORDER_HISTORY_TABLE_PREFERENCE_KEY = 'order-history-page';
const ORDER_HISTORY_FILTER_PREFERENCE_SCOPE = {
  routeKey: ORDER_HISTORY_TABLE_PREFERENCE_KEY,
  storeKey: 'orders',
};

const normalizeText = value => String(value || '').trim();

const buildDefaultHistoryFilters = () => ({
  alterDate: {
    shortcut: 'today',
    customRange: { from: '', to: '' },
  },
});

const resolveInitialHistoryFilters = () => {
  const storedFilters = resolveStoredTableFiltersPreference(
    ORDER_HISTORY_FILTER_PREFERENCE_SCOPE,
  );

  return storedFilters !== null ? storedFilters : buildDefaultHistoryFilters();
};

const buildExternalColumnsSignature = columns =>
  (Array.isArray(columns) ? columns : [])
    .map(column => [
      column?.key || column?.name || '',
      column?.externalFilter === true ? '1' : '0',
      column?.inputType || column?.type || '',
      column?.label || '',
      column?.list ? '1' : '0',
      column?.emptyOptionLabel || '',
    ].join(':'))
    .join('|');

const resolveOrderTypeFilter = value => {
  const normalizedValue = normalizeText(value).toLowerCase();
  return ORDER_TYPE_FILTER_KEYS.has(normalizedValue) ? normalizedValue : 'sale';
};

const resolveDateRangeFilter = value => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const shortcut = value.shortcut || value.value || 'all';
  const customRange = value.customRange || { from: '', to: '' };
  const dateRange = getDateRange(shortcut, customRange, {
    relativeMode: 'rolling',
    useCurrentMoment: true,
  });

  return {
    after: dateRange?.after || '',
    before: dateRange?.before || '',
  };
};

const getEntityId = entity => {
  if (!entity) return null;

  if (typeof entity === 'number' || typeof entity === 'string') {
    const matches = String(entity).match(/\d+/g);
    return matches ? Number(matches[matches.length - 1]) : null;
  }

  if (typeof entity === 'object') {
    if (entity.id) return Number(entity.id);
    if (entity['@id']) {
      const matches = String(entity['@id']).match(/\d+/g);
      return matches ? Number(matches[matches.length - 1]) : null;
    }
  }

  return null;
};

const getPeopleLabel = entity =>
  normalizeText(
    entity?.alias ||
    entity?.name ||
    entity?.fantasy_name ||
    entity?.company ||
    entity?.document
  );

const formatApiError = error =>
  normalizeText(
    error?.errmsg ||
    error?.message ||
    error?.error ||
    error?.description ||
    error?.['hydra:description'],
  ) || 'Nao foi possivel concluir a operacao.';

const isCancelableOrder = order => {
  const realStatus = normalizeText(order?.status?.realStatus || order?.realStatus).toLowerCase();
  const status = normalizeText(order?.status?.status || order?.status).toLowerCase();

  return !TERMINAL_ORDER_STATUSES.has(realStatus) && !TERMINAL_ORDER_STATUSES.has(status);
};

const isCanceledOrder = order => {
  const realStatus = normalizeText(order?.status?.realStatus || order?.realStatus).toLowerCase();
  const status = normalizeText(order?.status?.status || order?.status).toLowerCase();

  return ['canceled', 'cancelled'].includes(realStatus) ||
    ['canceled', 'cancelled', 'cancelado'].includes(status);
};

const getCurrentUserLabel = user =>
  normalizeText(
    user?.people?.alias ||
    user?.people?.name ||
    user?.name ||
    user?.email ||
    user?.username,
  );

const buildOrderHistoryPalette = themeColors => ({
  cardBackground: themeColors.cardBackground,
  cardBorder: themeColors.cardBorder,
  cardShadow: themeColors.cardShadow,
  dividerBorder: themeColors.dividerBorder,
  pageBackground: themeColors.pageBackground,
  textPrimary: themeColors.textPrimary,
  textSecondary: themeColors.textSecondary,
});

export const buildHistoryRequestParams = ({
  appType = app_type,
  canViewCompanyOrders,
  currentCompanyId,
  currentDeviceId,
  filters,
  orderTypeFilter,
  showAdvancedFilters,
}) => {
  if (!currentCompanyId) {
    return null;
  }

  const query = {
    provider: `/people/${currentCompanyId}`,
    orderType: resolveHistoryOrderTypeQuery({
      orderTypeFilter,
    }),
  };

  if (showAdvancedFilters && orderTypeFilter === 'sale') {
    query.report = 1;
  }

  if (!showAdvancedFilters && orderTypeFilter === 'sale') {
    query['status.realStatus'] = 'open';
  }

  if (showAdvancedFilters && filters?.app) {
    query.app = filters.app;
  }

  if (showAdvancedFilters && filters?.status) {
    query.status = filters.status;
  }

  if (appType === 'POS' && !canViewCompanyOrders && currentDeviceId) {
    query['device.device'] = currentDeviceId;
  }

  if (showAdvancedFilters) {
    const orderDateRange = resolveDateRangeFilter(filters?.orderDate);
    const dateRange = resolveDateRangeFilter(filters?.alterDate);

    if (orderDateRange?.after) {
      query['orderDate[after]'] = orderDateRange.after;
    }

    if (orderDateRange?.before) {
      query['orderDate[before]'] = orderDateRange.before;
    }

    if (dateRange?.after) {
      query['alterDate[after]'] = dateRange.after;
    }

    if (dateRange?.before) {
      query['alterDate[before]'] = dateRange.before;
    }
  }

  return query;
};

export default function OrderHistoryPage({ navigation, route }) {
  const ordersStore = useStore('orders');
  const peopleStore = useStore('people');
  const statusStore = useStore('status');
  const themeStore = useStore('theme');
  const authStore = useStore('auth');
  const deviceConfigStore = useStore('device_config');
  const deviceStore = useStore('device');
  const { showError, showSuccess } = useMessage() || {};
  const isFocused = useIsFocused();

  const { item: storagedDevice } = deviceStore.getters || {};
  const { item: deviceConfig } = deviceConfigStore.getters || {};
  const { actions: peopleActions, getters: peopleGetters } = peopleStore;
  const { getters: statusGetters } = statusStore;
  const { currentCompany, defaultCompany } = peopleGetters;
  const { colors: themeColors } = themeStore.getters;
  const currentUserLabel = getCurrentUserLabel(authStore?.getters?.user);
  const { actions: orderActions, getters: ordersGetters } = ordersStore;
  const orderHistoryPalette = useMemo(
    () => buildOrderHistoryPalette(themeColors),
    [themeColors],
  );
  const styles = useMemo(() => createStyles(orderHistoryPalette), [orderHistoryPalette]);

  const isPosApp = app_type === 'POS';
  const canViewCompanyOrders = useMemo(
    () => canDeviceViewCompanyOrders(deviceConfig?.configs),
    [deviceConfig?.configs],
  );
  const shouldRestrictToDeviceOrders = isPosApp && !canViewCompanyOrders;
  const showAdvancedFilters = !isPosApp || canViewCompanyOrders;
  const showHistoryToolbar = !shouldRestrictToDeviceOrders;
  const showOrderHistoryRowActions = !isPosApp;
  const statusItems = useMemo(
    () => (Array.isArray(statusGetters.items) ? statusGetters.items : []),
    [statusGetters.items],
  );
  const allChannelOption = useMemo(
    () => ({
      value: '',
      label: normalizeText(global.t?.t('orders', 'label', 'all')) || 'All',
    }),
    [],
  );
  const [historyFilters, setHistoryFilters] = useState(resolveInitialHistoryFilters);
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelReasons, setCancelReasons] = useState([]);
  const [selectedCancelReasonId, setSelectedCancelReasonId] = useState('');
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [cancelDetailsOrder, setCancelDetailsOrder] = useState(null);
  const [cancelReasonsLoading, setCancelReasonsLoading] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [reasonManagerVisible, setReasonManagerVisible] = useState(false);
  const applyHistoryFilters = useCallback(
    nextFilters => {
      const resolvedFilters =
        nextFilters && typeof nextFilters === 'object' && !Array.isArray(nextFilters)
          ? nextFilters
          : {};

      persistTableFiltersPreference(
        ORDER_HISTORY_FILTER_PREFERENCE_SCOPE,
        resolvedFilters,
      );
      setHistoryFilters(resolvedFilters);

      if (typeof orderActions.setFilters === 'function') {
        orderActions.setFilters(resolvedFilters);
      }
    },
    [orderActions],
  );
  const [purchaseSuppliersById, setPurchaseSuppliersById] = useState({});
  const loadingPurchaseSuppliersRef = useRef(new Set());

  const routeOrderTypeFilter = useMemo(
    () => resolveOrderTypeFilter(route?.params?.orderTypeFilter),
    [route?.params?.orderTypeFilter],
  );
  const orderTypeFilter = routeOrderTypeFilter;

  const defaultHistoryTitle =
    normalizeText(global.t?.t('configs', 'title', 'orderHistory')) ||
    'Historico de pedidos';
  const historyPageTitle = useMemo(
    () => normalizeText(route?.params?.historyTitle) || defaultHistoryTitle,
    [defaultHistoryTitle, route?.params?.historyTitle],
  );

  const statusOptions = useMemo(() => {
    const seenKeys = new Set();
    return statusItems
      .filter(item => normalizeText(item?.context).toLowerCase() === 'order')
      .reduce((accumulator, status) => {
        const key = normalizeText(
          status?.['@id'] || (status?.id ? `/statuses/${status.id}` : ''),
        );

        if (!key || seenKeys.has(key)) {
          return accumulator;
        }

        seenKeys.add(key);
        const statusKey = normalizeText(status?.status).toLowerCase();
        accumulator.push({
          value: key,
          label:
            normalizeText(global.t?.t('orders', 'status', statusKey)) ||
            normalizeText(status?.status) ||
            key,
        });
        return accumulator;
      }, []);
  }, [statusItems]);

  useEffect(() => {
    navigation.setOptions?.({ title: historyPageTitle });
  }, [historyPageTitle, navigation]);

  useEffect(() => {
    setHistoryFilters(current => {
      const next = { ...current };
      let changed = false;

      if (
        next.status &&
        !statusOptions.some(option => option.value === next.status || option.key === next.status)
      ) {
        delete next.status;
        changed = true;
      }

      if (changed) {
        persistTableFiltersPreference(
          ORDER_HISTORY_FILTER_PREFERENCE_SCOPE,
          next,
        );
        if (typeof orderActions.setFilters === 'function') {
          orderActions.setFilters(next);
        }
      }

      return changed ? next : current;
    });
  }, [orderActions, statusOptions]);

  const isCashRegisterClosed = useMemo(
    () => isPosCashRegisterClosed(deviceConfig?.configs),
    [deviceConfig?.configs],
  );
  const isCounterMode = useMemo(
    () => isPosCounterMode(deviceConfig?.configs),
    [deviceConfig?.configs],
  );
  const shouldResumeCounterFlow = useMemo(
    () =>
      shouldResumeCounterOrderFlow({
        appType: app_type,
        isCounterMode,
        resumeCounterFlow: route?.params?.resumeCounterFlow,
      }),
    [isCounterMode, route?.params?.resumeCounterFlow],
  );
  const { resolveCounterStartDestination } = usePosCartSession({
    companyId: currentCompany?.id,
    deviceId: storagedDevice?.id,
    defaultStatusId: defaultCompany?.configs?.['pos-default-status'],
    companyConfigs: currentCompany?.configs,
  });

  useEffect(() => {
    if (!isFocused || !shouldResumeCounterFlow) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const destination = await resolveCounterStartDestination();

        if (cancelled) {
          return;
        }

        if (destination.screen === 'OrderHistoryPage') {
          navigation.setParams?.({ resumeCounterFlow: false });
          return;
        }

        if (destination.screen === 'OrderDetails' && destination.order) {
          navigation.replace(
            'OrderDetails',
            buildOrderDetailsRouteParams(destination.order),
          );
          return;
        }

        navigation.replace('AddProductScreen');
      } catch {
        if (!cancelled) {
          navigation.replace('AddProductScreen');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isFocused,
    navigation,
    resolveCounterStartDestination,
    shouldResumeCounterFlow,
  ]);

  useEffect(() => {
    if (isFocused && app_type === 'POS' && isCashRegisterClosed) {
      navigation.navigate('CloseCashRegister');
    }
  }, [isCashRegisterClosed, isFocused, navigation]);

  const searchPlaceholder = useMemo(() => {
    if (orderTypeFilter === 'purchase') {
      return global.t?.t('orders', 'placeholder', 'search_purchase');
    }
    if (orderTypeFilter === 'transfer') {
      return global.t?.t('orders', 'placeholder', 'search_transfer');
    }
    if (orderTypeFilter === 'loss') {
      return global.t?.t('orders', 'placeholder', 'search_loss');
    }
    return global.t?.t('orders', 'placeholder', 'search_default');
  }, [orderTypeFilter]);

  const configuredOrderColumns = useMemo(
    () => (ordersGetters.columns || []).map(column => {
      const fieldName = column?.name || column?.key;

      if (fieldName === 'app') {
        return {
          ...column,
          externalFilter: showAdvancedFilters && orderTypeFilter === 'sale',
          emptyOptionLabel: allChannelOption.label,
          label: 'channel',
        };
      }

      if (fieldName === 'status') {
        return {
          ...column,
          externalFilter: showAdvancedFilters && !SIMPLE_TAB_KEYS.has(orderTypeFilter),
          emptyOptionLabel: allChannelOption.label,
          list: 'status/getItems',
        };
      }

      if (fieldName === 'orderDate') {
        return {
          ...column,
          externalFilter: showAdvancedFilters,
          inputType: 'date-range',
          show: true,
        };
      }

      if (fieldName === 'alterDate') {
        return {
          ...column,
          externalFilter: showAdvancedFilters,
          inputType: 'date-range',
          label: 'period',
        };
      }

      return {
        ...column,
        externalFilter: false,
      };
    }),
    [
      allChannelOption.label,
      orderTypeFilter,
      ordersGetters.columns,
      showAdvancedFilters,
    ],
  );
  const orderColumnsReady = useMemo(
    () =>
      buildExternalColumnsSignature(ordersGetters.columns) ===
      buildExternalColumnsSignature(configuredOrderColumns),
    [configuredOrderColumns, ordersGetters.columns],
  );
  const getExternalFilterOptions = useCallback(
    column => {
      const fieldName = column?.name || column?.key;
      if (fieldName === 'status') return statusOptions;

      return [];
    },
    [statusOptions],
  );

  useEffect(() => {
    if (!orderColumnsReady) {
      orderActions.setColumns(configuredOrderColumns);
    }
  }, [configuredOrderColumns, orderActions, orderColumnsReady]);

  const historyRequestParams = useMemo(
    () =>
      buildHistoryRequestParams({
        appType: app_type,
        canViewCompanyOrders,
        currentCompanyId: currentCompany?.id,
        currentDeviceId: storagedDevice?.id,
        filters: historyFilters,
        orderTypeFilter,
        showAdvancedFilters,
      }),
    [
      canViewCompanyOrders,
      currentCompany?.id,
      historyFilters,
      orderTypeFilter,
      showAdvancedFilters,
      storagedDevice?.id,
    ],
  );

  const orders = useMemo(
    () => (Array.isArray(ordersGetters.items) ? ordersGetters.items : []),
    [ordersGetters.items],
  );

  const loadCancelReasons = useCallback(async order => {
    const orderId = getEntityId(order);
    if (!orderId || typeof orderActions.getCancelReasons !== 'function') {
      setCancelReasons([]);
      return [];
    }

    setCancelReasonsLoading(true);
    try {
      const reasons = await orderActions.getCancelReasons({
        id: orderId,
        companyId: currentCompany?.id,
      });
      const applicableReasons = (Array.isArray(reasons) ? reasons : [])
        .filter(reason => reason?.applicable !== false);
      setCancelReasons(applicableReasons);
      return applicableReasons;
    } catch (error) {
      setCancelReasons([]);
      showError?.(formatApiError(error));
      return [];
    } finally {
      setCancelReasonsLoading(false);
    }
  }, [currentCompany?.id, orderActions, showError]);

  const openCancelModal = useCallback(order => {
    setCancelModalOrder(order);
    setCancelReasons([]);
    setSelectedCancelReasonId('');
    setCancelReasonText('');
    void loadCancelReasons(order);
  }, [loadCancelReasons]);

  const closeCancelModal = useCallback(() => {
    if (cancellingOrder) return;
    setCancelModalOrder(null);
    setCancelReasons([]);
    setSelectedCancelReasonId('');
    setCancelReasonText('');
  }, [cancellingOrder]);

  const closeReasonManager = useCallback(() => {
    setReasonManagerVisible(false);
    if (cancelModalOrder) {
      void loadCancelReasons(cancelModalOrder);
    }
  }, [cancelModalOrder, loadCancelReasons]);

  const confirmCancelOrder = useCallback(async () => {
    const orderId = getEntityId(cancelModalOrder);
    if (!orderId || typeof orderActions.cancelOrder !== 'function') {
      return;
    }

    const selectedReason = cancelReasons.find(reason =>
      normalizeText(
        reason?.reason_id ??
        reason?.reasonId ??
        reason?.cancelCodeId ??
        reason?.cancelCode ??
        reason?.code ??
        reason?.id ??
        reason?.value,
      ) === selectedCancelReasonId,
    );

    setCancellingOrder(true);
    try {
      await orderActions.cancelOrder({
        id: orderId,
        companyId: currentCompany?.id,
        reasonId: selectedCancelReasonId,
        reason: cancelReasonText || getCancelReasonLabel(selectedReason),
        reloadParams: historyRequestParams,
      });
      showSuccess?.(global.t?.t('orders', 'message', 'orderCanceled'));
      setCancelModalOrder(null);
      setCancelReasons([]);
      setSelectedCancelReasonId('');
      setCancelReasonText('');
    } catch (error) {
      showError?.(formatApiError(error));
    } finally {
      setCancellingOrder(false);
    }
  }, [
    cancelModalOrder,
    cancelReasonText,
    cancelReasons,
    currentCompany?.id,
    historyRequestParams,
    orderActions,
    selectedCancelReasonId,
    showError,
    showSuccess,
  ]);

  const orderToolbarActions = useMemo(
    () => [
      {
        key: 'order-cancellation-reasons',
        icon: 'tag',
        iconSize: 16,
        accessibilityLabel:
          global.t?.t('orders', 'button', 'manageCancelReasons') ||
          'Gerenciar motivos de cancelamento',
        hidden: !currentCompany?.id,
        color: themeColors.buttonText,
        style: {
          minWidth: 30,
          width: 30,
          paddingHorizontal: 0,
          backgroundColor: themeColors.buttonBackground,
          borderColor: themeColors.buttonBackground,
        },
        onPress: () => setReasonManagerVisible(true),
      },
    ],
    [currentCompany?.id, themeColors.buttonBackground, themeColors.buttonText],
  );

  const renderRowActions = useCallback(({ row }) => {
    if (isCanceledOrder(row)) {
      const infoColor = themeColors.iconInfo;

      return (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            global.t?.t('orders', 'button', 'viewCancellationDetails') ||
            'Ver cancelamento'
          }
          style={[
            styles.rowActionButton,
            {
              borderColor: infoColor,
              backgroundColor: orderHistoryPalette.cardBackground,
            },
          ]}
          activeOpacity={0.82}
          onPress={event => {
            event?.stopPropagation?.();
            setCancelDetailsOrder(row);
          }}
        >
          <Icon name="eye" size={16} color={infoColor} />
        </TouchableOpacity>
      );
    }

    if (!isCancelableOrder(row)) {
      return null;
    }

    const dangerColor = themeColors.iconDanger;

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={global.t?.t('orders', 'button', 'cancelOrder')}
        style={[
          styles.rowActionButton,
          {
            borderColor: dangerColor,
            backgroundColor: orderHistoryPalette.cardBackground,
          },
        ]}
        activeOpacity={0.82}
        onPress={event => {
          event?.stopPropagation?.();
          openCancelModal(row);
        }}
      >
        <Icon name="x-circle" size={16} color={dangerColor} />
      </TouchableOpacity>
    );
  }, [
    openCancelModal,
    orderHistoryPalette.cardBackground,
    styles.rowActionButton,
    themeColors,
  ]);

  useEffect(() => {
    const missingSupplierIds = [...new Set(
      orders
        .filter(order => order?.orderType === 'purchase')
        .map(order => {
          const supplierId = getEntityId(order?.client);
          const supplierLabel = getPeopleLabel(order?.client);
          const alreadyResolved = supplierId
            ? Object.prototype.hasOwnProperty.call(purchaseSuppliersById, supplierId)
            : false;

          if (
            !supplierId ||
            supplierLabel ||
            alreadyResolved ||
            loadingPurchaseSuppliersRef.current.has(supplierId)
          ) {
            return null;
          }

          return supplierId;
        })
        .filter(Boolean)
    )];

    if (!missingSupplierIds.length) return undefined;

    missingSupplierIds.forEach(id => loadingPurchaseSuppliersRef.current.add(id));

    let cancelled = false;

    (async () => {
      const resolvedSuppliers = await Promise.all(
        missingSupplierIds.map(async id => {
          try {
            const supplier = await peopleActions.get(id);
            return [id, getPeopleLabel(supplier)];
          } catch {
            return [id, ''];
          } finally {
            loadingPurchaseSuppliersRef.current.delete(id);
          }
        }),
      );

      if (cancelled) return;

      setPurchaseSuppliersById(prev => {
        let changed = false;
        const next = { ...prev };

        resolvedSuppliers.forEach(([id, label]) => {
          if (next[id] !== label) {
            next[id] = label;
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [orders, peopleActions, purchaseSuppliersById]);

  const goToAddProduct = useCallback(() => {
    if (orderTypeFilter === 'purchase') {
      navigation.navigate('PurchaseFormPage');
      return;
    }

    if (orderTypeFilter === 'transfer') {
      navigation.navigate('PurchaseFormPage', { mode: 'transfer' });
      return;
    }

    if (orderTypeFilter === 'loss') {
      return;
    }

    if (app_type === 'POS' && isCashRegisterClosed) {
      navigation.navigate('CloseCashRegister');
      return;
    }

    navigation.navigate('PdvPage', { startNewOrder: true });
  }, [navigation, isCashRegisterClosed, orderTypeFilter]);

  const openOrder = useCallback(order => {
    orderActions.syncOrder?.(order);

    if (isPosSingleItemMode(deviceConfig?.configs)) {
      navigation.navigate(
        'AddProductScreen',
        buildAddProductsRouteParams(
          order,
          buildManagerPdvRouteParams({ singleItemMode: true }),
        ),
      );
      return;
    }

    navigation.navigate('OrderDetails', buildOrderDetailsRouteParams(order));
  }, [deviceConfig?.configs, navigation, orderActions]);

  const renderCard = useCallback(({ item: order, openRow }) => {
    const isPurchase = order.orderType === 'purchase';
    const isTransfer = order.orderType === 'transfer';
    const isLoss = order.orderType === 'loss';
    const purchaseSupplierId = getEntityId(order?.client);
    const purchaseSupplierLabel =
      getPeopleLabel(order?.client) ||
      (purchaseSupplierId ? purchaseSuppliersById[purchaseSupplierId] : '');

    const channelLabel = isPurchase
      ? (purchaseSupplierLabel || global.t?.t('orders', 'label', 'supplier'))
      : isTransfer
        ? global.t?.t('orders', 'label', 'stock_transfer')
        : isLoss
          ? global.t?.t('orders', 'label', 'stock_loss')
          : '';
    const showChannelLabel = isPurchase || isTransfer || isLoss;

    return (
      <TouchableOpacity
        key={order.id}
        style={styles.orderCard}
        activeOpacity={0.85}
        onPress={openRow || (() => openOrder(order))}
      >
        <OrderHeader order={order} isKds={false} layout="historyCompact" />

        {showChannelLabel && (
          <View style={styles.cardMetaRow}>
            <Text style={styles.channelText} numberOfLines={1}>{channelLabel}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [openOrder, purchaseSuppliersById]);

  if (shouldResumeCounterFlow || !currentCompany?.id || !orderColumnsReady) {
    return (
      <StateStore
        mode="display"
        loading={global.t?.t('orders', 'label', 'loading')}
      />
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: orderHistoryPalette.pageBackground }]}
      edges={['bottom']}
    >
      <View style={styles.content}>
        <DefaultExternalFilters
          accentColor={themeColors.primary}
          filters={historyFilters}
          getOptionsForColumn={getExternalFilterOptions}
          onChangeFilters={applyHistoryFilters}
          storeName="orders"
        />

        <View style={styles.tableWrap}>
          <DefaultTable
            accentColor={themeColors.primary}
            add={orderTypeFilter === 'loss' ? false : null}
            filters={historyFilters}
            onAdd={goToAddProduct}
            onFilterChange={applyHistoryFilters}
            onRowPress={openOrder}
            pinRowActions={false}
            rowActionsComponent={renderRowActions}
            requestParams={historyRequestParams}
            renderCard={renderCard}
            searchProps={{
              placeholder: searchPlaceholder,
            }}
            showRowActions={showOrderHistoryRowActions}
            showToolbar={showHistoryToolbar}
            storeName="orders"
            summary={false}
            toolbarActions={orderToolbarActions}
            visibleColumnsPreferenceKey={ORDER_HISTORY_TABLE_PREFERENCE_KEY}
          />
        </View>
      </View>
      <OrderCancelModal
        accentColor={themeColors.iconDanger}
        cancelReasonText={cancelReasonText}
        cancelling={cancellingOrder}
        currentUserLabel={currentUserLabel}
        loadingReasons={cancelReasonsLoading}
        onChangeReasonText={setCancelReasonText}
        onClose={closeCancelModal}
        onConfirm={confirmCancelOrder}
        onManageReasons={() => setReasonManagerVisible(true)}
        onSelectReason={setSelectedCancelReasonId}
        order={cancelModalOrder}
        reasons={cancelReasons}
        selectedReasonId={selectedCancelReasonId}
        visible={!!cancelModalOrder}
      />
      <OrderCancellationDetailsModal
        accentColor={themeColors.primary}
        onClose={() => setCancelDetailsOrder(null)}
        order={cancelDetailsOrder}
        visible={!!cancelDetailsOrder}
      />
      <OrderCancellationReasonsModal
        accentColor={themeColors.primary}
        currentCompanyId={currentCompany?.id}
        onClose={closeReasonManager}
        visible={reasonManagerVisible}
      />
    </SafeAreaView>
  );
}
