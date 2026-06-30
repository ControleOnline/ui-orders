import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { env } from '@env';
import { useStore } from '@store';
import {api} from '@controleonline/ui-common/src/api';
import CompactFilterSelector from '@controleonline/ui-default/src/react/components/filters/CompactFilterSelector';
import DateShortcutFilter from '@controleonline/ui-default/src/react/components/filters/DateShortcutFilter';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {
  canDeviceViewCompanyOrders,
  isPosCounterMode,
  isPosCashRegisterClosed,
  isPosSingleItemMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import { getDateRange } from '@controleonline/ui-common/src/react/utils/dateRangeFilter';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import {
  buildAddProductsRouteParams,
  buildManagerPdvRouteParams,
  buildOrderDetailsRouteParams,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import { resolveOrderIdentity } from '@controleonline/ui-orders/src/react/utils/orderIdentity';
import usePosCartSession from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';
import {shouldResumeCounterOrderFlow} from '@controleonline/ui-orders/src/react/utils/counterOrderFlow';
import { colors } from '@controleonline/../../src/styles/colors';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import {
  resolveHistoryOrderTypeQuery,
} from '@controleonline/ui-orders/src/react/utils/orderHistoryQuery';
import styles from './OrderHistoryPage.styles';

/* ─── constantes ────────────────────────────────────────────────────── */

const PAGE_SIZE = 50;

/* tabs sem filtro de canal/status */
const ORDER_TYPE_FILTER_KEYS = new Set(['sale', 'purchase', 'transfer', 'loss']);
const SIMPLE_TAB_KEYS = new Set(['transfer', 'loss']);
const ORDER_HISTORY_COLUMN_NAMES = ['id', 'app', 'orderType', 'status', 'client', 'alterDate', 'price'];

/* ─── helpers ───────────────────────────────────────────────────────── */

const normalizeText = value => String(value || '').trim();

const resolveSummaryApps = response => {
  const apps =
    response?.summary?.report?.apps ||
    response?.summary?.apps ||
    response?.report?.apps ||
    response?.apps;

  if (!Array.isArray(apps)) {
    return [];
  }

  const seenKeys = new Set();

  return apps
    .map(app => {
      const key = normalizeText(app?.key || app?.app || app?.label);
      const label = normalizeText(app?.label || key);

      if (!key || seenKeys.has(key)) {
        return null;
      }

      seenKeys.add(key);

      return {
        key,
        label: label || key,
      };
    })
    .filter(Boolean);
};

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

const normalizeFilterValue = value => {
  if (value && typeof value === 'object') {
    return normalizeFilterValue(value.value ?? value.id ?? value['@id'] ?? '');
  }

  return normalizeText(value);
};

const getSearchText = o => {
  const identity = resolveOrderIdentity(o);

  return [
    o?.id,
    o?.app,
    identity?.internalId,
    identity?.externalId,
    identity?.primaryText,
    identity?.secondaryText,
    o?.client?.name,
    o?.client?.alias,
    o?.status?.status,
    o?.status?.realStatus,
  ].filter(Boolean).join(' ').toLowerCase();
};

/* ─── componente principal ──────────────────────────────────────────── */

export default function OrderHistoryPage({ navigation, route }) {
  const ordersStore = useStore('orders');
  const peopleStore = useStore('people');
  const statusStore = useStore('status');
  const themeStore = useStore('theme');
  const deviceConfigStore = useStore('device_config');
  const isFocused = useIsFocused();
  const deviceStore = useStore('device');
  const deviceGetters = deviceStore.getters;
  const { item: storagedDevice } = deviceGetters;
  const { item: deviceConfig } = deviceConfigStore.getters;
  const { actions: peopleActions, getters: peopleGetters } = peopleStore;
  const { actions: statusActions, getters: statusGetters } = statusStore;
  const { currentCompany, defaultCompany } = peopleGetters;
  const { colors: themeColors } = themeStore.getters;
  const { actions: orderActions, getters: ordersGetters } = ordersStore;
  const {
    columns: storedOrderColumns,
    items: storedOrders,
    totalItems: storedTotalItems,
    isLoadingList,
    loadedKey,
  } = ordersGetters;

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [themeColors, currentCompany?.id],
  );

  const canViewCompanyOrders = useMemo(
    () => canDeviceViewCompanyOrders(deviceConfig?.configs),
    [deviceConfig?.configs],
  );
  const [dynamicChannelOptions, setDynamicChannelOptions] = useState([]);
  const showAdvancedFilters = env.APP_TYPE !== 'POS' || canViewCompanyOrders;
  const statusItems = useMemo(
    () => (Array.isArray(statusGetters.items) ? statusGetters.items : []),
    [statusGetters.items],
  );
  const allChannelOption = useMemo(
    () => ({
      key: 'all',
      label: normalizeText(global.t?.t('orders', 'label', 'all')) || 'All',
    }),
    [],
  );
  const channelOptions = useMemo(
    () => [allChannelOption, ...dynamicChannelOptions],
    [allChannelOption, dynamicChannelOptions],
  );

  useEffect(() => {
    if (!isFocused || !currentCompany?.id) {
      return;
    }

    statusActions.getItems({ context: 'order' }).catch(() => {});
  }, [
    currentCompany?.id,
    isFocused,
    statusActions,
  ]);

  const statusOptions = useMemo(() => {
    const allStatusOption = {
      key: 'all',
      label: normalizeText(global.t?.t('orders', 'label', 'all')) || 'All',
    };
    const seenKeys = new Set(['all']);
    const mappedStatuses = statusItems
      .filter(item => normalizeText(item?.context).toLowerCase() === 'order')
      .reduce((accumulator, status) => {
        const key = normalizeText(
          status?.['@id'] || (status?.id ? `/statuses/${status.id}` : ''),
        );

        if (!key || seenKeys.has(key)) {
          return accumulator;
        }

        seenKeys.add(key);
        accumulator.push({
          key,
          label:
            normalizeText(global.t?.t('orders', 'status', status?.status)) ||
            normalizeText(status?.status) ||
            key,
        });
        return accumulator;
      }, []);

    return [allStatusOption, ...mappedStatuses];
  }, [statusItems]);

  /* ─── estado ──────────────────────────────────────────────────────── */

  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const [orderTypeFilter, setOrderTypeFilter] = useState(
    () => resolveOrderTypeFilter(route?.params?.orderTypeFilter),
  );
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [searchText, setSearchText] = useState('');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [tableFilters, setTableFilters] = useState({});
  const [sortState, setSortState] = useState({ field: 'id', direction: 'desc' });
  const [purchaseSuppliersById, setPurchaseSuppliersById] = useState({});

  useEffect(() => {
    if (
      statusFilter !== 'all' &&
      !statusOptions.some(option => option.key === statusFilter)
    ) {
      setStatusFilter('all');
    }
  }, [
    statusFilter,
    statusOptions,
  ]);

  const isCashRegisterClosed = useMemo(() => {
    return isPosCashRegisterClosed(deviceConfig?.configs);
  }, [deviceConfig?.configs]);
  const isCounterMode = useMemo(() => {
    return isPosCounterMode(deviceConfig?.configs);
  }, [deviceConfig?.configs]);
  const shouldResumeCounterFlow = useMemo(
    () =>
      shouldResumeCounterOrderFlow({
        appType: env.APP_TYPE,
        isCounterMode,
        resumeCounterFlow: route?.params?.resumeCounterFlow,
      }),
    [isCounterMode, route?.params?.resumeCounterFlow],
  );
  const { resolveCounterStartDestination } = usePosCartSession({
    companyId: currentCompany?.id,
    deviceId: storagedDevice?.id,
    defaultStatusId: defaultCompany?.configs?.['pos-default-status'],
  });

  const orders = useMemo(
    () => (Array.isArray(storedOrders) ? storedOrders : []),
    [storedOrders],
  );
  const totalOrders = Number(storedTotalItems || 0);
  const routeOrderTypeFilter = useMemo(
    () => resolveOrderTypeFilter(route?.params?.orderTypeFilter),
    [route?.params?.orderTypeFilter],
  );
  const defaultHistoryTitle =
    normalizeText(global.t?.t('configs', 'title', 'orderHistory')) ||
    'Historico de pedidos';
  const historyPageTitle = useMemo(
    () => normalizeText(route?.params?.historyTitle) || defaultHistoryTitle,
    [defaultHistoryTitle, route?.params?.historyTitle],
  );
  const currentChannelLabel = useMemo(
    () => channelOptions.find(option => option.key === channelFilter)?.label || channelOptions[0]?.label || 'All',
    [channelFilter, channelOptions],
  );
  const currentStatusLabel = useMemo(
    () => statusOptions.find(option => option.key === statusFilter)?.label || statusOptions[0]?.label || 'All',
    [statusFilter, statusOptions],
  );
  const visibleFilterCount = useMemo(
    () => [
      orderTypeFilter === 'sale',
      !SIMPLE_TAB_KEYS.has(orderTypeFilter),
      true,
    ].filter(Boolean).length,
    [orderTypeFilter],
  );
  const filterSelectorSlotStyle = useMemo(() => {
    if (visibleFilterCount >= 3) {
      return [styles.filterSelectorSlot, styles.filterSelectorSlotThird];
    }

    if (visibleFilterCount === 2) {
      return [styles.filterSelectorSlot, styles.filterSelectorSlotHalf];
    }

    return [styles.filterSelectorSlot, styles.filterSelectorSlotFull];
  }, [visibleFilterCount]);
  const searchPlaceholder = (() => {
    if (orderTypeFilter === 'purchase') return global.t?.t('orders', 'placeholder', 'search_purchase');
    if (orderTypeFilter === 'transfer') return global.t?.t('orders', 'placeholder', 'search_transfer');
    if (orderTypeFilter === 'loss') return global.t?.t('orders', 'placeholder', 'search_loss');
    return global.t?.t('orders', 'placeholder', 'search_default');
  })();
  const channelSummaryQuery = useMemo(() => {
    if (!currentCompany?.id || !showAdvancedFilters || orderTypeFilter !== 'sale') {
      return null;
    }

    return {
      provider: `/people/${currentCompany.id}`,
      orderType: resolveHistoryOrderTypeQuery({
        orderTypeFilter,
      }),
      page: 1,
      itemsPerPage: 1,
      report: 1,
    };
  }, [
    currentCompany?.id,
    orderTypeFilter,
    showAdvancedFilters,
  ]);
  const clearSearch = useCallback(() => setSearchText(''), []);
  const orderHistoryColumns = useMemo(() => {
    const columnsByName = new Map(
      (Array.isArray(storedOrderColumns) ? storedOrderColumns : [])
        .map(column => [column?.name || column?.key, column])
        .filter(([fieldName]) => Boolean(fieldName)),
    );

    return ORDER_HISTORY_COLUMN_NAMES.map(fieldName => {
      const sourceColumn = columnsByName.get(fieldName) || { name: fieldName, label: fieldName };
      const column = {
        ...sourceColumn,
        editable: false,
      };

      if (fieldName === 'status') {
        return {
          ...column,
          format: value => {
            const statusKey = normalizeText(value?.status || value?.realStatus || value);
            return normalizeText(global.t?.t('orders', 'status', statusKey)) || statusKey;
          },
        };
      }

      return column;
    });
  }, [storedOrderColumns]);

  /* ref para evitar fetch duplicado */
  const fetchingRef = useRef(false);
  const loadingPurchaseSuppliersRef = useRef(new Set());

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

    if (env.APP_TYPE === 'POS' && isCashRegisterClosed) {
      navigation.navigate('CloseCashRegister');
      return;
    }

    navigation.navigate('PdvPage', {startNewOrder: true});
  }, [navigation, isCashRegisterClosed, orderTypeFilter]);

  useEffect(() => {
    navigation.setOptions?.({ title: historyPageTitle });
  }, [historyPageTitle, navigation]);

  useEffect(() => {
    setOrderTypeFilter(routeOrderTypeFilter);
    setChannelFilter('all');
    setStatusFilter('all');
    setSearchText('');
  }, [routeOrderTypeFilter]);

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
          navigation.setParams?.({resumeCounterFlow: false});
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
    if (!isFocused || env.APP_TYPE !== 'POS') return;
    if (!isCashRegisterClosed) return;

    navigation.navigate('CloseCashRegister');
  }, [isFocused, isCashRegisterClosed, navigation]);

  useEffect(() => {
    let cancelled = false;

    if (!isFocused || !channelSummaryQuery) {
      setDynamicChannelOptions([]);
      return () => {
        cancelled = true;
      };
    }

    api.fetch('orders', {params: channelSummaryQuery})
      .then(response => {
        if (!cancelled) {
          setDynamicChannelOptions(resolveSummaryApps(response));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDynamicChannelOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    channelSummaryQuery,
    isFocused,
  ]);

  useEffect(() => {
    if (
      channelFilter !== 'all' &&
      !channelOptions.some(option => option.key === channelFilter)
    ) {
      setChannelFilter('all');
    }
  }, [
    channelFilter,
    channelOptions,
  ]);

  const historyQuery = useMemo(() => {
    if (!currentCompany?.id) return null;

    const query = {
      provider: `/people/${currentCompany.id}`,
    };

    const currentSort = sortState?.field && sortState?.direction
      ? sortState
      : { field: 'id', direction: 'desc' };

    query[`order[${currentSort.field}]`] = currentSort.direction;

    if (orderTypeFilter !== 'all') {
      query.orderType = resolveHistoryOrderTypeQuery({
        orderTypeFilter,
      });
    }

    if (!showAdvancedFilters && orderTypeFilter === 'sale') {
      query['status.realStatus'] = 'open';
    }

    if (showAdvancedFilters && channelFilter !== 'all') query.app = channelFilter;
    if (showAdvancedFilters && statusFilter !== 'all') query.status = statusFilter;
    if (searchText) query.search = searchText.replace(/^#/, '');

    Object.entries(tableFilters || {}).forEach(([key, value]) => {
      if (!key) return;
      if (key === 'search') {
        if (normalizeText(value)) query.search = normalizeText(value);
        return;
      }

      if (key === 'orderDate' || key === 'alterDate') {
        const dateRange = resolveDateRangeFilter(value);
        if (dateRange.after) query[`${key}[after]`] = dateRange.after;
        if (dateRange.before) query[`${key}[before]`] = dateRange.before;
        return;
      }

      if (Array.isArray(value)) {
        query[key] = value.map(normalizeFilterValue).filter(Boolean);
        return;
      }

      const normalizedValue = normalizeFilterValue(value);
      if (normalizedValue) {
        query[key] = normalizedValue;
      }
    });

    if (env.APP_TYPE === 'POS' && !canViewCompanyOrders && storagedDevice?.id) {
      query['device.device'] = storagedDevice.id;
    }

    const dateRange = showAdvancedFilters
      ? getDateRange(dateFilter, customRange, {
        relativeMode: 'rolling',
        useCurrentMoment: true,
      })
      : {};
    if (dateRange?.after) query['alterDate[after]'] = dateRange.after;
    if (dateRange?.before) query['alterDate[before]'] = dateRange.before;

    return query;
  }, [
    currentCompany?.id,
    orderTypeFilter,
    showAdvancedFilters,
    channelFilter,
    statusFilter,
    sortState?.direction,
    sortState?.field,
    canViewCompanyOrders,
    storagedDevice?.id,
    dateFilter,
    customRange,
    searchText,
    tableFilters,
  ]); 

  const historyLoadedKey = useMemo(
    () => JSON.stringify(historyQuery || {}),
    [historyQuery],
  );
  const hasMore = useMemo(() => {
    if (!orders.length) return false;
    if (totalOrders > 0) return orders.length < totalOrders;
    return orders.length % PAGE_SIZE === 0;
  }, [orders.length, totalOrders]);

  /* ─── fetch (aceita página, acumula ou substitui) ────────────────── */

  const fetchPage = useCallback(async (targetPage, replace = false) => {
    if (!historyQuery) {
      orderActions.setItems([]);
      orderActions.setTotalItems(0);
      setError('');
      return;
    }
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setError('');
      await orderActions.fetchHistoryPage({
        query: {
          ...historyQuery,
          page: targetPage,
        },
        append: !replace,
        loadedKey: historyLoadedKey,
      });
    } catch (err) {
      setError(
        err?.message ||
        global.t?.t('orders', 'state', 'Não foi possível carregar o histórico.'),
      );
    } finally {
      fetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [
    orderActions,
    historyLoadedKey,
    historyQuery,
  ]);

  /* carrega somente quando o snapshot atual da store não atende ao filtro atual */
  useEffect(() => {
    if (!isFocused) return;
    if (shouldResumeCounterFlow) return;

    if (!currentCompany?.id) {
      const shouldClearHistorySnapshot =
        (Array.isArray(storedOrders) && storedOrders.length > 0) ||
        Number(storedTotalItems || 0) > 0;

      if (shouldClearHistorySnapshot) {
        orderActions.setItems([]);
        orderActions.setTotalItems(0);
      }

      if (error) {
        setError('');
      }

      return;
    }

    const hasLoadedSnapshot =
      loadedKey === historyLoadedKey &&
      Array.isArray(storedOrders);

    if (!hasLoadedSnapshot) {
      fetchPage(1, true);
      return;
    }

    setError('');
  }, [
    isFocused,
    currentCompany?.id,
    fetchPage,
    historyLoadedKey,
    loadedKey,
    orderActions,
    error,
    storedOrders,
    storedTotalItems,
    shouldResumeCounterFlow,
  ]);

  /* scroll infinito — carrega próxima página */
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || fetchingRef.current) return;
    setLoadingMore(true);
    fetchPage(Math.floor(orders.length / PAGE_SIZE) + 1, false);
  }, [loadingMore, hasMore, fetchPage, orders.length]);

  /* ─── filtros client-side (canal, status, busca) ─────────────────── */

  const filteredOrders = useMemo(() => {
    if (!searchText.trim()) return orders;
    const q = searchText.trim().toLowerCase().replace(/^#/, '');
    return orders.filter(o => getSearchText(o).includes(q));
  }, [orders, searchText]);
  const displayedOrdersCount = useMemo(() => {
    if (searchText.trim()) {
      return filteredOrders.length;
    }

    return totalOrders || filteredOrders.length;
  }, [filteredOrders.length, searchText, totalOrders]);

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

          if (!supplierId || supplierLabel || alreadyResolved || loadingPurchaseSuppliersRef.current.has(supplierId)) {
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

  const openOrder = useCallback(order => {
    orderActions.syncOrder?.(order);
    if (isPosSingleItemMode(deviceConfig?.configs)) {
      navigation.navigate(
        'AddProductScreen',
        buildAddProductsRouteParams(
          order,
          buildManagerPdvRouteParams({singleItemMode: true}),
        ),
      );
      return;
    }

    navigation.navigate('OrderDetails', buildOrderDetailsRouteParams(order));
  }, [deviceConfig?.configs, navigation, orderActions]);

  /* ─── card de pedido ─────────────────────────────────────────────── */

  const renderCard = useCallback(({ item: order }) => {
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
        onPress={() => openOrder(order)}
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

  /* ─── render ─────────────────────────────────────────────────────── */
  if (shouldResumeCounterFlow) {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: brandColors.background}]}
        edges={['bottom']}>
        <View style={styles.content}>
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={brandColors.primary} />
            <Text style={styles.centerStateTitle}>
              {global.t?.t('orders', 'label', 'loading')}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.filtersCard}>
          <View style={styles.filtersHeaderRow}>
            <Text style={styles.filtersTitle}>{global.t?.t('orders', 'title', 'filters')}</Text>
          </View>

          {showAdvancedFilters && (
            <View style={styles.filterSelectorsRow}>
              {orderTypeFilter === 'sale' && (
                <View style={filterSelectorSlotStyle}>
                  <CompactFilterSelector
                    icon="radio"
                    label={currentChannelLabel}
                    labelCaption={global.t?.t('orders', 'label', 'channel') || 'Canal'}
                    accentColor={brandColors.primary}
                    active={channelFilter !== 'all'}
                    dense
                    title={global.t?.t('orders', 'label', 'channel')}
                    options={channelOptions}
                    selectedKey={channelFilter}
                    onSelect={optionKey => {
                      setChannelFilter(optionKey);
                      return true;
                    }}
                  />
                </View>
              )}

              {!SIMPLE_TAB_KEYS.has(orderTypeFilter) && (
                <View style={filterSelectorSlotStyle}>
                  <CompactFilterSelector
                    icon="check-circle"
                    label={currentStatusLabel}
                    labelCaption={global.t?.t('orders', 'label', 'status') || 'Status'}
                    accentColor={brandColors.primary}
                    active={statusFilter !== 'all'}
                    dense
                    title={global.t?.t('orders', 'label', 'status')}
                    options={statusOptions}
                    selectedKey={statusFilter}
                    onSelect={optionKey => {
                      setStatusFilter(optionKey);
                      return true;
                    }}
                  />
                </View>
              )}

              <View style={filterSelectorSlotStyle}>
                <DateShortcutFilter
                  value={dateFilter}
                  onChange={setDateFilter}
                  customRange={customRange}
                  onCustomRangeChange={setCustomRange}
                  dense
                  labelCaption={global.t?.t('orders', 'label', 'period') || 'Periodo'}
                  colors={{
                    accent: brandColors.primary,
                    appBg: 'transparent',
                    border: '#CBD5E1',
                    borderSoft: '#E2E8F0',
                    cardBg: '#FFFFFF',
                    cardBgSoft: '#F8FAFC',
                    danger: '#DC2626',
                    isLight: true,
                    panelBg: '#EFF6FF',
                    pillTextDark: '#FFFFFF',
                    textPrimary: '#0F172A',
                    textSecondary: '#64748B',
                  }}
                  optionKeys={['all', 'today', 'yesterday', '7d', '30d', 'custom']}
                />
              </View>
            </View>
          )}
        </View>

        {!isLoadingList && !!error && (
          <View style={styles.centerState}>
            <Icon name="alert-circle" size={28} color="#DC2626" />
            <Text style={styles.centerStateTitle}>{global.t?.t('orders', 'state', 'load_error')}</Text>
            <Text style={styles.centerStateText}>{error}</Text>
          </View>
        )}

        {!error && (
          <View style={styles.tableWrap}>
            <DefaultTable
              accentColor={brandColors.primary}
              columns={orderHistoryColumns}
              data={filteredOrders}
              hasMore={hasMore}
              initialViewMode="table"
              isLoading={isLoadingList || loadingMore}
              add={orderTypeFilter === 'loss' ? false : null}
              onAdd={goToAddProduct}
              onEndReached={loadMore}
              filters={tableFilters}
              onFilterChange={setTableFilters}
              onRowPress={openOrder}
              renderCard={renderCard}
              searchProps={{
                onClear: clearSearch,
                onSearch: setSearchText,
                placeholder: searchPlaceholder,
                value: searchText,
              }}
              onSortChange={setSortState}
              showColumnFiltersButton
              showRowActions={false}
              sort={sortState}
              storeName="orders"
              totalItems={displayedOrdersCount}
              totalItemsLabel={global.t?.t('orders', 'label', 'orders')}
            />
          </View>
        )}
      </View>

    </SafeAreaView>
  );
}
