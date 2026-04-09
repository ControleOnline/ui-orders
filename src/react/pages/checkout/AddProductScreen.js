import React, {useCallback, useState} from 'react';
import {useStore} from '@store';
import {useFocusEffect, useRoute} from '@react-navigation/native';

import Categories from '@controleonline/ui-products/src/react/pages/Categories';
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

  const status = defaultCompany?.configs['pos-default-status'];
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
      // Cria nova order sempre que não há uma ativa no PDV,
      // independente de existirem outros pedidos na lista de histórico
      if (status && currentCompany && order === null) setForceCreate(true);
    }, [currentCompany, order, status]),
  );

  return <Component />;
};

export default CheckoutContent;
