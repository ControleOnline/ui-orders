import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
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
import {buildAddProductCatalogRouteParams} from '@controleonline/ui-orders/src/react/pages/checkout/utils/addProductCatalogOrderContext';
import {setActivePosOrderContext} from '@controleonline/ui-orders/src/react/hooks/posCartSession/activePosOrderContext';

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
  const {currentCompany, mainCompany} = peopleGetters;
  const deviceGetters = deviceStore.getters;
  const deviceConfigGetters = deviceConfigStore.getters;
  const {item: storagedDevice} = deviceGetters;
  const {item: runtimeDeviceConfig} = deviceConfigGetters;
  const categoriesGetters = categoriesStore.getters;
  const categoryActions = categoriesStore.actions;
  const categoryItems = categoriesGetters?.items;
  const categoriesLoading = categoriesGetters?.isLoading === true;
  const [categoriesFetched, setCategoriesFetched] = useState(false);
  const [categoriesFetchError, setCategoriesFetchError] = useState(false);
  useEffect(() => {
    setCategoriesFetched(false);
    setCategoriesFetchError(false);
  }, [currentCompany?.id]);
  const {showError} = useMessage() || {};
  const isTotemMode = isPosTotemMode(runtimeDeviceConfig?.configs);
  const isSingleItemMode =
    (route?.params?.singleItemMode === true ||
      String(route?.params?.singleItemMode || '').trim().toLowerCase() === 'true') ||
    isPosSingleItemMode(runtimeDeviceConfig?.configs);
  const shouldUseCashRegisterLifecycle = shouldUsePosCashRegisterLifecycle(
    runtimeDeviceConfig?.configs,
  );
  const isCashRegisterClosed = isPosCashRegisterClosed(
    runtimeDeviceConfig?.configs,
  );
  const isLoadingStoredOrderRef = useRef(false);
  const activeOrderIdRef = useRef(null);
  const [catalogOrderId, setCatalogOrderId] = useState(null);
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
    defaultStatusId: mainCompany?.configs?.['pos-default-status'],
    requestLinkedOrderInput,
    companyConfigs: currentCompany?.configs,
  });
  const activeOrderId = activeOrder?.id || activeOrder?.['@id'] || null;
  const persistCatalogOrderId = useCallback(
    order => {
      const {orderId} = buildAddProductCatalogRouteParams({
        activeOrderId: order,
        routeParams: route?.params || {},
      });

      if (orderId) {
        setActivePosOrderContext({
          companyId: currentCompany?.id,
          deviceId: storagedDevice?.id,
          order,
        });
        setCatalogOrderId(orderId);
        if (String(route?.params?.orderId || '') !== orderId) {
          navigation.setParams({orderId});
        }
      }

      return orderId;
    },
    [
      currentCompany?.id,
      navigation,
      route?.params?.id,
      route?.params?.order,
      route?.params?.orderId,
      storagedDevice?.id,
    ],
  );
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
        categoriesFetchError,
        categoryItems,
      }),
    [categoriesFetchError, categoriesFetched, categoryItems, categoriesLoading, isSingleItemMode],
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
      let requestFailed = false;
      try {
        await categoryActions?.getItems?.({
          company: companyId,
          context: route?.params?.context || 'products',
          'order[sortOrder]': 'ASC',
          'order[name]': 'ASC',
        });
      } catch {
        requestFailed = true;
      } finally {
        if (!cancelled) {
          setCategoriesFetchError(requestFailed);
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
    currentCompany?.id,
    isSingleItemMode,
    route?.params?.context,
  ]);

  const effectiveRoute = useMemo(() => {
    return {
      ...route,
      params: {
        ...buildAddProductCatalogRouteParams({
          activeOrderId: activeOrderId || catalogOrderId,
          routeParams: route?.params || {},
        }),
        hideCatalogToolbar: false,
        categoriesPrefetched: categoriesFetched && !categoriesFetchError,
        ...(shouldListProductsDirectly
          ? {
              categoryId: ALL_PRODUCTS_SENTINEL_ID,
              context: route?.params?.context || 'products',
              singleItemMode: isSingleItemMode || undefined,
            }
          : {}),
      },
    };
  }, [activeOrderId, catalogOrderId, categoriesFetchError, categoriesFetched, isSingleItemMode, route, shouldListProductsDirectly]);

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
            const ensuredOrder = await ensureActiveOrder(undefined, {
              forceNew: true,
              signal: controller?.signal,
            });
            const ensuredOrderId = persistCatalogOrderId(ensuredOrder);
            linkedSessionBootstrappedRef.current = Boolean(ensuredOrderId);

            if (controller?.signal?.aborted !== true) {
              navigation.setParams({
                ...(ensuredOrderId ? {orderId: ensuredOrderId} : {}),
                startNewOrder: false,
              });
            }
            return;
          }

          if (route?.params?.resumeExistingOrder === true && resumeOrderId) {
            const resumedOrder = await refreshActiveOrder(resumeOrderId);
            if (resumedOrder) {
              ordersActions.syncOrder?.(resumedOrder);
              persistCatalogOrderId(resumedOrder);
            }
            return;
          }

          if (!activeOrderIdRef.current) {
            const storedDraftOrder = await loadStoredDraftOrder();

            if (storedDraftOrder) {
              linkedSessionBootstrappedRef.current = true;
              persistCatalogOrderId(storedDraftOrder);
              return;
            }

            if (!storedDraftOrder && usesLinkedCheckOrders) {
              if (linkedSessionBootstrappedRef.current) {
                return;
              }

              const ensuredOrder = await ensureActiveOrder();
              linkedSessionBootstrappedRef.current = Boolean(
                persistCatalogOrderId(ensuredOrder),
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
      persistCatalogOrderId,
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

  return (
    <>
      {isPreparingOrder ? (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
          }}>
          <ActivityIndicator size="large" />
          <Text style={{marginTop: 12}}>Carregando pedido...</Text>
        </View>
      ) : categoriesFetchError && !isSingleItemMode ? (
        <View style={{alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24}}>
          <Text style={{color: '#253044', fontSize: 16, marginBottom: 16, textAlign: 'center'}}>
            Não foi possível carregar as categorias. Verifique a conexão e tente novamente.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              setCategoriesFetchError(false);
              setCategoriesFetched(false);
            }}
            style={{backgroundColor: '#00a8df', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12}}
          >
            <Text style={{color: '#fff', fontWeight: '600'}}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : !isSingleItemMode && currentCompany?.id && !categoriesFetched ? (
        <View style={{alignItems: 'center', flex: 1, justifyContent: 'center'}}>
          <ActivityIndicator size="large" />
          <Text style={{marginTop: 12}}>Carregando categorias...</Text>
        </View>
      ) : (
        <CatalogComponent
          activeOrderId={activeOrderId || catalogOrderId || effectiveRoute.params?.orderId || ''}
          navigation={navigation}
          route={effectiveRoute}
        />
      )}
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
