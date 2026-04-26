import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useStore} from '@store';
import {useFocusEffect, useRoute} from '@react-navigation/native';

import Categories from '@controleonline/ui-products/src/react/pages/Categories';
import LinkedOrderEntrySheet from '@controleonline/ui-orders/src/react/components/LinkedOrderEntrySheet';
import {
  isPosCashRegisterClosed,
  isPosKioskMode,
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
  const isKioskMode = isPosKioskMode(runtimeDeviceConfig?.configs);
  const shouldUseCashRegisterLifecycle = shouldUsePosCashRegisterLifecycle(
    runtimeDeviceConfig?.configs,
  );
  const isCashRegisterClosed = isPosCashRegisterClosed(
    runtimeDeviceConfig?.configs,
  );
  const isLoadingStoredOrderRef = useRef(false);
  const linkedOrderEntryResolverRef = useRef(null);
  const [linkedOrderEntryState, setLinkedOrderEntryState] = useState(null);
  const requestLinkedOrderInput = useCallback(
    request =>
      new Promise(resolve => {
        linkedOrderEntryResolverRef.current = resolve;
        setLinkedOrderEntryState({
          orderType: request?.orderType || 'tab',
          preferredInputType: request?.preferredInputType || 'manual',
        });
      }),
    [],
  );
  const {
    activeOrder,
    ensureActiveOrder,
    loadStoredDraftOrder,
    prepareNewDraftOrder,
    usesLinkedCheckOrders,
  } = usePosCartSession({
    companyId: currentCompany?.id,
    deviceId: storagedDevice?.id,
    defaultStatusId: defaultCompany?.configs?.['pos-default-status'],
    requestLinkedOrderInput,
  });
  const activeOrderId = activeOrder?.id || activeOrder?.['@id'] || null;
  const Component = Categories;

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
    return () => {
      ordersActions.initQueue();
    };
  }, [ordersActions]);

  useEffect(() => {
    if (isKioskMode) {
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
  }, [isKioskMode, navigation, route?.params?.showBottomToolBar]);

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
            if (usesLinkedCheckOrders) {
              await ensureActiveOrder(undefined, {forceNew: true});
            } else {
              prepareNewDraftOrder();
            }
            navigation.setParams({startNewOrder: false});
            return;
          }

          if (!activeOrderId) {
            const storedDraftOrder = await loadStoredDraftOrder();

            if (!storedDraftOrder && usesLinkedCheckOrders) {
              await ensureActiveOrder();
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
      prepareNewDraftOrder,
      route?.params?.startNewOrder,
      showError,
      shouldUseCashRegisterLifecycle,
      usesLinkedCheckOrders,
    ]),
  );

  return (
    <>
      <Component navigation={navigation} route={route} />
      <LinkedOrderEntrySheet
        onCancel={handleCancelLinkedOrderEntry}
        onSubmit={resolveLinkedOrderEntry}
        orderType={linkedOrderEntryState?.orderType || 'tab'}
        preferredInputType={linkedOrderEntryState?.preferredInputType || 'manual'}
        visible={!!linkedOrderEntryState}
      />
    </>
  );
};

export default CheckoutContent;
