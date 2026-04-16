import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import useOrderDetailsVisuals from '../useOrderDetailsVisuals';

const OrderMarketplaceOverlayHost = ({marketplace}) => {
  const insets = useSafeAreaInsets();
  const {styles, ppcColors} = useOrderDetailsVisuals();
  const modalBottomInset = Math.max(insets?.bottom || 0, 8);

  if (!marketplace?.enabled) {
    return null;
  }

  const cancelFlow = marketplace.cancelFlow;
  const deliveryFlow = marketplace.deliveryFlow;
  const cancelLoading =
    cancelFlow?.actionLoading === 'cancel' || cancelFlow?.reasonsLoading;
  const deliverySubmitLoading =
    deliveryFlow?.actionLoading === 'locator_verify' ||
    deliveryFlow?.actionLoading === 'delivered';

  return (
    <>
      <Modal
        transparent
        animationType="fade"
        visible={!!cancelFlow?.visible}
        onRequestClose={() => {
          if (!cancelLoading) {
            cancelFlow?.onClose?.();
          }
        }}>
        <View style={styles.modalSheetRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalSheetBackdrop}
            onPress={() => {
              if (!cancelLoading) {
                cancelFlow?.onClose?.();
              }
            }}
          />
          <View style={styles.modalSheetWrap}>
            <View style={styles.cancelReasonModal}>
              <Text style={styles.cancelReasonBadge}>
                {global.t?.t('orders', 'title', 'cancellation')}{' '}
                {cancelFlow?.channelLabel}
              </Text>
              <Text style={styles.cancelReasonTitle}>
                {global.t?.t('orders', 'title', 'chooseOfficialReason')}
              </Text>
              <Text style={styles.cancelReasonDescription}>
                {global.t?.t('orders', 'message', 'selectOfficialReasonFor')}{' '}
                {cancelFlow?.channelLabel}.
              </Text>

              {cancelFlow?.reasonsLoading ? (
                <View style={styles.cancelReasonLoadingState}>
                  <ActivityIndicator size="small" color="#38BDF8" />
                  <Text style={styles.cancelReasonLoadingText}>
                    {global.t?.t('orders', 'message', 'loadingOfficialReasons')}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.cancelReasonList}
                  contentContainerStyle={styles.cancelReasonListContent}
                  showsVerticalScrollIndicator={false}>
                  {cancelFlow?.reasons?.map(reason => {
                    const reasonId = String(reason?.reason_id || '');
                    const isSelected =
                      String(cancelFlow?.selectedReasonId || '') === reasonId;

                    return (
                      <TouchableOpacity
                        key={`marketplace-cancel-reason-${reasonId || 'unknown'}`}
                        onPress={() => cancelFlow?.onSelectReason?.(reasonId)}
                        style={[
                          styles.cancelReasonOption,
                          isSelected && styles.cancelReasonOptionSelected,
                        ]}>
                        <View style={styles.cancelReasonOptionHeader}>
                          <Text style={styles.cancelReasonOptionCode}>
                            #{reason?.reason_id || '--'}
                          </Text>
                          {reason?.requires_description ? (
                            <Text style={styles.cancelReasonOptionBadge}>
                              {global.t?.t(
                                'orders',
                                'label',
                                'requiresDescription',
                              )}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={styles.cancelReasonOptionText}>
                          {reason?.description ||
                            global.t?.t(
                              'orders',
                              'message',
                              'reasonWithoutDescription',
                            )}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {cancelFlow?.requiresReasonText ? (
                <View style={styles.cancelReasonInputBlock}>
                  <Text style={styles.cancelReasonInputLabel}>
                    {global.t?.t('orders', 'label', 'reasonDescription')}
                  </Text>
                  <TextInput
                    value={cancelFlow?.reasonText}
                    onChangeText={cancelFlow?.onChangeReasonText}
                    editable={!cancelLoading}
                    multiline
                    numberOfLines={3}
                    placeholder={global.t?.t(
                      'orders',
                      'placeholder',
                      'explainCancellationReason',
                    )}
                    placeholderTextColor={ppcColors.textSecondary}
                    style={styles.cancelReasonInput}
                  />
                </View>
              ) : null}

              <View style={styles.deliveryCodeActions}>
                <TouchableOpacity
                  onPress={cancelFlow?.onClose}
                  disabled={cancelLoading}
                  style={[
                    styles.deliveryCodeButton,
                    styles.deliveryCodeButtonSecondary,
                  ]}>
                  <Text style={styles.deliveryCodeButtonSecondaryText}>
                    {global.t?.t('orders', 'button', 'close')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={cancelFlow?.onSubmit}
                  disabled={
                    cancelLoading || !String(cancelFlow?.selectedReasonId || '')
                  }
                  style={[
                    styles.deliveryCodeButton,
                    styles.cancelReasonButtonDanger,
                    (cancelLoading || !String(cancelFlow?.selectedReasonId || '')) &&
                      styles.kdsActionButtonDisabled,
                  ]}>
                  {cancelFlow?.actionLoading === 'cancel' ? (
                    <ActivityIndicator size="small" color="#F8FAFC" />
                  ) : (
                    <Text style={styles.deliveryCodeButtonPrimaryText}>
                      {global.t?.t('orders', 'button', 'cancelOrder')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="slide"
        visible={!!deliveryFlow?.visible}
        onRequestClose={() => {
          if (!deliveryFlow?.actionLoading) {
            deliveryFlow?.onClose?.();
          }
        }}
        statusBarTranslucent
        presentationStyle="overFullScreen">
        <View style={styles.modalSheetRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalSheetBackdrop}
            onPress={() => {
              if (!deliveryFlow?.actionLoading) {
                deliveryFlow?.onClose?.();
              }
            }}
          />
          <View style={styles.modalSheetWrap}>
            <View
              style={[
                styles.deliveryCodeModal,
                {paddingBottom: 14 + modalBottomInset},
              ]}>
              <View style={styles.deliveryCodeHeader}>
                <Text style={styles.deliveryCodeStepBadge}>
                  {deliveryFlow?.isHandoverFlow
                    ? global.t?.t('orders', 'title', 'ifoodFlow')
                    : deliveryFlow?.step === 'locator'
                      ? global.t?.t('orders', 'title', 'stepOneOfTwo')
                      : global.t?.t('orders', 'title', 'stepTwoOfTwo')}
                </Text>
                <TouchableOpacity
                  onPress={deliveryFlow?.onClose}
                  disabled={!!deliveryFlow?.actionLoading}
                  style={styles.deliveryCodeCloseButton}>
                  <Icon name="close" size={22} color={ppcColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.deliveryCodeModalTitle}>
                {deliveryFlow?.isHandoverFlow
                  ? global.t?.t('orders', 'title', 'ifoodOwnDelivery')
                  : global.t?.t('orders', 'title', 'complete99FoodDelivery')}
              </Text>

              <ScrollView
                style={styles.deliveryCodeScroll}
                contentContainerStyle={styles.deliveryCodeScrollContent}
                showsVerticalScrollIndicator={false}>
                <Text style={styles.deliveryCodeDescription}>
                  {deliveryFlow?.isHandoverFlow
                    ? global.t?.t(
                        'orders',
                        'message',
                        'useLocatorAndOfficialIfoodLink',
                      )
                    : deliveryFlow?.step === 'locator'
                      ? global.t?.t(
                          'orders',
                          'message',
                          'confirmOfficial99FoodLocatorAndShareLink',
                        )
                      : global.t?.t(
                          'orders',
                          'message',
                          'enterCustomerConfirmationCodeToFinishDelivery',
                        )}
                </Text>

                <View style={styles.deliveryLocatorHero}>
                  <Text style={styles.deliveryCodeMetaLabel}>
                    {deliveryFlow?.isHandoverFlow
                      ? global.t?.t('orders', 'label', 'ifoodLocator')
                      : global.t?.t('orders', 'label', 'food99Locator')}
                  </Text>
                  <Text style={styles.deliveryLocatorHeroValue}>
                    {deliveryFlow?.locator ||
                      global.t?.t('orders', 'label', 'notInformed')}
                  </Text>
                  <Text style={styles.deliveryLocatorHeroHelper}>
                    {deliveryFlow?.isHandoverFlow
                      ? deliveryFlow?.remoteLocator
                        ? global.t?.t(
                            'orders',
                            'message',
                            'shareThisLocatorWithCourierIfood',
                          )
                        : global.t?.t(
                            'orders',
                            'message',
                            'noLocatorInPayloadUseSupportIdIfood',
                          )
                      : deliveryFlow?.remoteLocator
                        ? global.t?.t(
                            'orders',
                            'message',
                            'shareThisLocatorWithCourier99',
                          )
                        : global.t?.t(
                            'orders',
                            'message',
                            'if99DoesNotSendLocatorUseReceiptNumber',
                          )}
                  </Text>

                  {!!deliveryFlow?.locator && (
                    <TouchableOpacity
                      onPress={deliveryFlow?.onCopyLocator}
                      disabled={!!deliveryFlow?.actionLoading}
                      style={styles.deliveryLinkPrimaryButton}>
                      <Text style={styles.deliveryLinkPrimaryButtonText}>
                        {global.t?.t('orders', 'button', 'copyLocator')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {!!deliveryFlow?.handoverLink && (
                  <View style={styles.deliveryLinkCard}>
                    <Text style={styles.deliveryCodeMetaLabel}>
                      {global.t?.t('orders', 'label', 'confirmationLink')}
                    </Text>
                    <Text style={styles.deliveryLinkUrl} selectable>
                      {deliveryFlow?.handoverLink}
                    </Text>
                    <View style={styles.deliveryLinkActions}>
                      <TouchableOpacity
                        onPress={deliveryFlow?.onOpenLink}
                        disabled={!!deliveryFlow?.actionLoading}
                        style={styles.deliveryLinkActionButton}>
                        <Text style={styles.deliveryLinkActionText}>
                          {global.t?.t('orders', 'button', 'openLink')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={deliveryFlow?.onCopyLink}
                        disabled={!!deliveryFlow?.actionLoading}
                        style={styles.deliveryLinkActionButton}>
                        <Text style={styles.deliveryLinkActionText}>
                          {global.t?.t('orders', 'button', 'copyLink')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={deliveryFlow?.onShareWhatsapp}
                        disabled={!!deliveryFlow?.actionLoading}
                        style={styles.deliveryLinkActionButton}>
                        <Text style={styles.deliveryLinkActionText}>
                          {global.t?.t('orders', 'button', 'sendViaWhatsApp')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {deliveryFlow?.isIfood ? null : (
                  <>
                    {(!!deliveryFlow?.pickupCode || !!deliveryFlow?.handoverCode) && (
                      <View style={styles.deliveryCodeMetaRow}>
                        {!!deliveryFlow?.pickupCode && (
                          <View style={styles.deliveryCodeMetaCardCompact}>
                            <Text style={styles.deliveryCodeMetaLabel}>
                              {global.t?.t('orders', 'label', 'pickupCode')}
                            </Text>
                            <Text style={styles.deliveryCodeMetaValueCompact}>
                              {deliveryFlow?.pickupCode}
                            </Text>
                          </View>
                        )}

                        {!!deliveryFlow?.handoverCode &&
                        deliveryFlow?.handoverCode !== deliveryFlow?.pickupCode ? (
                          <View style={styles.deliveryCodeMetaCardCompact}>
                            <Text style={styles.deliveryCodeMetaLabel}>
                              {global.t?.t('orders', 'label', 'handoverCode')}
                            </Text>
                            <Text style={styles.deliveryCodeMetaValueCompact}>
                              {deliveryFlow?.handoverCode}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    )}

                    <Text style={styles.deliveryCodeTitle}>
                      {deliveryFlow?.step === 'locator'
                        ? global.t?.t('orders', 'title', 'validateLocator')
                        : global.t?.t('orders', 'title', 'confirmCustomerCode')}
                    </Text>

                    <TextInput
                      value={
                        deliveryFlow?.step === 'locator'
                          ? deliveryFlow?.locator
                          : deliveryFlow?.confirmationCode
                      }
                      onChangeText={value => {
                        if (deliveryFlow?.step === 'locator') {
                          deliveryFlow?.onChangeLocator?.(value);
                        } else {
                          deliveryFlow?.onChangeConfirmationCode?.(value);
                        }
                      }}
                      placeholder={
                        deliveryFlow?.step === 'locator' ? '00000000' : '0000'
                      }
                      placeholderTextColor={ppcColors.textSecondary}
                      keyboardType="number-pad"
                      maxLength={
                        deliveryFlow?.step === 'locator'
                          ? deliveryFlow?.locatorLength
                          : deliveryFlow?.confirmationCodeLength
                      }
                      editable={!deliveryFlow?.actionLoading}
                      style={styles.deliveryCodeInput}
                    />

                    <Text style={styles.deliveryCodeHelper}>
                      {deliveryFlow?.step === 'locator'
                        ? `${global.t?.t(
                            'orders',
                            'message',
                            'official99FoodLocatorHas',
                          )} ${deliveryFlow?.locatorLength} ${global.t?.t(
                            'orders',
                            'label',
                            'digits',
                          )}.`
                        : `${global.t?.t(
                            'orders',
                            'message',
                            'customerCodeHas',
                          )} ${deliveryFlow?.confirmationCodeLength} ${global.t?.t(
                            'orders',
                            'label',
                            'digits',
                          )}.`}
                    </Text>
                  </>
                )}
              </ScrollView>

              {deliveryFlow?.isIfood ? null : (
                <View style={styles.deliveryCodeActions}>
                  <TouchableOpacity
                    onPress={() => {
                      if (deliveryFlow?.step === 'delivery_code') {
                        deliveryFlow?.onBack?.();
                        return;
                      }

                      deliveryFlow?.onClose?.();
                    }}
                    style={[
                      styles.deliveryCodeButton,
                      styles.deliveryCodeButtonSecondary,
                    ]}>
                    <Text style={styles.deliveryCodeButtonSecondaryText}>
                      {deliveryFlow?.step === 'delivery_code'
                        ? global.t?.t('orders', 'button', 'back')
                        : global.t?.t('orders', 'button', 'cancel')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={
                      deliveryFlow?.step === 'locator'
                        ? deliveryFlow?.onVerifyLocator
                        : deliveryFlow?.onSubmit
                    }
                    disabled={!!deliveryFlow?.actionLoading}
                    style={[
                      styles.deliveryCodeButton,
                      styles.deliveryCodeButtonPrimary,
                      !!deliveryFlow?.actionLoading &&
                        styles.kdsActionButtonDisabled,
                    ]}>
                    {deliverySubmitLoading ? (
                      <ActivityIndicator size="small" color="#F8FAFC" />
                    ) : (
                      <Text style={styles.deliveryCodeButtonPrimaryText}>
                        {deliveryFlow?.step === 'locator'
                          ? global.t?.t('orders', 'button', 'verifyAndContinue')
                          : global.t?.t('orders', 'button', 'completeDelivery')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default OrderMarketplaceOverlayHost;
