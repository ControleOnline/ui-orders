import OrdersPage from '@controleonline/ui-orders/src/react/pages/orders/sales/index';
import OrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails';
import Checkout from '@controleonline/ui-orders/src/react/pages/checkout/index';
import Categories from '@controleonline/ui-orders/src/react/pages/checkout/Categories';
import Products from '@controleonline/ui-orders/src/react/pages/checkout/Products';
import ShopLayout from '@controleonline/ui-layout/src/react/layouts/ShopLayout';
import CartLayout from '@controleonline/ui-layout/src/react/layouts/CartLayout';

import React from 'react';

const WrappedOrdersPage = ({navigation, route}) => (
  <ShopLayout navigation={navigation} route={route}>
    <OrdersPage navigation={navigation} route={route} />
  </ShopLayout>
);

const WrappedProductsPage = ({navigation, route}) => (
  <CartLayout navigation={navigation} route={route}>
    <Products navigation={navigation} route={route} />
  </CartLayout>
);

const WrappedCategoryPage = ({navigation, route}) => (
  <CartLayout navigation={navigation} route={route}>
    <Categories navigation={navigation} route={route} />
  </CartLayout>
);

const WrappedOrderDetails = ({navigation, route}) => {
  const order = route.params?.order;

  React.useEffect(() => {
    navigation.setOptions({
      title: order?.id ? `Pedido #${order.id}` : 'Pedido',
    });
  }, [navigation, order]);

  return (
    <CartLayout navigation={navigation} route={route}>
      <OrderDetails navigation={navigation} route={route} />
    </CartLayout>
  );
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
    options: {headerShown: true, title: 'Forma de Pagamento', store: 'cart'},
    initialParams: {store: 'cart'},
  },
];

export default ordersRoutes;
