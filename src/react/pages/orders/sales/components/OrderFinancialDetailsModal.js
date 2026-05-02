import React from 'react'
import {Modal, ScrollView, TouchableOpacity, View} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader'

import useOrderDetailsVisuals from '../useOrderDetailsVisuals'

const OrderFinancialDetailsModal = ({
  visible = false,
  onClose,
  order = null,
  isKds = false,
  orderHeaderProps = {},
  content = null,
}) => {
  const insets = useSafeAreaInsets()
  const {styles, ppcColors} = useOrderDetailsVisuals()
  const modalTopInset = Math.max(insets?.top || 0, 10)
  const modalBottomInset = Math.max(insets?.bottom || 0, 8)

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen">
      <View style={[styles.modalSheetRoot, {paddingTop: 0}]}>
        <View style={styles.modalSheetFullscreenWrap}>
          <View
            style={[
              styles.detailsModalFullscreen,
              {
                paddingTop: 14 + modalTopInset,
                paddingBottom: 14 + modalBottomInset,
              },
            ]}>
            <View style={styles.detailsModalFullscreenHeader}>
              <View style={styles.detailsModalFullscreenHeaderContent}>
                <OrderHeader
                  order={order}
                  isKds={isKds}
                  {...orderHeaderProps}
                />
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.detailsModalCloseButton}>
                <Icon name="close" size={22} color={ppcColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.detailsModalFullscreenScroll}
              contentContainerStyle={[
                styles.detailsModalFullscreenScrollContent,
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
