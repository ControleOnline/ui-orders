import React from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ActivityIndicator, View, ScrollView, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import css from '@controleonline/ui-orders/src/react/css/orders';
import UnifiedPaymentBar from '@controleonline/ui-common/src/react/components/UnifiedPaymentBar';
import {useStore} from '@store';
import { inlineStyle_62_26 } from './PaymentCheckoutPanel.styles';

const PaymentCheckoutPanel = ({
  payments = [],
  selectedPayment = {},
  onSelectPayment,
  onPay,
  payDisabled = false,
  invoiceIsSaving = false,
  invoiceError = null,
  error = null,
  topContent = null,
  totalAmount = 0,
  paidAmount = 0,
  pendingAmount = 0,
  actionLabel,
  emptyTitle = 'Nenhuma opcao de pagamento disponivel',
  emptyText = 'A configuracao atual nao liberou meios de pagamento para este modo.',
}) => {
  const {styles} = css();
  const themeStore = useStore('theme');
  const colors = themeStore?.getters?.colors || {};
  const theme = {
    primary: colors.primary || '#1B5587',
    success: colors.success || '#16A34A',
    warning: colors.warning || '#D97706',
    surface: '#FFFFFF',
    text: '#0F172A',
    muted: '#64748B',
    background: colors.background || '#F8FAFC',
    cardBorder: '#D6DEE8',
    onPrimary: '#FFFFFF',
  };
  const hasError = !!invoiceError || !!error;
  const canShowPayments =
    !invoiceIsSaving && !hasError && Array.isArray(payments) && payments.length > 0;

  return (
    <SafeAreaView style={[styles.container]}>
      {topContent}
      {invoiceIsSaving ? (
        <View style={[styles.boxInfos, {marginTop: 0}]}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : canShowPayments ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {paddingBottom: 220},
            {flexGrow: 1},
          ]}>
          <View>
            {payments.map(payment => (
              <TouchableOpacity
                key={payment.paymentType.id}
                onPress={() => onSelectPayment(payment)}>
                <View
                  style={[
                    styles.boxPayment,
                    selectedPayment.paymentType?.id === payment.paymentType.id &&
                      styles.selectedBoxPayment,
                  ]}>
                  <View style={styles.paymentIcon}>
                    {selectedPayment.paymentType?.id ===
                    payment.paymentType.id ? (
                      <Icon name="check-box" size={24} color="black" />
                    ) : (
                      <Icon
                        name="check-box-outline-blank"
                        size={22}
                        color="black"
                      />
                    )}
                  </View>
                  <View>
                    <Text style={inlineStyle_62_26}>
                      {payment.paymentType.paymentType}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={[styles.boxInfos, {marginTop: 0}]}>
          <Text style={[styles.infoText, {marginBottom: 6}]}>
            {hasError ? 'Falha ao montar o pagamento' : emptyTitle}
          </Text>
          <Text style={{color: '#64748B'}}>
            {invoiceError || error || emptyText}
          </Text>
        </View>
      )}
      <UnifiedPaymentBar
        actions={[
          {
            key: 'pay',
            label:
              actionLabel || global.t?.t('orders', 'button', 'pay') || 'Pagar',
            variant: 'primary',
            loading: invoiceIsSaving,
            disabled: payDisabled,
            onPress: onPay,
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
