import OrderDetails from '@controleonline/ui-orders/src/react/pages/orders/sales/orderDetails';
import Checkout from '@controleonline/ui-orders/src/react/pages/checkout/Checkout';
import AddProductScreen from '@controleonline/ui-orders/src/react/pages/checkout/AddProductScreen';
import CashRegister from '@controleonline/ui-orders/src/react/pages/CashRegister';
import Withdrawal from '@controleonline/ui-orders/src/react/pages/CashRegister/Withdrawal';
import CloseCashRegister from '@controleonline/ui-orders/src/react/pages/CashRegister/CloseCashRegister';
import PrintQueuePage from '@controleonline/ui-orders/src/react/pages/Prints';
import OrderHistoryPage from '@controleonline/ui-orders/src/react/pages/orders/OrderHistoryPage';
import OrderIdentityLabel from '@controleonline/ui-orders/src/react/components/OrderIdentityLabel';
import {menuStorefrontRoute} from '@controleonline/ui-shop/src/react/router/routes';
import {
  shouldShowOrderHistoryCompanyFilter,
} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import { useStore } from '@store';
import { env } from '@env';
import {MaterialCommunityIcons} from '@expo/vector-icons';

import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

export {WrappedOrderLogistics} from '@controleonline/ui-logistic/src/react/router/routes';

const routeStyles = StyleSheet.create({
  addProductHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  addProductBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE7F3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -2,
  },
  addProductModeBadge: {
    minHeight: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE7F3',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  addProductModeText: {
    color: '#022736',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  addProductTitleWrap: {
    minWidth: 0,
  },
});

const normalizeOrderId = value => String(value || '').replace(/\D+/g, '');

const AddProductHeader = ({navigation, order, route}) => {
  const routeOrderId = normalizeOrderId(route?.params?.id);
  const displayOrder = routeOrderId
    ? {...(order || {}), id: routeOrderId}
    : order;
  const routeStore = String(route?.params?.store || '').trim().toLowerCase();
  const isCategoryRoot =
    ['category', 'categories'].includes(routeStore) &&
    !route?.params?.categoryId &&
    route?.params?.resumeExistingOrder !== true;
  const showBackButton = !isCategoryRoot;
  const shouldShowPosBadge =
    String(route?.params?.interactionMode || '').toLowerCase() === 'pdv' ||
    String(env.APP_TYPE || '').toUpperCase() === 'POS';

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation?.navigate?.('HomePage');
  };

  return (
    <View style={routeStyles.addProductHeader}>
      {showBackButton && (
        <Pressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleBack}
          style={routeStyles.addProductBackButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#022736" />
        </Pressable>
      )}
      {shouldShowPosBadge && (
        <View style={routeStyles.addProductModeBadge}>
          <Text style={routeStyles.addProductModeText}>POS</Text>
        </View>
      )}
      <OrderIdentityLabel
        containerStyle={routeStyles.addProductTitleWrap}
        numberOfLines={1}
        order={displayOrder}
        primaryTextStyle={{fontSize: 18, fontWeight: '900', color: '#0F172A'}}
        secondaryTextStyle={{fontSize: 11, color: '#64748B', fontWeight: '700'}}
        showSecondary={false}
      />
    </View>
  );
};

const WrappedCloseCashRegister = ({ navigation, route }) => {
  const cashRegisterTitle =
    global.t?.t('orders', 'title', 'cashRegister') || 'Caixa';

  React.useEffect(() => {
    navigation.setOptions({
      title: cashRegisterTitle,
    });
  }, [cashRegisterTitle, navigation]);

  return (
    <CloseCashRegister navigation={navigation} route={route} />
  );
};


const WrappedAddProductsPage = ({ navigation, route }) => {
  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const { item: order } = ordersGetters;
  const orderTitle = global.t?.t('orders', 'title', 'order') || 'Pedido';

  React.useEffect(() => {
    navigation.setOptions({
      title: orderTitle,
      headerBackVisible: false,
      headerLeft: () => (
        <AddProductHeader navigation={navigation} order={order} route={route} />
      ),
      headerTitle: () => null,
      headerShadowVisible: true,
      headerStyle: {
        backgroundColor: '#FFFFFF',
      },
      headerLeftContainerStyle: {
        paddingLeft: 4,
      },
    });
  }, [navigation, order, orderTitle, route]);

  return (
    <AddProductScreen navigation={navigation} route={route} />
  );
};

const WrappedOrderDetails = ({ navigation, route }) => {
  const order = route.params?.order;
  const orderTitle = global.t?.t('orders', 'title', 'order') || 'Pedido';

  React.useEffect(() => {
    navigation.setOptions({
      title: orderTitle,
      headerTitle: () => (
        <OrderIdentityLabel
          order={order}
          primaryTextStyle={{fontSize: 16, fontWeight: '700'}}
          secondaryTextStyle={{fontSize: 11, color: '#64748B', fontWeight: '600'}}
        />
      ),
      headerBackVisible: true,
    });
  }, [navigation, order, orderTitle]);

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
      title: () => global.t?.t('orders', 'title', 'cashRegister'),
    },
  },
  {
    name: 'CloseCashRegister',
    component: WrappedCloseCashRegister,
    options: {
      headerShown: true,
      title: () => global.t?.t('orders', 'title', 'cashRegister'),
    },
  },
  {
    name: 'Withdrawal',
    component: Withdrawal,
    options: {
      headerShown: true,
      title: () => global.t?.t('orders', 'title', 'withdrawal'),
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
      title: () => global.t?.t('orders', 'title', 'chooseCategory'),
    },
    initialParams: { store: 'categories' },
  },
  {
    name: 'OrderHistoryPage',
    component: OrderHistoryPage,
    options: ({route}) => ({
      headerShown: true,
      headerBackVisible: true,
      title: () => global.t?.t('configs', 'title', 'orderHistory'),
      showCompanyFilter: shouldShowOrderHistoryCompanyFilter({
        appType: env.APP_TYPE,
        params: route?.params,
      }),
      companyFilterMode: 'icon',
    }),
  },
  {
    name: 'OrderDetails',
    component: WrappedOrderDetails,
    options: {
      headerShown: true,
      showBottomCart: false,
      showBottomToolBar: false,
      title: () => global.t?.t('orders', 'title', 'order'),
    },
    initialParams: { store: 'orders' },
  },
  {
    name: 'Checkout',
    component: Checkout,
    options: {
      showBottomCart: false,
      title: () => global.t?.t('orders', 'title', 'checkout') || 'Pagamento',
    },
    initialParams: { store: 'cart' },
  },
];

export default ordersRoutes;
