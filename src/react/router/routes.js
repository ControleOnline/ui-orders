import OrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails';
import Checkout from '@controleonline/ui-orders/src/react/pages/checkout/Checkout';
import AddProductScreen from '@controleonline/ui-orders/src/react/pages/checkout/AddProductScreen';
import CashRegister from '@controleonline/ui-orders/src/react/pages/CashRegister';
import Withdrawal from '@controleonline/ui-orders/src/react/pages/CashRegister/Withdrawal';
import CloseCashRegister from '@controleonline/ui-orders/src/react/pages/CashRegister/CloseCashRegister';
import PrintQueuePage from '@controleonline/ui-orders/src/react/pages/Prints';
import OrderIdentityLabel from '@controleonline/ui-orders/src/react/components/OrderIdentityLabel';
import {menuStorefrontRoute} from '@controleonline/ui-shop/src/react/router/routes';
import { useStore } from '@store';

import React from 'react';


const WrappedCloseCashRegister = ({ navigation, route }) => {
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
      title: global.t?.t('orders', 'title', 'order'),
      headerTitle: () => (
        <OrderIdentityLabel
          order={order}
          primaryTextStyle={{fontSize: 16, fontWeight: '700'}}
          secondaryTextStyle={{fontSize: 11, color: '#64748B', fontWeight: '600'}}
        />
      ),
      headerBackVisible: true,
    });
  }, [navigation, order]);

  return (
    <AddProductScreen navigation={navigation} route={route} />
  );
};

const WrappedOrderDetails = ({ navigation, route }) => {
  const order = route.params?.order;

  React.useEffect(() => {
    navigation.setOptions({
      title: global.t?.t('orders', 'title', 'order'),
      headerTitle: () => (
        <OrderIdentityLabel
          order={order}
          primaryTextStyle={{fontSize: 16, fontWeight: '700'}}
          secondaryTextStyle={{fontSize: 11, color: '#64748B', fontWeight: '600'}}
        />
      ),
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
      title: global.t?.t('orders', 'title', 'cashRegister'),
    },
  },
  {
    name: 'Withdrawal',
    component: Withdrawal,
    options: {
      headerShown: true,
      title: global.t?.t('orders', 'title', 'withdrawal'),
    },
  },
  {
    name: 'PrintQueuePage',
    component: PrintQueuePage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Impressões',
    },
    path: 'prints',
  },
  {
    name: 'AddProductScreen',
    component: WrappedAddProductsPage,
    options: {
      headerShown: true,
      showBottomCart: true,
      title: global.t?.t('orders', 'title', 'chooseCategory'),
    },
    initialParams: { store: 'categories' },
  },
  {
    name: 'OrderDetails',
    component: WrappedOrderDetails,
    options: {
      headerShown: true,
      title: global.t?.t('orders', 'title', 'order'),
    },
    initialParams: { store: 'orders' },
  },
  {
    name: 'Checkout',
    component: Checkout,
    options: {
      showBottomCart: false,
      title: global.t?.t('orders', 'title', 'checkout') || 'Pagamento',
    },
    initialParams: { store: 'cart' },
  },
];

export default ordersRoutes;
