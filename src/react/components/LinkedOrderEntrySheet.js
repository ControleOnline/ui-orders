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
import LinkedOrderCameraScanner from '@controleonline/ui-orders/src/react/components/LinkedOrderCameraScanner'
import LinkedOrderNfcScanner from '@controleonline/ui-orders/src/react/components/LinkedOrderNfcScanner'
import {
  LINKED_ORDER_INPUT_METHOD_BARCODE,
  LINKED_ORDER_INPUT_METHOD_MANUAL,
  LINKED_ORDER_INPUT_METHOD_NFC,
  normalizeLinkedOrderInputType,
  resolveLinkedOrderInputMethod,
  shouldUseLinkedOrderCameraScanner,
  shouldUseLinkedOrderNativeScanner,
  shouldUseLinkedOrderNfcScanner,
} from '@controleonline/ui-orders/src/react/utils/linkedOrderEntry'
import styles from './LinkedOrderEntrySheet.styles'

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
  validateInput,
}) => {
  const inputRef = useRef(null)
  const bufferRef = useRef('')
  const startedAtRef = useRef(0)
  const lastInputAtRef = useRef(0)
  const finalizeTimeoutRef = useRef(null)
  const editableTargetRef = useRef(false)
  const hasAutoOpenedScannerRef = useRef(false)
  const isNativeRuntime = NATIVE_PLATFORMS.has(Platform.OS)
  const orderLabel = useMemo(() => resolveOrderLabel(orderType), [orderType])
  const [value, setValue] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scannerVisible, setScannerVisible] = useState(false)
  const [inputMethod, setInputMethod] = useState(
    resolveLinkedOrderInputMethod({preferredInputType, isNativeRuntime}),
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
    async ({
      externalCode,
      inputType,
      source = LINKED_ORDER_INPUT_METHOD_MANUAL,
    }) => {
      const trimmedValue = String(externalCode || '').trim()

      if (!trimmedValue) {
        setFeedbackMessage(
          global.t?.t('orders', 'message', 'linkedOrderCodeRequired') ||
            `Informe o codigo da ${orderLabel.toLowerCase()} para continuar.`,
        )
        return false
      }

      setValue(trimmedValue)
      setFeedbackMessage('')
      setIsSubmitting(true)

      try {
        const payload = {
          externalCode: trimmedValue,
          inputType: normalizeLinkedOrderInputType(inputType),
        }
        const validatedInput =
          typeof validateInput === 'function'
            ? await validateInput(payload)
            : payload

        await onSubmit?.(validatedInput || payload)
        return true
      } catch (error) {
        setFeedbackMessage(
          error?.message ||
            global.t?.t('orders', 'message', 'linkedOrderInvalidCode') ||
            `Nao foi possivel identificar a ${orderLabel.toLowerCase()} informada.`,
        )

        if (source === LINKED_ORDER_INPUT_METHOD_MANUAL) {
          inputRef.current?.focus?.()
        }

        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [onSubmit, orderLabel, validateInput],
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
    void submitLinkedOrderCode({
      externalCode: scannedCode,
      inputType: LINKED_ORDER_INPUT_METHOD_BARCODE,
    })
    return true
  }, [clearScanBuffer, submitLinkedOrderCode])

  useEffect(() => {
    if (!visible) {
      setValue('')
      setFeedbackMessage('')
      setIsSubmitting(false)
      setScannerVisible(false)
      hasAutoOpenedScannerRef.current = false
      clearScanBuffer()
      return
    }

    setValue('')
    setFeedbackMessage('')
    setIsSubmitting(false)
    setScannerVisible(false)
    hasAutoOpenedScannerRef.current = false
    setInputMethod(
      resolveLinkedOrderInputMethod({preferredInputType, isNativeRuntime}),
    )
    clearScanBuffer()
  }, [clearScanBuffer, isNativeRuntime, preferredInputType, visible])

  useEffect(() => {
    if (
      !visible ||
      !shouldUseLinkedOrderNativeScanner({inputMethod, isNativeRuntime}) ||
      hasAutoOpenedScannerRef.current
    ) {
      return
    }

    hasAutoOpenedScannerRef.current = true
    setScannerVisible(true)
  }, [inputMethod, isNativeRuntime, visible])

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
          key: LINKED_ORDER_INPUT_METHOD_MANUAL,
          label: global.t?.t('orders', 'button', 'typeCode') || 'Type code',
        },
        {
          available: isNativeRuntime,
          description:
            global.t?.t('orders', 'message', 'linkedOrderBarcodeEntryHelp') ||
            'Use a camera do dispositivo para ler o codigo de barras ou QR Code.',
          icon: 'qr-code-scanner',
          key: LINKED_ORDER_INPUT_METHOD_BARCODE,
          label:
            global.t?.t('orders', 'button', 'readBarcodeQrCode') ||
            'Ler codigo de barras / QR Code',
        },
        {
          available: isNativeRuntime,
          description:
            global.t?.t('orders', 'message', 'linkedOrderNfcEntryHelp') ||
            'Use the native NFC reader when the app runs on a native device.',
          icon: 'nfc',
          key: LINKED_ORDER_INPUT_METHOD_NFC,
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

  const handleSelectMethod = useCallback(
    nextMethod => {
      setInputMethod(nextMethod)
      setFeedbackMessage('')

      if (shouldUseLinkedOrderNativeScanner({inputMethod: nextMethod, isNativeRuntime})) {
        hasAutoOpenedScannerRef.current = true
        setScannerVisible(true)
      }
    },
    [isNativeRuntime],
  )

  const confirm = () => {
    clearScanBuffer()
    void submitLinkedOrderCode({
      externalCode: value,
      inputType: inputMethod,
    })
  }

  const handleCameraScan = useCallback(
    scannedCode =>
      submitLinkedOrderCode({
        externalCode: scannedCode,
        inputType: LINKED_ORDER_INPUT_METHOD_BARCODE,
        source: LINKED_ORDER_INPUT_METHOD_BARCODE,
      }),
    [submitLinkedOrderCode],
  )

  return (
    <Modal
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

              <Text style={styles.title}>
                {global.t?.t('orders', 'title', 'identifyOrderBase') ||
                  `Identify ${orderLabel}`}
              </Text>
            </View>

            <Text style={styles.description}>
              {global.t?.t('orders', 'message', 'linkedOrderEntryDescription') ||
                `Identify the ${orderLabel.toLowerCase()} and continue the sale.`}
            </Text>
          </View>

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
    </Modal>
  )
}

export default LinkedOrderEntrySheet
