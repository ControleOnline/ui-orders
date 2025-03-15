import React, {useEffect} from 'react';
import {TouchableOpacity, Text, View} from 'react-native';
import {getStore} from '@store';
import css from '@controleonline/ui-products/src/react/css/products';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import ProductQuantity from '@controleonline/ui-orders/src/react/components/cart/ProductQuantity';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';

export default ProductsList = props => {
  const {orderId} = props;
  const {styles, globalStyles} = css();
  const navigation = useNavigation(); // Hook para navegação

  const {getters, actions} = getStore('order_products');
  const {items, isLoading, error} = getters;

  useEffect(() => {
    console.log('op',orderId)
    actions.getItems({
      company: '/people/4',
      order: 'orders/' + orderId,
      'exists[parentProduct]': 'false',
    });
  }, [orderId]);

  const handleAddProduct = () => {
    navigation.navigate('AddProductScreen', {orderId});
  };
  const customize = product => {
    console.log(product);
  };

  return (
    <View>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <Text style={styles.subHeader}>Itens do Pedido</Text>
        <TouchableOpacity onPress={handleAddProduct} style={{marginLeft: 10}}>
          <Icon name="add-circle" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      <StateStore store="order_products" />
      {!isLoading && items.length > 0 && !error && (
        <>
          {items.map(product => (
            <View
              key={product.id}
              style={[
                styles.boxWrap,
                {
                  borderRadius: 10,
                  marginBottom: 10,
                  overflow: 'hidden',
                  backgroundColor: '#fff',
                },
              ]}>
              <View style={{flexDirection: 'row', padding: 10}}>
                <View style={{flex: 1, justifyContent: 'center'}}>
                  <Text
                    style={[
                      styles.boxTextColor,
                      styles.boxOrderText,
                      {fontSize: 16, fontWeight: 'bold'},
                    ]}>
                    {product.product.product}
                  </Text>
                  <Text
                    style={[
                      styles.boxDateText,
                      styles.boxTextColor,
                      {fontSize: 14, color: '#666'},
                    ]}>
                    {product.product.description}
                  </Text>
                </View>

                <View style={{width: 100, height: 100}}>
                  <Carousel images={product.product.productFiles} />
                </View>
              </View>
              <View style={{flexDirection: 'row', padding: 10}}>
                <View style={{flex: 1, justifyContent: 'center'}}>
                  <Text
                    style={[
                      styles.boxStatusText,
                      {fontSize: 16, color: '#000', fontWeight: 'bold'},
                    ]}>
                    {Formatter.formatMoney(product.price)}
                  </Text>
                </View>
                <View style={{flex: 1, justifyContent: 'center'}}>
                  {product.product.type == 'product' && (
                    <ProductQuantity product={product.product} />
                  )}
                  {product.product.type == 'custom' && (
                    <TouchableOpacity
                      onPress={() => customize(product)}
                      style={[
                        globalStyles.button,
                        styles.btnPay,
                        {
                          flex: 1,
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                      ]}>
                      <Text style={styles.textWhite}>CUSTOMIZAR</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
};
