import React, {useState, useCallback} from 'react';
import {Text, View, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useStores} from '@store';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CashRegister = ({navigation}) => {
  const {styles, globalStyles} = css();
  const peopleStore = useStores(state => state.people);
  const peopleGetters = peopleStore.getters;
  const invoiceStore = useStores(state => state.invoice);
  const invoiceGetters = invoiceStore.getters;
  const invoiceActions = invoiceStore.actions;
  const walletPaymentTypeStore = useStores(state => state.walletPaymentType);
  const paymentTypeActions = walletPaymentTypeStore.actions;
  const configsStore = useStores(state => state.configs);
  const configsGetters = configsStore.getters;
  const device_configStore = useStores(state => state.device_config);
  const deviceConfigGetters = device_configStore.getters;
  const {item: device} = deviceConfigGetters;
  const {items: companyConfigs} = configsGetters;
  const {currentCompany} = peopleGetters;
  const {items: payments, isLoading, error} = invoiceGetters;
  const deviceStore = useStores(state => state.device);
  const deviceGetters = deviceStore.getters;
  const {item: storagedDevice} = deviceGetters;

  const [processedData, setProcessedData] = useState({
    walletGroups: [],
    total: 0,
  });

  const [defaultWallets, setDefaultWallets] = useState(null);
  useFocusEffect(
    useCallback(() => {
      if (
        companyConfigs &&
        device &&
        device.configs &&
        Object.entries(device.configs).length > 0 &&
        device.configs['pos-gateway'] &&
        companyConfigs['pos-cash-wallet']
      ) {
        let w = [];
        w.push(
          companyConfigs['pos-' + device.configs['pos-gateway'] + '-wallet'],
        );
        w.push(companyConfigs['pos-cash-wallet']);
        setDefaultWallets(w);
      }
    }, [companyConfigs, device]),
  );

  const handleWithdrawal = () => {
    navigation.navigate('Withdrawal');
  };

  const handleCloseCachRegister = () => {
    navigation.navigate('CloseCachRegister');
  };

  useFocusEffect(
    useCallback(() => {
      if (defaultWallets) {
        paymentTypeActions.getItems({
          people: '/people/' + currentCompany.id,
          wallet: defaultWallets,
        });
      }
    }, [currentCompany, defaultWallets]),
  );
  useFocusEffect(
    useCallback(() => {
      if (
        device?.configs &&
        storagedDevice &&
        device.configs['config-version'] == storagedDevice.buildNumber
      ) {
        invoiceActions.getInflow({
          receiver: currentCompany.id,
          'device.device': storagedDevice.id,
        });
      }
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      const processData = () => {
        if (!payments || !payments[0] || !payments[0].payments) {
          return;
        }
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
      {!isLoading && payments && payments.length > 0 && !error && (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.CashRegister.mainContainer}>
              {renderGroup(processedData.walletGroups)}
            </View>
          </ScrollView>
          <View style={styles.CloseCashRegister.footerContainer}>
            <View style={styles.CloseCashRegister.totalContainer}>
              <Text style={styles.CloseCashRegister.total}>TOTAL</Text>
              <Text style={styles.CloseCashRegister.total}>
                {Formatter.formatMoney(processedData.total)}
              </Text>
            </View>
            <View style={styles.CloseCashRegister.buttonContainer}>
              <TouchableOpacity
                style={[globalStyles.button]}
                onPress={handleWithdrawal}>
                <Icon name="print" size={24} color="#fff" />
                <Text style={{color: '#fff', marginLeft: 8}}>Sangria</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[globalStyles.button]}
                onPress={handleCloseCachRegister}>
                <Icon name="print" size={24} color="#fff" />
                <Text style={{color: '#fff', marginLeft: 8}}>Detalhar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default CashRegister;
