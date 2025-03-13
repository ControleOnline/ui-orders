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
  },
  {
    name: 'OrderDetails',
    component: WrappedOrderDetails,
    options: {
      headerShown: true,
      title: 'Detalhes do pedido',
    },
  },
  {
    name: 'Checkout',
    component: Checkout, // Sem ShopLayout, então passa route diretamente
    options: {headerShown: true, title: 'Forma de Pagamento'},
  },
];

export default ordersRoutes;
