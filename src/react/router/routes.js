import OrdersPage from '@controleonline/ui-orders/src/react/pages/orders/sales/index';
import OrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails';
import Checkout from '@controleonline/ui-orders/src/react/pages/checkout/index';
import ProductCart from '@controleonline/ui-orders/src/react/pages/checkout/ProductCart';

import ShopLayout from '@controleonline/ui-layout/src/react/layouts/ShopLayout';
import React from 'react';

const WrappedOrdersPage = ({navigation, route}) => (
  <ShopLayout navigation={navigation} route={route}>
    <OrdersPage navigation={navigation} route={route} />
  </ShopLayout>
);

const WrappedOrderDetails = ({navigation, route}) => {
  const orderId = route.params?.orderId;

  React.useEffect(() => {
    navigation.setOptions({
      title: orderId ? `Pedido #${orderId}` : 'Pedido',
    });
  }, [navigation, orderId]);

  return <OrderDetails navigation={navigation} route={route} />;
};

const ordersRoutes = [
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
    name: 'AddProductScreen',
    component: ProductCart,
    options: {
      headerShown: true,
      title: 'Adicionar Produtos',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: {store: 'orders'},
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
    options: {headerShown: true, title: 'Forma de Pagamento', store: 'cart'},
    initialParams: {store: 'cart'},
  },
];

export default ordersRoutes;
