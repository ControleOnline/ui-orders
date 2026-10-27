import {useEffect} from 'react';
import {
  resolveCheckoutLoyaltySelection,
  resolvePeopleId,
  resolveRewardableLoyaltyCard,
} from '@controleonline/ui-orders/src/react/utils/checkoutLoyaltyCpf';

export default function useCheckoutLoyaltyEffects({
  mainCompany,
  currentCompany,
  loyaltyCpfDigits,
  loyaltyCpfStepCompleted,
  loyaltySearchCompanyId,
  order,
  ordersActions,
  requiresLoyaltyCpfStep,
  selectedLoyaltyPerson,
  setLoadingLoyaltySnapshot,
  setLoyaltyCpfInput,
  setLoyaltyCpfLoading,
  setLoyaltyCpfResults,
  setLoyaltyCpfStepCompleted,
  setLoyaltyCpfStepSkipped,
  setLoyaltySnapshotError,
  setRewardableLoyaltyCard,
  setSelectedLoyaltyPerson,
}) {
  // Store refreshes replace the object; only a different order/customer resets identification.
  const orderIdentity = resolvePeopleId(order);
  const restoredPersonId = resolveCheckoutLoyaltySelection(order)?.id || '';
  useEffect(() => {
    if (!requiresLoyaltyCpfStep) {
      setLoyaltyCpfInput('');
      setLoyaltyCpfResults([]);
      setLoyaltyCpfLoading(false);
      setSelectedLoyaltyPerson(null);
      setLoyaltyCpfStepCompleted(true);
      setLoyaltyCpfStepSkipped(false);
      return;
    }

    const restoredSelection = resolveCheckoutLoyaltySelection(order);
    if (restoredSelection?.id) {
      setSelectedLoyaltyPerson(restoredSelection);
      setLoyaltyCpfInput(restoredSelection.cpfDisplay || restoredSelection.cpf || '');
      setLoyaltyCpfResults([]);
      setLoyaltyCpfLoading(false);
      setLoyaltyCpfStepCompleted(true);
      setLoyaltyCpfStepSkipped(false);
      return;
    }

    setSelectedLoyaltyPerson(null);
    setLoyaltyCpfInput('');
    setLoyaltyCpfResults([]);
    setLoyaltyCpfLoading(false);
    setLoyaltyCpfStepCompleted(false);
    setLoyaltyCpfStepSkipped(false);
  }, [orderIdentity, restoredPersonId, currentCompany?.id, requiresLoyaltyCpfStep]);

  useEffect(() => {
    if (!requiresLoyaltyCpfStep || !resolvePeopleId(selectedLoyaltyPerson?.id)) {
      setLoadingLoyaltySnapshot(false);
      setLoyaltySnapshotError('');
      setRewardableLoyaltyCard(null);
      return undefined;
    }

    let isActive = true;
    setLoadingLoyaltySnapshot(true);
    setLoyaltyCpfStepCompleted(false);
    setLoyaltySnapshotError('');

    ordersActions
      .getFidelitySnapshot({
        clientId: resolvePeopleId(selectedLoyaltyPerson?.id),
        history: false,
      })
      .then(response => {
        if (!isActive) return;
        setRewardableLoyaltyCard(resolveRewardableLoyaltyCard(response, resolvePeopleId(order?.provider) || resolvePeopleId(currentCompany)));
        setLoyaltyCpfStepCompleted(true);
      })
      .catch(error => {
        if (!isActive) return;
        setRewardableLoyaltyCard(null);
        setLoyaltySnapshotError(
          error?.message ||
            'Nao foi possivel consultar a fidelidade deste CPF.',
        );
      })
      .finally(() => {
        if (isActive) setLoadingLoyaltySnapshot(false);
      });

    return () => {
      isActive = false;
    };
  }, [
    orderIdentity,
    order?.provider,
    currentCompany?.['@id'],
    currentCompany?.id,
    mainCompany?.['@id'],
    mainCompany?.id,
    ordersActions,
    requiresLoyaltyCpfStep,
    selectedLoyaltyPerson?.id,
  ]);

}
