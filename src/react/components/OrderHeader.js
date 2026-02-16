import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import ExtraDataHeader from './ExtraDataHeader';

const OrderHeader = ({ 
  order, 
  showControls = true, 
  onCancel, 
  onDeliver 
}) => {
  const { styles } = css();
  const oh = styles.OrderHeader;

  const client = order?.client;
  const email = client?.email?.length ? client.email[0]?.email : null;
  const phone = client?.phone?.length
    ? `+${client.phone[0]?.ddi} (${client.phone[0]?.ddd}) ${client.phone[0]?.phone}`
    : null;

  return (
    <View style={oh.boxWrap}>
      <View style={oh.container}>

        <View style={oh.topInfo}>
          <Text style={[oh.boxTextColor, oh.infoText]}>
            Pedido: #{order?.id}
          </Text>
          <Text style={[oh.boxTextColor, oh.price]}>
            {Formatter.formatMoney(order?.price)}
          </Text>
        </View>

        <ExtraDataHeader
          extraData={order?.extraData}
          styles={oh}
        />

        <View style={oh.topInfo}>
          <Text style={[oh.boxTextColor, oh.boxStatusText, oh.statusText]}>
            {t.t('orders', 'status', order?.status?.status)}
          </Text>
          <Text style={[oh.boxTextColor, oh.infoText]}>
            {Formatter.formatDateYmdTodmY(order?.orderDate, true)}
          </Text>
        </View>

        {client?.name ? (
          <View style={{ marginTop: 5 }}>
            <Text style={[oh.boxTextColor, oh.customerName]}>
              {client.name}
            </Text>

            {email ? (
              <Text style={[oh.boxTextColor, oh.infoText]}>
                {email}
              </Text>
            ) : null}

            {phone ? (
              <Text style={[oh.boxTextColor, oh.infoText]}>
                {phone}
              </Text>
            ) : null}
          </View>
        ) : null}

        {showControls && (
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <TouchableOpacity
              style={{ flex: 1, marginRight: 5 }}
              onPress={() => onCancel && onCancel(order)}
            >
              <View style={oh.buttonCancel}>
                <Text style={oh.buttonText}>Cancelar</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, marginLeft: 5 }}
              onPress={() => onDeliver && onDeliver(order)}
            >
              <View style={oh.buttonDeliver}>
                <Text style={oh.buttonText}>Entregue</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </View>
  );
};

export default OrderHeader;
