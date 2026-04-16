import React from 'react';
import {Modal, ScrollView, Text, TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import OrderFood99Summary from './OrderFood99Summary';
import OrderIfoodSummary from './OrderIfoodSummary';
import useOrderDetailsVisuals from '../useOrderDetailsVisuals';

// Order Summary concentra detalhes operacionais e integrações fora da tela principal do pedido.
const OrderSummaryModal = ({visible, onClose, summary}) => {
  const insets = useSafeAreaInsets();
  const {styles, ppcColors} = useOrderDetailsVisuals();
  const modalBottomInset = Math.max(insets?.bottom || 0, 8);

  if (!summary?.base) {
    return null;
  }

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
                  {global.t?.t('orders', 'title', 'orderSummary')}
                </Text>
                <Text style={styles.detailsModalTitle}>
                  {global.t?.t('orders', 'title', 'order')} #{summary.base.orderId}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.detailsModalCloseButton}>
                <Icon name="close" size={22} color={ppcColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {!!summary.primaryAction && (
              <TouchableOpacity
                onPress={summary.primaryAction.onPress}
                disabled={summary.primaryAction.disabled}
                style={[
                  styles.detailsMarkPaidButton,
                  summary.primaryAction.disabled &&
                    styles.kdsActionButtonDisabled,
                ]}>
                {summary.primaryAction.content}
              </TouchableOpacity>
            )}

            <ScrollView
              style={styles.detailsModalScroll}
              contentContainerStyle={[
                styles.detailsModalScrollContent,
                {paddingBottom: 20 + modalBottomInset},
              ]}
              showsVerticalScrollIndicator={false}>
              <View style={styles.detailsGrid}>
                {summary.base.cards.map(card => (
                  <View key={card.key} style={styles.detailsCard}>
                    <Text style={styles.detailsCardLabel}>{card.label}</Text>
                    <Text style={styles.detailsCardValue}>{card.value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>
                  {global.t?.t('orders', 'title', 'orderData')}
                </Text>
                {summary.base.lines.map(line => (
                  <Text key={line.key} style={styles.detailsInfoText}>
                    {line.label}: {line.value}
                  </Text>
                ))}
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>
                  {summary.base.invoicesTitle}
                </Text>
                {summary.base.invoiceCardsNode}
              </View>

              {summary.marketplace?.isIfood ? (
                <OrderIfoodSummary marketplace={summary.marketplace} />
              ) : null}

              {summary.marketplace?.isFood99 ? (
                <OrderFood99Summary marketplace={summary.marketplace} />
              ) : null}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default OrderSummaryModal;
