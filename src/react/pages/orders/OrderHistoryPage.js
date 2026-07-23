import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import {app_type} from '@appType';
import { useStore } from '@store';
import DefaultExternalFilters from '@controleonline/ui-default/src/react/components/filters/DefaultExternalFilters';
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
import StateStore from '@controleonline/ui-common/src/react/components/StateStore';
import createStyles from './OrderHistoryPage.styles';

const ORDER_TYPE_FILTER_KEYS = new Set(['sale', 'purchase', 'transfer', 'loss']);
const SIMPLE_TAB_KEYS = new Set(['transfer', 'loss']);

const normalizeText = value => String(value || '').trim();

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

  if (app_type === 'POS' && !canViewCompanyOrders && currentDeviceId) {
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
  const deviceConfigStore = useStore('device_config');
  const deviceStore = useStore('device');
  const isFocused = useIsFocused();

  const { item: storagedDevice } = deviceStore.getters || {};
  const { item: deviceConfig } = deviceConfigStore.getters || {};
  const { actions: peopleActions, getters: peopleGetters } = peopleStore;
  const { getters: statusGetters } = statusStore;
  const { currentCompany, defaultCompany } = peopleGetters;
  const { colors: themeColors } = themeStore.getters || {};
  const { actions: orderActions, getters: ordersGetters } = ordersStore;
  const orderHistoryPalette = useMemo(
    () => buildOrderHistoryPalette(themeColors),
    [themeColors],
  );
  const styles = useMemo(() => createStyles(orderHistoryPalette), [orderHistoryPalette]);

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [themeColors, currentCompany?.theme?.colors],
  );

  const canViewCompanyOrders = useMemo(
    () => canDeviceViewCompanyOrders(deviceConfig?.configs),
    [deviceConfig?.configs],
  );

  const showAdvancedFilters = app_type !== 'POS' || canViewCompanyOrders;
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
  const [historyFilters, setHistoryFilters] = useState({
    alterDate: {
      shortcut: 'today',
      customRange: { from: '', to: '' },
    },
  });
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
        accumulator.push({
          value: key,
          label:
            normalizeText(global.t?.t('orders', 'status', status?.status)) ||
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

      return changed ? next : current;
    });
  }, [statusOptions]);

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
          accentColor={brandColors.primary}
          filters={historyFilters}
          getOptionsForColumn={getExternalFilterOptions}
          onChangeFilters={setHistoryFilters}
          storeName="orders"
        />

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
            summary={false}
            visibleColumnsPreferenceKey="order-history-page"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
