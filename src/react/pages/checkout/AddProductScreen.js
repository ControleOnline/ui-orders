import React, {useCallback, useEffect, useState} from 'react';
import {useStore} from '@store';
import {useFocusEffect, useRoute} from '@react-navigation/native';

import Categories from '@controleonline/ui-products/src/react/pages/Categories';
import usePosCartSession from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';
import TotemProducts from '@controleonline/ui-orders/src/react/pages/checkout/TotemProducts';
import {env} from '@env';

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
  const {activeOrder, ensureActiveOrder, loadStoredDraftOrder} = usePosCartSession({
    companyId: currentCompany?.id,
    deviceId: storagedDevice?.id,
    defaultStatusId: defaultCompany?.configs?.['pos-default-status'],
  });

  const [forceCreate, setForceCreate] = useState(
    route.params?.forceCreate || false,
  );

  const Component = env.APP_TYPE === 'TOTEM' ? TotemProducts : Categories;

  useEffect(() => {
    return () => {
      ordersActions.initQueue();
    };
  }, [ordersActions]);

  useFocusEffect(
    useCallback(() => {
      if (currentOrderId) return undefined;
      void loadStoredDraftOrder()
    }, [currentOrderId, loadStoredDraftOrder]),
  )

  useFocusEffect(
    useCallback(() => {
      if (forceCreate && !currentOrderId) {
        setForceCreate(false)
        void ensureActiveOrder()
      }
    }, [currentOrderId, ensureActiveOrder, forceCreate]),
  );
  useFocusEffect(
    useCallback(() => {
      if (currentCompany && !activeOrder && !currentOrderId) {
        setForceCreate(true);
      }
    }, [activeOrder, currentCompany, currentOrderId]),
  );

  return <Component navigation={navigation} route={route} />;
};

export default CheckoutContent;
