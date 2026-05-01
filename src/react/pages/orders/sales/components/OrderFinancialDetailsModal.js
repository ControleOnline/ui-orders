import React from 'react'
import {Modal, ScrollView, Text, TouchableOpacity, View} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

import OrderIdentityLabel from '@controleonline/ui-orders/src/react/components/OrderIdentityLabel'

import useOrderDetailsVisuals from '../useOrderDetailsVisuals'

const OrderFinancialDetailsModal = ({
  visible = false,
  onClose,
  order = null,
  marketplace = null,
  title = '',
  content = null,
}) => {
  const insets = useSafeAreaInsets()
  const {styles, ppcColors} = useOrderDetailsVisuals()
  const modalBottomInset = Math.max(insets?.bottom || 0, 8)

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen">
      <View style={styles.modalSheetRoot}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalSheetBackdrop}
          onPress={onClose}
        />
        <View style={styles.modalSheetWrap}>
          <View
            style={[
              styles.detailsModal,
              {paddingBottom: 14 + modalBottomInset},
            ]}>
            <View style={styles.detailsModalHeader}>
              <View>
                <Text style={styles.detailsModalEyebrow}>
                  {title || global.t?.t('orders', 'title', 'payments') || 'Financeiro'}
                </Text>
                <OrderIdentityLabel
                  order={order}
                  remoteSummary={marketplace}
                  primaryTextStyle={styles.detailsModalTitle}
                  secondaryTextStyle={styles.detailsModalIdentitySecondary}
                  showSecondary={false}
                />
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.detailsModalCloseButton}>
                <Icon name="close" size={22} color={ppcColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.detailsModalScroll}
              contentContainerStyle={[
                styles.detailsModalScrollContent,
                {paddingBottom: 20 + modalBottomInset},
              ]}
              showsVerticalScrollIndicator={false}>
              <View style={styles.detailsTabContentWrap}>{content}</View>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default OrderFinancialDetailsModal
