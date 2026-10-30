import React from 'react';
import {View,Text,TouchableOpacity} from 'react-native';
import styles from './Checkout.styles';
import {LOYALTY_REWARD_PAYMENT_LABEL} from './checkoutStatusHelpers';
export default function LoyaltySummary({
  loyaltyRewardOnlyMode,
  selectedLoyaltyPerson,
  setLoyaltyCpfResults,
  setLoyaltyCpfStepCompleted,
  setLoyaltyCpfStepSkipped,
  submittingPayment,
  themeColors,
}) {
  return (
    <>
      {loyaltyRewardOnlyMode ? (
        <View style={styles.loyaltySummaryCard}>
          <Text style={styles.loyaltySummaryTitle}>Brinde liberado</Text>
          <Text style={styles.loyaltySummaryText}>
            O cartao deste CPF completou a meta. Esta venda segue apenas com{' '}
            {LOYALTY_REWARD_PAYMENT_LABEL}.
          </Text>
        </View>
      ) : null}
      <View style={styles.loyaltySummaryCard}>
        <View style={styles.loyaltySummaryHeader}>
          <Text style={styles.loyaltySummaryTitle}>CPF fidelidade</Text>
          <TouchableOpacity
            disabled={submittingPayment}
            onPress={() => {
              setLoyaltyCpfStepCompleted(false);
              setLoyaltyCpfStepSkipped(false);
              setLoyaltyCpfResults([]);
            }}
            style={[
              styles.loyaltySecondaryAction,
              {
                borderColor: submittingPayment
                  ? themeColors.buttonDisabledBackground
                  : themeColors.buttonBorder,
                backgroundColor: submittingPayment
                  ? themeColors.buttonDisabledBackground
                  : themeColors.buttonBackground,
                opacity: submittingPayment ? 0.6 : 1,
              },
            ]}>
            <Text
              style={[
                styles.loyaltySecondaryActionText,
                {
                  color: submittingPayment
                    ? themeColors.buttonDisabledText
                    : themeColors.buttonText,
                },
              ]}>
              Alterar
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.loyaltySummaryText}>
          {selectedLoyaltyPerson?.id
            ? `${selectedLoyaltyPerson.label} - ${
                selectedLoyaltyPerson.cpfDisplay || selectedLoyaltyPerson.cpf || ''
              }`
            : 'Venda seguindo sem CPF informado.'}
        </Text>
      </View>
    </>
  );
}
