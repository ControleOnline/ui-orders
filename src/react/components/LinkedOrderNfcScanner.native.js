import React, {useCallback, useEffect, useRef, useState} from 'react'
import {
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import NfcManager, {NfcTech} from 'react-native-nfc-manager'
import {extractLinkedOrderCodeFromNfcTag} from '@controleonline/ui-orders/src/react/utils/linkedOrderNfc'
import styles from '@controleonline/ui-orders/src/react/components/LinkedOrderCameraScanner.styles'

const IOS_NFC_TECHS = [
  NfcTech.Ndef,
  NfcTech.IsoDep,
  NfcTech.MifareIOS,
  NfcTech.Iso15693IOS,
  NfcTech.FelicaIOS,
]

const ANDROID_NFC_TECHS = [
  NfcTech.Ndef,
  NfcTech.NfcA,
  NfcTech.NfcB,
  NfcTech.NfcF,
  NfcTech.NfcV,
  NfcTech.IsoDep,
  NfcTech.MifareClassic,
  NfcTech.MifareUltralight,
]

const CANCELLED_ERROR_SNIPPETS = [
  'cancelled',
  'canceled',
  'cancel',
  'user cancel',
  'session closed',
]

const isCancelledError = error =>
  CANCELLED_ERROR_SNIPPETS.some(snippet =>
    String(error?.message || error || '')
      .trim()
      .toLowerCase()
      .includes(snippet),
  )

const LinkedOrderNfcScanner = ({
  busy = false,
  errorMessage = '',
  onCancel,
  onScan,
  visible = false,
}) => {
  const retryTimeoutRef = useRef(null)
  const activeSessionRef = useRef(false)
  const [sessionKey, setSessionKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [runtimeMessage, setRuntimeMessage] = useState('')
  const [canOpenSettings, setCanOpenSettings] = useState(false)

  const scheduleRetry = useCallback(() => {
    if (!visible) {
      return
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }

    retryTimeoutRef.current = setTimeout(() => {
      setSessionKey(currentKey => currentKey + 1)
    }, 260)
  }, [visible])

  useEffect(() => {
    if (!visible) {
      activeSessionRef.current = false
      setLoading(false)
      setRuntimeMessage('')
      setCanOpenSettings(false)
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      void NfcManager.cancelTechnologyRequest().catch(() => {})
      return
    }

    if (busy) {
      return
    }

    let cancelled = false

    const openNfcSession = async () => {
      activeSessionRef.current = true
      setLoading(true)
      setRuntimeMessage('')
      setCanOpenSettings(false)

      try {
        await NfcManager.start()

        const isSupported = await NfcManager.isSupported()
        if (!isSupported) {
          const unsupportedError = new Error(
            global.t?.t('orders', 'message', 'nfcUnavailableDescription'),
          )
          unsupportedError.skipRetry = true
          throw unsupportedError
        }

        const isEnabled = await NfcManager.isEnabled()
        if (!isEnabled) {
          setCanOpenSettings(Platform.OS === 'android')
          const disabledError = new Error(
            global.t?.t('orders', 'message', 'enableNfcToReadLinkedOrder'),
          )
          disabledError.skipRetry = true
          throw disabledError
        }

        await NfcManager.requestTechnology(
          Platform.OS === 'ios' ? IOS_NFC_TECHS : ANDROID_NFC_TECHS,
          {
            alertMessage:
              global.t?.t('orders', 'message', 'approachNfcTagToReadLinkedOrder'),
          },
        )

        const tag = await NfcManager.getTag()
        const extractedCode = extractLinkedOrderCodeFromNfcTag(tag)

        if (!extractedCode) {
          throw new Error(
            global.t?.t('orders', 'message', 'nfcTagWithoutReadableCode'),
          )
        }

        const accepted = await onScan?.(extractedCode)

        if (accepted !== true) {
          scheduleRetry()
        }
      } catch (error) {
        if (cancelled || !activeSessionRef.current || isCancelledError(error)) {
          return
        }

        setRuntimeMessage(
          error?.message ||
            global.t?.t('orders', 'message', 'nfcReadFailed'),
        )

        if (error?.skipRetry !== true) {
          scheduleRetry()
        }
      } finally {
        setLoading(false)
        void NfcManager.cancelTechnologyRequest().catch(() => {})
      }
    }

    void openNfcSession()

    return () => {
      cancelled = true
      activeSessionRef.current = false
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      void NfcManager.cancelTechnologyRequest().catch(() => {})
    }
  }, [busy, onScan, scheduleRetry, sessionKey, visible])

  const activeMessage = runtimeMessage || errorMessage

  return (
    <Modal
      animationType="slide"
      onRequestClose={onCancel}
      visible={visible}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {global.t?.t('orders', 'title', 'scanLinkedOrderNfc')}
          </Text>
          <Text style={styles.subtitle}>
            {global.t?.t('orders', 'message', 'scanLinkedOrderNfcHelp')}
          </Text>
        </View>

        <View style={styles.cameraWrap}>
          <View style={styles.centerState}>
            <Icon color="#7DD3FC" name="nfc" size={72} />
            <Text style={styles.centerStateTitle}>
              {global.t?.t('orders', 'title', 'waitingForNfcTag')}
            </Text>
            <Text style={styles.centerStateDescription}>
              {global.t?.t('orders', 'message', 'keepNfcTagNearReader')}
            </Text>
            {loading && (
              <Text style={styles.loadingText}>
                {global.t?.t('orders', 'message', 'waitingForNfcTagHelp')}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <View
            style={[
              styles.messageBox,
              activeMessage ? styles.messageBoxError : styles.messageBoxInfo,
            ]}>
            <Icon
              color={activeMessage ? '#FCA5A5' : '#7DD3FC'}
              name={activeMessage ? 'error-outline' : 'nfc'}
              size={20}
            />
            <Text style={styles.messageText}>
              {activeMessage ||
                global.t?.t('orders', 'message', 'nfcScannerReadyAwaitingTag')}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.88}
            onPress={onCancel}
            style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>
              {global.t?.t('orders', 'button', 'cancel')}
            </Text>
          </TouchableOpacity>

            {canOpenSettings && (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => {
                  void NfcManager.goToNfcSetting().catch(() => {})
                }}
                style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {global.t?.t('orders', 'button', 'openNfcSettings')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default LinkedOrderNfcScanner
