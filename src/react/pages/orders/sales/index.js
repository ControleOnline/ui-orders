import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import globalStyles from '@controleonline/ui-shop/src/react/styles/global';
import {getStore} from '@store';
import {useTheme} from '@controleonline/ui-layout/src/react/components/ThemeProvider';

const Orders = ({navigation}) => {
  const {getters, actions} = getStore('orders');
  const {items, isLoading, error, columns} = getters;
  const {colors} = useTheme();

  useEffect(() => {
    actions.getItems({
      page: 1,
      itemsPerPage: 50,
      //provider: '/people/8',
      //status: [6],
    });
  }, []);

  const handlePay = orderId => {
    navigation.navigate('Checkout', {orderId: orderId});
  };

  const handleEdit = orderId => {
    navigation.navigate('OrderDetails', {orderId: orderId});
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      backgroundColor: '#fff',
    },
    scrollContent: {
      paddingBottom: 70, // Espaço para o BottomToolbar
    },
    boxWrap: {
      flex: 1,
      backgroundColor: '#fff',
      marginBottom: 15,
      borderLeftColor: colors['primary'],
      borderLeftWidth: 7,
      elevation: 3,
    },
    boxHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      borderTopEndRadius: 7,
      borderTopLeftRadius: 7,
      borderBottomColor: '#ccc',
      borderBottomWidth: 1,
    },
    boxContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      borderTopEndRadius: 7,
      borderTopLeftRadius: 7,
    },
    boxOrderText: {
      fontWeight: '700',
    },
    boxTextColor: {
      color: '#000000',
    },
    boxDateText: {
      color: '#000000',
      fontSize: 13,
      fontWeight: '700',
    },
    boxPrice: {
      color: '#000000',
      fontSize: 14,
      fontWeight: '700',
    },
    boxStatusText: {
      padding: 7,
      borderRadius: 20,
      fontSize: 13,
      color: colors['primary'],
      fontWeight: '500',
    },
    ordersAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    btnPay: {
      backgroundColor: colors['primary'],
      flex: 1,
    },
    textWhite: {
      color: '#fff',
    },
    btnEdit: {
      backgroundColor: '#fff',
      flex: 1,
    },
    btnEditText: {
      color: '#000000',
      fontWeight: 'bold',
    },
  });

  if (!isLoading)
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View>
            {items.map(order => (
              <View
                key={order.id}
                activeOpacity={0.6}
                onPress={() => handleEdit(order.id)}
                style={styles.boxWrap}>
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
                    <Text style={styles.boxStatusText}>
                      {order.status.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.ordersAction}>
                  <TouchableOpacity
                    onPress={() => handleEdit(order.id)}
                    style={[globalStyles.button, styles.btnEdit]}>
                    <Text style={styles.btnEditText}>EDITAR</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePay(order.id)}
                    style={[globalStyles.button, styles.btnPay]}>
                    <Text style={styles.textWhite}>PAGAR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
};
export default Orders;
