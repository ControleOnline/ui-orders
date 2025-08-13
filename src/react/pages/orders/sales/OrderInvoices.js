import React from 'react';
import {Text, View} from 'react-native';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useStores} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';

const OrderDetails = ({route}) => {
  const ordersStore = useStores(state => state.orders);
  const getters = ordersStore.getters;

  const {item: order, isLoading, error} = getters;

  return (
    <>
      <StateStore store="orders" />
      {!isLoading &&
        order &&
        order.invoices &&
        order.invoices.length > 0 &&
        !error && (
          <>
            <View style={componentStyles.orderContainer}>
              {order.invoices.map(invoice => (
                <View key={invoice.id} style={componentStyles.card}>
                  <Text style={componentStyles.headerText}>
                    Fatura #{invoice.id}
                  </Text>
                  <View style={componentStyles.row}>
                    <Text style={componentStyles.cardText}>
                      {Formatter.formatMoney(invoice.price)}
                    </Text>
                    <Text
                      style={[
                        componentStyles.cardText,
                        {color: invoice.status?.color},
                      ]}>
                      {t.t('invoice', 'status', invoice.status?.status)}
                    </Text>
                  </View>
                  <View style={componentStyles.row}>
                    <Text style={componentStyles.cardText}>
                      {invoice.destinationWallet?.wallet}
                    </Text>
                    <Text style={componentStyles.cardText}>
                      {invoice.paymentType?.paymentType}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
    </>
  );
};

// Styles
const componentStyles = {
  container: {
    flex: 1,
  },
  orderContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  headerText: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    color: '#333',
  },
};

export default OrderDetails;
