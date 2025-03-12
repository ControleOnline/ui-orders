import OrdersPage from '@controleonline/ui-orders/src/react/pages/orders/sales/index';
import OrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails';
import Checkout from '@controleonline/ui-orders/src/react/components/checkout/index';
import ScreenWithToolbar from '@controleonline/ui-layout/src/react/components/ScreenWithToolbar';

const WrappedOrdersPage = ({navigation, route}) => (
  <ScreenWithToolbar navigation={navigation} route={route}>
    <OrdersPage navigation={navigation} route={route} />
  </ScreenWithToolbar>
);

const WrappedOrderDetails = ({navigation, route}) => (
  <ScreenWithToolbar navigation={navigation} route={route}>
    <OrderDetails navigation={navigation} route={route} />
  </ScreenWithToolbar>
);

const ordersRoutes = [
  {
    name: 'SalesOrdersPage',
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
    component: Checkout, // Sem ScreenWithToolbar, então passa route diretamente
    options: {headerShown: true, title: 'Forma de Pagamento'},
  },
];

export default ordersRoutes;
