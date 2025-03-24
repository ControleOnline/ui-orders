import {View, Text} from 'react-native';
import CieloCheckout from '@controleonline/ui-orders/src/react/services/Cielo/Checkout';
import InfinitePay from '@controleonline/ui-orders/src/react/services/InfinitePay/Checkout';

import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';

export default Checkout = ({route}) => {
  const {styles, globalStyles} = css();
  const {getters: configsGetters, actions: configActions} = getStore('configs');
  const {item: config, items: companyConfigs, isSaving} = configsGetters;

  return (
    <View style={{flex: 1}}>
      {config['pdv-gateway'] == 'cielo' && <CieloCheckout />}
      {config['pdv-gateway'] == 'infinite-pay' && <InfinitePay />}
    </View>
  );
};
