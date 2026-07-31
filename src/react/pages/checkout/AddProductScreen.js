import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useStore} from '@store';
import {useFocusEffect, useRoute} from '@react-navigation/native';

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
} from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';

const CheckoutContent = ({navigation, route: routeProp}) => {
  const currentRoute = useRoute();
  const route = routeProp || currentRoute;
  const ordersStore = useStore('orders');
  const peopleStore = useStore('people');
  const deviceStore = useStore('device');
  const deviceConfigStore = useStore('device_config');
  const ordersActions = ordersStore.actions;
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
  const startNewOrderHandledRef = useRef(false);
  const linkedSessionBootstrappedRef = useRef(false);
  const linkedOrderEntryResolverRef = useRef(null);
  const [linkedOrderEntryState, setLinkedOrderEntryState] = useState(null);
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
      if (!currentCompany?.id || isLoadingStoredOrderRef.current) {
        return undefined;
      }

      if (shouldUseCashRegisterLifecycle && isCashRegisterClosed) {
        navigation.navigate('CloseCashRegister');
        return undefined;
      }

      isLoadingStoredOrderRef.current = true;

      void (async () => {
        try {
          if (route?.params?.startNewOrder === true) {
            if (startNewOrderHandledRef.current) {
              return;
            }

            startNewOrderHandledRef.current = true;
            navigation.setParams({startNewOrder: false});

            if (usesLinkedCheckOrders) {
              const ensuredOrder = await ensureActiveOrder(undefined, {forceNew: true});
              linkedSessionBootstrappedRef.current = !!(
                ensuredOrder?.id ||
                ensuredOrder?.['@id']
              );
            } else {
              const ensuredOrder = await ensureActiveOrder(undefined, {forceNew: true});
              linkedSessionBootstrappedRef.current = !!(
                ensuredOrder?.id ||
                ensuredOrder?.['@id']
              );
            }
            return;
          }

          if (route?.params?.resumeExistingOrder === true && resumeOrderId) {
            await refreshActiveOrder(resumeOrderId);
            return;
          }

          if (!activeOrderId) {
            const storedDraftOrder = await loadStoredDraftOrder();

            if (storedDraftOrder) {
              linkedSessionBootstrappedRef.current = true;
              return;
            }

            if (isSingleItemMode) {
              const ensuredOrder = await ensureActiveOrder(undefined, {forceNew: true});
              linkedSessionBootstrappedRef.current = !!(
                ensuredOrder?.id ||
                ensuredOrder?.['@id']
              );
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
          if (!isLinkedOrderCodeRequiredError(error)) {
            showError?.(
              error?.message ||
                'Nao foi possivel preparar o pedido para iniciar a venda.',
            );
          }
        } finally {
          isLoadingStoredOrderRef.current = false;
        }
      })();

      return undefined;
    }, [
      currentCompany?.id,
      activeOrderId,
      ensureActiveOrder,
      isCashRegisterClosed,
      loadStoredDraftOrder,
      navigation,
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
