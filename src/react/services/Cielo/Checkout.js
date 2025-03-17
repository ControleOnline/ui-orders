import React, {useEffect, useState} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import {position} from 'native-base/lib/typescript/theme/styled-system';

export default Checkout = ({route}) => {
  const navigation = useNavigation();
  const {styles, globalStyles} = css();
  const {getters} = getStore('cart');
  const {getters: paymentTypeGetters, actions: paymentTypeActions} =
    getStore('walletPaymentType');
  const {getters: peopleGetters} = getStore('people');
  const {getters: invoiceGetters, actions: invoiceActions} =
    getStore('invoice');
  const {IsSaving: invoiceIsSaving, error: invoiceError} = invoiceGetters;

  const {isLoading, error, items: payments} = paymentTypeGetters;
  const {currentCompany} = peopleGetters;
  const {item: order} = getters;
  const [selectedPayment, setSelectedPayment] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    paymentTypeActions.getItems({
      people: currentCompany.id,
      wallet: JSON.parse(currentCompany.configs['pdv-default-wallet']),
    });
  }, [order, currentCompany]);

  const selectPayment = payment => {
    setSelectedPayment(payment);
  };

  const formatProducts = () => {
    let items = [];

    order.orderProducts.forEach(orderProduct => {
      let item = {};
      item.name = orderProduct.product.product;
      item.quantity = orderProduct.quantity;
      item.sku = orderProduct.product.sku;
      item.unitOfMeasure = 'unidade';
      item.unitPrice = Math.round(orderProduct.price * 100).toString();
      items.push(item);
    });

    return items;
  };

  const handlePay = async () => {
    let totalPrice = Math.round(order.price * 100).toString();
    let items = formatProducts();

    const service = new Cielo();

    try {
      if (!selectedPayment.paymentCode) {
        setInputValue(Formatter.formatMoney(order.price));
        setModalVisible(true);
        return;
      }

      const response = await service.payment(
        selectedPayment.paymentCode,
        items,
        totalPrice,
      );

      if (
        !response.success ||
        response.result.code === 2 ||
        response.result.code === 1
      )
        throw response;

      createInvoice(response.paidAmount / 100);
    } catch (error) {
      paymentTypeActions.setError(error);
    }
  };

  const createInvoice = total => {
    const payload = {
      dueDate: Formatter.getCurrentDate(),
      status: '/statuses/' + currentCompany.configs['pdv-paid-status'],
      wallet: selectedPayment.wallet['@id'],
      paymentType: selectedPayment.paymentType['@id'],
      price: total,
      receiver: '/people/' + currentCompany.id,
      order: order['@id'],
    };

    invoiceActions.save(payload).finally(() => {
      navigation.navigate('OrderTools', {order: order});
    });
  };

  const handleConfirmValue = () => {
    const valorNumerico = parseFloat(inputValue.replace(/\D/g, '')) / 100;
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      showErrorPopup('Por favor, insira um valor válido!');
      return;
    }

    setModalVisible(false);
    setInputValue('');
    createInvoice(valorNumerico);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setInputValue('');
  };

  const handleInputChange = text => {
    const numericValue = text.replace(/\D/g, '');
    if (!numericValue) {
      setInputValue('');
      return;
    }
    const number = parseFloat(numericValue) / 100;
    setInputValue(Formatter.formatMoney(number));
  };

  return (
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
                contentContainerStyle={[styles.scrollContent, {flexGrow: 1}]}>
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
                          <Text>{payment.paymentType.paymentType}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={[styles.toolbar]}>
                <TouchableOpacity
                  onPress={() => handlePay()}
                  disabled={!selectedPayment}
                  style={[
                    globalStyles.button,
                    globalStyles.primary,
                    styles.btnPay,
                  ]}>
                  <Text style={styles.btnText}>PAGAR</Text>
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
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}>
          <View
            style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 10,
              width: '80%',
            }}>
            <Text style={{marginBottom: 10}}>Insira o valor:</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                padding: 8,
                marginBottom: 10,
              }}
              keyboardType="numeric"
              value={inputValue}
              onChangeText={handleInputChange}
              placeholder="Digite o valor"
            />
            <View
              style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Button title="Cancelar" onPress={handleCancel} />
              <Button title="Confirmar" onPress={handleConfirmValue} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
