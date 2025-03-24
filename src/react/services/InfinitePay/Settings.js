import React, {useCallback, useState} from 'react';
import {View, ActivityIndicator, Text} from 'react-native';
import Cielo from './InfinitePay';
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
  const {getters: walletGetters, actions: walletActions} = getStore('wallet');
  const {getters: peopleGetters, actions: peopleActions} = getStore('people');
  const {currentCompany} = peopleGetters;
  const {getters: configsGetters} = getStore('configs');
  const {getters: paymentTypeGetters, actions: paymentTypeActions} =
    getStore('paymentType');
  const {items: paymentTypes} = paymentTypeGetters;
  const {item: config, items: companyConfigs, isSaving} = configsGetters;
  const {isLoading: walletLoading, items: wallets} = walletGetters;
  const {styles, globalStyles} = css();

  useFocusEffect(
    useCallback(() => {
      if (wallets !== null && companyConfigs)
        discoverWallet('pdv-cielo-wallet', 'Cielo');
    }, [companyConfigs, wallets]),
  );

  const paymentsCheck = [
    {
      paymentType: 'Débito',
      frequency: 'single',
      installments: 'single',
      people: '/people/' + currentCompany.id,
      paymentCode: 'DEBITO_AVISTA',
    },
    {
      paymentType: 'Crédito à Vista',
      frequency: 'single',
      installments: 'single',
      people: '/people/' + currentCompany.id,
      paymentCode: 'CREDITO_AVISTA',
    },
    {
      paymentType: 'PIX',
      frequency: 'single',
      installments: 'single',
      people: '/people/' + currentCompany.id,
      paymentCode: 'PIX',
    },
    {
      paymentType: 'Crédito Parcelado - Cliente',
      frequency: 'single',
      installments: 'single',
      people: '/people/' + currentCompany.id,
      paymentCode: 'CREDITO_PARCELADO_CLIENTE',
    },
    {
      paymentType: 'Crédito Parcelado - Loja',
      frequency: 'single',
      installments: 'single',
      people: '/people/' + currentCompany.id,
      paymentCode: 'CREDITO_PARCELADO_LOJA',
    },
  ];

  useFocusEffect(
    useCallback(() => {
      if (
        paymentTypes === null ||
        wallets === null ||
        !companyConfigs ||
        !companyConfigs['pdv-cielo-wallet']
      ) {
        return;
      }
      checkPaymentOptions(
        companyConfigs['pdv-cielo-wallet'],
        paymentTypes,
        paymentsCheck,
      );
    }, [companyConfigs, paymentTypes, wallets]),
  );

  return (
    <>
      <View style={styles.Settings.walletRow}>
        <Text style={styles.Settings.label}>Carteira p/ Cielo: </Text>
        <View style={styles.Settings.walletValueContainer}>
          <Text style={styles.Settings.walletValue}>
            {companyConfigs['pdv-cielo-wallet']}
          </Text>
          {walletLoading || isSaving ? (
            <ActivityIndicator size={22} color={styles.Settings.label} />
          ) : companyConfigs['pdv-cielo-wallet'] ? (
            <Icon name={'check'} size={22} color="green" />
          ) : (
            <Icon name={'close'} size={22} color="red" />
          )}
        </View>
      </View>
    </>
  );
};
