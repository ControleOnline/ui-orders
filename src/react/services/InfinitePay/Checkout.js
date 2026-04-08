import React, {useCallback, useEffect, useState} from 'react';
import {
  Button,
  Modal,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import InfinitePay from './InfinitePay';
import {useStore} from '@store';
import {useFocusEffect} from '@react-navigation/native';
import Calculate from '@controleonline/ui-orders/src/react/components/cart/Calculate';
import PaymentCheckoutPanel from '@controleonline/ui-orders/src/react/components/PaymentCheckoutPanel';
import Formatter from '@controleonline/ui-common/src/utils/formatter';

const Checkout = ({
  createInvoice,
  cancelOperation,
  remoteCheckoutMode = false,
  paymentType = {},
  paymentValue = 0,
}) => {
  const ordersStore = useStore('orders');
  const orderGetters = ordersStore.getters;
  const walletPaymentTypeStore = useStore('walletPaymentType');
  const paymentTypeGetters = walletPaymentTypeStore.getters;
  const invoiceStore = useStore('invoice');
  const invoiceGetters = invoiceStore.getters;
  const invoiceActions = invoiceStore.actions;

  const {error, items: payments} = paymentTypeGetters;
  const [selectedPayment, setSelectedPayment] = useState(paymentType);
  const [modalVisible, setModalVisible] = useState(false);
  const {IsSaving: invoiceIsSaving, error: invoiceError} = invoiceGetters;
  const {item: order} = orderGetters;

  const [installmentsModalVisible, setInstallmentsModalVisible] =
    useState(false);
  const [setSelectedInstallments] = useState(null);

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
      setSelectedPayment(paymentType);
      handleConfirmValue(paymentValue);
    }
  }, [paymentType, paymentValue, remoteCheckoutMode]);

  const handlePay = async () => {
    if (
      !selectedPayment ||
      !selectedPayment.wallet ||
      !selectedPayment.paymentType
    ) {
      invoiceActions.setError(global.t?.t('orders', 'message', 'selectPaymentMethod'));
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
    if (selectedPayment.paymentCode) {
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
        invoiceActions.setError(error);
      }
    } else {
      createInvoice(selectedPayment, inputValue);
    }
    setModalVisible(false);
  }

  const handleCancel = () => {
    cancelOperation();
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

      createInvoice(
        {
          ...selectedPayment,
          installments,
        },
        response.result.paidAmount / 100 || order.price,
      );
    } catch (error) {
      invoiceActions.setError(error);
    }
  };

  if (remoteCheckoutMode) {
    return null;
  }

  return (
    <>
      <PaymentCheckoutPanel
        payments={payments}
        selectedPayment={selectedPayment}
        onSelectPayment={selectPayment}
        onPay={handlePay}
        payDisabled={!selectedPayment}
        invoiceIsSaving={invoiceIsSaving}
        invoiceError={invoiceError}
        error={error}
      />

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
              {global.t?.t('orders', 'title', 'chooseInstallments')}:
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
                    {num}x - {Formatter.formatMoney((order?.price || 0) / num)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title={global.t?.t('orders', 'button', 'cancel')}
              onPress={() => setInstallmentsModalVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

export default Checkout;
