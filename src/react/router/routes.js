import OrdersPage from '@controleonline/ui-orders/src/react/pages/orders/sales/index';
import OrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails';
import Checkout from '@controleonline/ui-orders/src/react/components/checkout/index';
import ShopLayout from '@controleonline/ui-layout/src/react/layouts/ShopLayout';

const WrappedOrdersPage = ({navigation, route, store}) => (
  <ShopLayout navigation={navigation} route={route} store={store}>
    <OrdersPage navigation={navigation} route={route} />
  </ShopLayout>
);

const WrappedOrderDetails = ({navigation, route, store}) => (
  <ShopLayout navigation={navigation} route={route} store={store}>
    <OrderDetails navigation={navigation} route={route} />
  </ShopLayout>
);

const ordersRoutes = [
  {
    name: 'SalesOrderIndex',
    component: WrappedOrdersPage,
    options: {
      headerShown: true,
      title: 'Pedidos de Venda',
      headerBackButtonMenuEnabled: false,
      store: 'orders',
    },
  },
  {
    name: 'OrderDetails',
    component: WrappedOrderDetails,
    options: {
      headerShown: true,
      title: 'Detalhes do pedido',
      store: 'orders',
    },
  },
  {
    name: 'Checkout',
    component: Checkout, // Sem ShopLayout, então passa route diretamente
    options: {headerShown: true, title: 'Forma de Pagamento', store: 'cart'},
  },
];

export default ordersRoutes;
