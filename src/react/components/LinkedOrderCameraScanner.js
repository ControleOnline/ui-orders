import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import {CameraView, useCameraPermissions} from 'expo-camera'
import Icon from 'react-native-vector-icons/MaterialIcons'
import {resolveLinkedOrderLabel} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'
import {
  LINKED_ORDER_CAMERA_BARCODE_TYPES,
  LINKED_ORDER_INPUT_METHOD_BARCODE,
} from '@controleonline/ui-orders/src/react/utils/linkedOrderEntry'
import styles from './LinkedOrderCameraScanner.styles'

const LinkedOrderCameraScanner = ({
  busy = false,
  errorMessage = '',
  inputType = LINKED_ORDER_INPUT_METHOD_BARCODE,
  onCancel,
  onScan,
  orderType = 'tab',
  visible = false,
}) => {
  const [permission, requestPermission] = useCameraPermissions()
  const [mountErrorMessage, setMountErrorMessage] = useState('')
  const [locked, setLocked] = useState(false)
  const orderLabel = useMemo(() => resolveLinkedOrderLabel(orderType), [orderType])
  const isBarcodeScanner = inputType === LINKED_ORDER_INPUT_METHOD_BARCODE

  useEffect(() => {
    if (!visible) {
      setLocked(false)
      setMountErrorMessage('')
      return
    }

    if (permission?.granted || permission?.canAskAgain === false) {
      return
    }

    void requestPermission()
  }, [permission?.canAskAgain, permission?.granted, requestPermission, visible])

  useEffect(() => {
    if (!busy) {
      setLocked(false)
    }
  }, [busy])

  const handleBarcodeScanned = useCallback(
    async result => {
      if (locked || busy) {
        return
      }

      const scannedCode = String(result?.data || '').trim()

      if (!scannedCode) {
        return
      }

      setLocked(true)

      try {
        const accepted = await onScan?.(scannedCode)

        if (accepted !== true) {
          setLocked(false)
        }
      } catch {
        setLocked(false)
      }
    },
    [busy, locked, onScan],
  )

  const renderPermissionFallback = () => {
    if (permission === null) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color="#38BDF8" size="large" />
          <Text style={styles.loadingText}>
            {global.t?.t('orders', 'message', 'preparingCamera') ||
              'Preparando a camera...'}
          </Text>
        </View>
      )
    }

    return (
      <View style={styles.centerState}>
        <Icon color="#F8FAFC" name="camera-alt" size={48} />
        <Text style={styles.centerStateTitle}>
          {global.t?.t('orders', 'title', 'cameraPermissionRequired') ||
            'Permita o uso da camera'}
        </Text>
        <Text style={styles.centerStateDescription}>
          {global.t?.t('orders', 'message', 'cameraPermissionRequired') ||
            'A leitura de codigo de barras e QR Code precisa da camera do dispositivo.'}
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onCancel}
            style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>
              {global.t?.t('orders', 'button', 'cancel') || 'Cancelar'}
            </Text>
          </TouchableOpacity>

          {permission?.canAskAgain !== false && (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => void requestPermission()}
              style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {global.t?.t('orders', 'button', 'allowCamera') ||
                  'Permitir camera'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  const activeMessage = mountErrorMessage || errorMessage

  return (
    <Modal
      animationType="slide"
      onRequestClose={onCancel}
      visible={visible}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {global.t?.t('orders', 'title', 'scanLinkedOrderCode') ||
              `Ler ${orderLabel.toLowerCase()}`}
          </Text>
          <Text style={styles.subtitle}>
            {global.t?.t('orders', 'message', 'scanLinkedOrderCodeHelp') ||
              'Aponte a camera para o codigo e aguarde a leitura automatica.'}
          </Text>
        </View>

        <View style={styles.cameraWrap}>
          {permission?.granted ? (
            <>
              <CameraView
                active={visible}
                barcodeScannerEnabled={isBarcodeScanner}
                barcodeScannerSettings={{
                  barcodeTypes: LINKED_ORDER_CAMERA_BARCODE_TYPES,
                }}
                facing="back"
                onBarcodeScanned={handleBarcodeScanned}
                onMountError={event =>
                  setMountErrorMessage(
                    event?.message ||
                      global.t?.t('orders', 'message', 'cameraUnavailable') ||
                      'Nao foi possivel iniciar a camera deste dispositivo.',
                  )
                }
                style={styles.camera}
              />

              <View pointerEvents="none" style={styles.overlay}>
                <View style={styles.guideFrame} />
                <View style={styles.guideTextWrap}>
                  <Text style={styles.guideText}>
                    {global.t?.t('orders', 'message', 'alignBarcodeOrQrCode') ||
                      `Alinhe o codigo de barras ou QR Code da ${orderLabel.toLowerCase()}.`}
                  </Text>
                </View>
              </View>

              {busy && (
                <View style={styles.busyOverlay}>
                  <ActivityIndicator color="#38BDF8" size="large" />
                </View>
              )}
            </>
          ) : (
            renderPermissionFallback()
          )}
        </View>

        <View style={styles.footer}>
          <View
            style={[
              styles.messageBox,
              activeMessage ? styles.messageBoxError : styles.messageBoxInfo,
            ]}>
            <Icon
              color={activeMessage ? '#FCA5A5' : '#7DD3FC'}
              name={activeMessage ? 'error-outline' : 'qr-code-scanner'}
              size={20}
            />
            <Text style={styles.messageText}>
              {activeMessage ||
                global.t?.t('orders', 'message', 'scannerReadyAwaitingCode') ||
                  'Aguardando a leitura do codigo correto.'}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={onCancel}
              style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>
                {global.t?.t('orders', 'button', 'cancel') || 'Cancelar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default LinkedOrderCameraScanner
