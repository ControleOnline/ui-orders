import {useMemo} from 'react';
import {isGatewayFreePayment} from '@controleonline/ui-common/src/react/utils/cashPayment';
import {resolveLoyaltyCardProgress} from '@controleonline/ui-orders/src/react/utils/checkoutLoyaltyCpf';
import {buildPaymentSelectionOption} from './CheckoutPaymentOptions';
import {
  buildLoyaltyRewardPayment,
  LOYALTY_REWARD_PAYMENT_LABEL,
  PAYMENT_CHANNEL_LOCAL,
  PAYMENT_CHANNEL_REMOTE,
} from './checkoutStatusHelpers';

export default function useCheckoutPaymentSelection({
  localPaymentOptions,
  loyaltyCpfStepCompleted,
  remotePaymentOptions,
  requiresLoyaltyCpfStep,
  rewardableLoyaltyCard,
  selectedPaymentOption,
}) {
  const loyaltyRewardBasePayment = useMemo(() => {
    const options = [...localPaymentOptions, ...remotePaymentOptions];
    const payments = options.map(option => option?.payment || null).filter(Boolean);
    return payments.find(payment => isGatewayFreePayment(payment)) || payments[0] || null;
  }, [localPaymentOptions, remotePaymentOptions]);

  const loyaltyRewardPaymentOption = useMemo(() => {
    if (!rewardableLoyaltyCard || !loyaltyRewardBasePayment) return null;

    const progress = resolveLoyaltyCardProgress(rewardableLoyaltyCard);
    const description =
      progress.requiredSales > 0
        ? `Cartao #${rewardableLoyaltyCard?.card?.id || ''} completo em ${progress.completedStampCount}/${progress.requiredSales}.`
        : 'Cartao completo para liberar o brinde.';

    return buildPaymentSelectionOption({
      channel: PAYMENT_CHANNEL_LOCAL,
      description,
      label: LOYALTY_REWARD_PAYMENT_LABEL,
      payment: buildLoyaltyRewardPayment(loyaltyRewardBasePayment),
      targetDeviceId: 'loyalty-reward',
    });
  }, [loyaltyRewardBasePayment, rewardableLoyaltyCard]);

  const loyaltyRewardOnlyMode =
    requiresLoyaltyCpfStep &&
    loyaltyCpfStepCompleted &&
    !!loyaltyRewardPaymentOption;
  const effectiveLocalPaymentOptions = useMemo(
    () =>
      loyaltyRewardOnlyMode && loyaltyRewardPaymentOption
        ? [loyaltyRewardPaymentOption]
        : localPaymentOptions,
    [localPaymentOptions, loyaltyRewardOnlyMode, loyaltyRewardPaymentOption],
  );
  const effectiveRemotePaymentOptions = useMemo(
    () => (loyaltyRewardOnlyMode ? [] : remotePaymentOptions),
    [loyaltyRewardOnlyMode, remotePaymentOptions],
  );
  const allPaymentOptions = useMemo(
    () => [...effectiveLocalPaymentOptions, ...effectiveRemotePaymentOptions],
    [effectiveLocalPaymentOptions, effectiveRemotePaymentOptions],
  );
  const activeSelectedPaymentOption = useMemo(() => {
    if (selectedPaymentOption?.payment) return selectedPaymentOption;
    if (loyaltyRewardOnlyMode && loyaltyRewardPaymentOption) {
      return loyaltyRewardPaymentOption;
    }
    if (allPaymentOptions.length === 1) return allPaymentOptions[0];
    return null;
  }, [
    allPaymentOptions,
    loyaltyRewardOnlyMode,
    loyaltyRewardPaymentOption,
    selectedPaymentOption,
  ]);
  const selectedPayment = activeSelectedPaymentOption?.payment || {};
  const selectedPaymentChannel = activeSelectedPaymentOption?.channel || '';
  const isRemotePaymentSelected = selectedPaymentChannel === PAYMENT_CHANNEL_REMOTE;

  return {
    activeSelectedPaymentOption,
    allPaymentOptions,
    effectiveLocalPaymentOptions,
    effectiveRemotePaymentOptions,
    isRemotePaymentSelected,
    loyaltyRewardOnlyMode,
    selectedPayment,
    selectedPaymentChannel,
  };
}
