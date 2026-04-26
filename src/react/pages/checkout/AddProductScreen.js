import React, {useCallback, useEffect, useRef} from 'react';
import {useStore} from '@store';
import {useFocusEffect, useRoute} from '@react-navigation/native';

import Categories from '@controleonline/ui-products/src/react/pages/Categories';
import {
  isPosCashRegisterClosed,
  isPosKioskMode,
  shouldUsePosCashRegisterLifecycle,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import usePosCartSession from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';

const CheckoutContent = ({navigation, route: routeProp}) => {
  const currentRoute = useRoute();
  const route = routeProp || currentRoute;
  const ordersStore = useStore('orders');
  const peopleStore = useStore('people');
  const deviceStore = useStore('device');
  const deviceConfigStore = useStore('device_config');
  const ordersActions = ordersStore.actions;
  const ordersGetters = ordersStore.getters;
  const peopleGetters = peopleStore.getters;
  const {currentCompany, defaultCompany} = peopleGetters;
  const deviceGetters = deviceStore.getters;
  const deviceConfigGetters = deviceConfigStore.getters;
  const {item: storagedDevice} = deviceGetters;
  const {item: runtimeDeviceConfig} = deviceConfigGetters;
  const {item: order} = ordersGetters;
  const currentOrderId =
    order?.id ||
    order?.['@id'] ||
    null;
  const isKioskMode = isPosKioskMode(runtimeDeviceConfig?.configs);
  const shouldUseCashRegisterLifecycle = shouldUsePosCashRegisterLifecycle(
    runtimeDeviceConfig?.configs,
  );
  const isCashRegisterClosed = isPosCashRegisterClosed(
    runtimeDeviceConfig?.configs,
  );
  const {loadStoredDraftOrder, prepareNewDraftOrder} = usePosCartSession({
    companyId: currentCompany?.id,
    deviceId: storagedDevice?.id,
    defaultStatusId: defaultCompany?.configs?.['pos-default-status'],
  });
  const isLoadingStoredOrderRef = useRef(false);
  const Component = Categories;

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
            prepareNewDraftOrder();
            navigation.setParams({startNewOrder: false});
            return;
          }

          if (!currentOrderId) {
            await loadStoredDraftOrder();
          }
        } finally {
          isLoadingStoredOrderRef.current = false;
        }
      })();

      return undefined;
    }, [
      currentCompany?.id,
      currentOrderId,
      isCashRegisterClosed,
      loadStoredDraftOrder,
      navigation,
      prepareNewDraftOrder,
      route?.params?.startNewOrder,
      shouldUseCashRegisterLifecycle,
    ]),
  );

  return <Component navigation={navigation} route={route} />;
};

export default CheckoutContent;
