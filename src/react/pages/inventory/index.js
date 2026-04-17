import React, {useCallback, useState} from 'react';
import {Text, View, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useFocusEffect} from '@react-navigation/native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';

import {
  inlineStyle_54_47,
  inlineStyle_56_18,
  inlineStyle_65_18,
  inlineStyle_74_18,
  inlineStyle_82_24,
  inlineStyle_86_20,
  inlineStyle_99_22,
  inlineStyle_106_28,
  inlineStyle_112_24,
} from './index.styles';

const Inventory = () => {
  const {styles, globalStyles} = css();
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const productsStore = useStore('products');
  const productsGetters = productsStore.getters;
  const productsActions = productsStore.actions;
  const {currentCompany} = peopleGetters;
  const {isLoading, error} = productsGetters;
  const [orderItems, setOrderItems] = useState([]);

  useFocusEffect(
    useCallback(() => {
      if (currentCompany) {
        productsActions
          .getInventory({
            company: currentCompany.id,
          })
          .then(data => {
            setOrderItems(data);
          });
      }
    }, [currentCompany]),
  );

  const groupedByInventory = orderItems.reduce((acc, item) => {
    const inventoryName = item.inventory_name;
    if (!acc[inventoryName]) {
      acc[inventoryName] = {
        companyName: item.company_name,
        items: [],
      };
    }
    acc[inventoryName].items.push(item);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="products" />
      {!isLoading && !error && (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {Object.keys(groupedByInventory).map((inventoryName, index) => (
              <View key={`inventory-${index}`} style={inlineStyle_54_47}>
                <Text
                  style={inlineStyle_56_18}>
                  {groupedByInventory[inventoryName].companyName}
                </Text>
                <Text
                  style={inlineStyle_65_18}>
                  Inventário: {inventoryName}
                </Text>
                <View
                  style={inlineStyle_74_18}>
                  <Text style={inlineStyle_82_24}>
                    Produto
                  </Text>
                  <Text
                    style={inlineStyle_86_20}>
                    Disponível
                  </Text>
                </View>
                {groupedByInventory[inventoryName].items.map(
                  (item, itemIndex) => (
                    <View
                      key={`item-${item.product_id}-${itemIndex}`}
                      style={inlineStyle_99_22}>
                      <Text style={inlineStyle_106_28}>
                        {item.product_name}{' '}
                        {item.description ? ` - ${item.description}` : ''}{' '}
                        {item.productUnit ? `(${item.productUnit})` : ''}
                      </Text>
                      <Text
                        style={inlineStyle_112_24}>
                        {item.available} {item.productUnit}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            ))}
          </ScrollView>
          <View style={styles.CloseCashRegister.footerContainer}>
            <View style={styles.CloseCashRegister.buttonContainer}>
              <PrintButton
                job={{type: 'inventory'}}
                store={'products'}
                style={[globalStyles.button]}
                printerSelection={{enabled: true}}
              />
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default Inventory;
