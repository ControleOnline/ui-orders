import React, {useCallback, useState} from 'react';
import {useStores} from '@store';
import {useFocusEffect, useRoute} from '@react-navigation/native';

import Categories from '@controleonline/ui-orders/src/react/pages/checkout/Categories';
import TotemProducts from '@controleonline/ui-orders/src/react/pages/checkout/TotemProducts';
import {APP_ENV} from '@controleonline/../../config/env.js';
const CheckoutContent = ({navigation}) => {
  const route = useRoute();
  const ordersStore = useStores(state => state.orders);
  const peopleStore = useStores(state => state.people);
  const deviceStore = useStores(state => state.device);
  const ordersActions = ordersStore.actions;
  const ordersGetters = ordersStore.getters;
  const peopleGetters = peopleStore.getters;
  const {currentCompany, defaultCompany, isLoading, error} = peopleGetters;
  const deviceGetters = deviceStore.getters;
  const {item: storagedDevice} = deviceGetters;
  const {item: order, items: orders} = ordersGetters;

  const status = defaultCompany?.configs['pos-default-status'];
  const [forceCreate, setForceCreate] = useState(
    route.params?.forceCreate || false,
  );
  const Component = APP_ENV.APP_TYPE === 'TOTEM' ? TotemProducts : Categories;

  useFocusEffect(
    useCallback(() => {
      return () => {
        ordersActions.initQueue();
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (forceCreate) {
        setForceCreate(false);
        ordersActions
          .save({
            app: 'POS',
            provider: '/people/' + currentCompany.id,
            status: '/statuses/' + status,
            'device.device': storagedDevice.id,
            orderType: 'sale',
          })
          .then(data => {
            ordersActions.setItem(data);
          });
      }
    }, [forceCreate]),
  );
  useFocusEffect(
    useCallback(() => {
      if (
        status &&
        currentCompany &&
        orders &&
        orders.length === 0 &&
        order === null
      )
        setForceCreate(true);
    }, [currentCompany, order, orders]),
  );

  return <Component />;
};

export default CheckoutContent;
