import OrdersPage from '@controleonline/ui-orders/src/react/pages/orders/sales/index';
import OrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails';
import Checkout from '@controleonline/ui-orders/src/react/pages/checkout/Checkout';
import Categories from '@controleonline/ui-orders/src/react/pages/checkout/Categories';
import Products from '@controleonline/ui-orders/src/react/pages/checkout/Products';
import ShopLayout from '@controleonline/ui-layout/src/react/layouts/ShopLayout';
import CartLayout from '@controleonline/ui-layout/src/react/layouts/CartLayout';
import OrderTools from '@controleonline/ui-orders/src/react/pages/orders/sales/OrderTools';
import CashRegister from '@controleonline/ui-orders/src/react/pages/CashRegister';
import Withdrawal from '@controleonline/ui-orders/src/react/pages/CashRegister/Withdrawal';
import CloseCachRegister from '@controleonline/ui-orders/src/react/pages/CashRegister/CloseCachRegister';
import CustomizeScreen from '@controleonline/ui-products/src/react/pages/CustomizeScreen';
import {getStore} from '@store';

import React from 'react';

const WrappedOrdersPage = ({navigation, route}) => (
  <ShopLayout navigation={navigation} route={route}>
    <OrdersPage navigation={navigation} route={route} />
  </ShopLayout>
);

const WrappedCloseCachRegister = ({navigation, route}) => {
  const {getters: deviceConfigGetters} = getStore('device_config');
  const {item: device} = deviceConfigGetters;

  React.useEffect(() => {
    navigation.setOptions({
      title:
        !device?.configs ||
        device?.configs['cash-wallet-closed-id'] == undefined ||
        device?.configs['cash-wallet-closed-id'] > 0
          ? 'Abrir Caixa'
          : 'Fechar Caixa',
    });
  }, [navigation, device.configs['cash-wallet-open-id']]);

  return (
    <ShopLayout navigation={navigation} route={route}>
      <CloseCachRegister navigation={navigation} route={route} />
    </ShopLayout>
  );
};

const WrappedCustomizeScreen = ({navigation, route}) => (
  <ShopLayout navigation={navigation} route={route}>
    <CustomizeScreen navigation={navigation} route={route} />
  </ShopLayout>
);

const WrappedWithdrawal = ({navigation, route}) => (
  <ShopLayout navigation={navigation} route={route}>
    <Withdrawal navigation={navigation} route={route} />
  </ShopLayout>
);

const WrappedCashRegister = ({navigation, route}) => (
  <ShopLayout navigation={navigation} route={route}>
    <CashRegister navigation={navigation} route={route} />
  </ShopLayout>
);

const WrappedProductsPage = ({navigation, route}) => (
  <ShopLayout navigation={navigation} route={route}>
    <Products navigation={navigation} route={route} />
  </ShopLayout>
);

const WrappedCategoryPage = ({navigation, route}) => (
  <ShopLayout navigation={navigation} route={route}>
    <Categories navigation={navigation} route={route} />
  </ShopLayout>
);

const WrappedOrderTools = ({navigation, route}) => {
  const order = route.params?.order;

  React.useEffect(() => {
    navigation.setOptions({
      title: order?.id ? `Pedido #${order.id}` : 'Pedido',
    });
  }, [navigation, order]);

  return (
    <ShopLayout navigation={navigation} route={route}>
      <CartLayout navigation={navigation} route={route}>
        <OrderTools navigation={navigation} route={route} />
      </CartLayout>
    </ShopLayout>
  );
};

const WrappedOrderDetails = ({navigation, route}) => {
  const order = route.params?.order;

  React.useEffect(() => {
    navigation.setOptions({
      title: order?.id ? `Pedido #${order.id}` : 'Pedido',
    });
  }, [navigation, order]);

  return (
    <ShopLayout navigation={navigation} route={route}>
      <CartLayout navigation={navigation} route={route}>
        <OrderDetails navigation={navigation} route={route} />
      </CartLayout>
    </ShopLayout>
  );
};

const ordersRoutes = [
  {
    name: 'CustomizeScreen',
    component: WrappedCustomizeScreen,
    options: {
      headerShown: true,
      title: 'Customizar Produto',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: {store: 'product'},
  },

  {
    name: 'SalesOrderIndex',
    component: WrappedOrdersPage,
    options: {
      headerShown: true,
      title: 'Pedidos de Venda',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: {store: 'orders'},
  },
  {
    name: 'OrderTools',
    component: WrappedOrderTools,
    options: {
      headerShown: true,
      title: 'Pedido',
    },
    initialParams: {store: 'orders'},
  },
  {
    name: 'CashRegisterIndex',
    component: WrappedCashRegister,
    options: {
      headerShown: true,
      title: 'Caixa',
    },
  },
  {
    name: 'CloseCachRegister',
    component: WrappedCloseCachRegister,
    options: {
      headerShown: true,
      title: 'Caixa', 
    },
  },
  {
    name: 'Withdrawal',
    component: WrappedWithdrawal,
    options: {
      headerShown: true,
      title: 'Sangria',
    },
  },
  {
    name: 'ProductsPage',
    component: WrappedProductsPage,
    options: {
      headerShown: true,
      title: 'Escolher Produtos',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: {store: 'products'},
  },
  {
    name: 'AddProductScreen',
    component: WrappedCategoryPage,
    options: {
      headerShown: true,
      title: 'Escolher Categoria',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: {store: 'categories'},
  },
  {
    name: 'OrderDetails',
    component: WrappedOrderDetails,
    options: {
      headerShown: true,
      title: 'Pedido',
    },
    initialParams: {store: 'orders'},
  },
  {
    name: 'Checkout',
    component: Checkout,
    options: {headerShown: true, title: 'Forma de Pagamento'},
    initialParams: {store: 'cart'},
  },
];

export default ordersRoutes;
