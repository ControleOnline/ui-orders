import React, {useEffect, useRef} from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import css from '@controleonline/ui-orders/src/react/css/orders';
import BottomCart from '@controleonline/ui-orders/src/react/components/cart/BottomCart';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import {useStore} from '@store';

import panelStyles from './PaymentCheckoutPanel.styles';

const resolvePaymentOptionIdentity = option =>
  String(
    option?.key ||
      option?.payment?.id ||
      option?.payment?.['@id'] ||
      option?.payment?.paymentType?.id ||
      option?.payment?.paymentType?.['@id'] ||
      '',
  );

const resolvePixOptInErrorMessage = () =>
  global.t?.t('orders', 'message', 'contactCieloToEnablePixBilling') ||
  'Entrar em contato com a CIELO para liberar a cobranca por PIX';

const normalizeText = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const resolveErrorText = errorValue => {
  if (!errorValue) {
    return '';
  }

  if (typeof errorValue === 'string') {
    return errorValue;
  }

  if (typeof errorValue?.message === 'string') {
    return errorValue.message;
  }

  if (typeof errorValue?.reason === 'string') {
    return errorValue.reason;
  }

  try {
    return JSON.stringify(errorValue);
  } catch (serializationError) {
    return String(errorValue);
  }
};

const resolveFeedbackState = ({invoiceError, error, emptyText}) => {
  const fallbackMessage = resolveErrorText(invoiceError || error) || emptyText;
  const normalizedMessage = normalizeText(fallbackMessage);
  const isPixOptInError =
    normalizedMessage.includes('nao elegivel ao optin') ||
    normalizedMessage.includes('nao foi possivel efetuar a inicializacao do pos');

  return {
    isPixOptInError,
    message: isPixOptInError ? resolvePixOptInErrorMessage() : fallbackMessage,
  };
};

