import React, {useCallback, useState} from 'react';
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
import InfinitePay from './InfinitePay';
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {getStore} from '@store';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import PayableToolbar from '@controleonline/ui-orders/src/react/components/PayableToolbar';
import OrderTotalToolbar from '@controleonline/ui-orders/src/react/components/OrderTotalToolbar';
import Calculate from '@controleonline/ui-orders/src/react/components/cart/Calculate';

export default Checkout = ({route, createInvoice}) => {
  const {styles, globalStyles} = css();
  const {getters} = getStore('cart');
  const {getters: paymentTypeGetters, actions: paymentTypeActions} =
    getStore('walletPaymentType');
  const {getters: invoiceGetters, actions: invoiceActions} =
    getStore('invoice');
  const {
    IsSaving: invoiceIsSaving,
    error: invoiceError,
    items: invoices,
  } = invoiceGetters;
  const {isLoading, error, items: payments} = paymentTypeGetters;
  const {item: order, payable} = getters;
  const [selectedPayment, setSelectedPayment] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [installmentsModalVisible, setInstallmentsModalVisible] =
    useState(false);
  const [selectedInstallments, setSelectedInstallments] = useState(null);

  const selectPayment = payment => {
    setSelectedPayment(payment);
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

    // Verifica se é 'split' para abrir o modal de parcelas
    if (selectedPayment.installments === 'split') {
      setInstallmentsModalVisible(true);
      return;
    }

    setModalVisible(true);
  };

  async function handleConfirmValue(inputValue) {
    let totalPrice = Math.round(parseFloat(inputValue) * 100).toString();
    const service = new InfinitePay();
    try {
      const response = await service.payment(
        selectedPayment.paymentCode,
        selectedPayment.installments || 1,
        order['@id'],
        totalPrice,
      );

      if (!response.success || response.code === 2 || response.code === 1)
        throw response;

      createInvoice(
        selectedPayment,
        response.result.paidAmount / 100 || order.price,
      );
    } catch (error) {
      paymentTypeActions.setError(error);
    }
    setModalVisible(false);
  }

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleInstallmentsSelect = async installments => {
    setSelectedInstallments(installments);
    setInstallmentsModalVisible(false);

    const service = new InfinitePay();
    let totalPrice = Math.round(order.price * 100).toString();

    try {
      const response = await service.payment(
        selectedPayment.paymentCode,
        installments,
        order['@id'],
        totalPrice,
      );

      if (!response.success || response.code === 2 || response.code === 1)
        throw response;

      createInvoice(response.result.paidAmount / 100 || order.price);
    } catch (error) {
      paymentTypeActions.setError(error);
    }
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={installmentsModalVisible}
        onRequestClose={() => setInstallmentsModalVisible(false)}>
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
            <Text style={{marginBottom: 10}}>
              Escolha o número de parcelas:
            </Text>
            <ScrollView>
              {Array.from({length: 9}, (_, i) => i + 2).map(num => (
                <TouchableOpacity
                  key={num}
                  onPress={() => handleInstallmentsSelect(num)}
                  style={{
                    padding: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#ccc',
                  }}>
                  <Text>
                    {num}x - {Formatter.formatMoney(order.price / num)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title="Cancelar"
              onPress={() => setInstallmentsModalVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};
