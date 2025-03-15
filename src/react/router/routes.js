import OrdersPage from '@controleonline/ui-orders/src/react/pages/orders/sales/index';
import OrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails';
import Checkout from '@controleonline/ui-orders/src/react/pages/checkout/index';
import Categories from '@controleonline/ui-orders/src/react/pages/checkout/Categories';
import Products from '@controleonline/ui-orders/src/react/pages/checkout/Products';
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
    name: 'ProductsPage',
    component: Products,
    options: {
      headerShown: true,
      title: 'Escolher Produtos',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: {store: 'products'},
  },
  {
    name: 'AddProductScreen',
    component: Categories,
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
    options: {headerShown: true, title: 'Forma de Pagamento', store: 'cart'},
    initialParams: {store: 'cart'},
  },
];

export default ordersRoutes;
