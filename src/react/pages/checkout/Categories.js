import React, { useCallback } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,

} from 'react-native';
import { useStore } from '@store';
import { SafeAreaView } from 'react-native-safe-area-context';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

const CategoriesPage = () => {
  const navigation = useNavigation();

  const categoriesStore = useStore('categories');
  const getters = categoriesStore.getters;
  const categoryActions = categoriesStore.actions;

  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;

  const { currentCompany, isLoading, error } = peopleGetters;
  const { items } = getters;

  const { styles } = css();

  useFocusEffect(
    useCallback(() => {
      const categories = JSON.parse(
        localStorage.getItem('categories') || '[]',
      );

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
    }, [currentCompany]),
  );

  const changeCategory = category => {
    navigation.navigate('ProductsPage', { category });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="categories" />

      {!isLoading && items && items.length > 0 && !error && (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 220 },
          ]}>
          <View style={styles.Category.categoriesContainer}>
            {items.map(category => (
              <TouchableOpacity
                key={category.id}
                style={styles.Category.categoryItem}
                onPress={() => changeCategory(category)}>
                <View
                  style={[
                    styles.Category.categorySquare,
                    { backgroundColor: category.color },
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