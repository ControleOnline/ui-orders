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
import {resolveShouldListProductsDirectly} from '@controleonline/ui-orders/src/react/pages/checkout/utils/addProductCatalogMode';

const CheckoutContent = ({navigation, route: routeProp}) => {
  const currentRoute = useRoute();
  const isScreenFocused = useIsFocused();
  const route = routeProp || currentRoute;
  const ordersStore = useStore('orders');
  const peopleStore = useStore('people');
  const deviceStore = useStore('device');
  const deviceConfigStore = useStore('device_config');
  const categoriesStore = useStore('categories');
  const ordersActions = ordersStore.actions;
  const peopleGetters = peopleStore.getters;
  const {currentCompany, defaultCompany} = peopleGetters;
  const deviceGetters = deviceStore.getters;
  const deviceConfigGetters = deviceConfigStore.getters;
  const {item: storagedDevice} = deviceGetters;
  const {item: runtimeDeviceConfig} = deviceConfigGetters;
  const categoriesGetters = categoriesStore.getters;
  const categoryActions = categoriesStore.actions;
  const categoryItems = categoriesGetters?.items;
  const categoriesLoading = categoriesGetters?.isLoading === true;
  const [categoriesFetched, setCategoriesFetched] = useState(false);
  useEffect(() => {
    setCategoriesFetched(false);
  }, [currentCompany?.id]);
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

  const shouldListProductsDirectly = useMemo(
    () =>
      resolveShouldListProductsDirectly({
        isSingleItemMode,
        categoriesLoading,
        categoriesFetched,
        categoryItems,
      }),
    [categoriesFetched, categoryItems, categoriesLoading, isSingleItemMode],
  );

  useEffect(() => {
    if (isSingleItemMode || !currentCompany?.id || categoriesFetched) {
      return undefined;
    }

    const companyId =
      currentCompany?.id ||
      String(currentCompany?.['@id'] || '').replace(/\D+/g, '');
    if (!companyId) {
      return undefined;
    }

    let cancelled = false;
    void (async () => {
      try {
        await categoryActions?.getItems?.({
          company: companyId,
          context: route?.params?.context || 'products',
          'order[sortOrder]': 'ASC',
          'order[name]': 'ASC',
        });
      } catch {
        // Decision still needs a definitive fetch result (empty on failure).
      } finally {
        if (!cancelled) {
          setCategoriesFetched(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    categoryActions,
    categoriesFetched,
    currentCompany,
    isSingleItemMode,
    route?.params?.context,
  ]);

  const effectiveRoute = useMemo(() => {
    return {
      ...route,
      params: {
        ...(route?.params || {}),
        hideCatalogToolbar: true,
        ...(shouldListProductsDirectly
          ? {
              categoryId: ALL_PRODUCTS_SENTINEL_ID,
              context: route?.params?.context || 'products',
              singleItemMode: isSingleItemMode || undefined,
            }
          : {}),
      },
    };
  }, [isSingleItemMode, route, shouldListProductsDirectly]);

  const CatalogComponent = shouldListProductsDirectly ? ProductsPage : Categories;

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
