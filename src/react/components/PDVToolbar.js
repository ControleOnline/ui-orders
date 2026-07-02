import React, {useMemo} from 'react';
import {useNavigationState} from '@react-navigation/native';
import {useStore} from '@store';
import {
  isPosCashRegisterClosed,
  shouldUsePosCashRegisterLifecycle,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import BottomNavigationBar from '@controleonline/ui-common/src/react/components/BottomNavigationBar';
import {
  getBottomNavigationPreset,
  resolveBottomNavigationItems,
} from '@controleonline/ui-common/src/react/components/BottomNavigationBar.config';

const ShopToolbar = ({navigation}) => {
  const state = useNavigationState(state => state);
  const activeTab = state.routes[state.index]?.name || 'HomePage';
  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore.getters;
  const {item: device} = deviceConfigGetters;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const themeStore = useStore('theme');
  const getters = themeStore.getters;
  const {colors} = getters;
  const {currentCompany} = peopleGetters;

  const isCashRegisterClosed = isPosCashRegisterClosed(device?.configs);
  const shouldShowCashRegisterButton = shouldUsePosCashRegisterLifecycle(
    device?.configs,
  );
  const preset = getBottomNavigationPreset('posToolbar');
  const presetItems = useMemo(
    () => resolveBottomNavigationItems(preset.items, global.t?.t),
    [preset.items],
  );
  const items = useMemo(
    () => [
      ...(device?.configs && Object.entries(device.configs).length > 0
        ? [presetItems[0]]
        : []),
      presetItems[1],
      ...(shouldShowCashRegisterButton
        ? [
            {
              ...presetItems[2],
              route: isCashRegisterClosed ? 'CloseCashRegister' : 'CashRegisterIndex',
            },
          ]
        : []),
      presetItems[3],
    ],
    [
      device?.configs,
      isCashRegisterClosed,
      presetItems,
      shouldShowCashRegisterButton,
    ],
  );

  return (
    <BottomNavigationBar
      activeRouteName={activeTab}
      colors={colors}
      disabled={!currentCompany || Object.entries(currentCompany).length === 0}
      items={items}
      navigation={navigation}
    />
  );
};
export default ShopToolbar;
