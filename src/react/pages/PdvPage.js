import React, {useEffect, useMemo} from 'react';
import {Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';

import AddProductScreen from '@controleonline/ui-orders/src/react/pages/checkout/AddProductScreen';
import {
  POS_CHECK_ORDER_TYPE_NONE,
  resolvePosCheckOrderTypeForShop,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';

export default function PdvPage({navigation, route}) {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const deviceConfigStore = useStore('device_config');
  const {currentCompany} = peopleStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {item: runtimeDeviceConfig} = deviceConfigStore.getters;
  const linkedOrderType = useMemo(
    () =>
      resolvePosCheckOrderTypeForShop(
        runtimeDeviceConfig?.configs,
        currentCompany?.configs,
      ),
    [currentCompany?.configs, runtimeDeviceConfig?.configs],
  );
  const palette = useMemo(
    () => ({
      buttonBackgroundSecondary: themeColors.buttonBackgroundSecondary,
      buttonBorderSecondary: themeColors.buttonBorderSecondary,
      buttonIconSecondary: themeColors.buttonIconSecondary,
      buttonTextSecondary: themeColors.buttonTextSecondary,
    }),
    [themeColors],
  );
  const settlementLabel =
    global.t?.t('orders', 'title', 'linkedOrderSettlement') || 'Liquidação';
  const pdvRoute = useMemo(
    () => ({
      ...route,
      params: {
        ...(route?.params || {}),
        interactionMode: 'pdv',
        showBottomCart: true,
        showBottomToolBar: true,
      },
    }),
    [route],
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() =>
            navigation.navigate('LinkedOrderSettlementPage', {
              ...(linkedOrderType !== POS_CHECK_ORDER_TYPE_NONE
                ? {orderType: linkedOrderType}
                : {}),
            })
          }
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginRight: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: palette.buttonBorderSecondary,
            backgroundColor: palette.buttonBackgroundSecondary,
          }}>
          <Icon name="layers" size={14} color={palette.buttonIconSecondary} />
          <Text
            style={{
              color: palette.buttonTextSecondary,
              fontSize: 12,
              fontWeight: '800',
            }}>
            {settlementLabel}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [linkedOrderType, navigation, palette, settlementLabel]);

  return <AddProductScreen navigation={navigation} route={pdvRoute} />;
}
