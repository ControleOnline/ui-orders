import React from 'react';
import { useNavigationState } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@store';
import {
  isPosCashRegisterClosed,
  shouldUsePosCashRegisterLifecycle,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import BottomNavigationBar from '@controleonline/ui-common/src/react/components/BottomNavigationBar';

const ShopToolbar = ({ navigation }) => {
  const state = useNavigationState(state => state);
  const activeTab = state.routes[state.index]?.name || 'HomePage';
  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore.getters;
  const { item: device } = deviceConfigGetters;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const themeStore = useStore('theme');
  const getters = themeStore.getters;
  const { colors } = getters;
  const insets = useSafeAreaInsets();
  const { currentCompany } = peopleGetters;

  const isCashRegisterClosed = isPosCashRegisterClosed(device?.configs);
  const shouldShowCashRegisterButton = shouldUsePosCashRegisterLifecycle(
    device?.configs,
  );

  const items = [
    ...(device?.configs && Object.entries(device.configs).length > 0
      ? [
          {
            route: 'HomePage',
            icon: 'home',
            label: global.t?.t('orders', 'label', 'home'),
          },
        ]
      : []),
    {
      route: 'OrderHistoryPage',
      icon: 'shopping-bag',
      label: global.t?.t('orders', 'label', 'orders'),
    },
    ...(shouldShowCashRegisterButton
      ? [
          {
            route: isCashRegisterClosed ? 'CloseCashRegister' : 'CashRegisterIndex',
            icon: 'credit-card',
            label: global.t?.t('orders', 'title', 'cashRegister'),
          },
        ]
      : []),
    {
      route: 'ProfilePage',
      icon: 'user',
      label: global.t?.t('orders', 'label', 'profile'),
    },
  ];

  return (
    <BottomNavigationBar
      activeRouteName={activeTab}
      colors={colors}
      disabled={!currentCompany || Object.entries(currentCompany).length === 0}
      insets={insets}
      items={items}
      navigation={navigation}
    />
  );
};
export default ShopToolbar;
