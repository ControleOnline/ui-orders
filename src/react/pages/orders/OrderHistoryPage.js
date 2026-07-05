import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { env } from '@env';
import { useStore } from '@store';
import CompactFilterSelector from '@controleonline/ui-default/src/react/components/filters/CompactFilterSelector';
import DateShortcutFilter from '@controleonline/ui-default/src/react/components/filters/DateShortcutFilter';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
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
import { colors } from '@controleonline/../../src/styles/colors';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { resolveHistoryOrderTypeQuery } from '@controleonline/ui-orders/src/react/utils/orderHistoryQuery';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import styles from './OrderHistoryPage.styles';

const ORDER_TYPE_FILTER_KEYS = new Set(['sale', 'purchase', 'transfer', 'loss']);
const SIMPLE_TAB_KEYS = new Set(['transfer', 'loss']);

const normalizeText = value => String(value || '').trim();

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

const buildHistoryRequestParams = ({
  canViewCompanyOrders,
  channelFilter,
  currentCompanyId,
  currentDeviceId,
  dateFilter,
  orderTypeFilter,
  showAdvancedFilters,
  statusFilter,
  customRange,
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

  if (!showAdvancedFilters && orderTypeFilter === 'sale') {
    query['status.realStatus'] = 'open';
  }

  if (showAdvancedFilters && channelFilter !== 'all') {
    query.app = channelFilter;
  }

  if (showAdvancedFilters && statusFilter !== 'all') {
    query.status = statusFilter;
  }

  if (env.APP_TYPE === 'POS' && !canViewCompanyOrders && currentDeviceId) {
    query['device.device'] = currentDeviceId;
  }

  if (showAdvancedFilters) {
    const dateRange = resolveDateRangeFilter({
      shortcut: dateFilter,
      customRange,
    });

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
  const deviceConfigStore = useStore('device_config');
  const deviceStore = useStore('device');
  const isFocused = useIsFocused();

  const { item: storagedDevice } = deviceStore.getters || {};
  const { item: deviceConfig } = deviceConfigStore.getters || {};
  const { actions: peopleActions, getters: peopleGetters } = peopleStore;
  const { actions: statusActions, getters: statusGetters } = statusStore;
  const { currentCompany, defaultCompany } = peopleGetters;
  const { colors: themeColors } = themeStore.getters || {};
  const { actions: orderActions, getters: ordersGetters } = ordersStore;

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [themeColors, currentCompany?.theme?.colors],
  );

  const canViewCompanyOrders = useMemo(
    () => canDeviceViewCompanyOrders(deviceConfig?.configs),
    [deviceConfig?.configs],
  );

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
  const [dynamicChannelOptions, setDynamicChannelOptions] = useState([]);
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
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

  const channelOptions = useMemo(
    () => [allChannelOption, ...dynamicChannelOptions],
    [allChannelOption, dynamicChannelOptions],
  );

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

  useEffect(() => {
    navigation.setOptions?.({ title: historyPageTitle });
  }, [historyPageTitle, navigation]);

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
    if (isFocused && env.APP_TYPE === 'POS' && isCashRegisterClosed) {
      navigation.navigate('CloseCashRegister');
    }
  }, [isCashRegisterClosed, isFocused, navigation]);

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

  useEffect(() => {
    let cancelled = false;

    if (!isFocused || !channelSummaryQuery) {
      setDynamicChannelOptions([]);
      return () => {
        cancelled = true;
      };
    }

    if (typeof orderActions.getHistorySummaryApps !== 'function') {
      setDynamicChannelOptions([]);
      return () => {
        cancelled = true;
      };
    }

    orderActions.getHistorySummaryApps({query: channelSummaryQuery})
      .then(apps => {
        if (!cancelled) {
          setDynamicChannelOptions(Array.isArray(apps) ? apps : []);
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
    orderActions,
  ]);

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

  const currentChannelLabel = useMemo(
    () =>
      channelOptions.find(option => option.key === channelFilter)?.label ||
      channelOptions[0]?.label ||
      'All',
    [channelFilter, channelOptions],
  );
  const currentStatusLabel = useMemo(
    () =>
      statusOptions.find(option => option.key === statusFilter)?.label ||
      statusOptions[0]?.label ||
      'All',
    [statusFilter, statusOptions],
  );

  const historyRequestParams = useMemo(
    () =>
      buildHistoryRequestParams({
        canViewCompanyOrders,
        channelFilter,
        currentCompanyId: currentCompany?.id,
        currentDeviceId: storagedDevice?.id,
        dateFilter,
        orderTypeFilter,
        showAdvancedFilters,
        statusFilter,
        customRange,
      }),
    [
      canViewCompanyOrders,
      channelFilter,
      currentCompany?.id,
      customRange,
      dateFilter,
      orderTypeFilter,
      showAdvancedFilters,
      statusFilter,
      storagedDevice?.id,
    ],
  );

  const orders = useMemo(
    () => (Array.isArray(ordersGetters.items) ? ordersGetters.items : []),
    [ordersGetters.items],
  );

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

    if (env.APP_TYPE === 'POS' && isCashRegisterClosed) {
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

  if (shouldResumeCounterFlow || !currentCompany?.id) {
    return (
      <StateStore
        mode="display"
        loading={global.t?.t('orders', 'label', 'loading')}
      />
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: brandColors.background }]}
      edges={['bottom']}
    >
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

        <View style={styles.tableWrap}>
          <DefaultTable
            accentColor={brandColors.primary}
            add={orderTypeFilter === 'loss' ? false : null}
            onAdd={goToAddProduct}
            onRowPress={openOrder}
            requestParams={historyRequestParams}
            renderCard={renderCard}
            searchProps={{
              placeholder: searchPlaceholder,
            }}
            showRowActions={false}
            storeName="orders"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
