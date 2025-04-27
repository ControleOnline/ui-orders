import React, {useCallback} from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {getStore} from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

const CategoriesPage = ({navigation}) => {
  const {getters, actions: categoryActions} = getStore('categories');
  const {getters: peopleGetters} = getStore('people');
  const {getters: ordersGetters, actions: ordersActions} = getStore('orders');
  const localDevice = JSON.parse(localStorage.getItem('device') || '{}');
  const {currentCompany, defaultCompany, isLoading, error} = peopleGetters;
  const {items} = getters;
  const {item: order, items: orders} = ordersGetters;
  const {styles, globalStyles} = css();
  const status = defaultCompany?.configs['pos-default-status'];

  useFocusEffect(
    useCallback(() => {
      if (!items || items.length == 0)
        categoryActions.getItems({
          context: 'products',
          'order[name]': 'ASC',
          company: currentCompany.id,
        });
    }, [currentCompany]),
  );

  useFocusEffect(
    useCallback(() => {
      if (
        order === null &&
        status &&
        currentCompany &&
        order &&
        Object.entries(order).length === 0
      ) {
        ordersActions
          .save({
            app: 'POS',
            provider: '/people/' + currentCompany.id,
            status: '/statuses/' + status,
            'device.device': localDevice?.id,
            orderType: 'sale',
          })
          .then(data => {
            ordersActions.setItem(data);
          });
      }
    }, [currentCompany, order]),
  );

  const changeCategory = category => {
    navigation.navigate('ProductsPage', {category: category});
  };
  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="categories" />
      {!isLoading && items && items.length > 0 && !error && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.Category.categoriesContainer}>
            {items.map(category => (
              <TouchableOpacity
                key={category.id}
                style={styles.Category.categoryItem}
                onPress={() => changeCategory(category)}>
                <View
                  style={[
                    styles.Category.categorySquare,
                    {backgroundColor: category.color},
                  ]}>
                  <Carousel images={category.categoryFiles} />
                </View>

                <Text style={styles.Category.categoryName}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default CategoriesPage;
