import React, {useCallback, useState} from 'react';
import {View} from 'react-native';
import {useStore} from '@store';
import {useFocusEffect, useRoute} from '@react-navigation/native';

import Categories from '@controleonline/ui-orders/src/react/pages/checkout/Categories';
import TotemProducts from '@controleonline/ui-orders/src/react/pages/checkout/TotemProducts';

import {APP_ENV} from '@controleonline/../../config/env.js';

// ALEMAC // 24/01/2026 // para mostrar ou não o barcode input
import BarcodeInput from '@controleonline/ui-orders/src/react/pages/checkout/BarcodeInput';

const CheckoutContent = ({navigation}) => {
  const route = useRoute();

  const ordersStore = useStore('orders');
  const peopleStore = useStore('people');
  const deviceStore = useStore('device');
  const deviceConfigStore = useStore('device_config');

  const ordersActions = ordersStore.actions;
  const ordersGetters = ordersStore.getters;
  const peopleGetters = peopleStore.getters;
  const deviceGetters = deviceStore.getters;

  const {currentCompany, defaultCompany} = peopleGetters;
  const {item: storagedDevice} = deviceGetters;
  const {item: order, items: orders} = ordersGetters;

  // ALEMAC // 24/01/2026 // para mostrar ou não o barcode input
  const device = deviceConfigStore.getters?.item;
  const showBarcode =
    device?.configs?.['barcode-reader'] === '1' ||
    device?.configs?.['barcode-reader'] === true;

  const status = defaultCompany?.configs['pos-default-status'];

  const [forceCreate, setForceCreate] = useState(
    route.params?.forceCreate || false,
  );

  const Component =
    APP_ENV.APP_TYPE === 'TOTEM' ? TotemProducts : Categories;

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
      ) {
        setForceCreate(true);
      }
    }, [currentCompany, order, orders]),
  );

  return (
    <View style={{flex: 1}}>
      {/* ALEMAC // 24/01/2026 // para mostrar ou não o barcode input */}
      {showBarcode && <BarcodeInput />}

      <Component />
    </View>
  );
};

export default CheckoutContent;