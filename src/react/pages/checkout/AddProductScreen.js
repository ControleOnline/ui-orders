import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {useStore} from '@store';
import {useFocusEffect, useIsFocused, useRoute} from '@react-navigation/native';

import Categories from '@controleonline/ui-products/src/react/pages/Categories';
import ProductsPage from '@controleonline/ui-products/src/react/pages/Products';
import {ALL_PRODUCTS_SENTINEL_ID} from '@controleonline/ui-products/src/react/constants/categorySentinels';
import LinkedOrderEntrySheet from '@controleonline/ui-orders/src/react/components/LinkedOrderEntrySheet';
import {
  isPosCashRegisterClosed,
  isPosTotemMode,
  isPosSingleItemMode,
  shouldUsePosCashRegisterLifecycle,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import usePosCartSession, {
  isLinkedOrderCodeRequiredError,
  isPosOrderCreationCancelledError,
} from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';
import {hasCompleteEmbeddedOrderProductsTree} from '@controleonline/ui-orders/src/react/utils/orderProductsFetchPolicy';

const normalizeOrderId = value =>
  String(value?.id || value?.['@id'] || value || '').replace(/\D+/g, '');

const hasEmbeddedOrderProductsCollection = order =>
  Array.isArray(order?.orderProducts) ||
  Array.isArray(order?.orderProducts?.member) ||
  Array.isArray(order?.orderProducts?.['hydra:member']);

export const canReuseCompleteResumeOrder = (order, requestedOrderId) => {
  const normalizedRequestedOrderId = normalizeOrderId(requestedOrderId);
  const rawPrice = order?.price;

  return (
    !!normalizedRequestedOrderId &&
    normalizeOrderId(order) === normalizedRequestedOrderId &&
    rawPrice !== null &&
    rawPrice !== undefined &&
    String(rawPrice).trim() !== '' &&
    Number.isFinite(Number(rawPrice)) &&
    hasEmbeddedOrderProductsCollection(order) &&
    hasCompleteEmbeddedOrderProductsTree(order)
  );
};

const CheckoutContent = ({navigation, route: routeProp}) => {
  const currentRoute = useRoute();
  const isScreenFocused = useIsFocused();
  const route = routeProp || currentRoute;
  const ordersStore = useStore('orders');
  const peopleStore = useStore('people');
  const deviceStore = useStore('device');
  const deviceConfigStore = useStore('device_config');
  const ordersActions = ordersStore.actions;
  const storedOrder = ordersStore.getters.item;
  const peopleGetters = peopleStore.getters;
  const {currentCompany, defaultCompany} = peopleGetters;
  const deviceGetters = deviceStore.getters;
  const deviceConfigGetters = deviceConfigStore.getters;
  const {item: storagedDevice} = deviceGetters;
  const {item: runtimeDeviceConfig} = deviceConfigGetters;
  const {showError} = useMessage() || {};
  const isTotemMode = isPosTotemMode(runtimeDeviceConfig?.configs);
  const isSingleItemMode =
    route?.params?.singleItemMode === true ||
    isPosSingleItemMode(runtimeDeviceConfig?.configs);
  const shouldUseCashRegisterLifecycle = shouldUsePosCashRegisterLifecycle(
    runtimeDeviceConfig?.configs,
  );
  const isCashRegisterClosed = isPosCashRegisterClosed(
    runtimeDeviceConfig?.configs,
  );
  const isLoadingStoredOrderRef = useRef(false);
  const activeOrderIdRef = useRef(null);
  const activePreparationControllerRef = useRef(null);
  const hasPreparedCurrentFocusRef = useRef(false);
  const startNewOrderHandledRef = useRef(false);
  const linkedSessionBootstrappedRef = useRef(false);
  const linkedOrderEntryResolverRef = useRef(null);
  const [linkedOrderEntryState, setLinkedOrderEntryState] = useState(null);
  const [isPreparingOrder, setIsPreparingOrder] = useState(
    route?.params?.startNewOrder === true ||
      route?.params?.resumeExistingOrder === true,
  );
  const requestLinkedOrderInput = useCallback(
    request =>
      new Promise(resolve => {
        linkedOrderEntryResolverRef.current = resolve;
        setLinkedOrderEntryState({
          orderType: request?.orderType || 'tab',
          preferredInputType: request?.preferredInputType || 'manual',
          validateInput: request?.validateInput || null,
        });
      }),
    [],
  );
  const {
    activeOrder,
    ensureActiveOrder,
    loadStoredDraftOrder,
    refreshActiveOrder,
    usesLinkedCheckOrders,
  } = usePosCartSession({
    companyId: currentCompany?.id,
    deviceId: storagedDevice?.id,
    defaultStatusId: defaultCompany?.configs?.['pos-default-status'],
    requestLinkedOrderInput,
    companyConfigs: currentCompany?.configs,
  });
  const activeOrderId = activeOrder?.id || activeOrder?.['@id'] || null;
  const resumeOrderId = String(route?.params?.id || '').replace(/\D+/g, '');
  const reusableResumeOrder = useMemo(
    () =>
      route?.params?.resumeExistingOrder === true &&
      canReuseCompleteResumeOrder(storedOrder, resumeOrderId)
        ? storedOrder
        : null,
    [resumeOrderId, route?.params?.resumeExistingOrder, storedOrder],
  );
  const resolveLinkedOrderEntry = useCallback(result => {
    const resolve = linkedOrderEntryResolverRef.current;
    linkedOrderEntryResolverRef.current = null;
    setLinkedOrderEntryState(null);
    resolve?.(result);
  }, []);

  useEffect(() => {
    activeOrderIdRef.current = activeOrderId;
  }, [activeOrderId]);

  useEffect(
    () =>
      navigation.addListener?.('blur', () => {
        hasPreparedCurrentFocusRef.current = false;
        activePreparationControllerRef.current?.abort();
      }),
    [navigation],
  );

  useEffect(() => {
    if (isScreenFocused) {
      return;
    }

    hasPreparedCurrentFocusRef.current = false;
    activePreparationControllerRef.current?.abort();
  }, [isScreenFocused]);

  useEffect(
    () => () => {
      activePreparationControllerRef.current?.abort();
    },
    [],
  );

  const handleCancelLinkedOrderEntry = useCallback(() => {
    resolveLinkedOrderEntry(null);

    if (!activeOrderId && navigation.canGoBack?.()) {
      navigation.goBack();
    }
  }, [activeOrderId, navigation, resolveLinkedOrderEntry]);

  useEffect(
    () => () => {
      linkedOrderEntryResolverRef.current?.(null);
      linkedOrderEntryResolverRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (route?.params?.startNewOrder !== true) {
      startNewOrderHandledRef.current = false;
    }
  }, [route?.params?.startNewOrder]);

  useEffect(() => {
    linkedSessionBootstrappedRef.current = false;
  }, [currentCompany?.id, storagedDevice?.id, usesLinkedCheckOrders]);

  useEffect(() => {
    return () => {
      ordersActions.initQueue();
    };
  }, [ordersActions]);

  useEffect(() => {
    if (isTotemMode) {
      if (route?.params?.showBottomToolBar !== true) {
        return;
      }

      navigation.setParams({showBottomToolBar: false});
      return;
    }

    if (route?.params?.showBottomToolBar === true) {
      return;
    }

    navigation.setParams({showBottomToolBar: true});
  }, [isTotemMode, navigation, route?.params?.showBottomToolBar]);

  const effectiveRoute = useMemo(() => {
    return {
      ...route,
      params: {
        ...(route?.params || {}),
        hideCatalogToolbar: true,
        ...(isSingleItemMode
          ? {
              categoryId: ALL_PRODUCTS_SENTINEL_ID,
              context: 'products',
              singleItemMode: true,
            }
          : {}),
      },
    };
  }, [isSingleItemMode, route]);

  const CatalogComponent = isSingleItemMode ? ProductsPage : Categories;

  useFocusEffect(
    useCallback(() => {
      if (
        !currentCompany?.id ||
        isLoadingStoredOrderRef.current ||
        hasPreparedCurrentFocusRef.current
      ) {
        return undefined;
      }

      if (shouldUseCashRegisterLifecycle && isCashRegisterClosed) {
        navigation.navigate('CloseCashRegister');
        return undefined;
      }

      if (reusableResumeOrder) {
        hasPreparedCurrentFocusRef.current = true;
        activeOrderIdRef.current = resumeOrderId;
        setIsPreparingOrder(false);
        return undefined;
      }

      isLoadingStoredOrderRef.current = true;
      hasPreparedCurrentFocusRef.current = true;
      const controller =
        typeof AbortController === 'function' ? new AbortController() : null;
      activePreparationControllerRef.current = controller;
      setIsPreparingOrder(true);

      void (async () => {
        try {
          if (route?.params?.startNewOrder === true) {
            if (startNewOrderHandledRef.current) {
              return;
            }

            startNewOrderHandledRef.current = true;
            if (usesLinkedCheckOrders) {
              const ensuredOrder = await ensureActiveOrder(undefined, {
                forceNew: true,
                signal: controller?.signal,
              });
              linkedSessionBootstrappedRef.current = !!(
                ensuredOrder?.id ||
                ensuredOrder?.['@id']
              );
            } else {
              const ensuredOrder = await ensureActiveOrder(undefined, {
                forceNew: true,
                signal: controller?.signal,
              });
              linkedSessionBootstrappedRef.current = !!(
                ensuredOrder?.id ||
                ensuredOrder?.['@id']
              );
            }

            if (controller?.signal?.aborted !== true) {
              navigation.setParams({startNewOrder: false});
            }
            return;
          }

          if (route?.params?.resumeExistingOrder === true && resumeOrderId) {
            const resumedOrder = await refreshActiveOrder(resumeOrderId);
            if (resumedOrder) {
              ordersActions.syncOrder?.(resumedOrder);
            }
            return;
          }

          if (!activeOrderIdRef.current) {
            const storedDraftOrder = await loadStoredDraftOrder();

            if (storedDraftOrder) {
              linkedSessionBootstrappedRef.current = true;
              return;
            }

            if (!storedDraftOrder && usesLinkedCheckOrders) {
              if (linkedSessionBootstrappedRef.current) {
                return;
              }

              const ensuredOrder = await ensureActiveOrder();
              linkedSessionBootstrappedRef.current = !!(
                ensuredOrder?.id ||
                ensuredOrder?.['@id']
              );
            }
          }
        } catch (error) {
          if (
            !isLinkedOrderCodeRequiredError(error) &&
            !isPosOrderCreationCancelledError(error)
          ) {
            showError?.(
              error?.message ||
                'Nao foi possivel preparar o pedido para iniciar a venda.',
            );
          }
        } finally {
          isLoadingStoredOrderRef.current = false;
          if (activePreparationControllerRef.current === controller) {
            activePreparationControllerRef.current = null;
          }
          if (controller?.signal?.aborted !== true) {
            setIsPreparingOrder(false);
          }
        }
      })();

      return undefined;
    }, [
      currentCompany?.id,
      ensureActiveOrder,
      isCashRegisterClosed,
      loadStoredDraftOrder,
      navigation,
      ordersActions,
      refreshActiveOrder,
      reusableResumeOrder,
      resumeOrderId,
      route?.params?.resumeExistingOrder,
      route?.params?.startNewOrder,
      showError,
      shouldUseCashRegisterLifecycle,
      isSingleItemMode,
      usesLinkedCheckOrders,
    ]),
  );

  if (isPreparingOrder) {
    return (
      <View
        style={{
          alignItems: 'center',
          flex: 1,
          justifyContent: 'center',
        }}>
        <ActivityIndicator size="large" />
        <Text style={{marginTop: 12}}>Carregando pedido...</Text>
      </View>
    );
  }

  return (
    <>
      <CatalogComponent navigation={navigation} route={effectiveRoute} />
      <LinkedOrderEntrySheet
        onCancel={handleCancelLinkedOrderEntry}
        onSubmit={resolveLinkedOrderEntry}
        orderType={linkedOrderEntryState?.orderType || 'tab'}
        preferredInputType={linkedOrderEntryState?.preferredInputType || 'manual'}
        validateInput={linkedOrderEntryState?.validateInput || null}
        visible={!!linkedOrderEntryState}
      />
    </>
  );
};

export default CheckoutContent;
