import React, {useCallback, useState} from 'react';
import {Text, View, ScrollView, SafeAreaView} from 'react-native';
import {getStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useFocusEffect} from '@react-navigation/native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';

const PurchasingSuggestion = () => {
  const {styles, globalStyles} = css();
  const {getters: peopleGetters} = getStore('people');
  const {getters: productsGetters, actions: productsActions} = getStore('products');
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
              <View key={`company-${index}`} style={{marginBottom: 20}}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: 10,
                  }}>
                  {companyName}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    borderBottomWidth: 2,
                    borderBottomColor: '#ccc',
                    backgroundColor: '#f5f5f5',
                  }}>
                  <Text style={{color: '#333', flex: 2, fontWeight: 'bold'}}>
                    Produto
                  </Text>
                  <Text
                    style={{
                      color: '#333',
                      flex: 1,
                      textAlign: 'right',
                      fontWeight: 'bold',
                    }}>
                    Estoque
                  </Text>
                  <Text
                    style={{
                      color: '#333',
                      flex: 1,
                      textAlign: 'right',
                      fontWeight: 'bold',
                    }}>
                    Mínimo
                  </Text>
                  <Text
                    style={{
                      color: '#333',
                      flex: 1,
                      textAlign: 'right',
                      fontWeight: 'bold',
                    }}>
                    Comprar
                  </Text>
                </View>
                {groupedByCompany[companyName].map((item, itemIndex) => (
                  <View
                    key={`item-${item.product_id}-${itemIndex}`}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 4,
                      borderBottomWidth: 1,
                      borderBottomColor: '#eee',
                    }}>
                    <Text style={{color: '#333', flex: 2}}>
                      {item.product_name}{' '}
                      {item.description ? ` - ${item.description}` : ''}
                    </Text>
                    <Text style={{color: '#333', flex: 1, textAlign: 'right'}}>
                      {item.stock} {item.unity}
                    </Text>
                    <Text style={{color: '#333', flex: 1, textAlign: 'right'}}>
                      {item.minimum} {item.unity}
                    </Text>
                    <Text style={{color: '#333', flex: 1, textAlign: 'right'}}>
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
                printType={'purchasing-suggestion'}
                store={'products'}
                style={[globalStyles.button]}
              />
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default PurchasingSuggestion;
