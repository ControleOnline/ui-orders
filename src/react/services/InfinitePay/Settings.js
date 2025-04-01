import React, {useCallback, useState} from 'react';
import {View, ActivityIndicator, Text} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {getStore} from '@store';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
export default InfinitePaySettings = ({
  checkWalletPaymentOptions,
  checkPaymentOptions,
  discoverWallet,
}) => {
  const {getters: walletGetters} = getStore('wallet');
  const {getters: peopleGetters} = getStore('people');
  const {currentCompany} = peopleGetters;
  const {getters: configsGetters} = getStore('configs');
  const {getters: paymentTypeGetters} = getStore('paymentType');
  const {items: paymentTypes} = paymentTypeGetters;
  const {items: companyConfigs, isSaving} = configsGetters;
  const {isLoading: walletLoading, items: wallets} = walletGetters;
  const {styles, globalStyles} = css();

  useFocusEffect(
    useCallback(() => {
      if (wallets !== null && companyConfigs)
        discoverWallet('pos-infinite-pay-wallet', 'Infine Pay');
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
        !companyConfigs['pos-infinite-pay-wallet']
      ) {
        return;
      }
      checkPaymentOptions(
        companyConfigs['pos-infinite-pay-wallet'],
        paymentTypes,
        paymentsCheck,
      );
    }, [companyConfigs, paymentTypes, wallets]),
  );

  return (
    <>
      <View style={styles.Settings.walletRow}>
        <Text style={styles.Settings.label}>Carteira p/ Infine Pay: </Text>
        <View style={styles.Settings.walletValueContainer}>
          <Text style={styles.Settings.walletValue}>
            {companyConfigs['pos-infinite-pay-wallet']}
          </Text>
          {walletLoading || isSaving ? (
            <ActivityIndicator size={22} color={styles.Settings.label} />
          ) : companyConfigs['pos-infinite-pay-wallet'] ? (
            <Icon name={'check'} size={22} color="green" />
          ) : (
            <Icon name={'close'} size={22} color="red" />
          )}
        </View>
      </View>
    </>
  );
};
