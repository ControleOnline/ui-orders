import OrdersPage from '@controleonline/ui-orders/src/react/pages/orders/sales/index';
import OrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails';
import Checkout from '@controleonline/ui-orders/src/react/pages/checkout/Checkout';
import AddProductScreen from '@controleonline/ui-orders/src/react/pages/checkout/AddProductScreen';
import OrderTools from '@controleonline/ui-orders/src/react/pages/orders/sales/OrderTools';
import CashRegister from '@controleonline/ui-orders/src/react/pages/CashRegister';
import Withdrawal from '@controleonline/ui-orders/src/react/pages/CashRegister/Withdrawal';
import CloseCashRegister from '@controleonline/ui-orders/src/react/pages/CashRegister/CloseCashRegister';
import { useStore } from '@store';

import React from 'react';


const WrappedCloseCashRegister = ({ navigation, route }) => {
  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore.getters;
  const { item: device } = deviceConfigGetters;

  React.useEffect(() => {
    navigation.setOptions({
      title:
        !device?.configs ||
          device?.configs['cash-wallet-closed-id'] == undefined ||
          device?.configs['cash-wallet-closed-id'] > 0
          ? 'Abrir Caixa XXX'
          : 'Fechar Caixa YYY',
    });
  }, [navigation, device.configs['cash-wallet-open-id']]);

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
      title: order?.id ? `Pedido #${order.id}` : 'Pedido',
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
      title: order?.id ? `Pedido #${order.id}` : 'Pedido',
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
      title: order?.id ? `Pedido #${order.id}` : 'Pedido',
    });
  }, [navigation, order]);

  return (
    <OrderDetails navigation={navigation} route={route} />
  );
};

const ordersRoutes = [

  {
    name: 'SalesOrderIndex',
    component: OrdersPage,
    options: {
      headerShown: true,
      title: 'Pedidos de Venda',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: { store: 'orders' },
  },
  {
    name: 'OrderTools',
    component: WrappedOrderTools,
    options: {
      headerShown: true,
      title: 'Pedido',
    },
    initialParams: { store: 'orders' },
  },
  {
    name: 'CashRegisterIndex',
    component: CashRegister,
    options: {
      headerShown: true,
      title: 'Caixa',
    },
  },
  {
    name: 'CloseCashRegister',
    component: WrappedCloseCashRegister,
    options: {
      headerShown: true,
      title: 'Caixa',
    },
  },
  {
    name: 'Withdrawal',
    component: Withdrawal,
    options: {
      headerShown: true,
      title: 'Sangria',
    },
  },
  {
    name: 'AddProductScreen',
    component: WrappedAddProductsPage,
    options: {
      headerShown: true,
      title: 'Escolher Categoria',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: { store: 'categories' },
  },
  {
    name: 'OrderDetails',
    component: WrappedOrderDetails,
    options: {
      headerShown: true,
      title: 'Pedido',
    },
    initialParams: { store: 'orders' },
  },
  {
    name: 'Checkout',
    component: Checkout,
    options: { headerShown: false },
    initialParams: { store: 'cart' },
  },
];

export default ordersRoutes;
