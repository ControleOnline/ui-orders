import OrdersPage from '@controleonline/ui-orders/src/react/pages/orders/sales/index';
import OrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails';
import Checkout from '@controleonline/ui-orders/src/react/components/checkout/index';
import ShopLayout from '@controleonline/ui-layout/src/react/layouts/ShopLayout';

const WrappedOrdersPage = ({navigation, route}) => (
  <ShopLayout navigation={navigation} route={route}>
    <OrdersPage navigation={navigation} route={route} />
  </ShopLayout>
);

const WrappedOrderDetails = ({navigation, route}) => (
  <ShopLayout navigation={navigation} route={route}>
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
    },
    initialParams: {store: 'orders'},
  },
  {
    name: 'OrderDetails',
    component: WrappedOrderDetails,
    options: {
      headerShown: true,
      title: 'Detalhes do pedido',
    },
    initialParams: {store: 'orders'},
  },
  {
    name: 'Checkout',
    component: Checkout, // Sem ShopLayout, então passa route diretamente
    options: {headerShown: true, title: 'Forma de Pagamento', store: 'cart'},
    initialParams: {store: 'cart'},
  },
];

export default ordersRoutes;
