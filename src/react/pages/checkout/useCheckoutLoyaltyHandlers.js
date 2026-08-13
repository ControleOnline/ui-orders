import {useCallback} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {
  getPaymentOptionLabel,
  isCashPaymentOption,
} from '@controleonline/ui-common/src/react/utils/paymentOptions';
import {
  digitsOnly,
  resolvePeopleId,
} from '@controleonline/ui-orders/src/react/utils/checkoutLoyaltyCpf';
import {
  LOYALTY_REWARD_PAYMENT_LABEL,
  PAYMENT_CHANNEL_LOCAL,
} from './checkoutStatusHelpers';
import styles from './Checkout.styles';

export default function useCheckoutLoyaltyHandlers(d) {
  const {
    setLoyaltyCpfInput, setLoyaltyCpfResults, setSelectedLoyaltyPerson,
    setLoyaltyCpfStepCompleted, setLoyaltyCpfStepSkipped, selectedLoyaltyPerson,
    requiresLoyaltyCpfStep, loyaltyCpfStepCompleted, loyaltyCpfStepSkipped,
    setLoadingLoyaltySnapshot, setLoyaltySnapshotError, setRewardableLoyaltyCard,
    loadingLoyaltySnapshot, loyaltySnapshotError, invoiceActions,
    loyaltyCpfResults, loyaltyRewardOnlyMode, submittingPayment,
    themeColors, selectedPayment, loadingPaymentOptions, allPaymentOptions,
    isRemotePaymentSelected, selectedRemoteDevice, amountEntryModalMode,
    isCashAmountEntry, remainingAmount, cashPaymentDetails, cashPaymentContext,
  } = d;

  const handleLoyaltyCpfInputChange = useCallback(value => {
    const nextDigits = digitsOnly(value).slice(0, 11);
    const selectedCpfDigits = digitsOnly(
      selectedLoyaltyPerson?.cpf || selectedLoyaltyPerson?.cpfDisplay || '',
    );

    setLoyaltyCpfInput(Formatter.maskCPF(nextDigits));
    setLoyaltyCpfStepSkipped(false);

    if (selectedCpfDigits && selectedCpfDigits !== nextDigits) {
      setSelectedLoyaltyPerson(null);
    }
  }, [selectedLoyaltyPerson?.cpf, selectedLoyaltyPerson?.cpfDisplay]);

  const handleSelectLoyaltyPerson = useCallback(person => {
    setSelectedLoyaltyPerson(person);
    setLoyaltyCpfInput(currentValue =>
      person?.cpfDisplay || Formatter.maskCPF(person?.cpf || '') || currentValue,
    );
    setLoyaltyCpfResults([]);
    setLoyaltyCpfStepSkipped(false);
  }, []);

  const handleSkipLoyaltyCpfStep = useCallback(() => {
    setSelectedLoyaltyPerson(null);
    setLoyaltyCpfInput('');
    setLoyaltyCpfResults([]);
    setLoyaltyCpfStepSkipped(true);
    setLoyaltyCpfStepCompleted(true);
  }, []);

  const handleContinueAfterLoyaltyCpf = useCallback(() => {
    if (loadingLoyaltySnapshot) {
      invoiceActions.setError(
        'Aguarde a consulta de fidelidade terminar para continuar.',
      );
      return;
    }

    if (loyaltySnapshotError) {
      invoiceActions.setError(loyaltySnapshotError);
      return;
    }

    if (!resolvePeopleId(selectedLoyaltyPerson?.id)) {
      invoiceActions.setError(
        'Selecione um CPF da lista ou toque em pular para seguir sem identificar o cliente.',
      );
      return;
    }

    setLoyaltyCpfStepSkipped(false);
    setLoyaltyCpfStepCompleted(true);
  }, [
    invoiceActions,
    loadingLoyaltySnapshot,
    loyaltySnapshotError,
    selectedLoyaltyPerson?.id,
  ]);

  const shouldRenderLoyaltyCpfStep =
    requiresLoyaltyCpfStep && !loyaltyCpfStepCompleted;
  const loyaltyPreviewPerson =
    selectedLoyaltyPerson?.id
      ? selectedLoyaltyPerson
      : loyaltyCpfResults[0] || null;
  const loyaltyPreviewFullName = String(
    loyaltyPreviewPerson?.raw?.name || loyaltyPreviewPerson?.label || '',
  ).trim();
  const loyaltyPreviewCpf =
    loyaltyPreviewPerson?.cpfDisplay || loyaltyPreviewPerson?.cpf || '';
  const isLoyaltyPreviewSelected =
    String(loyaltyPreviewPerson?.id || '') ===
    String(selectedLoyaltyPerson?.id || '');

  const paymentTopContent =
    requiresLoyaltyCpfStep && loyaltyCpfStepCompleted ? (
      <>
        {loyaltyRewardOnlyMode ? (
          <View style={styles.loyaltySummaryCard}>
            <View style={styles.loyaltySummaryHeader}>
              <Text style={styles.loyaltySummaryTitle}>Brinde liberado</Text>
            </View>
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
                  opacity: submittingPayment
                    ? Number.isFinite(Number(themeColors.buttonDisabledOpacity))
                      ? Number(themeColors.buttonDisabledOpacity)
                      : 0.6
                    : 1,
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
    ) : null;

  const emptyTitle = 'Nenhum meio de pagamento disponível';
  const emptyText =
    'Verifique as carteiras configuradas neste equipamento ou no equipamento remoto principal.';
  const payDisabled =
    submittingPayment ||
    loadingPaymentOptions ||
    !selectedPayment?.wallet ||
    !selectedPayment?.paymentType ||
    !allPaymentOptions.length ||
    (isRemotePaymentSelected && !selectedRemoteDevice);
  const actionLabel = loyaltyRewardOnlyMode
    ? `Finalizar com ${LOYALTY_REWARD_PAYMENT_LABEL}`
    : !selectedPayment?.paymentType
      ? 'Pagar'
      : isRemotePaymentSelected && selectedRemoteDevice?.alias
        ? `Enviar para ${selectedRemoteDevice.alias}`
        : isCashPaymentOption(selectedPayment)
          ? 'Receber em dinheiro'
          : `Pagar com ${getPaymentOptionLabel(selectedPayment)}`;
  const actionIcon = loyaltyRewardOnlyMode
    ? 'loyalty'
    : isRemotePaymentSelected
      ? 'credit-card'
      : isCashPaymentOption(selectedPayment)
        ? 'dollar-sign'
        : 'credit-card';
  const amountEntryTitle =
    amountEntryModalMode === 'cash-local'
      ? 'Pagamento em dinheiro'
      : 'Valor a cobrar';
  const amountEntryDescription = isCashAmountEntry
    ? [
        `Total a cobrar: ${Formatter.formatMoney(remainingAmount)}`,
        'Informe quanto o cliente entregou em dinheiro para calcular o troco automaticamente.',
      ]
    : 'Confirme o valor deste pagamento antes de continuar.';
  const amountEntryFieldLabel = isCashAmountEntry
    ? 'Valor recebido do cliente'
    : 'Valor a cobrar';
  const amountEntryDetails = isCashAmountEntry
    ? [
        `Valor pago agora: ${Formatter.formatMoney(
          cashPaymentDetails.appliedAmount,
        )}`,
        `Troco: ${Formatter.formatMoney(cashPaymentDetails.changeAmount)}`,
        cashPaymentContext === PAYMENT_CHANNEL_LOCAL &&
        cashPaymentDetails.missingAmount > 0.009
          ? `Restara pendente: ${Formatter.formatMoney(
              cashPaymentDetails.missingAmount,
            )}`
          : null,
      ]
    : [];
  const paymentExplanationTitle = selectedRemoteDevice
    ? `Enviar para ${selectedRemoteDevice.alias}`
    : 'Enviar pagamento remoto';
  const paymentExplanationDescription = selectedRemoteDevice
    ? [
        `O pagamento sera enviado para ${selectedRemoteDevice.alias}.`,
        'Esta tela permanece aguardando a resposta do equipamento remoto antes de concluir o pedido.',
      ]
    : ['Selecione um equipamento remoto antes de continuar.'];

  return {
    handleLoyaltyCpfInputChange,
    handleSelectLoyaltyPerson,
    handleSkipLoyaltyCpfStep,
    handleContinueAfterLoyaltyCpf,
    shouldRenderLoyaltyCpfStep,
    loyaltyPreviewPerson,
    loyaltyPreviewFullName,
    loyaltyPreviewCpf,
    isLoyaltyPreviewSelected,
    paymentTopContent,
    emptyTitle,
    emptyText,
    payDisabled,
    actionLabel,
    actionIcon,
    amountEntryTitle,
    amountEntryDescription,
    amountEntryFieldLabel,
    amountEntryDetails,
    paymentExplanationTitle,
    paymentExplanationDescription,
  };
}
