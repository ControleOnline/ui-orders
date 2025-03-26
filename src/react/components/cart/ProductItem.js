import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import css from '@controleonline/ui-products/src/react/css/products';
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import ProductQuantity from '@controleonline/ui-orders/src/react/components/cart/ProductQuantity';

const ProductItem = ({ orderProduct }) => {
  const navigation = useNavigation();
  const { styles, globalStyles } = css();
  const currentPageName = navigation.getState().routes[navigation.getState().index].name;

  const customize = product => {
    console.log(orderProduct);
  };

  return (
    <View
      style={[
        styles.boxWrap,
        {
          borderRadius: 10,
          marginBottom: 10,
          overflow: 'hidden',
          backgroundColor: '#fff',
        },
      ]}>
      <View
        style={{
          flexDirection: 'row',
          padding: 10,
          alignItems: 'flex-start',
        }}>
        <View
          style={{
            flex: 1,
            padding: 5,
          }}>
          <View
            style={{
              flexDirection: 'column',
            }}>
            <Text
              style={[
                styles.boxTextColor,
                styles.boxOrderText,
                { fontSize: 16, fontWeight: 'bold' },
              ]}>
              {orderProduct.product.product}
            </Text>
            <Text
              style={[
                styles.boxDateText,
                styles.boxTextColor,
                { fontSize: 14, color: '#666', marginTop: 2 },
              ]}>
              {orderProduct.product.description}
            </Text>
          </View>
        </View>

        <View
          style={{
            width: 100,
            height: 100,
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}>
          <Carousel images={orderProduct.product.productFiles} />
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          padding: 10,
        }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 5,
          }}>
          {currentPageName !== 'ProductsPage' && (
            <Text style={{ color: '#666' }}>
              {orderProduct.quantity} X{' '}
              {Formatter.formatMoney(orderProduct.product.price)}
            </Text>
          )}
        </View>

        <View
          style={{
            width: 100,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          {orderProduct.product.type === 'product' && (
            <>
              {currentPageName === 'ProductsPage' ? (
                <ProductQuantity orderProduct={orderProduct} />
              ) : (
                <Text
                  style={{
                    fontSize: 16,
                    color: '#000',
                    fontWeight: 'bold',
                    textAlign: 'center',
                  }}>
                  {Formatter.formatMoney(
                    orderProduct.quantity * orderProduct.product.price,
                  )}
                </Text>
              )}
            </>
          )}
          {orderProduct.product.type === 'custom' && (
            <TouchableOpacity
              onPress={() => customize(orderProduct)}
              style={[
                globalStyles.button,
                styles.btnPay,
                {
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
  );
};

export default ProductItem;