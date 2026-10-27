import {useEffect} from 'react';
import {
  resolveCheckoutLoyaltySelection,
  resolvePeopleId,
  resolveRewardableLoyaltyCard,
} from '@controleonline/ui-orders/src/react/utils/checkoutLoyaltyCpf';

export default function useCheckoutLoyaltyEffects({
  mainCompany,
  currentCompany,
  loadingLoyaltySnapshot,
  loyaltyCpfDigits,
  loyaltyCpfStepCompleted,
  loyaltyCpfStepSkipped,
  loyaltySearchCompanyId,
  loyaltySnapshotError,
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
  }, [order, requiresLoyaltyCpfStep]);

  useEffect(() => {
    if (!requiresLoyaltyCpfStep || !resolvePeopleId(selectedLoyaltyPerson?.id)) {
      setLoadingLoyaltySnapshot(false);
      setLoyaltySnapshotError('');
      setRewardableLoyaltyCard(null);
      return undefined;
    }

    let isActive = true;
    setLoadingLoyaltySnapshot(true);
    setLoyaltySnapshotError('');

    ordersActions
      .getFidelitySnapshot({
        clientId: resolvePeopleId(selectedLoyaltyPerson?.id),
        history: false,
      })
      .then(response => {
        if (isActive) setRewardableLoyaltyCard(resolveRewardableLoyaltyCard(response));
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
    currentCompany?.['@id'],
    currentCompany?.id,
    mainCompany?.['@id'],
    mainCompany?.id,
    ordersActions,
    requiresLoyaltyCpfStep,
    selectedLoyaltyPerson?.id,
  ]);

  useEffect(() => {
    if (
      !requiresLoyaltyCpfStep ||
      loyaltyCpfStepCompleted ||
      loyaltyCpfStepSkipped ||
      !resolvePeopleId(selectedLoyaltyPerson?.id) ||
      loadingLoyaltySnapshot ||
      loyaltySnapshotError
    ) {
      return;
    }

    setLoyaltyCpfStepCompleted(true);
  }, [
    loadingLoyaltySnapshot,
    loyaltyCpfStepCompleted,
    loyaltyCpfStepSkipped,
    loyaltySnapshotError,
    requiresLoyaltyCpfStep,
    selectedLoyaltyPerson?.id,
  ]);
}
