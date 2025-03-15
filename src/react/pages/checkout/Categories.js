import React, {useEffect} from 'react';
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
import BottomCart from '@controleonline/ui-orders/src/react/components/cart/BottomCart';

const CategoriesPage = ({navigation}) => {
  const {getters, actions} = getStore('categories');
  const {getters: peopleGetters} = getStore('people');
  const {currentCompany, isLoading, error} = peopleGetters;
  const {items} = getters;
  const {styles, globalStyles} = css();

  useEffect(() => {
    actions.getItems({
      context: 'products',
      company: currentCompany.id,
    });
  }, []);

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
                onPress={() =>
                  navigation.navigate('ProductsPage', {category: category})
                }>
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
      <BottomCart navigation={navigation} />
    </SafeAreaView>
  );
};

export default CategoriesPage;
