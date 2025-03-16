import {View, Text} from 'react-native';
import CieloCheckout from '@controleonline/ui-orders/src/react/services/Cielo/Checkout';
import css from '@controleonline/ui-orders/src/react/css/orders';

export default Checkout = ({route}) => {
  const {styles, globalStyles} = css();

  return (
    <View style={{flex: 1}}>
      <CieloCheckout />
    </View>
  );
};
