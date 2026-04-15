import React, {useCallback, useState} from 'react';
import {Text, View, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useFocusEffect} from '@react-navigation/native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';

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
              <View key={`inventory-${index}`} style={{marginBottom: 20}}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: 10,
                  }}>
                  {groupedByInventory[inventoryName].companyName}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: 10,
                  }}>
                  Inventário: {inventoryName}
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
                    Disponível
                  </Text>
                </View>
                {groupedByInventory[inventoryName].items.map(
                  (item, itemIndex) => (
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
                        {item.description ? ` - ${item.description}` : ''}{' '}
                        {item.productUnit ? `(${item.productUnit})` : ''}
                      </Text>
                      <Text
                        style={{color: '#333', flex: 1, textAlign: 'right'}}>
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
