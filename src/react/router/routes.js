import OrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails';
import Checkout from '@controleonline/ui-orders/src/react/pages/checkout/Checkout';
import AddProductScreen from '@controleonline/ui-orders/src/react/pages/checkout/AddProductScreen';
import OrderTools from '@controleonline/ui-orders/src/react/pages/orders/sales/OrderTools';
import CashRegister from '@controleonline/ui-orders/src/react/pages/CashRegister';
import Withdrawal from '@controleonline/ui-orders/src/react/pages/CashRegister/Withdrawal';
import CloseCashRegister from '@controleonline/ui-orders/src/react/pages/CashRegister/CloseCashRegister';
import {menuStorefrontRoute} from '@controleonline/ui-shop/src/react/router/routes';
import { useStore } from '@store';

import React from 'react';


const WrappedCloseCashRegister = ({ navigation, route }) => {
  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore.getters;
  const { item: device } = deviceConfigGetters;

  React.useEffect(() => {
    navigation.setOptions({
      title: global.t?.t('orders', 'title', 'cashRegister'),
    });
  }, [navigation]);

  return (
    <CloseCashRegister navigation={navigation} route={route} />
  );
};


const WrappedAddProductsPage = ({ navigation, route }) => {
  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const { item: order } = ordersGetters;

  React.useEffect(() => {
    navigation.setOptions({
      title: order?.id ? `${global.t?.t('orders', 'title', 'order')} #${order.id}` : global.t?.t('orders', 'title', 'order'),
      headerBackVisible: true,
    });
  }, [navigation, order]);

  return (
    <AddProductScreen navigation={navigation} route={route} />
  );
};

const WrappedOrderTools = ({ navigation, route }) => {
  const order = route.params?.order;

  React.useEffect(() => {
    navigation.setOptions({
      title: order?.id ? `${global.t?.t('orders', 'title', 'order')} #${order.id}` : global.t?.t('orders', 'title', 'order'),
      headerBackVisible: true,
    });
  }, [navigation, order]);

  return (
    <OrderTools navigation={navigation} route={route} />
  );
};

const WrappedOrderDetails = ({ navigation, route }) => {
  const order = route.params?.order;

  React.useEffect(() => {
    navigation.setOptions({
      title: order?.id ? `${global.t?.t('orders', 'title', 'order')} #${order.id}` : global.t?.t('orders', 'title', 'order'),
      headerBackVisible: true,
    });
  }, [navigation, order]);

  return (
    <OrderDetails navigation={navigation} route={route} />
  );
};

const ordersRoutes = [

  menuStorefrontRoute,
  {
    name: 'OrderTools',
    component: WrappedOrderTools,
    options: {
      showBottomCart: true,
      headerShown: true,
      headerBackVisible: false,
      title: global.t?.t('orders', 'title', 'order'),
    },
    initialParams: { store: 'orders' },
  },
  {
    name: 'CashRegisterIndex',
    component: CashRegister,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: global.t?.t('orders', 'title', 'cashRegister'),
    },
  },
  {
    name: 'CloseCashRegister',
    component: WrappedCloseCashRegister,
    options: {
      headerShown: true,
      headerBackVisible: false,
      title: global.t?.t('orders', 'title', 'cashRegister'),
    },
  },
  {
    name: 'Withdrawal',
    component: Withdrawal,
    options: {
      headerShown: true,
      headerBackVisible: false,
      title: global.t?.t('orders', 'title', 'withdrawal'),
    },
  },
  {
    name: 'AddProductScreen',
    component: WrappedAddProductsPage,
    options: {
      headerShown: true,
      headerBackVisible: false,
      showBottomCart: true,
      showBottomToolBar: true,
      title: global.t?.t('orders', 'title', 'chooseCategory'),
    },
    initialParams: { store: 'categories' },
  },
  {
    name: 'OrderDetails',
    component: WrappedOrderDetails,
    options: {
      headerShown: true,
      headerBackVisible: false,
      showBottomToolBar: false,
      title: global.t?.t('orders', 'title', 'order'),
    },
    initialParams: { store: 'orders' },
  },
  {
    name: 'Checkout',
    component: Checkout,
    options: { showBottomCart: true, headerShown: false },
    initialParams: { store: 'cart' },
  },
];

export default ordersRoutes;
