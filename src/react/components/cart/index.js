import React, { useEffect } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { getStore } from '@store';
import css from '@controleonline/ui-products/src/react/css/products';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel';
import Icon from 'react-native-vector-icons/MaterialIcons'; 
import { useNavigation } from '@react-navigation/native'; 

export default ProductsList = props => {
  const { orderId } = props;
  const { styles, globalStyles } = css();
  const navigation = useNavigation(); // Hook para navegação

  const { getters, actions } = getStore('order_products');
  const { items, isLoading, error } = getters;

  useEffect(() => {
    actions.getItems({
      company: '/people/4',
      order: 'orders/' + orderId,
      'exists[parentProduct]': 'false',
    });
  }, [orderId]);

  const handleDetailProduct = productId => {
    console.log('productId: ', productId);
  };

  const handleAddProduct = () => {
    navigation.navigate('AddProductScreen', { orderId });
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={styles.subHeader}>Itens do Pedido</Text>
        <TouchableOpacity onPress={handleAddProduct} style={{ marginLeft: 10 }}>
          <Icon name="add-circle" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      <StateStore store="order_products" />
      {!isLoading && items.length > 0 && !error && (
        <>
          {items.map(product => (
            <TouchableOpacity
              key={product.id}
              onPress={() => handleDetailProduct(product.id)}
              activeOpacity={0.6}
              style={[
                styles.boxWrap,
                {
                  borderRadius: 10,
                  marginBottom: 10,
                  overflow: 'hidden',
                  backgroundColor: '#fff',
                },
              ]}>
              <View style={{ flexDirection: 'row', padding: 10 }}>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text
                    style={[
                      styles.boxTextColor,
                      styles.boxOrderText,
                      { fontSize: 16, fontWeight: 'bold' },
                    ]}>
                    {product.product.product}
                  </Text>
                  <Text
                    style={[
                      styles.boxDateText,
                      styles.boxTextColor,
                      { fontSize: 14, color: '#666' },
                    ]}>
                    {product.product.description}
                  </Text>
                  <Text
                    style={[
                      styles.boxStatusText,
                      { fontSize: 16, color: '#000', fontWeight: 'bold' },
                    ]}>
                    {`R$ ${product.price}`}
                  </Text>
                </View>
                {product.product.productFiles &&
                  product.product.productFiles.length > 0 && (
                    <View style={{ width: 100, height: 100 }}>
                      <Carousel images={product.product.productFiles} />
                    </View>
                  )}
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );
};