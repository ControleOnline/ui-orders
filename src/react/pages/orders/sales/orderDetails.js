import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View, ScrollView, SafeAreaView} from 'react-native';
import globalStyles from '@controleonline/ui-shop/src/react/styles/global';
import ProductsList from '@controleonline/ui-products/src/react/components/products/index';
import {getStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';

const OrderDetails = ({route, navigation}) => {
  const orderId = route.params.orderId;
  const {getters, actions} = getStore('orders');
  const {item, isLoading, error, columns} = getters;

  useEffect(() => {
    actions.get(orderId);
  }, [orderId]);
  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="orders" />
      {!isLoading && item && !error && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.orderContainer}>
            <Text style={styles.header}>
              Detalhes do Pedido #{item.id || orderId}
            </Text>

            {/* Informações do pedido */}
            <View style={styles.boxWrap}>
              <View style={styles.boxHeader}>
                <Text style={[styles.boxTextColor, styles.boxOrderText]}>
                  Pedido: #{item.id || orderId}
                </Text>
                <Text style={[styles.boxTextColor, styles.boxPrice]}>
                  {item.totalPrice}
                </Text>
              </View>
              <View style={styles.boxContent}>
                <Text style={[styles.boxDateText, styles.boxTextColor]}>
                  {item.orderDate}
                </Text>
                <Text style={styles.boxStatusText}>{item.status?.status}</Text>
              </View>
            </View>

            {/* Lista de produtos do pedido */}
            <View style={styles.itemsSection}>
              <Text style={styles.subHeader}>Itens do Pedido</Text>
              <ProductsList orderId={orderId} />
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 70, // Espaço para o BottomToolbar
  },
  orderContainer: {
    flex: 1,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5587',
    marginBottom: 15,
  },
  boxWrap: {
    backgroundColor: '#fff',
    marginBottom: 15,
    borderLeftColor: '#5bbf4b',
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
  },
  boxOrderText: {
    fontWeight: '700',
  },
  boxTextColor: {
    color: '#000000',
  },
  boxDateText: {
    fontSize: 13,
    fontWeight: '700',
  },
  boxPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  boxStatusText: {
    padding: 7,
    borderRadius: 20,
    fontSize: 13,
    color: '#5bbf4b',
    fontWeight: '500',
  },
  itemsSection: {
    marginTop: 20,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5587',
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  btnBack: {
    backgroundColor: '#ccc',
    padding: 15,
    flex: 1,
    alignItems: 'center',
  },
  btnBackText: {
    color: '#000',
    fontWeight: 'bold',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FF0000',
  },
});

export default OrderDetails;
