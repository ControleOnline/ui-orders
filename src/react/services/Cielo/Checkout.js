import React, {useCallback, useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  Button,
} from 'react-native';
import Cielo from './Cielo';
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {getStore} from '@store';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import PayableToolbar from '@controleonline/ui-orders/src/react/components/PayableToolbar';
import OrderTotalToolbar from '@controleonline/ui-orders/src/react/components/OrderTotalToolbar';
import Calculate from '@controleonline/ui-orders/src/react/components/cart/Calculate';

export default Checkout = ({
  route,
  createInvoice,
  cancelOperation,
  remoteCheckoutMode = false,
  paymentType = {},
  paymentValue = 0,
}) => {
  const {styles, globalStyles} = css();
  const {getters: paymentTypeGetters, actions: paymentTypeActions} =
    getStore('walletPaymentType');
  const {getters: orderGetters} = getStore('orders');
  const {getters: orderProductsGetters, actions: orderProductsActions} =
    getStore('order_products');
  const {getters: invoiceGetters} = getStore('invoice');
  const {IsSaving: invoiceIsSaving, error: invoiceError} = invoiceGetters;
  const {item: order} = orderGetters;
  const {items: orderProducts} = orderProductsGetters;
  const {isLoading, error, items: payments} = paymentTypeGetters;
  const [selectedPayment, setSelectedPayment] = useState(paymentType);
  const [modalVisible, setModalVisible] = useState(false);

  const selectPayment = async payment => {
    setSelectedPayment(payment);
  };
  useFocusEffect(
    useCallback(() => {
      if (
        !remoteCheckoutMode &&
        selectedPayment &&
        Object.keys(selectedPayment).length > 0
      )
        handlePay();
    }, [selectedPayment]),
  );

  useEffect(() => {
    if (remoteCheckoutMode) {
      console.log(paymentType, paymentValue);
      setSelectedPayment(paymentType);
      handleConfirmValue(paymentValue);
    }
  }, [remoteCheckoutMode]);

  const formatProducts = () => {
    let items = [];

    orderProducts.forEach(orderProduct => {
      let item = {};
      item.name = orderProduct.product.product;
      item.quantity = orderProduct.quantity;
      item.sku =
        orderProduct.product.sku ||
        orderProduct.product['@id'].replace(/\D/g, '');
      item.unitOfMeasure = 'unidade';
      item.unitPrice = Math.round(orderProduct.price * 100).toString();
      items.push(item);
    });
    console.log(items);
    return items;
  };

  const handlePay = async () => {
    if (
      !selectedPayment ||
      !selectedPayment.wallet ||
      !selectedPayment.paymentType
    ) {
      paymentTypeActions.setError('Selecione uma forma de pagamento');
      return;
    }

    setModalVisible(true);
  };

  async function handleConfirmValue(inputValue) {
    if (selectedPayment.paymentCode) {
      let totalPrice = Math.round(parseFloat(inputValue) * 100).toString();
      let items = formatProducts();

      const service = new Cielo();

      try {
        const response = await service.payment(
          selectedPayment.paymentCode,
          items,
          totalPrice,
        );

        if (!response.success) {
          paymentTypeActions.setError(response.result);
          cancelOperation();

          setModalVisible(false);
          return;
        }

        createInvoice(selectedPayment, inputValue);
      } catch (error) {
        paymentTypeActions.setError('Erro inesperado: ' + error.message);
        console.error('Erro na chamada ao serviço:', error);
        cancelOperation();
        setModalVisible(false);
      }
    } else {
      setModalVisible(false);
      createInvoice(selectedPayment, inputValue);
    }

    setModalVisible(false);
  }

  const handleCancel = () => {
    cancelOperation();
    setModalVisible(false);
  };

  return remoteCheckoutMode ? null : (
    <>
      <SafeAreaView style={[styles.container]}>
        <StateStore store="walletPaymentType" />
        <StateStore store="invoice" />
        {!invoiceIsSaving &&
          !invoiceError &&
          !isLoading &&
          payments &&
          payments.length > 0 &&
          !error && (
            <>
              <ScrollView
                contentContainerStyle={[
                  styles.scrollContent,
                  {paddingBottom: 100},
                  {flexGrow: 1},
                ]}>
                <View>
                  {payments.map(payment => (
                    <TouchableOpacity
                      key={payment.paymentType.id}
                      onPress={() => selectPayment(payment)}>
                      <View
                        style={[
                          styles.boxPayment,
                          selectedPayment.paymentType?.id ===
                            payment.paymentType.id && styles.selectedBoxPayment,
                        ]}>
                        <View style={styles.paymentIcon}>
                          {selectedPayment.paymentType?.id ===
                          payment.paymentType.id ? (
                            <Icon name="check-box" size={24} color="black" />
                          ) : (
                            <Icon
                              name="check-box-outline-blank"
                              size={22}
                              color="black"
                            />
                          )}
                        </View>
                        <View>
                          <Text style={{color: '#666'}}>
                            {payment.paymentType.paymentType}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <PayableToolbar />

              <View style={[styles.toolbar]}>
                <OrderTotalToolbar />
                <TouchableOpacity
                  onPress={() => handlePay()}
                  disabled={!selectedPayment}
                  style={[globalStyles.button]}>
                  <Text style={globalStyles.btnText}>PAGAR</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
      </SafeAreaView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCancel}>
        <Calculate
          handleCancel={handleCancel}
          handleConfirmValue={handleConfirmValue}
        />
      </Modal>
    </>
  );
};
