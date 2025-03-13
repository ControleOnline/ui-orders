import React from 'react';
import {Text, View, TouchableOpacity} from 'react-native';
import globalStyles from '@controleonline/ui-shop/src/react/styles/global';
import css from '@controleonline/ui-orders/src/react/css/orders';

const OrderHeader = ({order}) => {
  const styles = css();

  return (
    <View activeOpacity={0.6} style={styles.boxWrap}>
      <View>
        <View style={styles.boxHeader}>
          <Text style={[styles.boxTextColor, styles.boxOrderText]}>
            Pedido: #{order.id}
          </Text>
          <Text style={[styles.boxTextColor, styles.boxPrice]}>
            {order.totalPrice}
          </Text>
        </View>
        <View style={styles.boxContent}>
          <Text style={[styles.boxDateText, styles.boxTextColor]}>
            {order.orderDate}
          </Text>
          <Text style={styles.boxStatusText}>{order.status?.status}</Text>
        </View>
      </View>
    </View>
  );
};

export default OrderHeader;
