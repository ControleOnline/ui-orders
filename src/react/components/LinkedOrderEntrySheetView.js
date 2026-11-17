import React from 'react';
import {Modal, Text, TextInput, TouchableOpacity, View} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import LinkedOrderCameraScanner from "@controleonline/ui-orders/src/react/components/LinkedOrderCameraScanner";
import LinkedOrderNfcScanner from "@controleonline/ui-orders/src/react/components/LinkedOrderNfcScanner";
import {LINKED_ORDER_INPUT_METHOD_MANUAL, LINKED_ORDER_INPUT_METHOD_NFC, shouldUseLinkedOrderCameraScanner, shouldUseLinkedOrderNfcScanner} from "@controleonline/ui-orders/src/react/utils/linkedOrderEntry";
import styles from "./LinkedOrderEntrySheet.styles";

export default function LinkedOrderEntrySheetView({onCancel, visible, orderLabel, setConfigurationVisible, configurationVisible, operationInfo, methodOptions, inputMethod, handleSelectMethod, currentMethod, inputRef, isSubmitting, setValue, confirm, value, feedbackMessage, setScannerVisible, handleCameraScan, orderType, scannerVisible, isNativeRuntime, submitLinkedOrderCode}) {
  return (<Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerIcon}>
                <Icon name="fact-check" size={24} color="#0EA5E9" />
              </View>

              <View style={styles.titleRow}>
                <Text style={styles.title}>
                  {global.t?.t('orders', 'title', 'identifyOrderBase') ||
                    `Identify ${orderLabel}`}
                </Text>
                <TouchableOpacity
                  accessibilityLabel="Ver configuração da operação"
                  onPress={() => setConfigurationVisible(value => !value)}
                  style={styles.configurationButton}>
                  <Icon color="#2563EB" name="info-outline" size={20} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.description}>
              {global.t?.t('orders', 'message', 'linkedOrderEntryDescription') ||
                `Identify the ${orderLabel.toLowerCase()} and continue the sale.`}
            </Text>
          </View>

          {configurationVisible ? (
            <View style={styles.configurationBox}>
              <Text style={styles.configurationTitle}>Configuração do PDV</Text>
              {operationInfo.map(row => (
                <View key={row.key} style={styles.configurationRow}>
                  <Text style={styles.configurationLabel}>{row.label}</Text>
                  <Text style={styles.configurationValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {methodOptions.length > 1 && (
            <View style={styles.methodGrid}>
              {methodOptions.map(option => {
                const active = option.key === inputMethod

                return (
                  <TouchableOpacity
                    key={option.key}
                    activeOpacity={0.88}
                    onPress={() => handleSelectMethod(option.key)}
                    style={[
                      styles.methodButton,
                      active && styles.methodButtonActive,
                    ]}>
                    <View style={styles.methodHeader}>
                      <Icon
                        color={active ? '#0EA5E9' : '#64748B'}
                        name={option.icon}
                        size={20}
                      />
                      <Text style={styles.methodLabel}>{option.label}</Text>
                    </View>
                    <Text style={styles.methodDescription}>
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {currentMethod?.key === LINKED_ORDER_INPUT_METHOD_MANUAL
                ? global.t?.t('orders', 'label', 'code') || 'Code'
                : currentMethod?.label}
            </Text>
            <TextInput
              ref={inputRef}
              autoCapitalize="none"
              autoCorrect={false}
              blurOnSubmit={false}
              editable={!isSubmitting}
              keyboardType={
                currentMethod?.key === LINKED_ORDER_INPUT_METHOD_MANUAL
                  ? 'number-pad'
                  : 'default'
              }
              onChangeText={setValue}
              onSubmitEditing={confirm}
              placeholder={
                global.t?.t('orders', 'placeholder', 'linkedOrderCode') ||
                `${orderLabel} ${global.t?.t('orders', 'label', 'code') || 'code'}`
              }
              placeholderTextColor="#94A3B8"
              showSoftInputOnFocus={
                currentMethod?.key === LINKED_ORDER_INPUT_METHOD_MANUAL
              }
              style={[styles.input, isSubmitting && styles.inputDisabled]}
              value={value}
            />
          </View>

          {feedbackMessage ? (
            <View style={styles.feedbackBox}>
              <Icon color="#DC2626" name="error-outline" size={18} />
              <Text style={styles.feedbackText}>{feedbackMessage}</Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={onCancel}
              style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>
                {global.t?.t('orders', 'button', 'cancel') || 'Cancel'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              disabled={isSubmitting || !String(value || '').trim()}
              onPress={confirm}
              style={[
                styles.primaryButton,
                (isSubmitting || !String(value || '').trim()) &&
                  styles.primaryButtonDisabled,
              ]}>
              <Text style={styles.primaryButtonText}>
                {global.t?.t('orders', 'button', 'confirm') || 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <LinkedOrderCameraScanner
        busy={isSubmitting}
        errorMessage={feedbackMessage}
        inputType={inputMethod}
        onCancel={() => setScannerVisible(false)}
        onScan={handleCameraScan}
        orderType={orderType}
        visible={
          scannerVisible &&
          shouldUseLinkedOrderCameraScanner({inputMethod, isNativeRuntime})
        }
      />

      <LinkedOrderNfcScanner
        busy={isSubmitting}
        errorMessage={feedbackMessage}
        onCancel={() => setScannerVisible(false)}
        onScan={scannedCode =>
          submitLinkedOrderCode({
            externalCode: scannedCode,
            inputType: LINKED_ORDER_INPUT_METHOD_NFC,
            source: LINKED_ORDER_INPUT_METHOD_NFC,
          })
        }
        orderType={orderType}
        visible={
          scannerVisible &&
          shouldUseLinkedOrderNfcScanner({inputMethod, isNativeRuntime})
        }
      />
    </Modal>);
}
