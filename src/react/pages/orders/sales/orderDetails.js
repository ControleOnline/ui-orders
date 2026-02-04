import React, {useCallback} from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProductsList from '@controleonline/ui-orders/src/react/components/cart/ProductList';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';

import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Icon from 'react-native-vector-icons/MaterialIcons';

// ALEMAC // 24/01/2026 // para mostrar ou não o barcode input
import BarcodeInput from '@controleonline/ui-orders/src/react/pages/checkout/BarcodeInput';

const OrderDetails = ({route, navigation}) => {
  const order = route.params.order;

  const ordersStore = useStore('orders');
  const ordersGetters = ordersStore.getters;
  const ordersActions = ordersStore.actions;

  const order_productsStore = useStore('order_products');
  const orderProductsActions = order_productsStore.actions;

  const invoiceStore = useStore('invoice');
  const invoiceGetters = invoiceStore.getters;
  const invoiceActions = invoiceStore.actions;
  const {items: invoices} = invoiceGetters;
  const {item, isLoading, error} = ordersGetters;
  const {styles, globalStyles} = css();

  // ALEMAC // 24/01/2026 // para mostrar ou não o barcode input baseado no tipo de produto
  const deviceConfigStore = useStore('device_config');
  const device = deviceConfigStore.getters?.item;
  const productInputType = device?.configs?.['product-input-type'] || 'manual';

  const showBarcodeInput = productInputType === 'barcode' || productInputType === 'rfid';
  const isManualInput = productInputType === 'manual';

  //console.log('📋 [ORDER DETAILS] productInputType:', productInputType);
  //console.log('📋 [ORDER DETAILS] showBarcodeInput:', showBarcodeInput);
  //console.log('📋 [ORDER DETAILS] isManualInput:', isManualInput);

  useFocusEffect(
    useCallback(() => {
      //console.log('📋 [ORDER DETAILS FOCUS] productInputType:', productInputType);
      //console.log('📋 [ORDER DETAILS FOCUS] device.configs:', device?.configs);

      if (
        invoices &&
        invoices.length === 0 &&
        order &&
        order['@id'] &&
        !isLoading
      ) {
        invoiceActions.getItems({'order.order': order['@id']});
      }
    }, [invoices, order, isLoading, productInputType]),
  );

  useFocusEffect(
    useCallback(() => {
      if (order && order['@id']) {
        ordersActions.get(order['@id']).then(data => {
          orderProductsActions.setItems(data.orderProducts);
        });
      }
    }, [order]),
  );

  const handleAddProduct = () => {
    navigation.navigate('AddProductScreen');
  };

  const handleOrderTools = () => {
    navigation.navigate('OrderTools');
  };

  return (
    <SafeAreaView style={[styles.container, {paddingBottom: 120}]}>
      {/* ALEMAC // 24/01/2026 // mostrar barcode input apenas se product-input-type for 'barcode' ou 'rfid' */}
      {showBarcodeInput && <BarcodeInput />}

      <StateStore store="orders" />

      {!isLoading && item && !error && (
        <>
          <OrderHeader key={item.id} order={item} />

          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {/* ALEMAC // 24/01/2026 // botão adicionar item apenas se input for manual */}
            {isManualInput && (
              <TouchableOpacity
                onPress={handleAddProduct}
                style={[globalStyles.button, {marginRight: 5}]}>
                <Icon name="add-circle" size={24} color="#fff" />
                <Text style={{color: '#fff', marginLeft: 8}}>
                  {t.t('default', 'button', 'AddItem')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleOrderTools}
              style={[globalStyles.button, {marginLeft: 5}]}>
              <Icon name="settings" size={24} color="#fff" />
              <Text style={{color: '#fff', marginLeft: 8}}>
                {t.t('default', 'button', 'Details')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{paddingBottom: 0}}>
            <View style={styles.itemsSection}>
              <ProductsList order={order} />
            </View>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
};

export default OrderDetails;