import React, {useCallback, useState} from 'react';
import {Text, View, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useFocusEffect} from '@react-navigation/native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';

import {
  inlineStyle_51_45,
  inlineStyle_53_18,
  inlineStyle_62_18,
  inlineStyle_70_24,
  inlineStyle_74_20,
  inlineStyle_83_20,
  inlineStyle_92_20,
  inlineStyle_104_20,
  inlineStyle_111_26,
  inlineStyle_115_26,
  inlineStyle_118_26,
  inlineStyle_121_26,
} from './Suggestion.styles';

const PurchasingSuggestion = () => {
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
          .getPurchasingSuggestion({
            company: currentCompany.id,
          })
          .then(data => {
            setOrderItems(data);
          });
      }
    }, [currentCompany]),
  );

  const groupedByCompany = orderItems.reduce((acc, item) => {
    const companyName = item.company_name;
    if (!acc[companyName]) {
      acc[companyName] = [];
    }
    acc[companyName].push(item);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="products" />
      {!isLoading && !error && (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {Object.keys(groupedByCompany).map((companyName, index) => (
              <View key={`company-${index}`} style={inlineStyle_51_45}>
                <Text
                  style={inlineStyle_53_18}>
                  {companyName}
                </Text>
                <View
                  style={inlineStyle_62_18}>
                  <Text style={inlineStyle_70_24}>
                    Produto
                  </Text>
                  <Text
                    style={inlineStyle_74_20}>
                    Estoque
                  </Text>
                  <Text
                    style={inlineStyle_83_20}>
                    Mínimo
                  </Text>
                  <Text
                    style={inlineStyle_92_20}>
                    Comprar
                  </Text>
                </View>
                {groupedByCompany[companyName].map((item, itemIndex) => (
                  <View
                    key={`item-${item.product_id}-${itemIndex}`}
                    style={inlineStyle_104_20}>
                    <Text style={inlineStyle_111_26}>
                      {item.product_name}{' '}
                      {item.description ? ` - ${item.description}` : ''}
                    </Text>
                    <Text style={inlineStyle_115_26}>
                      {item.stock} {item.unity}
                    </Text>
                    <Text style={inlineStyle_118_26}>
                      {item.minimum} {item.unity}
                    </Text>
                    <Text style={inlineStyle_121_26}>
                      {item.needed} {item.unity}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          <View style={styles.CloseCashRegister.footerContainer}>
            <View style={styles.CloseCashRegister.buttonContainer}>
              <PrintButton
                job={{type: 'purchasing-suggestion'}}
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

export default PurchasingSuggestion;
