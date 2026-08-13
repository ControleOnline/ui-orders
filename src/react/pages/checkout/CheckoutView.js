import React, {useMemo} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {getPaymentOptionLabel, isCashPaymentOption} from '@controleonline/ui-common/src/react/utils/paymentOptions';
import OrderIdentityLabel from '@controleonline/ui-orders/src/react/components/OrderIdentityLabel';
import StateStore from '@controleonline/ui-common/src/react/components/StateStore';
import PaymentCheckoutPanel from '@controleonline/ui-orders/src/react/components/PaymentCheckoutPanel';
import BottomCart from '@controleonline/ui-orders/src/react/components/cart/BottomCart';
import {buildPaymentSections} from './CheckoutPaymentOptions';
import {resolvePeopleId} from '@controleonline/ui-orders/src/react/utils/checkoutLoyaltyCpf';
import styles, {inlineStyle_491_14} from './Checkout.styles';
import CheckoutPaymentModals from './CheckoutPaymentModals';
import {
  LOYALTY_REWARD_PAYMENT_LABEL,
  PAYMENT_CHANNEL_LOCAL,
} from './checkoutStatusHelpers';

export default function CheckoutView({
  activeSelectedPaymentOption,
  allPaymentOptions,
  amountEntryModalMode,
  canChangePaymentDeviceDuringCheckout,
  canRenderCheckout,
  cashPaymentDetails,
  cashPaymentContext,
  cashReceivedValue,
  checkoutOrderProductsError,
  continueSelectedPayment,
  effectiveLocalPaymentOptions,
  effectiveRemotePaymentOptions,
  handleCashReceivedInputChange,
  handleConfirmAmountEntry,
  handleContinueAfterLoyaltyCpf,
  handleInstallmentsSelect,
  handleLoyaltyCpfInputChange,
  handlePay,
  handleSelectLoyaltyPerson,
  handleSkipLoyaltyCpfStep,
  installmentsModalVisible,
  invoiceError,
  isCashAmountEntry,
  isLoyaltyPreviewSelected,
  isRemotePaymentSelected,
  loadingLoyaltySnapshot,
  loadingPaymentOptions,
  loyaltyCpfDigits,
  loyaltyCpfInput,
  loyaltyCpfLoading,
  loyaltyCpfResults,
  loyaltyPreviewCpf,
  loyaltyPreviewFullName,
  loyaltyPreviewPerson,
  loyaltyRewardOnlyMode,
  loyaltySnapshotError,
  order,
  paymentExplanationVisible,
  paymentOptionsError,
  remoteDeviceModalVisible,
  remotePaymentDevices,
  remainingAmount,
  reloadCheckoutOrderProducts,
  rewardableLoyaltyProgress,
  selectedLoyaltyPerson,
  selectedPayment,
  selectedRemoteDevice,
  setAmountEntryModalMode,
  setInstallmentsModalVisible,
  setLoyaltyCpfResults,
  setLoyaltyCpfStepCompleted,
  setLoyaltyCpfStepSkipped,
  setPaymentExplanationVisible,
  setRemoteDeviceModalVisible,
  setSelectedPaymentOption,
  setSelectedRemoteDeviceId,
  showLoyaltySummary,
  shouldRenderLoyaltyCpfStep,
  submittingPayment,
  themeColors,
}) {
  const paymentSections = useMemo(() => {
    return buildPaymentSections({
      canChangeRemoteDevice:
        !loyaltyRewardOnlyMode &&
        canChangePaymentDeviceDuringCheckout &&
        remotePaymentDevices.length > 1,
      localPaymentOptions: effectiveLocalPaymentOptions,
      onPressRemoteAction: () => setRemoteDeviceModalVisible(true),
      remotePaymentOptions: effectiveRemotePaymentOptions,
      remoteSectionTitle: selectedRemoteDevice?.alias || 'Equipamento principal',
    });
  }, [
    canChangePaymentDeviceDuringCheckout,
    effectiveLocalPaymentOptions,
    effectiveRemotePaymentOptions,
    loyaltyRewardOnlyMode,
    remotePaymentDevices.length,
    selectedRemoteDevice,
    setRemoteDeviceModalVisible,
  ]);

  const paymentTopContent = showLoyaltySummary ? (
      <LoyaltySummary
        loyaltyRewardOnlyMode={loyaltyRewardOnlyMode}
        selectedLoyaltyPerson={selectedLoyaltyPerson}
        setLoyaltyCpfResults={setLoyaltyCpfResults}
        setLoyaltyCpfStepCompleted={setLoyaltyCpfStepCompleted}
        setLoyaltyCpfStepSkipped={setLoyaltyCpfStepSkipped}
        submittingPayment={submittingPayment}
        themeColors={themeColors}
      />
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
        `Valor pago agora: ${Formatter.formatMoney(cashPaymentDetails.appliedAmount)}`,
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <OrderIdentityLabel
          order={order}
          containerStyle={styles.headerTitleWrap}
          primaryTextStyle={styles.headerTitle}
          secondaryTextStyle={styles.headerTitleSecondary}
        />
      </View>

      <StateStore
        stores={[
          'invoice',
          'orders',
          'order_products',
          'walletPaymentType',
          'device_config',
          'websocket',
        ]}
      />

      {checkoutOrderProductsError ? (
        <View style={styles.loyaltyCard}>
          <Text style={styles.loyaltyTitle}>Nao foi possivel carregar o pedido</Text>
          <Text style={styles.loyaltyHint}>{checkoutOrderProductsError}</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={reloadCheckoutOrderProducts}
            style={styles.loyaltySecondaryAction}>
            <Text style={styles.loyaltySecondaryActionText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : canRenderCheckout ? (
        <>
          {shouldRenderLoyaltyCpfStep ? (
            <LoyaltyCpfStep
              handleContinueAfterLoyaltyCpf={handleContinueAfterLoyaltyCpf}
              handleLoyaltyCpfInputChange={handleLoyaltyCpfInputChange}
              handleSelectLoyaltyPerson={handleSelectLoyaltyPerson}
              handleSkipLoyaltyCpfStep={handleSkipLoyaltyCpfStep}
              loadingLoyaltySnapshot={loadingLoyaltySnapshot}
              loyaltyCpfDigits={loyaltyCpfDigits}
              loyaltyCpfInput={loyaltyCpfInput}
              loyaltyCpfLoading={loyaltyCpfLoading}
              loyaltyCpfResults={loyaltyCpfResults}
              loyaltyPreviewCpf={loyaltyPreviewCpf}
              loyaltyPreviewFullName={loyaltyPreviewFullName}
              loyaltyPreviewPerson={loyaltyPreviewPerson}
              loyaltySnapshotError={loyaltySnapshotError}
              remainingAmount={remainingAmount}
              rewardableLoyaltyProgress={rewardableLoyaltyProgress}
              selectedLoyaltyPerson={selectedLoyaltyPerson}
              isLoyaltyPreviewSelected={isLoyaltyPreviewSelected}
            />
          ) : (
            <PaymentCheckoutPanel
              actionLabel={actionLabel}
              actionIcon={actionIcon}
              actionLoading={submittingPayment}
              emptyText={emptyText}
              emptyTitle={emptyTitle}
              error={paymentOptionsError}
              forceShowActionButton={loyaltyRewardOnlyMode}
              invoiceError={invoiceError}
              isLoadingPayments={loadingPaymentOptions}
              onPay={handlePay}
              onSelectPayment={option => {
                setSelectedPaymentOption(option);
                setPaymentExplanationVisible(false);
              }}
              paymentSections={paymentSections}
              payDisabled={payDisabled}
              pendingAmount={remainingAmount}
              selectedPaymentKey={activeSelectedPaymentOption?.key}
              skipOrderMaterialization={true}
              topContent={paymentTopContent}
            />
          )}
          <CheckoutPaymentModals
            amountEntryDescription={amountEntryDescription}
            amountEntryDetails={amountEntryDetails}
            amountEntryFieldLabel={amountEntryFieldLabel}
            amountEntryModalMode={amountEntryModalMode}
            amountEntryTitle={amountEntryTitle}
            cashReceivedValue={cashReceivedValue}
            continueSelectedPayment={continueSelectedPayment}
            handleCashReceivedInputChange={handleCashReceivedInputChange}
            handleConfirmAmountEntry={handleConfirmAmountEntry}
            handleInstallmentsSelect={handleInstallmentsSelect}
            installmentsModalVisible={installmentsModalVisible}
            isCashAmountEntry={isCashAmountEntry}
            paymentExplanationDescription={paymentExplanationDescription}
            paymentExplanationTitle={paymentExplanationTitle}
            paymentExplanationVisible={paymentExplanationVisible}
            remoteDeviceModalVisible={remoteDeviceModalVisible}
            remotePaymentDevices={remotePaymentDevices}
            remainingAmount={remainingAmount}
            selectedRemoteDevice={selectedRemoteDevice}
            setAmountEntryModalMode={setAmountEntryModalMode}
            setInstallmentsModalVisible={setInstallmentsModalVisible}
            setPaymentExplanationVisible={setPaymentExplanationVisible}
            setRemoteDeviceModalVisible={setRemoteDeviceModalVisible}
            setSelectedRemoteDeviceId={setSelectedRemoteDeviceId}
            submittingPayment={submittingPayment}
          />
        </>
      ) : null}
    </View>
  );
}

function LoyaltySummary({
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

function LoyaltyCpfStep({
  handleContinueAfterLoyaltyCpf,
  handleLoyaltyCpfInputChange,
  handleSelectLoyaltyPerson,
  handleSkipLoyaltyCpfStep,
  isLoyaltyPreviewSelected,
  loadingLoyaltySnapshot,
  loyaltyCpfDigits,
  loyaltyCpfInput,
  loyaltyCpfLoading,
  loyaltyCpfResults,
  loyaltyPreviewCpf,
  loyaltyPreviewFullName,
  loyaltyPreviewPerson,
  loyaltySnapshotError,
  remainingAmount,
  rewardableLoyaltyProgress,
  selectedLoyaltyPerson,
}) {
  return (
    <View style={inlineStyle_491_14}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.loyaltyStepScrollContent}>
        <View style={styles.loyaltyCard}>
          <Text style={styles.loyaltyTitle}>Identifique o cliente</Text>
          <Text style={styles.loyaltySubtitle}>
            Informe o CPF para registar um "carimbo".
          </Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            maxLength={14}
            onChangeText={handleLoyaltyCpfInputChange}
            placeholder="Digite o CPF"
            style={styles.loyaltyInput}
            value={loyaltyCpfInput}
          />
          {loyaltyPreviewPerson?.id ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleSelectLoyaltyPerson(loyaltyPreviewPerson)}
              style={[
                styles.loyaltySelectedPill,
                !isLoyaltyPreviewSelected && styles.loyaltyResultItemActive,
              ]}>
              <Text style={styles.loyaltySelectedTitle}>
                CPF encontrado: {loyaltyPreviewCpf}
              </Text>
              <Text style={styles.loyaltySelectedValue}>
                {loyaltyPreviewFullName}
              </Text>
            </TouchableOpacity>
          ) : null}
          <LoyaltyCpfStatus
            loadingLoyaltySnapshot={loadingLoyaltySnapshot}
            loyaltyCpfDigits={loyaltyCpfDigits}
            loyaltyCpfLoading={loyaltyCpfLoading}
            loyaltyCpfResults={loyaltyCpfResults}
            loyaltySnapshotError={loyaltySnapshotError}
            rewardableLoyaltyProgress={rewardableLoyaltyProgress}
            selectedLoyaltyPerson={selectedLoyaltyPerson}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSkipLoyaltyCpfStep}
            style={styles.loyaltySecondaryAction}>
            <Text style={styles.loyaltySecondaryActionText}>
              Pular e ir para pagamento
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomCart
        actionDisabled={!resolvePeopleId(selectedLoyaltyPerson?.id) || loadingLoyaltySnapshot}
        actionIcon="arrow-right"
        actionLabel="Continuar"
        bottomOffset={-8}
        collapsePayableWhenPaid={false}
        onActionPress={handleContinueAfterLoyaltyCpf}
        paymentPaidLabel="Pago"
        paymentPendingAmount={remainingAmount}
        paymentPendingLabel="Pendente"
        showPayableBadge={false}
        variant="default"
      />
    </View>
  );
}

