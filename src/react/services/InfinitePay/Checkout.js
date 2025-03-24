import React, {useCallback, useState} from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Button,
  ActivityIndicator,
} from 'react-native';
import PaymentMethods from './PaymentMethods';
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {getStore} from '@store';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import PayableToolbar from '@controleonline/ui-orders/src/react/components/PayableToolbar';

export default Checkout = ({
  checkWalletPaymentOptions,
  checkPaymentOptions,
  discoverWallet,
}) => {
  const navigation = useNavigation();
  const {getters: walletGetters, actions: walletActions} = getStore('wallet');
  const {getters: peopleGetters, actions: peopleActions} = getStore('people');
  const {currentCompany} = peopleGetters;
  const {getters: configsGetters} = getStore('configs');
  const {getters: paymentTypeGetters, actions: paymentTypeActions} =
    getStore('paymentType');
  const {items: paymentTypes} = paymentTypeGetters;
  const {item: config, items: companyConfigs, isSaving} = configsGetters;
  const {isLoading: walletLoading, items: wallets} = walletGetters;
  const {getters: cartGetters} = getStore('cart');
  const {getters: invoiceGetters, actions: invoiceActions} =
    getStore('invoice');
  const {
    IsSaving: invoiceIsSaving,
    error: invoiceError,
    items: invoices,
  } = invoiceGetters;
  const {item: order, payable} = cartGetters;
  const {styles, globalStyles} = css();
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [installmentsModalVisible, setInstallmentsModalVisible] =
    useState(false);
  const [selectedInstallments, setSelectedInstallments] = useState(2);

  useFocusEffect(
    useCallback(() => {
      if (wallets !== null && companyConfigs)
        discoverWallet('pdv-infinite-pay-wallet', 'InfinitePay');
    }, [companyConfigs, wallets]),
  );

  const paymentsCheck = [
    {
      paymentType: 'Débito',
      frequency: 'single',
      installments: 'single',
      people: '/people/' + currentCompany.id,
      paymentCode: 'debit',
    },
    {
      paymentType: 'Crédito à Vista',
      frequency: 'single',
      installments: 'single',
      people: '/people/' + currentCompany.id,
      paymentCode: 'credit',
    },
    {
      paymentType: 'Crédito Parcelado',
      frequency: 'single',
      installments: 'split',
      people: '/people/' + currentCompany.id,
      paymentCode: 'credit',
    },
  ];

  useFocusEffect(
    useCallback(() => {
      if (
        paymentTypes === null ||
        wallets === null ||
        !companyConfigs ||
        !companyConfigs['pdv-infinite-pay-wallet']
      ) {
        return;
      }
      checkPaymentOptions(
        companyConfigs['pdv-infinite-pay-wallet'],
        paymentTypes,
        paymentsCheck,
      );
    }, [companyConfigs, paymentTypes, wallets]),
  );

  const handlePay = async () => {
    if (!selectedPayment) {
      paymentTypeActions.setError('Selecione uma forma de pagamento');
      return;
    }

    if (selectedPayment.installments === 'split') {
      setInstallmentsModalVisible(true);
      return;
    }

    await processPayment();
  };

  const processPayment = async () => {
    let totalPrice = Math.round(order.price * 100).toString();

    try {
      const response = await PaymentMethods.payWithInfinitePay(
        selectedPayment.paymentType,
        order['@id'],
        totalPrice,
        selectedPayment.installments === 'split' ? selectedInstallments : 1,
      );

      if (
        !response.success ||
        response.result.code === 2 ||
        response.result.code === 1
      ) {
        throw response;
      }

      createInvoice(response.paidAmount / 100);
    } catch (error) {
      paymentTypeActions.setError(error);
    }
  };

  const createInvoice = total => {
    const payload = {
      dueDate: Formatter.getCurrentDate(),
      status: '/statuses/' + defaultCompany?.configs['pdv-paid-status'],
      destinationWallet: companyConfigs['pdv-infinite-pay-wallet'],
      paymentType: selectedPayment['@id'],
      price: total,
      receiver: '/people/' + currentCompany.id,
      order: order['@id'],
    };

    invoiceActions.save(payload).finally(() => {
      navigation.navigate('OrderTools', {order: order});
    });
  };

  const handleInstallmentsCancel = () => {
    setInstallmentsModalVisible(false);
    setSelectedInstallments(2);
  };

  const handleInstallmentsConfirm = async () => {
    setInstallmentsModalVisible(false);
    await processPayment();
  };

  const installmentsOptions = Array.from({length: 11}, (_, i) => i + 2); // 2 a 12 parcelas

  return (
    <>
      <SafeAreaView style={[styles.container]}>
        <StateStore store="walletPaymentType" />
        <StateStore store="invoice" />
        <View style={styles.Settings.walletRow}>
          <Text style={styles.Settings.label}>Carteira p/ InfinitePay: </Text>
          <View style={styles.Settings.walletValueContainer}>
            <Text style={styles.Settings.walletValue}>
              {companyConfigs['pdv-infinite-pay-wallet']}
            </Text>
            {walletLoading || isSaving ? (
              <ActivityIndicator size={22} color={styles.Settings.label} />
            ) : companyConfigs['pdv-infinite-pay-wallet'] ? (
              <Icon name={'check'} size={22} color="green" />
            ) : (
              <Icon name={'close'} size={22} color="red" />
            )}
          </View>
        </View>

        {!invoiceIsSaving &&
          !invoiceError &&
          !walletLoading &&
          paymentTypes &&
          paymentTypes.length > 0 && (
            <>
              <ScrollView
                contentContainerStyle={[
                  styles.scrollContent,
                  {paddingBottom: 100},
                  {flexGrow: 1},
                ]}>
                <View>
                  {paymentsCheck.map(payment => (
                    <TouchableOpacity
                      key={payment.paymentType}
                      onPress={() => setSelectedPayment(payment)}>
                      <View
                        style={[
                          styles.boxPayment,
                          selectedPayment?.paymentType ===
                            payment.paymentType && styles.selectedBoxPayment,
                        ]}>
                        <View style={styles.paymentIcon}>
                          {selectedPayment?.paymentType ===
                          payment.paymentType ? (
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
                            {payment.paymentType}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <PayableToolbar />

              <View style={[styles.toolbar]}>
                <Text style={[styles.primary, {flex: 1, textAlign: 'center'}]}>
                  {Formatter.formatMoney(order.price)}
                </Text>
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
        visible={installmentsModalVisible}
        onRequestClose={handleInstallmentsCancel}>
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
              Selecione o número de parcelas:
            </Text>
            <ScrollView style={{maxHeight: 200}}>
              {installmentsOptions.map(num => (
                <TouchableOpacity
                  key={num}
                  onPress={() => setSelectedInstallments(num)}
                  style={{
                    padding: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#ccc',
                    backgroundColor:
                      selectedInstallments === num ? '#e0e0e0' : 'white',
                  }}>
                  <Text style={{color: '#666'}}>{num} parcelas</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 10,
              }}>
              <Button title="Cancelar" onPress={handleInstallmentsCancel} />
              <Button title="Confirmar" onPress={handleInstallmentsConfirm} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