const PaymentCheckoutPanel = ({
  actionLabel,
  actionIcon = 'credit-card',
  actionLoading = false,
  emptyText = 'A configuracao atual nao liberou meios de pagamento para este modo.',
  emptyTitle = 'Nenhuma opcao de pagamento disponivel',
  error = null,
  invoiceError = null,
  forceShowActionButton = false,
  isLoadingPayments = false,
  onPay,
  onSelectPayment,
  paymentSections = [],
  payments = [],
  payDisabled = false,
  pendingAmount = 0,
  selectedPayment = {},
  selectedPaymentKey = '',
  skipOrderMaterialization = false,
  topContent = null,
}) => {
  const {styles} = css();
  const themeStore = useStore('theme');
  const themeColors = themeStore?.getters?.colors || {};
  const {showError} = useMessage() || {};
  const lastToastMessageRef = useRef('');
  const hasError = !!invoiceError || !!error;
  const feedbackState = resolveFeedbackState({invoiceError, error, emptyText});
  const feedbackMessage = feedbackState.message;
  const normalizedSections = Array.isArray(paymentSections)
    ? paymentSections.filter(section => Array.isArray(section?.options) && section.options.length > 0)
    : [];
  const hasSectionedPayments = normalizedSections.length > 0;
  const hasFlatPayments = Array.isArray(payments) && payments.length > 0;
  const hasPayments = hasSectionedPayments || hasFlatPayments;
  const radioBorderColor = themeColors.radioBorder;
  const radioSelectedBorderColor = themeColors.radioSelectedBorder;
  const radioSelectedDotColor = themeColors.radioSelectedDot;
  const radioTextColor = themeColors.radioText;

  useEffect(() => {
    if (!hasError || !feedbackState.isPixOptInError || !feedbackMessage) {
      lastToastMessageRef.current = '';
      return;
    }

    if (lastToastMessageRef.current === feedbackMessage) {
      return;
    }

    lastToastMessageRef.current = feedbackMessage;
    showError?.(feedbackMessage);
  }, [feedbackMessage, feedbackState.isPixOptInError, hasError, showError]);

  const renderSelectionIcon = selected => (
    <View style={panelStyles.selectionIconWrap}>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: selected
            ? radioSelectedBorderColor
            : radioBorderColor,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        }}>
        {selected ? (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: radioSelectedDotColor,
            }}
          />
        ) : null}
      </View>
    </View>
  );

  const renderPaymentOption = option => {
    const optionIdentity = resolvePaymentOptionIdentity(option);
    const selectedPaymentIdentity = resolvePaymentOptionIdentity({
      key: selectedPaymentKey,
      payment: selectedPayment,
    });
    const selected = selectedPaymentIdentity !== ''
      ? selectedPaymentIdentity === optionIdentity
      : false;

    return (
      <TouchableOpacity
        key={optionIdentity}
        activeOpacity={actionLoading ? 1 : 0.85}
        disabled={actionLoading}
        onPress={() => onSelectPayment(option)}
        style={[
          panelStyles.paymentOption,
          {
            backgroundColor: themeColors.cardBackground,
            borderColor: themeColors.cardBorder,
          },
        ]}>
        {renderSelectionIcon(selected)}
        <View style={panelStyles.paymentTextWrap}>
          <Text
            style={[
              panelStyles.paymentTitle,
              {color: radioTextColor},
            ]}>
            {option?.label}
          </Text>
          {option?.description ? (
            <Text
              style={[
                panelStyles.paymentSubtitle,
                {
                  color: radioTextColor,
                },
              ]}>
              {option.description}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={panelStyles.container}>
      <ScrollView
        style={panelStyles.scrollView}
        contentContainerStyle={[styles.scrollContent, panelStyles.scrollContent]}>
        {topContent}

        {isLoadingPayments && !hasError && !hasPayments ? (
          <View
            style={[
              panelStyles.feedbackCard,
              {
                backgroundColor: themeColors.cardBackground,
                borderColor: themeColors.cardBorder,
              },
            ]}>
            <Text
              style={[
                panelStyles.feedbackText,
                {color: themeColors.textSecondary || themeColors.cardDisabledText},
              ]}>
              Carregando pagamentos...
            </Text>
          </View>
        ) : hasError || !hasPayments ? (
          <View
            style={[
              panelStyles.feedbackCard,
              {
                backgroundColor: themeColors.cardBackground,
                borderColor: themeColors.cardBorder,
              },
            ]}>
            <Text style={[panelStyles.feedbackTitle, {color: themeColors.cardText}]}> 
              {hasError ? 'Falha ao montar o pagamento' : emptyTitle}
            </Text>
            <Text
              style={[
                panelStyles.feedbackText,
                {color: themeColors.textSecondary || themeColors.cardDisabledText},
              ]}>
              {feedbackMessage}
            </Text>
          </View>
        ) : hasSectionedPayments ? (
          normalizedSections.map(section => (
            <View
              key={section.key}
              style={[
                panelStyles.sectionCard,
                {
                  backgroundColor: themeColors.cardBackground,
                  borderColor: themeColors.cardBorder,
                },
              ]}>
              <View style={panelStyles.sectionHeader}>
                <Text style={[panelStyles.sectionTitle, {color: themeColors.cardText}]}> 
                  {section.title}
                </Text>
                {section.actionLabel ? (
                  <TouchableOpacity
                    onPress={section.onPressAction}
                    style={panelStyles.sectionActionButton}>
                    <Text style={panelStyles.sectionActionText}>
                      {section.actionLabel}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={panelStyles.sectionOptions}>
                {section.options.map(renderPaymentOption)}
              </View>
            </View>
          ))
        ) : (
          <View
            style={[
              panelStyles.sectionCard,
              {
                backgroundColor: themeColors.cardBackground,
                borderColor: themeColors.cardBorder,
              },
            ]}>
            <View style={panelStyles.sectionOptions}>
              {payments.map(payment =>
                renderPaymentOption({
                  description: '',
                  key: String(payment?.id || payment?.['@id'] || payment?.paymentType?.id || ''),
                  label: payment?.paymentType?.paymentType || 'Pagamento',
                  payment,
                }),
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <BottomCart
        actionDisabled={payDisabled || actionLoading}
        actionIcon={actionIcon}
        actionLabel={actionLabel || global.t?.t('orders', 'button', 'pay') || 'Pagar'}
        bottomOffset={-8}
        collapsePayableWhenPaid={false}
        forceShowActionButton={forceShowActionButton}
        onActionPress={onPay}
        paymentPaidLabel="Pago"
        paymentPendingAmount={pendingAmount}
        paymentPendingLabel="Pendente"
        showPayableBadge={false}
        skipOrderMaterialization={skipOrderMaterialization}
        variant="payment-status"
      />
    </View>
  );
};

export default PaymentCheckoutPanel;