function LoyaltyCpfStatus({
  loadingLoyaltySnapshot,
  loyaltyCpfDigits,
  loyaltyCpfLoading,
  loyaltyCpfResults,
  loyaltySnapshotError,
  rewardableLoyaltyProgress,
  selectedLoyaltyPerson,
}) {
  if (selectedLoyaltyPerson?.id && loadingLoyaltySnapshot) {
    return <InlineHint text="Consultando fidelidade deste CPF..." loading />;
  }
  if (selectedLoyaltyPerson?.id && loyaltySnapshotError) {
    return <Text style={styles.loyaltyHint}>{loyaltySnapshotError}</Text>;
  }
  if (
    selectedLoyaltyPerson?.id &&
    rewardableLoyaltyProgress?.requiredSales > 0
  ) {
    return (
      <Text style={styles.loyaltyHint}>
        {rewardableLoyaltyProgress.completedStampCount >= rewardableLoyaltyProgress.requiredSales
          ? `Brinde liberado. O pagamento seguira apenas com ${LOYALTY_REWARD_PAYMENT_LABEL}.`
          : `Cartao em andamento: ${rewardableLoyaltyProgress.completedStampCount}/${rewardableLoyaltyProgress.requiredSales}. O pagamento seguira o fluxo normal.`}
      </Text>
    );
  }
  if (loyaltyCpfLoading) return <InlineHint text="Buscando CPFs cadastrados..." loading />;
  if (
    loyaltyCpfDigits.length >= 11 &&
    !loyaltyCpfLoading &&
    !loyaltyCpfResults.length
  ) {
    return (
      <Text style={styles.loyaltyHint}>
        Nenhum CPF encontrado com os digitos informados.
      </Text>
    );
  }
  return null;
}

function InlineHint({loading = false, text}) {
  return (
    <View style={styles.loyaltyInlineRow}>
      {loading ? <ActivityIndicator size="small" color="#1B5587" /> : null}
      <Text style={styles.loyaltyHint}>{text}</Text>
    </View>
  );
}
