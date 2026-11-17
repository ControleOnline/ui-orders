import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import {app_type} from '@appType';
import { useStore } from '@store';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import DefaultExternalFilters from '@controleonline/ui-default/src/react/components/filters/DefaultExternalFilters';
import OrderHistoryCompactFooter from './OrderHistoryCompactFooter';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {
  canDeviceViewCompanyOrders,
  isPosCashRegisterClosed,
  isPosCounterMode,
  isPosSingleItemMode,
  resolvePosOperationMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  buildAddProductsRouteParams,
  buildManagerPdvRouteParams,
  buildOrderDetailsRouteParams,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import usePosCartSession from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';
import { shouldResumeCounterOrderFlow } from '@controleonline/ui-orders/src/react/utils/counterOrderFlow';
import StateStore from '@controleonline/ui-common/src/react/components/StateStore';
import {
  OrderCancelModal,
  OrderCancellationDetailsModal,
  OrderCancellationReasonsModal,
} from './OrderCancellationModals';
import {
  clearCreateInvoiceOnlyMode,
} from '@controleonline/ui-orders/src/react/utils/createInvoiceSession';
import createStyles from './OrderHistoryPage.styles';
import {
  ORDER_HISTORY_TABLE_PREFERENCE_KEY,
  normalizeText,
  buildExternalColumnsSignature,
  resolveOrderTypeFilter,
  getCurrentUserLabel,
  buildOrderHistoryPalette,
  buildHistoryRequestParams,
  configureOrderHistoryColumns,
} from './orderHistoryHelpers';
import OrderHistoryRowActions from './OrderHistoryRowActions';
import OrderHistoryMarkAsPaidModal from './OrderHistoryMarkAsPaidModal';
import OrderHistoryCard from './OrderHistoryCard';
import usePurchaseSupplierLabels from './usePurchaseSupplierLabels';
import useOrderCancellation from './useOrderCancellation';
import useOrderHistoryFilters from './useOrderHistoryFilters';

export { buildHistoryRequestParams };

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

  useEffect(() => {
    if (isFocused) {
      clearCreateInvoiceOnlyMode();
    }
  }, [isFocused]);

  const { item: storagedDevice } = deviceStore.getters || {};
  const { item: deviceConfig } = deviceConfigStore.getters || {};
  const { actions: peopleActions, getters: peopleGetters } = peopleStore;
  const { actions: statusActions, getters: statusGetters } = statusStore;
  const { currentCompany, mainCompany } = peopleGetters;
  const themeColors = useMemo(() => themeStore.getters.colors, [themeStore.getters.colors]);
  const currentUserLabel = getCurrentUserLabel(authStore?.getters?.user);
  const { actions: orderActions, getters: ordersGetters } = ordersStore;
  const setColumnsRef = useRef(orderActions?.setColumns);
  setColumnsRef.current = orderActions?.setColumns;

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
  const isSingleItemHistory = isPosApp && isPosSingleItemMode(deviceConfig?.configs);
  const showAdvancedFilters = !isSingleItemHistory && (!isPosApp || canViewCompanyOrders);
  const isWaiterMode = isPosApp && resolvePosOperationMode(deviceConfig?.configs) === 'waiter';
  const showHistoryToolbar = isSingleItemHistory || (!isWaiterMode && !shouldRestrictToDeviceOrders);
  const showOrderHistoryRowActions = !isPosApp;
  const [markAsPaidOrder, setMarkAsPaidOrder] = useState(null);
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
  const { historyFilters, applyHistoryFilters, statusOptions } = useOrderHistoryFilters({
    orderActions,
    statusItems,
    operationalSingleItem: isSingleItemHistory,
  });

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

  useEffect(() => {
    navigation.setOptions?.({ title: historyPageTitle });
  }, [historyPageTitle, navigation]);

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
    defaultStatusId: mainCompany?.configs?.['pos-default-status'],
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

  const configuredOrderColumns = useMemo(
    () => configureOrderHistoryColumns({
      columns: ordersGetters.columns, showAdvancedFilters, orderTypeFilter,
      allChannelLabel: allChannelOption.label,
    }),
    [allChannelOption.label, orderTypeFilter, ordersGetters.columns, showAdvancedFilters],
  );
  const orderColumnsReady = useMemo(
    () =>
      buildExternalColumnsSignature(ordersGetters.columns) ===
      buildExternalColumnsSignature(configuredOrderColumns),
    [configuredOrderColumns, ordersGetters.columns],
  );
  // Order statuses feed the Status filter; without this fetch the filter only offers "Todos".
  useEffect(() => {
    if (!isFocused || !currentCompany?.id) return;
    statusActions?.getItems?.({ context: 'order' })?.catch?.(() => {});
  }, [currentCompany?.id, isFocused, statusActions]);

  const getExternalFilterOptions = useCallback(
    column => {
      const fieldName = column?.name || column?.key;
      // An empty array would hide the column's own list loader, so fall through until statuses arrive.
      if (fieldName === 'status') return statusOptions.length > 0 ? statusOptions : undefined;

      return undefined;
    },
    [statusOptions],
  );

  useEffect(() => {
    if (!orderColumnsReady) {
      if (typeof setColumnsRef.current === 'function') {
        setColumnsRef.current(configuredOrderColumns);
      }
    }
  }, [configuredOrderColumns, orderColumnsReady]);

  const historyRequestParams = useMemo(
    () =>
      ({...buildHistoryRequestParams({
        appType: app_type,
        canViewCompanyOrders,
        currentCompanyId: currentCompany?.id,
        currentDeviceId: storagedDevice?.id,
        filters: historyFilters,
        singleItemMode: isSingleItemHistory,
        orderTypeFilter,
        showAdvancedFilters,
      }), ...(isSingleItemHistory ? {summary: 'operational'} : orderTypeFilter === 'sale' && !isWaiterMode ? {summary: 'sales'} : {})}),
    [
      isWaiterMode,
      isSingleItemHistory,
      canViewCompanyOrders,
      currentCompany?.id,
      historyFilters,
      orderTypeFilter,
      showAdvancedFilters,
      storagedDevice?.id,
    ],
  );
  const {
    cancelModalOrder, cancelDetailsOrder, setCancelDetailsOrder, cancelReasons,
    selectedCancelReasonId, setSelectedCancelReasonId, cancelReasonText, setCancelReasonText,
    cancelReasonsLoading, cancellingOrder, reasonManagerVisible, setReasonManagerVisible,
    openCancelModal, closeCancelModal, closeReasonManager, confirmCancelOrder,
  } = useOrderCancellation({
    currentCompanyId: currentCompany?.id, historyRequestParams, orderActions, showError, showSuccess,
  });

  const orders = useMemo(
    () => (Array.isArray(ordersGetters.items) ? ordersGetters.items : []),
    [ordersGetters.items],
  );
  const purchaseSuppliersById = usePurchaseSupplierLabels(orders, peopleActions);

  const orderToolbarActions = useMemo(
    () => [
      {
        key: 'order-cancellation-reasons',
        icon: 'tag',
        iconSize: 16,
        label: 'Motivos de cancelamento',
        accessibilityLabel:
          global.t?.t('orders', 'button', 'manageCancelReasons') ||
          'Gerenciar motivos de cancelamento',
        hidden: !currentCompany?.id,
        color: themeColors.buttonText,
        style: {
          minWidth: 160,
          paddingHorizontal: 10,
          backgroundColor: themeColors.buttonBackground,
          borderColor: themeColors.buttonBackground,
        },
        onPress: () => setReasonManagerVisible(true),
      },
    ],
    [currentCompany?.id, themeColors.buttonBackground, themeColors.buttonText],
  );

  const openCreateInvoiceFlow = useCallback(order => {
    orderActions.syncOrder?.(order);
    setMarkAsPaidOrder(order);
  }, [orderActions]);

  const handleMarkAsPaidSuccess = useCallback((result) => {
    setMarkAsPaidOrder(null);
    const message = String(result?.message || '').trim();
    if (result?.alreadyPaid) {
      // Backend: financial balance already zero — show API text (e.g. "Pedido ja esta quitado.")
      if (message) {
        if (typeof showError === 'function') showError(message);
        else if (typeof showSuccess === 'function') showSuccess(message);
      }
    } else if (message && message.toLowerCase() !== 'ok') {
      if (typeof showSuccess === 'function') showSuccess(message);
    } else if (typeof showSuccess === 'function') {
      showSuccess(
        (global.t?.t && global.t.t('orders', 'message', 'markAsPaidSuccess')) ||
          'Pedido marcado como pago.',
      );
    }
    orderActions.setReload?.(true);
  }, [orderActions, showError, showSuccess]);

  const renderRowActions = useCallback(({ row, openRow }) => (
    <OrderHistoryRowActions row={row} onOpenOrder={openRow} themeColors={themeColors}
      onViewCancellation={setCancelDetailsOrder} onCreateInvoice={openCreateInvoiceFlow} onCancelOrder={openCancelModal} />
  ), [openCancelModal, openCreateInvoiceFlow, styles, themeColors]);

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

  const renderCard = useCallback(({ item: order, openRow }) => (
    <OrderHistoryCard order={order} openRow={openRow} onOpenOrder={openOrder} styles={styles} purchaseSuppliersById={purchaseSuppliersById} />
  ), [openOrder, purchaseSuppliersById, styles]);

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
        {!showHistoryToolbar ? <DefaultExternalFilters
          accentColor={themeColors.primary}
          filters={historyFilters}
          getOptionsForColumn={getExternalFilterOptions}
          onChangeFilters={applyHistoryFilters}
          storeName="orders"
        /> : null}

        <View style={styles.tableWrap}>
          <DefaultTable
            paginationMode={isSingleItemHistory ? "infinite" : "pages"}
            initialViewMode="cards"
            viewMode={isSingleItemHistory ? "cards" : null}
            showCompactCaption={!isSingleItemHistory}
            showToolbarControls={!isSingleItemHistory}
            showToolbarActions={!isSingleItemHistory}
            showAdministrativeTools={!isSingleItemHistory}
            pageSize={20}
            addLabel="Novo pedido"
            rowActionsWidth={210}
            footerComponent={isSingleItemHistory ? null : OrderHistoryCompactFooter}
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
            showSearch={isSingleItemHistory || showAdvancedFilters}
            searchPlaceholder="Buscar por ID ou cliente"
            getOptionsForColumn={getExternalFilterOptions}
            showRowActions={showOrderHistoryRowActions}
            showToolbar={showHistoryToolbar}
            showTotalItemsInFooter={!isWaiterMode && !isSingleItemHistory}
            storeName="orders"
            summary={false}
            toolbarActions={isWaiterMode ? [] : orderToolbarActions}
            visibleColumnsPreferenceKey={isSingleItemHistory ? "orders:pos:single-item" : ORDER_HISTORY_TABLE_PREFERENCE_KEY}
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
    <OrderHistoryMarkAsPaidModal
        visible={!!markAsPaidOrder}
        order={markAsPaidOrder}
        onClose={() => setMarkAsPaidOrder(null)}
        onSuccess={handleMarkAsPaidSuccess}
        themeColors={themeColors}
        currentCompanyId={currentCompany?.id}
      />
    </SafeAreaView>
  );
}
