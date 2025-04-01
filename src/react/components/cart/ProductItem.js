import React from 'react';
import {TouchableOpacity, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import css from '@controleonline/ui-products/src/react/css/products';
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel';
import Formatter from '@controleonline/ui-common/src/utils/formatter';

const ProductItem = ({orderProduct}) => {
  const navigation = useNavigation();
  const {styles, globalStyles} = css();
  const currentPageName =
    navigation.getState().routes[navigation.getState().index].name;

  const groupComponentsByGroup = components => {
    return components.reduce((acc, component) => {
      const groupName = component.productGroup?.productGroup;
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(component);
      return acc;
    }, {});
  };

  const groupedComponents =
    orderProduct.orderProductComponents &&
    orderProduct.orderProductComponents.length > 0
      ? groupComponentsByGroup(orderProduct.orderProductComponents)
      : {};

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
                {fontSize: 16, fontWeight: 'bold'},
              ]}>
              {orderProduct.product.product}
            </Text>
            <Text
              style={[
                styles.boxDateText,
                styles.boxTextColor,
                {fontSize: 14, color: '#666', marginTop: 2},
              ]}>
              {orderProduct.product.description}
            </Text>
            {orderProduct.orderProductComponents &&
              orderProduct.orderProductComponents.length > 0 && (
                <View style={{marginTop: 5}}>
                  {Object.entries(groupedComponents).map(
                    ([groupName, components], groupIndex) => (
                      <View key={groupIndex} style={{marginBottom: 8}}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: 'bold',
                            color: '#444',
                            marginBottom: 4,
                          }}>
                          {groupName}
                        </Text>
                        {components.map((orderProductComponent, index) => (
                          <>
                            <Text
                              key={index}
                              style={{
                                fontSize: 12,
                                color: '#888',
                                marginTop: 2,
                              }}>
                              - {orderProductComponent.product.product}
                            </Text>
                            {orderProductComponent.orderProductComponents.map(
                              (ingredient, i) => (
                                <Text
                                  key={index + '-' + i}
                                  style={{
                                    fontSize: 12,
                                    color: '#888',
                                    marginTop: 2,
                                  }}>
                                  -- Remover {ingredient.product.product}
                                </Text>
                              ),
                            )}
                          </>
                        ))}
                      </View>
                    ),
                  )}
                </View>
              )}
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
          <Text style={{color: '#666'}}>
            {orderProduct.quantity} X{' '}
            {Formatter.formatMoney(orderProduct.price)}
          </Text>
        </View>

        <View
          style={{
            width: 100,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Text
            style={{
              fontSize: 16,
              color: '#000',
              fontWeight: 'bold',
              textAlign: 'center',
            }}>
            {Formatter.formatMoney(orderProduct.quantity * orderProduct.price)}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default ProductItem;
