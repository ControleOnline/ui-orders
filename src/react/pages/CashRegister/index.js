import React, {useState, useCallback} from 'react';
import {Text, View, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {getStore} from '@store';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

const CashRegister = ({navigation}) => {
  const {styles, globalStyles} = css();
  const {getters: peopleGetters} = getStore('people');
  const {getters: invoiceGetters, actions: invoiceActions} =
    getStore('invoice');
  const {getters: paymentTypeGetters, actions: paymentTypeActions} =
    getStore('walletPaymentType');
  const {getters: configsGetters, actions: configActions} = getStore('configs');
  const {item: config, items: companyConfigs} = configsGetters;
  const {currentCompany} = peopleGetters;
  const {items: payments, isLoading, error} = invoiceGetters;

  const device = JSON.parse(localStorage.getItem('device') || '{}');
  const [processedData, setProcessedData] = useState({
    walletGroups: [],
    total: 0,
  });

  const [defaultWallets, setDefaultWallets] = useState(null);
  useFocusEffect(
    useCallback(() => {
      if (companyConfigs && config) {
        let w = [];

        if (config['pdv-gateway'] == 'cielo')
          w.push(companyConfigs['pdv-cielo-wallet']);
        if (config['pdv-gateway'] == 'google')
          w.push(companyConfigs['pdv-google-wallet']);

        w.push(companyConfigs['pdv-cash-wallet']);
        setDefaultWallets(w);
      }
    }, [companyConfigs, config]),
  );

  const handleWithdrawal = () => {
    navigation.navigate('Withdrawal');
  };

  const handleCloseCachRegister = () => {
    navigation.navigate('CloseCachRegister');
  };

  useFocusEffect(
    useCallback(() => {
      if (defaultWallets)
        paymentTypeActions.getItems({
          people: '/people/' + currentCompany.id,
          wallet: defaultWallets,
        });
    }, [currentCompany, defaultWallets]),
  );
  useFocusEffect(
    useCallback(() => {
      if (config && device && config['config-version'] == device.buildNumber)
        invoiceActions.getInflow({
          receiver: currentCompany.id,
          device: device?.id,
        });
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      const processData = () => {
        if (!payments || !payments[0] || !payments[0].payments) return;
        const data = payments[0].payments;

        const formatData = data => {
          return Object.keys(data.wallet || {}).map(walletId => {
            const wallet = data.wallet[walletId] || {};
            const paymentsList = Object.keys(wallet.payment || {}).map(
              paymentId => ({
                id: paymentId,
                payment: wallet.payment[paymentId]?.payment,
                inflow: wallet.payment[paymentId]?.inflow || 0,
                withdrawal: wallet.payment[paymentId]?.withdrawal || 0,
              }),
            );
            return {
              walletName: wallet.wallet,
              'withdrawal-wallet': wallet['withdrawal-wallet'],
              payments: paymentsList,
              total: wallet.total,
            };
          });
        };

        const walletGroups = formatData(data);
        const total = data.total || 0;

        setProcessedData({
          walletGroups,
          total,
        });
      };

      processData();
    }, [payments]),
  );

  const renderGroup = groups => (
    <View style={[styles.CashRegister.groupContainer]}>
      {groups.map((group, index) => (
        <View
          key={index}
          style={[
            styles.CashRegister.walletContainer,
            styles.OrderHeader.boxWrap,
          ]}>
          <View style={styles.boxHeader}>
            <Text style={[styles.CashRegister.walletTitle, styles.primary]}>
              {group.walletName}
            </Text>
          </View>
          {group.payments.map(payment => (
            <View
              key={payment.id}
              style={[
                styles.boxContent,
                {flexDirection: 'column', marginVertical: 2},
              ]}>
              {payment.inflow > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}>
                  <Text
                    style={[
                      styles.CashRegister.paymentText,
                      styles.boxTextColor,
                    ]}>
                    {payment.payment}
                  </Text>
                  <Text
                    style={[
                      styles.CashRegister.paymentText,
                      styles.boxTextColor,
                    ]}>
                    {Formatter.formatMoney(payment.inflow)}
                  </Text>
                </View>
              )}
              {payment.withdrawal > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}>
                  <Text
                    style={[styles.CashRegister.paymentText, {color: 'red'}]}>
                    Sangria {group['withdrawal-wallet']}
                  </Text>
                  <Text
                    style={[styles.CashRegister.paymentText, {color: 'red'}]}>
                    {Formatter.formatMoney(payment.withdrawal)}
                  </Text>
                </View>
              )}
            </View>
          ))}
          <View
            style={[
              styles.boxContent,
              {
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 5,
              },
            ]}>
            <Text style={[styles.CashRegister.walletTotal, styles.primary]}>
              Total
            </Text>
            <Text
              style={[
                styles.CashRegister.walletTotal,
                styles.primary,
                styles.boxPrice,
              ]}>
              {Formatter.formatMoney(group.total)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="invoice" />
      {!isLoading && payments.length > 0 && !error && (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.CashRegister.mainContainer}>
              {renderGroup(processedData.walletGroups)}
              <View
                style={[
                  styles.boxContent,
                  {
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    marginTop: 10,
                  },
                ]}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}>
                  <Text
                    style={[styles.CashRegister.grandTotal, styles.primary]}>
                    Total
                  </Text>
                  <Text
                    style={[
                      styles.CashRegister.grandTotal,
                      styles.primary,
                      styles.boxPrice,
                    ]}>
                    {Formatter.formatMoney(processedData.total)}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 10,
              backgroundColor: 'white',
            }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#ff4444',
                padding: 15,
                borderRadius: 5,
                flex: 1,
                marginRight: 5,
                alignItems: 'center',
              }}
              onPress={handleWithdrawal}>
              <Text style={{color: 'white', fontWeight: 'bold'}}>Sangria</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                globalStyles.primary,
                {
                  padding: 15,
                  borderRadius: 5,
                  flex: 1,
                  marginLeft: 5,
                  alignItems: 'center',
                },
              ]}
              onPress={handleCloseCachRegister}>
              <Text style={{color: 'white', fontWeight: 'bold'}}>
                Fechar Caixa
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default CashRegister;
