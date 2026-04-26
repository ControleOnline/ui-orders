import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import styles from './LinkedOrderEntrySheet.styles'

const INPUT_METHOD_MANUAL = 'manual'
const INPUT_METHOD_BARCODE = 'barcode'
const INPUT_METHOD_QRCODE = 'qrcode'
const INPUT_METHOD_NFC = 'nfc'

const NATIVE_PLATFORMS = new Set(['android', 'ios'])
const SCAN_IDLE_TIMEOUT_MS = 90
const SCAN_MIN_LENGTH = 4
const SCAN_MAX_TOTAL_MS = 700
const SCAN_MAX_AVERAGE_INTERVAL_MS = 70

const resolveOrderLabel = orderType => {
  if (String(orderType || '').trim().toLowerCase() === 'table') {
    return global.t?.t('orders', 'title', 'table') || 'Table'
  }

  return global.t?.t('orders', 'title', 'tab') || 'Tab'
}

const resolveInitialMethod = preferredInputType => {
  const normalized = String(preferredInputType || '').trim().toLowerCase()

  if (normalized === 'rfid' && NATIVE_PLATFORMS.has(Platform.OS)) {
    return INPUT_METHOD_NFC
  }

  if (normalized === INPUT_METHOD_QRCODE && NATIVE_PLATFORMS.has(Platform.OS)) {
    return INPUT_METHOD_QRCODE
  }

  return INPUT_METHOD_MANUAL
}

const isEditableTarget = target => {
  const tagName = String(target?.tagName || '')
    .trim()
    .toUpperCase()

  return (
    target?.isContentEditable === true ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  )
}

const looksLikeScannerInput = ({
  lastInputAt,
  scannedCode,
  startedAt,
  targetWasEditable = false,
}) => {
  if (!scannedCode || scannedCode.length < SCAN_MIN_LENGTH) {
    return false
  }

  const totalDuration = Math.max(lastInputAt - startedAt, 0)
  const averageInterval =
    scannedCode.length > 1 ? totalDuration / (scannedCode.length - 1) : totalDuration

  if (targetWasEditable) {
    return averageInterval <= SCAN_MAX_AVERAGE_INTERVAL_MS
  }

  return (
    totalDuration <= SCAN_MAX_TOTAL_MS ||
    averageInterval <= SCAN_MAX_AVERAGE_INTERVAL_MS
  )
}

