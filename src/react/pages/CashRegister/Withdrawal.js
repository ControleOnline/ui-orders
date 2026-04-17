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
import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

import {
  inlineStyle_173_12,
  inlineStyle_175_14,
  inlineStyle_182_18,
  inlineStyle_191_14,
  inlineStyle_197_14,
  inlineStyle_215_24,
  inlineStyle_225_14,
  inlineStyle_226_16,
  inlineStyle_229_12,
  inlineStyle_245_10,
} from './Withdrawal.styles';

const normalizeStatusKey = value => String(value || '').trim().toLowerCase();

const extractCollectionItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const buildStatusIriFromId = value => {
  const normalizedId = String(value || '').replace(/\D/g, '');
  return normalizedId ? `/statuses/${normalizedId}` : null;
};

let posPaidInvoiceStatusIriCache = null;

const resolvePosPaidInvoiceStatusIri = async fallbackStatusId => {
  if (posPaidInvoiceStatusIriCache) return posPaidInvoiceStatusIriCache;

  const fallbackIri = buildStatusIriFromId(fallbackStatusId);

  try {
    const response = await api.fetch('statuses', {
      params: {
        context: 'invoice',
        realStatus: 'closed',
        status: 'paid',
        itemsPerPage: 10,
      },
    });
    const items = extractCollectionItems(response);
    const matchedStatus =
      items.find(
        item =>
          normalizeStatusKey(item?.realStatus) === 'closed' &&
          normalizeStatusKey(item?.status) === 'paid',
      ) || items[0];
    const resolvedIri =
      matchedStatus?.['@id'] || buildStatusIriFromId(matchedStatus?.id) || fallbackIri;

    if (resolvedIri) {
      posPaidInvoiceStatusIriCache = resolvedIri;
    }

    return resolvedIri;
  } catch (error) {
    return fallbackIri;
  }
};

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

  const handleSave = async () => {
    if (!selectedPaymentType || !bleedValue) {
      paymentTypeActions.setError(
        global.t?.t('orders', 'message', 'selectPaymentTypeAndEnterAmount'),
      );
      return;
    }

    const numericValue = parseFloat(bleedValue.replace(/\D/g, '')) / 100;

    if (!withdrawlWallet || !cashWallet || !currentCompany?.id) return;

    const paidStatusIri = await resolvePosPaidInvoiceStatusIri(
      defaultCompany?.configs['pos-paid-status'],
    );

    if (!paidStatusIri) {
      paymentTypeActions.setError(
        'Nao foi possivel resolver o status pago da invoice do PDV.',
      );
      return;
    }

    const payload = {
      dueDate: Formatter.getCurrentDate(),
      status: paidStatusIri,
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
      <View style={inlineStyle_173_12}>
        {/* Combobox personalizado */}
        <View style={inlineStyle_175_14}>
          <TouchableOpacity
            style={[
              styles.boxPayment,
              {flexDirection: 'row', alignItems: 'center', padding: 10},
            ]}
            onPress={() => setDropdownVisible(!dropdownVisible)}>
            <Text style={inlineStyle_182_18}>
              {selectedPaymentType
                ? selectedPaymentType.paymentType.paymentType
                : global.t?.t('orders', 'message', 'selectPaymentType')}
            </Text>
            <Icon
              name={dropdownVisible ? 'arrow-drop-up' : 'arrow-drop-down'}
              size={24}
              color="black"
              style={inlineStyle_191_14}
            />
          </TouchableOpacity>

          {dropdownVisible && (
            <View
              style={inlineStyle_197_14}>
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
                  <Text style={inlineStyle_215_24}>
                    {paymentType.paymentType.paymentType}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Input de valor */}
        <View style={inlineStyle_225_14}>
          <Text style={inlineStyle_226_16}>{global.t?.t('orders', 'label', 'withdrawalAmount')}:</Text>
          <TextInput
            placeholderTextColor="#666"
            style={inlineStyle_229_12}
            keyboardType="numeric"
            value={bleedValue}
            onChangeText={handleValueChange}
            placeholder={global.t?.t('orders', 'placeholder', 'enterWithdrawalValue')}
          />
        </View>

        {/* Botão Salvar fixo no rodapé */}
        <View
          style={inlineStyle_245_10}>
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
