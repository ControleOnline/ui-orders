import React from 'react';

import {
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';
import css from '@controleonline/ui-orders/src/react/css/orders';

import {
  getDeviceTypeLabel,
  getPrinterLabel,
  getPrinterOptionValue,
} from '@controleonline/ui-common/src/react/utils/printerDevices';

import {usePrintButtonController} from '@controleonline/ui-common/src/react/print/usePrintButtonController';
import { inlineStyle_129_16 } from './PrintButton.styles';

const PrinterButton = ({
  job = null,
  printType,
  store,
  compact = false,
  iconColor = '#fff',
  compactButtonStyle = null,
  compactSelectStyle = null,
  disabled = false,
  style = null,
  printerSelection = {},
  layout = {},
  onSuccess = null,
  onError = null,
  label = '',
  iconSize = null,
  textStyle = null,
}) => {
  const {styles, globalStyles} = css();
  const {
    canSelectPrinter,
    closePrinterModal,
    handlePrint,
    handleSelectPrinter,
    isModalVisible,
    isRequestLoading,
    normalizedJob,
    openPrinterModal,
    printerOptions,
    selectedPrinter,
  } = usePrintButtonController({
    job,
    printType,
    store,
    printerSelection,
    onSuccess,
    onError,
  });

  const resolvedVariant = layout?.variant || (compact ? 'compact' : 'default');
  const showCompactContent = resolvedVariant === 'compact' || resolvedVariant === 'icon';
  const resolvedIconSize = iconSize || (showCompactContent ? 19 : 24);
  let resolvedLabel = '';
  if (!showCompactContent) {
    if (isRequestLoading) {
      resolvedLabel = global.t?.t('orders', 'button', 'printing') || 'Processando...';
    } else if (label) {
      resolvedLabel = label;
    } else if (selectedPrinter?.alias) {
      resolvedLabel = `${global.t?.t('orders', 'button', 'print') || 'Imprimir'} (${selectedPrinter.alias} • ${getDeviceTypeLabel(
        selectedPrinter?.type,
      )})`;
    } else {
      resolvedLabel = global.t?.t('orders', 'button', 'print') || 'Imprimir';
    }
  }

  const renderPrinterItem = ({item}) => (
    <TouchableOpacity
      style={styles.printButton.printerItem}
      onPress={() => handleSelectPrinter(item)}>
      <Text style={styles.printButton.printerText}>
        {`${getPrinterLabel(item)} (${getDeviceTypeLabel(item?.type)})`}
      </Text>
    </TouchableOpacity>
  );

  if (!normalizedJob) {
    return null;
  }

  const printDisabled = disabled || isRequestLoading;
    
  return (
    <View
      style={
        showCompactContent
          ? styles.printButton.compactWrap
          : [
              globalStyles.button,
              style,
              {flexDirection: 'row', alignItems: 'center'},
            ]
      }>
      <TouchableOpacity
        style={
          showCompactContent
            ? [styles.printButton.compactButton, compactButtonStyle, layout?.mainButtonStyle]
            : [styles.printButton.printButton, layout?.mainButtonStyle]
        }
        onPress={handlePrint}
        disabled={printDisabled}>
        <Icon
          name={isRequestLoading ? 'autorenew' : 'print'}
          size={resolvedIconSize}
          color={iconColor}
        />
        {!showCompactContent && (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              inlineStyle_129_16({
                iconColor: iconColor,
              }),
              textStyle,
            ]}>
            {resolvedLabel}
          </Text>
        )}
      </TouchableOpacity>
      {canSelectPrinter ? (
        <TouchableOpacity
          style={
            showCompactContent
              ? [styles.printButton.compactButton, compactSelectStyle, layout?.selectButtonStyle]
              : [styles.printButton.selectButton, layout?.selectButtonStyle]
          }
          disabled={disabled || isRequestLoading}
          onPress={openPrinterModal}>
          <Icon
            name="list"
            size={showCompactContent ? 20 : resolvedIconSize}
            color={iconColor}
          />
        </TouchableOpacity>
      ) : null}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closePrinterModal}>
        <View style={styles.printButton.modalContainer}>
          <View style={styles.printButton.modalContent}>
            <Text style={styles.printButton.modalTitle}>
              {global.t?.t('orders', 'title', 'selectPrinter')}
            </Text>
            <FlatList
              data={printerOptions}
              renderItem={renderPrinterItem}
              keyExtractor={item => getPrinterOptionValue(item) || item.device}
            />
            <TouchableOpacity
              style={styles.printButton.closeButton}
              onPress={closePrinterModal}>
              <Text style={styles.printButton.closeButtonText}>{global.t?.t('orders', 'button', 'close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PrinterButton;
