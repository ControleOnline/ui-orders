import React, {useCallback, useState, useEffect} from 'react';
import {Modal} from 'react-native';
import Cielo from './Cielo';
import { useStore } from '@store';
import { useFocusEffect } from '@react-navigation/native';
import Calculate from '@controleonline/ui-orders/src/react/components/cart/Calculate';
import PaymentCheckoutPanel from '@controleonline/ui-orders/src/react/components/PaymentCheckoutPanel';

const Checkout = ({
  createInvoice,
  cancelOperation,
  remoteCheckoutMode = false,
  paymentType = {},
  paymentValue = 0,
}) => {
  const walletPaymentTypeStore = useStore('walletPaymentType');
  const paymentTypeGetters = walletPaymentTypeStore.getters;
  const order_productsStore = useStore('order_products');
  const orderProductsGetters = order_productsStore.getters;
  const invoiceStore = useStore('invoice');
  const invoiceGetters = invoiceStore.getters;
  const invoiceActions = invoiceStore.actions;
  const { IsSaving: invoiceIsSaving, error: invoiceError } = invoiceGetters;

  const { items: orderProducts } = orderProductsGetters;
  const { error, items: payments } = paymentTypeGetters;
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
      setSelectedPayment(paymentType);
      handleConfirmValue(paymentValue);
    }
  }, [paymentType, paymentValue, remoteCheckoutMode]);

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
    return items;
  };

  const handlePay = async () => {
    if (
      !selectedPayment ||
      !selectedPayment.wallet ||
      !selectedPayment.paymentType
    ) {
      invoiceActions.setError(global.t?.t('orders', 'message', 'selectPaymentMethod'));
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
          invoiceActions.setError(response.result);
          cancelOperation();

          setModalVisible(false);
          return;
        }

        createInvoice(selectedPayment, inputValue);
      } catch (error) {
        invoiceActions.setError(`${global.t?.t('orders', 'message', 'unexpectedError')}: ${error.message}`);
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
    </>
  );
};

export default Checkout;
