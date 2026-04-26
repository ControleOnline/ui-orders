import React, {useCallback, useState} from 'react';

import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useFocusEffect} from '@react-navigation/native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';
import Formatter from '@controleonline/ui-common/src/utils/formatter.js';
import {
  isPosCashRegisterOpen,
  shouldUsePosCashRegisterLifecycle,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';

import {
  inlineStyle_123_20,
  inlineStyle_130_18,
  inlineStyle_137_24,
  inlineStyle_141_24,
  inlineStyle_148_24,
  inlineStyle_152_24,
  inlineStyle_183_24,
  inlineStyle_192_24,
} from './CloseCashRegister.styles';

const normalizeNotificationTargets = value => {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/\r?\n|,/)
      : [];

  return Array.from(
    new Set(
      source
        .map(item => String(item || '').replace(/\D+/g, '').trim())
        .filter(Boolean),
    ),
  );
};

const groupCashRegisterItems = items => {
  const groupedItems = new Map();

  (Array.isArray(items) ? items : []).forEach(item => {
    const productName = String(item?.product_name || '').trim() || 'Item';
    const productDescription = String(item?.product_description || '').trim();
    const productLabel = productDescription
      ? `${productName} - ${productDescription}`
      : productName;
    const currentItem = groupedItems.get(productLabel) || {
      label: productLabel,
      quantity: 0,
      total: 0,
    };

    currentItem.quantity += Number(item?.quantity || 0);
    currentItem.total += Number(item?.order_product_total || 0);
    groupedItems.set(productLabel, currentItem);
  });

  return Array.from(groupedItems.values()).sort((left, right) =>
    left.label.localeCompare(right.label, 'pt-BR', {sensitivity: 'base'}),
  );
};

const buildCashRegisterWhatsappMessage = ({
  companyName,
  deviceLabel,
  operatorName,
  orderItems,
  total,
}) => {
  const groupedItems = groupCashRegisterItems(orderItems);
  const reportLines = groupedItems.map(
    item =>
      `- ${item.quantity}x ${item.label}: ${Formatter.formatMoney(item.total)}`,
  );

  return [
    'Fechamento de caixa do device',
    companyName ? `Empresa: ${companyName}` : '',
    deviceLabel ? `Device: ${deviceLabel}` : '',
    operatorName ? `Operador: ${operatorName}` : '',
    `Data: ${new Date().toLocaleString('pt-BR')}`,
    '',
    'Vendido no device:',
    ...(reportLines.length > 0
      ? reportLines
      : ['- Nenhum item vendido neste fechamento.']),
    '',
    `Total: ${Formatter.formatMoney(total)}`,
  ]
    .filter(Boolean)
    .join('\n');
};

const sendCashRegisterWhatsappReport = async ({targets, message}) => {
  let openedTargets = 0;

  for (const target of targets) {
    const whatsappUrl = `https://wa.me/${target}?text=${encodeURIComponent(
      message,
    )}`;

    try {
      await Linking.openURL(whatsappUrl);
      openedTargets += 1;
    } catch {
      // segue para os demais numeros
    }
  }

  return openedTargets;
};

