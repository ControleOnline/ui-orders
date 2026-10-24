import {useEffect} from 'react';
import {api} from '@controleonline/ui-common/src/api';
import {extractCollectionItems} from '@controleonline/ui-orders/src/react/utils/posCartHelpers';
import {
  buildLoyaltyCpfSearchParams,
  buildLoyaltyCpfSearchResults,
  digitsOnly,
  LOYALTY_CPF_MIN_SEARCH_LENGTH,
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
    if (
      !requiresLoyaltyCpfStep ||
      loyaltyCpfStepCompleted ||
      loyaltyCpfDigits.length < LOYALTY_CPF_MIN_SEARCH_LENGTH
    ) {
      setLoyaltyCpfLoading(false);
      setLoyaltyCpfResults([]);
      return undefined;
    }

    const selectedCpfDigits = digitsOnly(
      selectedLoyaltyPerson?.cpf || selectedLoyaltyPerson?.cpfDisplay || '',
    );
    if (selectedCpfDigits && selectedCpfDigits === loyaltyCpfDigits) {
      setLoyaltyCpfLoading(false);
      setLoyaltyCpfResults([]);
      return undefined;
    }

    let isActive = true;
    setLoyaltyCpfLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const response = await api.fetch('people', {
          params: buildLoyaltyCpfSearchParams({
            companyId: loyaltySearchCompanyId,
            query: loyaltyCpfDigits,
          }),
        });
        if (!isActive) return;
        setLoyaltyCpfResults(
          buildLoyaltyCpfSearchResults(
            extractCollectionItems(response),
            loyaltyCpfDigits,
          ),
        );
      } catch {
        if (isActive) setLoyaltyCpfResults([]);
      } finally {
        if (isActive) setLoyaltyCpfLoading(false);
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [
    loyaltyCpfDigits,
    loyaltySearchCompanyId,
    loyaltyCpfStepCompleted,
    requiresLoyaltyCpfStep,
    selectedLoyaltyPerson?.cpf,
    selectedLoyaltyPerson?.cpfDisplay,
  ]);

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
