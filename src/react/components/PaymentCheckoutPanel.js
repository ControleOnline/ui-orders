import React from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import css from '@controleonline/ui-orders/src/react/css/orders';
import UnifiedPaymentBar from '@controleonline/ui-common/src/react/components/UnifiedPaymentBar';
import {useStore} from '@store';

import panelStyles from './PaymentCheckoutPanel.styles';

const PaymentCheckoutPanel = ({
  actionLabel,
  actionLoading = false,
  emptyText = 'A configuracao atual nao liberou meios de pagamento para este modo.',
  emptyTitle = 'Nenhuma opcao de pagamento disponivel',
  error = null,
  invoiceError = null,
  isLoadingPayments = false,
  onPay,
  onSelectPayment,
  paidAmount = 0,
  paymentSections = [],
  payments = [],
  payDisabled = false,
  pendingAmount = 0,
  selectedPayment = {},
  selectedPaymentKey = '',
  topContent = null,
  totalAmount = 0,
}) => {
  const {styles} = css();
  const themeStore = useStore('theme');
  const colors = themeStore?.getters?.colors || {};
  const theme = {
    background: colors.background || '#F8FAFC',
    cardBorder: '#D6DEE8',
    muted: '#64748B',
    onPrimary: '#FFFFFF',
    primary: colors.primary || '#1B5587',
    success: colors.success || '#16A34A',
    surface: '#FFFFFF',
    text: '#0F172A',
    warning: colors.warning || '#D97706',
  };
  const hasError = !!invoiceError || !!error;
  const normalizedSections = Array.isArray(paymentSections)
    ? paymentSections.filter(section => Array.isArray(section?.options) && section.options.length > 0)
    : [];
  const hasSectionedPayments = normalizedSections.length > 0;
  const hasFlatPayments = Array.isArray(payments) && payments.length > 0;
  const hasPayments = hasSectionedPayments || hasFlatPayments;

  const renderSelectionIcon = selected => (
    <View style={panelStyles.selectionIconWrap}>
      <Icon
        color={selected ? theme.primary : '#334155'}
        name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
        size={22}
      />
    </View>
  );

  const renderPaymentOption = option => {
    const selected = selectedPaymentKey
      ? selectedPaymentKey === option?.key
      : selectedPayment?.paymentType?.id === option?.payment?.paymentType?.id;

    return (
      <TouchableOpacity
        key={option?.key || option?.payment?.paymentType?.id}
        activeOpacity={actionLoading ? 1 : 0.85}
        disabled={actionLoading}
        onPress={() => onSelectPayment(option)}
        style={[
          panelStyles.paymentOption,
          selected && panelStyles.paymentOptionSelected,
        ]}>
        {renderSelectionIcon(selected)}
        <View style={panelStyles.paymentTextWrap}>
          <Text style={panelStyles.paymentTitle}>{option?.label}</Text>
          {option?.description ? (
            <Text style={panelStyles.paymentSubtitle}>{option.description}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, panelStyles.scrollContent]}>
        {topContent}

        {isLoadingPayments && !hasError && !hasPayments ? (
          <View style={panelStyles.feedbackCard}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : hasError || !hasPayments ? (
          <View style={panelStyles.feedbackCard}>
            <Text style={panelStyles.feedbackTitle}>
              {hasError ? 'Falha ao montar o pagamento' : emptyTitle}
            </Text>
            <Text style={panelStyles.feedbackText}>
              {invoiceError || error || emptyText}
            </Text>
          </View>
        ) : hasSectionedPayments ? (
          normalizedSections.map(section => (
            <View key={section.key} style={panelStyles.sectionCard}>
              <Text style={panelStyles.sectionTitle}>{section.title}</Text>
              {section.description ? (
                <Text style={panelStyles.sectionSubtitle}>
                  {section.description}
                </Text>
              ) : null}
              <View style={panelStyles.sectionOptions}>
                {section.options.map(renderPaymentOption)}
              </View>
            </View>
          ))
        ) : (
          <View style={panelStyles.sectionCard}>
            <View style={panelStyles.sectionOptions}>
              {payments.map(payment =>
                renderPaymentOption({
                  description: '',
                  key: String(payment?.paymentType?.id || payment?.id || ''),
                  label: payment?.paymentType?.paymentType || 'Pagamento',
                  payment,
                }),
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <UnifiedPaymentBar
        actions={[
          {
            disabled: payDisabled,
            key: 'pay',
            label: actionLabel || global.t?.t('orders', 'button', 'pay') || 'Pagar',
            loading: actionLoading,
            onPress: onPay,
            variant: 'primary',
          },
        ]}
        paidAmount={paidAmount}
        pendingAmount={pendingAmount}
        theme={theme}
        totalAmount={totalAmount}
      />
    </SafeAreaView>
  );
};

export default PaymentCheckoutPanel;
