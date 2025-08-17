import React from 'react';
import {Text, View} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Formatter from '@controleonline/ui-common/src/utils/formatter';

const OrderHeader = ({order, showId = false}) => {
  const {styles} = css();
  const oh = styles.OrderHeader;

  return (
    <View style={oh.boxWrap}>
      <View style={oh.container}>
        {showId ? (
          <View style={oh.topInfo}>
            <Text style={[oh.boxTextColor, oh.infoText]}>
              Pedido: #{order?.id}
            </Text>
            <Text style={[oh.boxTextColor, oh.price]}>
              {Formatter.formatMoney(order?.price)}
            </Text>
          </View>
        ) : null}
        <View style={oh.topInfo}>
          <Text style={[oh.boxTextColor, oh.boxStatusText, oh.statusText]}>
            {t.t('orders', 'status', order?.status?.status)}
          </Text>
          <Text style={[oh.boxTextColor, oh.infoText]}>
            {Formatter.formatDateYmdTodmY(order?.orderDate, true)}
          </Text>
        </View>
        {order?.client?.name ? (
          <Text style={[oh.boxTextColor, oh.customerName]}>
            {order?.client.name}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export default OrderHeader;
