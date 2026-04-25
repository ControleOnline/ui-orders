import React, {useCallback, useEffect, useRef} from 'react';
import {useStore} from '@store';
import {useFocusEffect, useRoute} from '@react-navigation/native';

import Categories from '@controleonline/ui-products/src/react/pages/Categories';
import usePosCartSession from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';

const CheckoutContent = ({navigation, route: routeProp}) => {
  const currentRoute = useRoute();
  const route = routeProp || currentRoute;
  const ordersStore = useStore('orders');
  const peopleStore = useStore('people');
  const deviceStore = useStore('device');
  const ordersActions = ordersStore.actions;
  const ordersGetters = ordersStore.getters;
  const peopleGetters = peopleStore.getters;
  const {currentCompany, defaultCompany} = peopleGetters;
  const deviceGetters = deviceStore.getters;
  const {item: storagedDevice} = deviceGetters;
  const {item: order} = ordersGetters;
  const currentOrderId =
    order?.id ||
    order?.['@id'] ||
    null;
  const {loadStoredDraftOrder} = usePosCartSession({
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

  useFocusEffect(
    useCallback(() => {
      if (currentOrderId || isLoadingStoredOrderRef.current || !currentCompany?.id) {
        return undefined;
      }

      isLoadingStoredOrderRef.current = true;

      void (async () => {
        try {
          await loadStoredDraftOrder();
        } finally {
          isLoadingStoredOrderRef.current = false;
        }
      })();

      return undefined;
    }, [
      currentCompany?.id,
      currentOrderId,
      loadStoredDraftOrder,
    ]),
  );

  return <Component navigation={navigation} route={route} />;
};

export default CheckoutContent;
