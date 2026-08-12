import {useCallback, useMemo} from 'react';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {
  digitsOnly,
  resolvePeopleId,
} from '@controleonline/ui-orders/src/react/utils/checkoutLoyaltyCpf';

export default function useCheckoutLoyaltyUi({
  invoiceActions,
  loadingLoyaltySnapshot,
  loyaltyCpfInput,
  loyaltyCpfResults,
  loyaltyCpfStepCompleted,
  loyaltySnapshotError,
  requiresLoyaltyCpfStep,
  selectedLoyaltyPerson,
  setLoyaltyCpfInput,
  setLoyaltyCpfResults,
  setLoyaltyCpfStepCompleted,
  setLoyaltyCpfStepSkipped,
  setSelectedLoyaltyPerson,
}) {
  const loyaltyCpfDigits = useMemo(
    () => digitsOnly(loyaltyCpfInput).slice(0, 11),
    [loyaltyCpfInput],
  );
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
  }, [
    selectedLoyaltyPerson?.cpf,
    selectedLoyaltyPerson?.cpfDisplay,
    setLoyaltyCpfInput,
    setLoyaltyCpfStepSkipped,
    setSelectedLoyaltyPerson,
  ]);
  const handleSelectLoyaltyPerson = useCallback(person => {
    setSelectedLoyaltyPerson(person);
    setLoyaltyCpfInput(currentValue =>
      person?.cpfDisplay || Formatter.maskCPF(person?.cpf || '') || currentValue,
    );
    setLoyaltyCpfResults([]);
    setLoyaltyCpfStepSkipped(false);
  }, [
    setLoyaltyCpfInput,
    setLoyaltyCpfResults,
    setLoyaltyCpfStepSkipped,
    setSelectedLoyaltyPerson,
  ]);
  const handleSkipLoyaltyCpfStep = useCallback(() => {
    setSelectedLoyaltyPerson(null);
    setLoyaltyCpfInput('');
    setLoyaltyCpfResults([]);
    setLoyaltyCpfStepSkipped(true);
    setLoyaltyCpfStepCompleted(true);
  }, [
    setLoyaltyCpfInput,
    setLoyaltyCpfResults,
    setLoyaltyCpfStepCompleted,
    setLoyaltyCpfStepSkipped,
    setSelectedLoyaltyPerson,
  ]);
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
    setLoyaltyCpfStepCompleted,
    setLoyaltyCpfStepSkipped,
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

  return {
    handleContinueAfterLoyaltyCpf,
    handleLoyaltyCpfInputChange,
    handleSelectLoyaltyPerson,
    handleSkipLoyaltyCpfStep,
    isLoyaltyPreviewSelected,
    loyaltyCpfDigits,
    loyaltyPreviewCpf,
    loyaltyPreviewFullName,
    loyaltyPreviewPerson,
    shouldRenderLoyaltyCpfStep,
  };
}
