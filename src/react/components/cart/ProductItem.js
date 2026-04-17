import React from 'react';
import {Text, View} from 'react-native';
import css from '@controleonline/ui-products/src/react/css/products';
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import { inlineStyle_53_45 } from './ProductItem.styles';

const ProductItem = ({orderProduct}) => {
  const {styles} = css();

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
    <View style={[styles.boxWrap, styles.productItem.cardContainer]}>
      <View style={styles.productItem.rowContainer}>
        <View style={styles.productItem.infoContainer}>
          <View style={styles.productItem.columnContainer}>
            <Text
              style={[
                styles.boxTextColor,
                styles.boxOrderText,
                styles.productItem.productName,
              ]}>
              {orderProduct.product.product}
            </Text>
            <Text
              style={[
                styles.boxDateText,
                styles.boxTextColor,
                styles.productItem.productDescription,
              ]}>
              {orderProduct.product.description}
            </Text>
            {orderProduct.orderProductComponents &&
              orderProduct.orderProductComponents.length > 0 && (
                <View style={styles.productItem.groupContainer}>
                  {Object.entries(groupedComponents).map(
                    ([groupName, components], groupIndex) => (
                      <View key={groupIndex} style={inlineStyle_53_45}>
                        <Text style={styles.productItem.groupName}>
                          {groupName}
                        </Text>
                        {components.map((orderProductComponent, index) => (
                          <>
                            <Text
                              key={groupIndex + '-' + index}
                              style={styles.productItem.componentText}>
                              - {orderProductComponent.product.product}
                            </Text>
                            {orderProductComponent.orderProductComponents.map(
                              (ingredient, i) => (
                                <Text
                                  key={groupIndex + '-' + index + '-' + i}
                                  style={styles.productItem.componentText}>
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
        <View style={styles.productItem.imageContainer}>
          <Carousel images={orderProduct.product.productFiles} />
        </View>
      </View>
      <View style={styles.productItem.priceRow}>
        <View style={styles.productItem.priceContainer}>
          <Text style={styles.productItem.priceText}>
            {orderProduct.quantity} X{' '}
            {Formatter.formatMoney(orderProduct.price)}
          </Text>
        </View>

        <View style={styles.productItem.totalContainer}>
          <Text style={styles.productItem.totalText}>
            {Formatter.formatMoney(orderProduct.quantity * orderProduct.price)}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default ProductItem;
