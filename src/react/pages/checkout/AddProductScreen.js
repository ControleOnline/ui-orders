import React, {useCallback, useState} from 'react';
import {useStore} from '@store';
import {useFocusEffect, useRoute} from '@react-navigation/native';

import Categories from '@controleonline/ui-products/src/react/pages/Categories';
import usePosCartSession from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';
import TotemProducts from '@controleonline/ui-orders/src/react/pages/checkout/TotemProducts';
import {env} from '@env';

const CheckoutContent = ({navigation}) => {
  const route = useRoute();
  const ordersStore = useStore('orders');
  const peopleStore = useStore('people');
  const deviceStore = useStore('device');
  const ordersActions = ordersStore.actions;
  const ordersGetters = ordersStore.getters;
  const peopleGetters = peopleStore.getters;
  const {currentCompany, defaultCompany, isLoading, error} = peopleGetters;
  const deviceGetters = deviceStore.getters;
  const {item: storagedDevice} = deviceGetters;
  const {item: order, items: orders} = ordersGetters;
  const {activeOrder, ensureActiveOrder, loadStoredDraftOrder} = usePosCartSession({
    companyId: currentCompany?.id,
    deviceId: storagedDevice?.id,
    defaultStatusId: defaultCompany?.configs['pos-default-status'],
  });

  const [forceCreate, setForceCreate] = useState(
    route.params?.forceCreate || false,
  );

  const Component = env.APP_TYPE === 'TOTEM' ? TotemProducts : Categories;

  useFocusEffect(
    useCallback(() => {
      return () => {
        ordersActions.initQueue();
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      void loadStoredDraftOrder()
    }, [loadStoredDraftOrder]),
  )

  useFocusEffect(
    useCallback(() => {
      if (forceCreate) {
        setForceCreate(false)
        void ensureActiveOrder()
      }
    }, [ensureActiveOrder, forceCreate]),
  );
  useFocusEffect(
    useCallback(() => {
      if (currentCompany && !activeOrder) setForceCreate(true);
    }, [activeOrder, currentCompany]),
  );

  return <Component />;
};

export default CheckoutContent;
