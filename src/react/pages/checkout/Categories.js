import React, {useCallback, useState, useEffect} from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {useStores} from '@store';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useFocusEffect, useRoute} from '@react-navigation/native';

const CategoriesPage = ({navigation}) => {
  const route = useRoute();
  const categoryStore = useStores(state => state.categories);
  const getters = categoryStore.getters;
  const categoryActions = categoryStore.actions;
  const peopleStore = useStores(state => state.people);
  const peopleGetters = peopleStore.getters;
  const ordersStore = useStores(state => state.orders);
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;
  const deviceStore = useStores(state => state.device);
  const deviceGetters = deviceStore.getters;
  const {item: storagedDevice} = deviceGetters;
  const {currentCompany, defaultCompany, isLoading, error} = peopleGetters;
  const {items} = getters;
  const {item: order, items: orders} = ordersGetters;
  const {styles} = css();
  const status = defaultCompany?.configs['pos-default-status'];
  const [forceCreate, setForceCreate] = useState(
    route.params?.forceCreate || false,
  );

  useFocusEffect(
    useCallback(() => {
      //if (!items || items.length == 0) {

      const categories = JSON.parse(localStorage.getItem('categories') || '[]');

      if (categories.length > 0) {
        categoryActions.setItems(categories);
      } else {
        categoryActions
          .getItems({
            context: 'products',
            'order[name]': 'ASC',
            company: currentCompany.id,
          })
          .then(data => {
            localStorage.setItem('categories', JSON.stringify(data));
          });
      }
      //}
    }, [currentCompany]),
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        ordersActions.initQueue();
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (forceCreate) {
        setForceCreate(false);
        ordersActions
          .save({
            app: 'POS',
            provider: '/people/' + currentCompany.id,
            status: '/statuses/' + status,
            'device.device': storagedDevice.id,
            orderType: 'sale',
          })
          .then(data => {
            ordersActions.setItem(data);
          });
      }
    }, [forceCreate]),
  );
  useFocusEffect(
    useCallback(() => {
      if (
        status &&
        currentCompany &&
        orders &&
        orders.length === 0 &&
        order === null
      ) {
        setForceCreate(true);
      }
    }, [currentCompany, order, orders]),
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
