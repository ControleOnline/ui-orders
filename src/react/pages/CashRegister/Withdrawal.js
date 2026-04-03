import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import css from '@controleonline/ui-orders/src/react/css/orders';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useStore} from '@store';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

export default function BleedScreen() {
  const navigation = useNavigation();

  const {styles, globalStyles} = css();
  const walletPaymentTypeStore = useStore('walletPaymentType');
  const paymentTypeGetters = walletPaymentTypeStore.getters;
  const paymentTypeActions = walletPaymentTypeStore.actions;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const {items: paymentTypes} = paymentTypeGetters;
  const {currentCompany, defaultCompany} = peopleGetters;
  const invoiceStore = useStore('invoice');
  const invoiceActions = invoiceStore.actions;
  const [selectedPaymentType, setSelectedPaymentType] = useState(null);
  const [bleedValue, setBleedValue] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const configsStore = useStore('configs');
  const configsGetters = configsStore.getters;
  const {items: companyConfigs} = configsGetters;
  const [cashWallet, setCashWallet] = useState(null);
  const [withdrawlWallet, setWithdrawlWallet] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (companyConfigs && companyConfigs['pos-cash-wallet'])
        setCashWallet(companyConfigs['pos-cash-wallet']);
      if (
        companyConfigs &&
        (companyConfigs['pos-withdrawl-wallet'] ||
          companyConfigs['pos-withdrawal-wallet'])
      )
        setWithdrawlWallet(
          companyConfigs['pos-withdrawl-wallet'] ||
            companyConfigs['pos-withdrawal-wallet'],
        );
    }, [companyConfigs]),
  );

  useFocusEffect(
    useCallback(() => {
      if (cashWallet)
        paymentTypeActions.getItems({
          wallet: cashWallet,
        });
    }, [cashWallet]),
  );

  useFocusEffect(
    useCallback(() => {
      if (paymentTypes.length > 0) setSelectedPaymentType(paymentTypes[0]);
    }, [paymentTypes]),
  );

  const handleValueChange = text => {
    const numericValue = text.replace(/\D/g, '');
    if (!numericValue) {
      setBleedValue('');
      return;
    }
    const number = parseFloat(numericValue) / 100;
    setBleedValue(Formatter.formatMoney(number));
  };

  const handleSave = () => {
    if (!selectedPaymentType || !bleedValue) {
      paymentTypeActions.setError(
        global.t?.t('orders', 'message', 'selectPaymentTypeAndEnterAmount'),
      );
      return;
    }

    const numericValue = parseFloat(bleedValue.replace(/\D/g, '')) / 100;

    if (
      !withdrawlWallet ||
      !cashWallet ||
      !defaultCompany?.configs['pos-paid-status'] ||
      !currentCompany?.id
    )
      return;
    const payload = {
      dueDate: Formatter.getCurrentDate(),
      status: '/statuses/' + defaultCompany?.configs['pos-paid-status'],
      destinationWallet: '/wallets/' + withdrawlWallet,
      sourceWallet: '/wallets/' + cashWallet,
      price: numericValue,
      paymentType: selectedPaymentType.paymentType['@id'],
      payer: '/people/' + currentCompany.id,
      receiver: '/people/' + currentCompany.id,
    };

    invoiceActions.save(payload).then(invoice => {
      navigation.navigate('CashRegisterIndex');
    });
  };

  return (
    <SafeAreaView style={[styles.container]}>
      <StateStore store="walletPaymentType" />

      <View style={{flex: 1, padding: 20}}>
        {/* Combobox personalizado */}
        <View style={{marginBottom: 20}}>
          <TouchableOpacity
            style={[
              styles.boxPayment,
              {flexDirection: 'row', alignItems: 'center', padding: 10},
            ]}
            onPress={() => setDropdownVisible(!dropdownVisible)}>
            <Text style={{color: '#666'}}>
              {selectedPaymentType
                ? selectedPaymentType.paymentType.paymentType
                : global.t?.t('orders', 'message', 'selectPaymentType')}
            </Text>
            <Icon
              name={dropdownVisible ? 'arrow-drop-up' : 'arrow-drop-down'}
              size={24}
              color="black"
              style={{marginLeft: 'auto'}}
            />
          </TouchableOpacity>

          {dropdownVisible && (
            <View
              style={{
                maxHeight: 200,
                borderWidth: 1,
                borderColor: '#ccc',
                backgroundColor: 'white',
              }}>
              {paymentTypes.map(paymentType => (
                <TouchableOpacity
                  key={paymentType.id}
                  style={[
                    styles.boxPayment,
                    selectedPaymentType?.id === paymentType.id &&
                      styles.selectedBoxPayment,
                  ]}
                  onPress={() => {
                    setSelectedPaymentType(paymentType);
                    setDropdownVisible(false);
                  }}>
                  <Text style={{color: '#666'}}>
                    {paymentType.paymentType.paymentType}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Input de valor */}
        <View style={{marginBottom: 20}}>
          <Text style={{marginBottom: 5}}>{global.t?.t('orders', 'label', 'withdrawalAmount')}:</Text>
          <TextInput
            placeholderTextColor="#666"
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              padding: 10,
              fontSize: 16,
              color: '#666',
            }}
            keyboardType="numeric"
            value={bleedValue}
            onChangeText={handleValueChange}
            placeholder={global.t?.t('orders', 'placeholder', 'enterWithdrawalValue')}
          />
        </View>

        {/* Botão Salvar fixo no rodapé */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 10,
            backgroundColor: 'white',
          }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!selectedPaymentType || !bleedValue}
            style={[
              globalStyles.button,
              (!selectedPaymentType || !bleedValue) && globalStyles.disabled,
              {
                width: '100%',
                height: 50,
                justifyContent: 'center',
                alignItems: 'center',
              }, // Tamanho normal ajustado
            ]}>
            <Text style={globalStyles.btnText}>{global.t?.t('orders', 'button', 'save').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
