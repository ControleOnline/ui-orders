import React from 'react'
import {Modal, Text, TouchableOpacity, View} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import styles from '@controleonline/ui-orders/src/react/components/LinkedOrderCameraScanner.styles'

const LinkedOrderNfcScanner = ({
  errorMessage = '',
  onCancel,
  visible = false,
}) => (
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
          {global.t?.t('orders', 'message', 'nfcUnavailableOnThisPlatform')}
        </Text>
      </View>

      <View style={styles.cameraWrap}>
        <View style={styles.centerState}>
          <Icon color="#7DD3FC" name="nfc" size={72} />
          <Text style={styles.centerStateTitle}>
            {global.t?.t('orders', 'title', 'nfcUnavailable')}
          </Text>
          <Text style={styles.centerStateDescription}>
            {errorMessage || global.t?.t('orders', 'message', 'nfcUnavailableOnThisPlatform')}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={[styles.messageBox, styles.messageBoxError]}>
          <Icon color="#FCA5A5" name="error-outline" size={20} />
          <Text style={styles.messageText}>
            {errorMessage || global.t?.t('orders', 'message', 'nfcUnavailableOnThisPlatform')}
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
        </View>
      </View>
    </View>
  </Modal>
)

export default LinkedOrderNfcScanner
