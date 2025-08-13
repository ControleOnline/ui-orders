import React from 'react';
import {View, SafeAreaView, ScrollView} from 'react-native';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import {useStores} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import OrderInvoices from './OrderInvoices';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';
import css from '@controleonline/ui-orders/src/react/css/orders';

const OrderDetails = ({route}) => {
  const ordersStore = useStores(state => state.orders);
  const getters = ordersStore.getters;

  const {item, isLoading, error} = getters;
  const {styles} = css();

  return (
    <SafeAreaView style={[{paddingBottom: 0}, styles.container]}>
      <StateStore store="orders" />
      {!isLoading && item && !error && (
        <View>
          <OrderHeader key={item.id} order={item} />
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <PrintButton printType={'order'} store={'orders'} />
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={[styles.orderContainer, {paddingBottom: 100}]}>
              <OrderInvoices />
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

export default OrderDetails;
