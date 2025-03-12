import React, {useState, useEffect} from 'react';
import {Button, StyleSheet, Text, ActivityIndicator, View} from 'react-native';
import globalStyles from '@controleonline/ui-shop/src/react/styles/global';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProductsList from '@controleonline/ui-products/src/react/components/products/index';
import {useStore} from '@store';
import * as DefaultFiltersMethods from '@controleonline/ui-default/src/vue/components/Default/Scripts/DefaultFiltersMethods.js';

const OrderDetails = ({route, navigation}) => {
  const {getters, actions} = useStore('orders');
  const {item, isLoading, error, columns} = getters;
  const orderId = route.params.orderId;

  useEffect(() => {
    actions.get(orderId);
  }, [orderId]);

  const handleAddProduct = () => {
    navigation.navigate('AddProductToOrder', {orderId});
  };

  if (isLoading) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#3FB8AF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={globalStyles.container}>
        <Text>Erro: {error}</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={globalStyles.container}>
        <Text>Pedido não encontrado</Text>
      </View>
    );
  }
  if (!isLoading && item) {
    return (
      <View style={globalStyles.container}>
        <View style={styles.boxHeader}>
          <Text style={styles.boxTitleText}># {item.id}</Text>
          <Text style={styles.boxTitleText}>Lista de Produtos</Text>
          <Icon.Button
            style={globalStyles.button}
            name="add"
            backgroundColor="#40b8af"
            onPress={handleAddProduct}>
            Adicionar
          </Icon.Button>
        </View>
        <ProductsList orderId={orderId} />
        <Text style={styles.boxTitleText}> {item.price}</Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  boxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  boxTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default OrderDetails;
