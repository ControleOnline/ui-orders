// ProductItem.js
import React from 'react';
import {TouchableOpacity, Text, View} from 'react-native';
import css from '@controleonline/ui-products/src/react/css/products';
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import ProductQuantity from '@controleonline/ui-orders/src/react/components/cart/ProductQuantity';

const ProductItem = ({product}) => {
  const {styles, globalStyles} = css();

  const customize = product => {
    console.log(product);
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
      <View style={{flexDirection: 'row', padding: 10}}>
        <View style={{flex: 1, justifyContent: 'center'}}>
          <Text
            style={[
              styles.boxTextColor,
              styles.boxOrderText,
              {fontSize: 16, fontWeight: 'bold'},
            ]}>
            {product.product}
          </Text>
          <Text
            style={[
              styles.boxDateText,
              styles.boxTextColor,
              {fontSize: 14, color: '#666'},
            ]}>
            {product.description}
          </Text>
        </View>

        <View style={{width: 100, height: 100}}>
          <Carousel images={product.productFiles} />
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
          {product.type === 'product' && (
            <ProductQuantity product={product} />
          )}
          {product.type === 'custom' && (
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
  );
};

export default ProductItem;