const LinkedOrderEntrySheet = ({
  orderType = 'tab',
  preferredInputType = 'manual',
  visible = false,
  onCancel,
  onSubmit,
}) => {
  const inputRef = useRef(null)
  const bufferRef = useRef('')
  const startedAtRef = useRef(0)
  const lastInputAtRef = useRef(0)
  const finalizeTimeoutRef = useRef(null)
  const editableTargetRef = useRef(false)
  const isNativeRuntime = NATIVE_PLATFORMS.has(Platform.OS)
  const orderLabel = useMemo(() => resolveOrderLabel(orderType), [orderType])
  const [value, setValue] = useState('')
  const [inputMethod, setInputMethod] = useState(
    resolveInitialMethod(preferredInputType),
  )

  const clearScanBuffer = useCallback(() => {
    bufferRef.current = ''
    startedAtRef.current = 0
    lastInputAtRef.current = 0
    editableTargetRef.current = false

    if (finalizeTimeoutRef.current) {
      clearTimeout(finalizeTimeoutRef.current)
      finalizeTimeoutRef.current = null
    }
  }, [])

  const submitLinkedOrderCode = useCallback(
    ({externalCode, inputType}) => {
      const trimmedValue = String(externalCode || '').trim()

      if (!trimmedValue) {
        return
      }

      onSubmit?.({
        externalCode: trimmedValue,
        inputType,
      })
    },
    [onSubmit],
  )

  const finalizeBufferedScan = useCallback(() => {
    const scannedCode = String(bufferRef.current || '').trim()
    const startedAt = Number(startedAtRef.current || 0)
    const lastInputAt = Number(lastInputAtRef.current || 0)
    const targetWasEditable = editableTargetRef.current

    clearScanBuffer()

    if (
      !looksLikeScannerInput({
        lastInputAt,
        scannedCode,
        startedAt,
        targetWasEditable,
      })
    ) {
      return false
    }

    setValue(scannedCode)
    submitLinkedOrderCode({
      externalCode: scannedCode,
      inputType: INPUT_METHOD_BARCODE,
    })
    return true
  }, [clearScanBuffer, submitLinkedOrderCode])

  useEffect(() => {
    if (!visible) {
      setValue('')
      clearScanBuffer()
      return
    }

    setValue('')
    setInputMethod(resolveInitialMethod(preferredInputType))
    clearScanBuffer()
  }, [clearScanBuffer, preferredInputType, visible])

  useEffect(() => {
    if (!visible) {
      return
    }

    const timeoutId = setTimeout(() => {
      inputRef.current?.focus?.()
    }, 80)

    return () => clearTimeout(timeoutId)
  }, [inputMethod, visible])

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) {
      clearScanBuffer()
      return undefined
    }

    const scheduleFinalize = () => {
      if (finalizeTimeoutRef.current) {
        clearTimeout(finalizeTimeoutRef.current)
      }

      finalizeTimeoutRef.current = setTimeout(() => {
        finalizeBufferedScan()
      }, SCAN_IDLE_TIMEOUT_MS)
    }

    const handleKeyDown = event => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return
      }

      const key = String(event.key || '')
      const now = Date.now()

      if (key === 'Enter') {
        const shouldHandleEnter = looksLikeScannerInput({
          lastInputAt: Number(lastInputAtRef.current || 0),
          scannedCode: String(bufferRef.current || '').trim(),
          startedAt: Number(startedAtRef.current || 0),
          targetWasEditable: editableTargetRef.current,
        })

        if (shouldHandleEnter) {
          event.preventDefault()
          finalizeBufferedScan()
          return
        }

        clearScanBuffer()
        return
      }

      if (key.length !== 1) {
        return
      }

      if (lastInputAtRef.current && now - lastInputAtRef.current > SCAN_IDLE_TIMEOUT_MS) {
        clearScanBuffer()
      }

      if (!startedAtRef.current) {
        startedAtRef.current = now
      }

      editableTargetRef.current =
        editableTargetRef.current || isEditableTarget(event.target)
      bufferRef.current += key
      lastInputAtRef.current = now
      scheduleFinalize()
    }

    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      clearScanBuffer()
    }
  }, [clearScanBuffer, finalizeBufferedScan, visible])

  const methodOptions = useMemo(
    () =>
      [
        {
          available: true,
          description:
            global.t?.t('orders', 'message', 'linkedOrderManualEntryHelp') ||
            `Type the ${orderLabel.toLowerCase()} number manually.`,
          icon: 'keyboard',
          key: INPUT_METHOD_MANUAL,
          label: global.t?.t('orders', 'button', 'typeCode') || 'Type code',
        },
        {
          available: isNativeRuntime,
          description:
            global.t?.t('orders', 'message', 'linkedOrderQrEntryHelp') ||
            'Use the native QR Code reader when the app runs on a native device.',
          icon: 'qr-code',
          key: INPUT_METHOD_QRCODE,
          label: global.t?.t('orders', 'button', 'readQrCode') || 'QR Code',
        },
        {
          available: isNativeRuntime,
          description:
            global.t?.t('orders', 'message', 'linkedOrderNfcEntryHelp') ||
            'Use the native NFC reader when the app runs on a native device.',
          icon: 'nfc',
          key: INPUT_METHOD_NFC,
          label: global.t?.t('orders', 'button', 'readNfc') || 'NFC',
        },
      ].filter(option => option.available),
    [isNativeRuntime, orderLabel],
  )

  const currentMethod = useMemo(
    () =>
      methodOptions.find(option => option.key === inputMethod) ||
      methodOptions[0],
    [inputMethod, methodOptions],
  )

  const confirm = () => {
    clearScanBuffer()
    submitLinkedOrderCode({
      externalCode: value,
      inputType: inputMethod,
    })
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Icon name="fact-check" size={24} color="#0EA5E9" />
            </View>

            <View style={styles.headerContent}>
              <Text style={styles.title}>
                {global.t?.t('orders', 'title', 'identifyOrderBase') ||
                  `Identify ${orderLabel}`}
              </Text>
              <Text style={styles.description}>
                {global.t?.t('orders', 'message', 'linkedOrderEntryDescription') ||
                  `Identify the ${orderLabel.toLowerCase()} and continue the sale.`}
              </Text>
            </View>
          </View>

          {methodOptions.length > 1 && (
            <View style={styles.methodGrid}>
              {methodOptions.map(option => {
                const active = option.key === inputMethod

                return (
                  <TouchableOpacity
                    key={option.key}
                    activeOpacity={0.88}
                    onPress={() => setInputMethod(option.key)}
                    style={[
                      styles.methodButton,
                      active && styles.methodButtonActive,
                    ]}>
                    <Icon
                      color={active ? '#0EA5E9' : '#64748B'}
                      name={option.icon}
                      size={20}
                    />
                    <Text style={styles.methodLabel}>{option.label}</Text>
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
              {currentMethod?.key === INPUT_METHOD_MANUAL
                ? global.t?.t('orders', 'label', 'code') || 'Code'
                : currentMethod?.label}
            </Text>
            <TextInput
              ref={inputRef}
              autoCapitalize="none"
              autoCorrect={false}
              blurOnSubmit={false}
              keyboardType={
                currentMethod?.key === INPUT_METHOD_MANUAL ? 'number-pad' : 'default'
              }
              onChangeText={setValue}
              onSubmitEditing={confirm}
              placeholder={
                global.t?.t('orders', 'placeholder', 'linkedOrderCode') ||
                `${orderLabel} ${global.t?.t('orders', 'label', 'code') || 'code'}`
              }
              placeholderTextColor="#94A3B8"
              showSoftInputOnFocus={currentMethod?.key === INPUT_METHOD_MANUAL}
              style={styles.input}
              value={value}
            />
          </View>

          <View style={styles.helperCard}>
            <Text style={styles.helperTitle}>
              {currentMethod?.label ||
                (global.t?.t('orders', 'title', 'linkedOrder') || 'Linked order')}
            </Text>
            <Text style={styles.helperText}>
              {currentMethod?.key === INPUT_METHOD_QRCODE
                ? global.t?.t('orders', 'message', 'linkedOrderQrReaderHelper') ||
                  'Keep the field focused and use the native QR Code reader to send the value here.'
                : currentMethod?.key === INPUT_METHOD_NFC
                  ? global.t?.t('orders', 'message', 'linkedOrderNfcReaderHelper') ||
                    'Keep the field focused and use the native NFC reader to deliver the identifier.'
                  : global.t?.t('orders', 'message', 'linkedOrderManualHelper') ||
                      `Type the ${orderLabel.toLowerCase()} number or scan it with the attached barcode reader to continue.`}
            </Text>
          </View>

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
              disabled={!String(value || '').trim()}
              onPress={confirm}
              style={[
                styles.primaryButton,
                !String(value || '').trim() && styles.primaryButtonDisabled,
              ]}>
              <Text style={styles.primaryButtonText}>
                {global.t?.t('orders', 'button', 'confirm') || 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default LinkedOrderEntrySheet
