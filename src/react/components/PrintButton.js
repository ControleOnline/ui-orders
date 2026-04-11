import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {TouchableOpacity, Text, View, Modal, FlatList, Platform} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {parseConfigsObject} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {getPrinterOptions} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {useStore} from '@store';

const PrinterButton = ({
  printType,
  store,
  compact = false,
  iconColor = '#fff',
  compactButtonStyle = null,
  compactSelectStyle = null,
  disabled = false,
}) => {
  const {styles, globalStyles} = css();

  const currentStore = useStore(store);
  const storeGetters = currentStore.getters;
  const storeActions = currentStore.actions;

  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore.getters;
  const deviceConfigsActions = device_configStore.actions;
  const printerStore = useStore('printer');
  const printerGetters = printerStore.getters;
  const printerActions = printerStore.actions;
  const printStore = useStore('print');
  const printActions = printStore.actions;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;

  const {currentCompany} = peopleGetters;
  const {isLoading, items: printers, item: printer} = printerGetters;
  const {item: device_config, items: companyDeviceConfigs = []} = deviceConfigGetters;
  const currentItemId = useMemo(
    () =>
      storeGetters.item && storeGetters.item['@id']
        ? storeGetters.item['@id'].split('/').pop()
        : null,
    [storeGetters.item],
  );
  const configuredPrinterDevice = useMemo(
    () => parseConfigsObject(device_config?.configs)?.printer || '',
    [device_config?.configs],
  );
  const printerOptions = useMemo(
    () =>
      getPrinterOptions({
        printers,
        deviceConfigs: companyDeviceConfigs,
        companyId: currentCompany?.id,
      }),
    [companyDeviceConfigs, currentCompany?.id, printers],
  );

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPrinterDevice, setSelectedPrinterDevice] = useState('');

  useEffect(() => {
    if (!currentCompany?.id) {
      return;
    }

    deviceConfigsActions
      .getItems({people: `/people/${currentCompany.id}`})
      .catch(() => {});
    printerActions.getPrinters({people: currentCompany.id}).catch(() => {});
  }, [currentCompany?.id, deviceConfigsActions, printerActions]);

  useEffect(() => {
    const matchedPrinter =
      printerOptions.find(
        option =>
          option.device === (selectedPrinterDevice || configuredPrinterDevice),
      ) ||
      printerOptions.find(option => option.device === configuredPrinterDevice) ||
      null;

    printerActions.setItem(matchedPrinter || null);

    const nextPrinterDevice =
      matchedPrinter?.device || configuredPrinterDevice || '';
    if (nextPrinterDevice !== selectedPrinterDevice) {
      setSelectedPrinterDevice(nextPrinterDevice);
    }
  }, [
    configuredPrinterDevice,
    printerActions,
    printerOptions,
    selectedPrinterDevice,
  ]);

  const handleOpenPrinters = () => {
    setIsModalVisible(true);
  };
  const handleSelectPrinter = index => {
    const nextPrinterDevice = printerOptions[index]?.device;
    deviceConfigsActions
      .addDeviceConfigs({
        configs: JSON.stringify({
          printer: nextPrinterDevice,
        }),
        people: '/people/' + currentCompany.id,
      })
      .then(() => {
        setIsModalVisible(false);
        setSelectedPrinterDevice(nextPrinterDevice || '');
        printerActions.setItem(printerOptions[index] || null);
      });
  };

  const requestRemotePrint = useCallback(
    async targetDevice => {
      const commonParams = {
        device: targetDevice,
        ...(currentCompany?.id ? {people: currentCompany.id} : {}),
      };

      if (printType === 'order') {
        if (!currentItemId) {
          throw new Error(global.t?.t('orders', 'message', 'printProcessingError'));
        }

        return printActions.printOrder({
          id: currentItemId,
          ...commonParams,
        });
      }

      if (printType === 'cash-register') {
        return printActions.getCashRegisterPrint(commonParams);
      }

      if (printType === 'purchasing-suggestion') {
        return printActions.printPurchasingSuggestion(commonParams);
      }

      if (printType === 'inventory') {
        return printActions.printInventory(commonParams);
      }

      return null;
    },
    [currentCompany?.id, currentItemId, printActions, printType],
  );

  const handlePrint = async () => {
    if (disabled) {
      return;
    }

    try {
      const targetDevice =
        selectedPrinterDevice ||
        printer?.device ||
        configuredPrinterDevice ||
        null;
      if (!targetDevice) {
        storeActions.setError(
          global.t?.t('orders', 'title', 'selectPrinter'),
        );
        return;
      }

      if (Platform.OS === 'web') {
        const remoteResult = await requestRemotePrint(targetDevice);
        if (remoteResult !== null) {
          return;
        }
      }

      printActions.addToPrint({
        printType: printType,
        id: currentItemId,
        device: targetDevice,
      });
    } catch (err) {
      storeActions.setError(err.message || global.t?.t('orders', 'message', 'printProcessingError'));
    }
  };

  const renderPrinterItem = ({item, index}) => (
    <TouchableOpacity
      style={styles.printButton.printerItem}
      onPress={() => handleSelectPrinter(index)}>
      <Text style={styles.printButton.printerText}>{item.alias}</Text>
    </TouchableOpacity>
  );

  if (!printerOptions?.length) {
    return null;
  }

  const resolvedPrinterDevice =
    selectedPrinterDevice ||
    printer?.device ||
    configuredPrinterDevice ||
    '';
  const printDisabled = disabled || isLoading || !resolvedPrinterDevice;

  return (
    <View
      style={
        compact
          ? styles.printButton.compactWrap
          : [
              globalStyles.button,
              {flexDirection: 'row', alignItems: 'center'},
            ]
      }>
      <TouchableOpacity
        style={
          compact
            ? [styles.printButton.compactButton, compactButtonStyle]
            : [styles.printButton.printButton]
        }
        onPress={handlePrint}
        disabled={printDisabled}>
        <Icon name="print" size={compact ? 19 : 24} color={iconColor} />
        {!compact && (
          <Text style={{color: iconColor, marginLeft: 8}}>
            {isLoading
              ? global.t?.t('orders', 'button', 'printing')
              : printer && printer.alias
              ? `${global.t?.t('orders', 'button', 'print')} (${printer?.alias})`
              : global.t?.t('orders', 'title', 'selectPrinter')}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={
          compact
            ? [styles.printButton.compactButton, compactSelectStyle]
            : styles.printButton.selectButton
        }
        disabled={disabled}
        onPress={handleOpenPrinters}>
        <Icon name="list" size={compact ? 20 : 24} color={iconColor} />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.printButton.modalContainer}>
          <View style={styles.printButton.modalContent}>
            <Text style={styles.printButton.modalTitle}>
              {global.t?.t('orders', 'title', 'selectPrinter')}
            </Text>
            <FlatList
              data={printerOptions}
              renderItem={renderPrinterItem}
              keyExtractor={item => item.device}
            />
            <TouchableOpacity
              style={styles.printButton.closeButton}
              onPress={() => setIsModalVisible(false)}>
              <Text style={styles.printButton.closeButtonText}>{global.t?.t('orders', 'button', 'close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PrinterButton;
