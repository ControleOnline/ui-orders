import React, {useState, useEffect} from 'react';
import {TouchableOpacity, Text, View, Modal, FlatList} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';
import css from '@controleonline/ui-orders/src/react/css/orders';
import {useStore} from '@store';

const PrinterButton = ({printType, store}) => {
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
  const {item: device_config} = deviceConfigGetters;

  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    if (
      printers &&
      printers.length > 0 &&
      device_config &&
      device_config.configs
    )
      printerActions.setItem(
        printers.find(p => p.device === device_config.configs.printer),
      );
  }, [device_config, printers]);

  const handleOpenPrinters = () => {
    setIsModalVisible(true);
  };
  const handleSelectPrinter = index => {
    deviceConfigsActions
      .addDeviceConfigs({
        configs: JSON.stringify({
          printer: printers[index].device,
        }),
        people: '/people/' + currentCompany.id,
      })
      .then(() => {
        setIsModalVisible(false);
        printerActions.setItem(printers[index]);
      });
  };

  const handlePrint = async () => {
    try {
      printActions.addToPrint({
        printType: printType,
        id:
          storeGetters.item && storeGetters.item['@id']
            ? storeGetters.item['@id'].split('/').pop()
            : null,
      });
    } catch (err) {
      storeActions.setError(err.message || 'Erro ao processar impressão');
    }
  };

  const renderPrinterItem = ({item, index}) => (
    <TouchableOpacity
      style={styles.printButton.printerItem}
      onPress={() => handleSelectPrinter(index)}>
      <Text style={styles.printButton.printerText}>{item.alias}</Text>
    </TouchableOpacity>
  );

  return (
    printers?.length > 0 && (
      <View
        style={[
          globalStyles.button,
          {flexDirection: 'row', alignItems: 'center'},
        ]}>
        <TouchableOpacity
          style={[styles.printButton.printButton]}
          onPress={handlePrint}
          disabled={isLoading || !printer}>
          <Icon name="print" size={24} color="#fff" />
          <Text style={{color: '#fff', marginLeft: 8}}>
            {isLoading
              ? 'Imprimindo...'
              : printer && printer.alias
              ? `Imprimir (${printer?.alias})`
              : 'Selecionar Impressora'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.printButton.selectButton}
          onPress={handleOpenPrinters}>
          <Icon name="list" size={24} color="#fff" />
        </TouchableOpacity>

        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsModalVisible(false)}>
          <View style={styles.printButton.modalContainer}>
            <View style={styles.printButton.modalContent}>
              <Text style={styles.printButton.modalTitle}>
                Selecionar Impressora
              </Text>
              <FlatList
                data={printers}
                renderItem={renderPrinterItem}
                keyExtractor={item => item.device}
              />
              <TouchableOpacity
                style={styles.printButton.closeButton}
                onPress={() => setIsModalVisible(false)}>
                <Text style={styles.printButton.closeButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    )
  );
};

export default PrinterButton;
