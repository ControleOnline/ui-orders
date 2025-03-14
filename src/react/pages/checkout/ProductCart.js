import React from 'react';
import { View, Text } from 'react-native';

const AddProductScreen = ({ route }) => {
  const { orderId } = route.params;

  return (
    <View>
      <Text>Adicionar produto para o pedido: {orderId}</Text>
      {/* Lógica para adicionar produtos */}
    </View>
  );
};

export default AddProductScreen;