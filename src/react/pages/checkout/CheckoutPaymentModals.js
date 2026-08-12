import React from 'react';
import {
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {getPaymentGatewayLabel} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import Calculate from '@controleonline/ui-orders/src/react/components/cart/Calculate';
import styles from './Checkout.styles';

export default function CheckoutPaymentModals({
  amountEntryDescription,
  amountEntryDetails,
  amountEntryFieldLabel,
  amountEntryModalMode,
  amountEntryTitle,
  cashReceivedValue,
  continueSelectedPayment,
  handleCashReceivedInputChange,
  handleConfirmAmountEntry,
  handleInstallmentsSelect,
  installmentsModalVisible,
  isCashAmountEntry,
  paymentExplanationDescription,
  paymentExplanationTitle,
  paymentExplanationVisible,
  remoteDeviceModalVisible,
  remotePaymentDevices,
  remainingAmount,
  selectedRemoteDevice,
  setAmountEntryModalMode,
  setInstallmentsModalVisible,
  setPaymentExplanationVisible,
  setRemoteDeviceModalVisible,
  setSelectedRemoteDeviceId,
  submittingPayment,
}) {
  return (
    <>
      <Modal
        visible={remoteDeviceModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRemoteDeviceModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecionar equipamento</Text>
            <Text style={styles.modalSubtitle}>
              O primeiro device configurado na empresa vira o fallback padrao
              quando este device nao tem destino proprio.
            </Text>
            <FlatList
              data={remotePaymentDevices}
              keyExtractor={item => item.deviceId}
              renderItem={({item}) => (
                <RemoteDeviceOption
                  item={item}
                  selectedRemoteDevice={selectedRemoteDevice}
                  setRemoteDeviceModalVisible={setRemoteDeviceModalVisible}
                  setSelectedRemoteDeviceId={setSelectedRemoteDeviceId}
                  submittingPayment={submittingPayment}
                />
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              disabled={submittingPayment}
              onPress={() => setRemoteDeviceModalVisible(false)}>
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={amountEntryModalMode !== ''}
        onRequestClose={() => setAmountEntryModalMode('')}>
        <Calculate
          closeOnInvalid={false}
          defaultValue={isCashAmountEntry ? null : remainingAmount}
          description={amountEntryDescription}
          details={amountEntryDetails}
          fieldLabel={amountEntryFieldLabel}
          handleCancel={() => setAmountEntryModalMode('')}
          handleConfirmValue={handleConfirmAmountEntry}
          invalidValueMessage={
            isCashAmountEntry
              ? 'Informe o valor recebido para continuar.'
              : global.t?.t('orders', 'message', 'enterValidAmount')
          }
          onChangeText={isCashAmountEntry ? handleCashReceivedInputChange : undefined}
          placeholder={
            isCashAmountEntry
              ? 'Ex.: 50,00'
              : global.t?.t('orders', 'placeholder', 'enterValue')
          }
          title={amountEntryTitle}
          value={isCashAmountEntry ? cashReceivedValue : undefined}
        />
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={paymentExplanationVisible}
        onRequestClose={() => setPaymentExplanationVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{paymentExplanationTitle}</Text>
            {paymentExplanationDescription.map(item => (
              <Text key={item} style={styles.modalSubtitle}>{item}</Text>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setPaymentExplanationVisible(false)}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                disabled={!selectedRemoteDevice?.deviceId}
                onPress={async () => {
                  setPaymentExplanationVisible(false);
                  await continueSelectedPayment();
                }}>
                <Text style={styles.primaryButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={installmentsModalVisible}
        onRequestClose={() => setInstallmentsModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Escolher parcelamento</Text>
            <Text style={styles.modalSubtitle}>
              Selecione em quantas parcelas o terminal deve processar o valor
              restante do pedido.
            </Text>
            {Array.from({length: 9}, (_, index) => index + 2).map(installments => (
              <TouchableOpacity
                key={String(installments)}
                style={styles.installmentsItem}
                activeOpacity={0.85}
                onPress={() => handleInstallmentsSelect(installments)}>
                <Text style={styles.installmentsText}>
                  {installments}x - {Formatter.formatMoney(remainingAmount / installments)}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setInstallmentsModalVisible(false)}>
              <Text style={styles.closeButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function RemoteDeviceOption({
  item,
  selectedRemoteDevice,
  setRemoteDeviceModalVisible,
  setSelectedRemoteDeviceId,
  submittingPayment,
}) {
  const active = item.deviceId === selectedRemoteDevice?.deviceId;
  return (
    <TouchableOpacity
      style={[styles.modalItem, active && styles.modalItemActive]}
      disabled={submittingPayment}
      onPress={() => {
        setSelectedRemoteDeviceId(item.deviceId);
        setRemoteDeviceModalVisible(false);
      }}>
      <Text style={styles.modalItemTitle}>{item.alias}</Text>
      <Text style={styles.modalItemSubtitle}>
        {getPaymentGatewayLabel(item.gateway)} - {item.deviceId}
      </Text>
    </TouchableOpacity>
  );
}
