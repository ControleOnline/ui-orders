import OrdersPage from '@controleonline/ui-orders/src/react/pages/orders/sales/index';
import OrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails';
import Checkout from '@controleonline/ui-orders/src/react/pages/checkout/Checkout';
import AddProductScreen from '@controleonline/ui-orders/src/react/pages/checkout/AddProductScreen';

import Products from '@controleonline/ui-orders/src/react/pages/checkout/Products';
import ShopLayout from '@controleonline/ui-layout/src/react/layouts/ShopLayout';
import CartLayout from '@controleonline/ui-layout/src/react/layouts/CartLayout';
import OrderTools from '@controleonline/ui-orders/src/react/pages/orders/sales/OrderTools';
import PurchasingSuggestion from '@controleonline/ui-orders/src/react/pages/orders/purchasing/Suggestion';
import Inventory from '@controleonline/ui-orders/src/react/pages/inventory';
import CashRegister from '@controleonline/ui-orders/src/react/pages/CashRegister';
import Withdrawal from '@controleonline/ui-orders/src/react/pages/CashRegister/Withdrawal';
import CloseCashRegister from '@controleonline/ui-orders/src/react/pages/CashRegister/CloseCashRegister';
import CustomizeScreen from '@controleonline/ui-products/src/react/pages/CustomizeScreen';
import {useStores} from '@store';

import React from 'react';
import BarcodeInput from '@controleonline/ui-orders/src/react/pages/checkout/BarcodeInput';

const WrappedOrdersPage = ({navigation, route}) => (
  <ShopLayout navigation={navigation} route={route}>
    <OrdersPage navigation={navigation} route={route} />
  </ShopLayout>
);

const WrappedCloseCashRegister = ({navigation, route}) => {
  const device_configStore = useStores(state => state.device_config);
  const deviceConfigGetters = device_configStore.getters;
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
      <CloseCashRegister navigation={navigation} route={route} />
    </ShopLayout>
  );
};

const WrappedCustomizeScreen = ({navigation, route}) => (
  <ShopLayout navigation={navigation} route={route}>
    <CustomizeScreen navigation={navigation} route={route} />
  </ShopLayout>
);

const WrappedPurchasingSuggestion = ({navigation, route}) => (
  <ShopLayout navigation={navigation} route={route}>
    <PurchasingSuggestion navigation={navigation} route={route} />
  </ShopLayout>
);

const WrappedInventory = ({navigation, route}) => (
  <ShopLayout navigation={navigation} route={route}>
    <Inventory navigation={navigation} route={route} />
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
    <CartLayout navigation={navigation} route={route}>
      <Products navigation={navigation} route={route} />
    </CartLayout>
  </ShopLayout>
);

const WrappedAddProductsPage = ({navigation, route}) => {
  const ordersStore = useStores(state => state.orders);
  const ordersGetters = ordersStore.getters;
  const {item: order} = ordersGetters;

  React.useEffect(() => {
    navigation.setOptions({
      title: order?.id ? `Pedido #${order.id}` : 'Pedido',
    });
  }, [navigation, order]);

  return (
    <ShopLayout navigation={navigation} route={route}>
      <BarcodeInput />
      <CartLayout navigation={navigation} route={route}>
        <AddProductScreen navigation={navigation} route={route} />
      </CartLayout>
    </ShopLayout>
  );
};

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
      <BarcodeInput />
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
    name: 'PurchasingSuggestion',
    component: WrappedPurchasingSuggestion,
    options: {
      headerShown: true,
      title: 'Sugestão de Compras',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: {store: 'products'},
  },
  {
    name: 'Inventory',
    component: WrappedInventory,
    options: {
      headerShown: true,
      title: 'Estoque',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: {store: 'products'},
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
    name: 'CloseCashRegister',
    component: WrappedCloseCashRegister,
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
    component: WrappedAddProductsPage,
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
    options: {headerShown: false},
    initialParams: {store: 'cart'},
  },
];

export default ordersRoutes;