const CloseCashRegister = ({navigation}) => {
  const {styles, globalStyles} = css();
  const {width} = useWindowDimensions();
  const authStore = useStore('auth');
  const authGetters = authStore.getters;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const configsStore = useStore('configs');
  const invoiceStore = useStore('invoice');
  const invoiceGetters = invoiceStore.getters;
  const invoiceActions = invoiceStore.actions;
  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore.getters;
  const deviceConfigsActions = device_configStore.actions;
  const {item: device} = deviceConfigGetters;
  const {currentCompany} = peopleGetters;
  const {items: companyConfigs} = configsStore.getters;
  const {user} = authGetters;
  const deviceStore = useStore('device');
  const deviceGetters = deviceStore.getters;
  const {item: storagedDevice} = deviceGetters;
  const {isLoading, error} = invoiceGetters;
  const [orderItems, setOrderItems] = useState([]);
  const effectiveCompanyConfigs =
    companyConfigs && typeof companyConfigs === 'object'
      ? companyConfigs
      : currentCompany?.configs || {};
  const cashRegisterLifecycleEnabled = shouldUsePosCashRegisterLifecycle(
    device?.configs,
  );
  const cashRegisterOpen = isPosCashRegisterOpen(device?.configs);
  const isCompactWidth = width < 360;
  const footerButtonContainerStyle = isCompactWidth
    ? {
        height: 44,
        paddingHorizontal: 4,
        paddingBottom: 4,
      }
    : null;
  const footerButtonStyle = isCompactWidth
    ? {
        marginHorizontal: 3,
        paddingVertical: 8,
        paddingHorizontal: 6,
      }
    : null;
  const footerButtonTextStyle = isCompactWidth
    ? {
        flexShrink: 1,
        fontSize: 12,
        marginLeft: 4,
      }
    : null;
  const footerButtonIconSize = isCompactWidth ? 18 : 24;

  useFocusEffect(
    useCallback(() => {
      if (storagedDevice)
        invoiceActions
          .getCashRegister({
            device: storagedDevice.id,
            provider: currentCompany.id,
          })
          .then(data => {
            setOrderItems(data);
          });
    }, [storagedDevice, currentCompany]),
  );

  const confirm = (message, callback) => {
    if (Platform.OS === 'web') {
      if (window.confirm(message)) callback();
    } else {
      Alert.alert(global.t?.t('orders', 'title', 'confirmation'), message, [
        { text: global.t?.t('orders', 'button', 'cancel'), style: 'cancel' },
        { text: global.t?.t('orders', 'button', 'confirm'), onPress: callback },
      ]);
    }
  };

  const handleConfirmClose = () => {
    confirm(global.t?.t('orders', 'message', 'confirmCloseCashRegister'), () =>
      handleCashRegister(false),
    );
  };

  const handleConfirmOpen = () => {
    confirm(global.t?.t('orders', 'message', 'confirmOpenCashRegister'), () =>
      handleCashRegister(true),
    );
  };

  const handleCashRegister = isOpening => {
    invoiceActions
      .getItems({
        'order[id]': 'DESC',
        itemsPerPage: 1,
      })
      .then(data => {
        let openId = 0;
        if (data && data.length > 0)
          openId = data[0]['@id'].replace(/\D/g, '');

        const configValue = isOpening
          ? {
              'cash-wallet-open-id': openId,
              'cash-wallet-closed-id': 0,
            }
          : {
              'cash-wallet-closed-id': openId,
            };

        deviceConfigsActions
          .addDeviceConfigs({
            configs: JSON.stringify(configValue),
            people: '/people/' + currentCompany.id,
          })
          .then(async () => {
            if (!isOpening && cashRegisterLifecycleEnabled) {
              const notificationTargets = normalizeNotificationTargets(
                effectiveCompanyConfigs['cash-register-notifications'],
              );

              if (notificationTargets.length > 0) {
                const message = buildCashRegisterWhatsappMessage({
                  companyName:
                    currentCompany?.alias || currentCompany?.name || '',
                  deviceLabel:
                    device?.alias ||
                    storagedDevice?.alias ||
                    storagedDevice?.id ||
                    '',
                  operatorName: user?.realname || user?.username || '',
                  orderItems,
                  total,
                });

                const openedTargets = await sendCashRegisterWhatsappReport({
                  targets: notificationTargets,
                  message,
                });

                if (openedTargets === 0) {
                  Alert.alert(
                    'Relatorio nao enviado',
                    'Nao foi possivel abrir o WhatsApp para os numeros configurados neste device.',
                  );
                }
              }
            }

            navigation.reset({
              index: 0,
              routes: [{name: 'HomePage'}],
            });
          });
      });
  };

  const total = orderItems.reduce(
    (sum, item) => sum + item.order_product_total,
    0,
  );

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="invoice" />
      {!isLoading && !error && (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View>
              <Text style={inlineStyle_123_20}>
                {user?.realname}
              </Text>

              {orderItems.map((item, index) => (
                <View
                  key={index}
                  style={inlineStyle_130_18}>
                  <Text style={inlineStyle_137_24}>
                    {item.quantity}
                  </Text>

                  <Text style={inlineStyle_141_24}>
                    {item.product_name}
                    {item.product_description
                      ? ' - ' + item.product_description
                      : ''}
                  </Text>

                  <Text style={inlineStyle_148_24}>
                    {Formatter.formatMoney(item.order_product_price)}
                  </Text>

                  <Text style={inlineStyle_152_24}>
                    {Formatter.formatMoney(item.order_product_total)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.CloseCashRegister.footerContainer}>
            <View style={styles.CloseCashRegister.totalContainer}>
              <Text style={styles.CloseCashRegister.total}>{global.t?.t('orders', 'label', 'total').toUpperCase()}</Text>
              <Text style={styles.CloseCashRegister.total}>
                {Formatter.formatMoney(total)}
              </Text>
            </View>

            <View
              style={[
                styles.CloseCashRegister.buttonContainer,
                footerButtonContainerStyle,
              ]}>
              <PrintButton
                job={{type: 'cash-register'}}
                store={'invoice'}
                label="Imprimir"
                iconSize={footerButtonIconSize}
                style={[globalStyles.button, footerButtonStyle]}
                printerSelection={{enabled: true}}
                textStyle={footerButtonTextStyle}
              />

              {cashRegisterLifecycleEnabled ? (
                cashRegisterOpen ? (
                <TouchableOpacity
                  onPress={handleConfirmClose}
                  style={[globalStyles.button, footerButtonStyle]}>
                  <Icon name="lock" size={footerButtonIconSize} color="#fff" />
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[inlineStyle_183_24, footerButtonTextStyle]}>
                    {global.t?.t('orders', 'button', 'closeCashRegister')}
                  </Text>
                </TouchableOpacity>
                ) : (
                <TouchableOpacity
                  onPress={handleConfirmOpen}
                  style={[globalStyles.button, footerButtonStyle]}>
                  <Icon name="lock-open" size={footerButtonIconSize} color="#fff" />
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[inlineStyle_192_24, footerButtonTextStyle]}>
                    {global.t?.t('orders', 'button', 'openCashRegister')}
                  </Text>
                </TouchableOpacity>
                )
              ) : (
                <View style={[globalStyles.button, footerButtonStyle, {opacity: 0.75}]}>
                  <Icon name="event-note" size={footerButtonIconSize} color="#fff" />
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[inlineStyle_192_24, footerButtonTextStyle]}>
                    {isCompactWidth
                      ? 'Fechamento diario'
                      : 'Fechamento diario configurado'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default CloseCashRegister;
