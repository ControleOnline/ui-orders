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
import InfinitePay from './InfinitePay'; // Substituímos Cielo por InfinitePay
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {getStore} from '@store';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import PayableToolbar from '@controleonline/ui-orders/src/react/components/PayableToolbar';

export default Checkout = ({route}) => {
  const navigation = useNavigation();
  const {styles, globalStyles} = css();
  const {getters} = getStore('cart');
  const {getters: paymentTypeGetters, actions: paymentTypeActions} =
    getStore('walletPaymentType');
  const {getters: peopleGetters} = getStore('people');
  const {getters: invoiceGetters, actions: invoiceActions} =
    getStore('invoice');
  const {
    IsSaving: invoiceIsSaving,
    error: invoiceError,
    items: invoices,
  } = invoiceGetters;
  const {getters: configsGetters} = getStore('configs');
  const {items: companyConfigs} = configsGetters;
  const {getters: deviceConfigGetters} = getStore('device_config');
  const {item: device} = deviceConfigGetters;
  const {isLoading, error, items: payments} = paymentTypeGetters;
  const {currentCompany, defaultCompany} = peopleGetters;
  const {item: order, payable} = getters;
  const [selectedPayment, setSelectedPayment] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [installmentsModalVisible, setInstallmentsModalVisible] =
    useState(false); // Novo modal para parcelas
  const [inputValue, setInputValue] = useState('');
  const [selectedInstallments, setSelectedInstallments] = useState(null); // Estado para número de parcelas

  useFocusEffect(
    useCallback(() => {
      if (
        payments.length == 0 &&
        companyConfigs &&
        device?.configs &&
        Object.entries(device.configs).length > 0 &&
        device.configs['pos-gateway']
      ) {
        let wallets = [];

        if (companyConfigs['pos-' + device.configs['pos-gateway'] + '-wallet'])
          wallets.push(
            companyConfigs['pos-' + device.configs['pos-gateway'] + '-wallet'],
          );

        if (companyConfigs['pos-cash-wallet'])
          wallets.push(companyConfigs['pos-cash-wallet']);

        paymentTypeActions.getItems({
          people: '/people/' + currentCompany.id,
          wallet: wallets,
        });
      }
    }, [order, currentCompany, companyConfigs]),
  );

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
    if (
      !selectedPayment ||
      !selectedPayment.wallet ||
      !selectedPayment.paymentType
    ) {
      paymentTypeActions.setError('Selecione uma forma de pagamento');
      return;
    }

    let totalPrice = Math.round(order.price * 100).toString();

    // Verifica se é 'split' para abrir o modal de parcelas
    if (selectedPayment.installments === 'split') {
      setInstallmentsModalVisible(true);
      return;
    }

    const service = new InfinitePay();

    try {
      if (!selectedPayment.paymentCode) {
        let value = 0;
        if (payable > 0) value = 0;
        else value = payable * -1;
        setInputValue(Formatter.formatMoney(value));
        setModalVisible(true);
        return;
      }

      const response = await service.payment(
        selectedPayment.paymentCode,
        selectedPayment.installments || 1, // Usa 1 como padrão se não houver parcelas
        order['@id'],
        totalPrice,
      );

      if (!response.success || response.code === 2 || response.code === 1)
        throw response;

      createInvoice(response.result.paidAmount / 100 || order.price); // Ajuste conforme retorno da InfinitePay
    } catch (error) {
      paymentTypeActions.setError(error);
    }
  };

  const createInvoice = total => {
    if (
      !selectedPayment ||
      !selectedPayment.wallet ||
      !selectedPayment.paymentType
    ) {
      paymentTypeActions.setError('Selecione uma forma de pagamento');
      return;
    }
    const payload = {
      dueDate: Formatter.getCurrentDate(),
      status: '/statuses/' + defaultCompany?.configs['pos-paid-status'],
      destinationWallet: selectedPayment.wallet['@id'],
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
      paymentTypeActions.setError('Por favor, insira um valor válido!');
      setModalVisible(false);
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
            <Text style={{marginBottom: 10}}>Valor à pagar:</Text>
            <TextInput
              placeholderTextColor="#666"
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                padding: 8,
                marginBottom: 10,
                color: '#666',
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
