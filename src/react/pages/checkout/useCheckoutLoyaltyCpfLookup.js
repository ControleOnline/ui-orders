import {useCallback, useEffect, useState} from 'react';
import {api} from '@controleonline/ui-common/src/api';
import {extractCollectionItems} from '@controleonline/ui-orders/src/react/utils/posCartHelpers';
import {
  buildLoyaltyCpfSearchParams,
  buildLoyaltyCpfSearchResults,
  digitsOnly,
  isValidCpf,
  LOYALTY_CPF_MIN_SEARCH_LENGTH,
  resolvePeopleId,
} from '@controleonline/ui-orders/src/react/utils/checkoutLoyaltyCpf';
import {
  buildLoyaltySelectionFromPeople,
  ensureClientLink,
  registerLoyaltyPerson,
  validateLoyaltyRegistration,
} from '@controleonline/ui-orders/src/react/utils/checkoutLoyaltyCpfRegistration';

// Looks the CPF up only once it is complete (11 valid digits):
//  - found           -> ensures the client people_link with the current company;
//  - not found       -> opens the registration popup (name, surname, phone, email).
export default function useCheckoutLoyaltyCpfLookup({
  currentCompany,
  loyaltyCpfDigits,
  loyaltyCpfStepCompleted,
  requiresLoyaltyCpfStep,
  selectedLoyaltyPerson,
  setLoyaltyCpfInput,
  setLoyaltyCpfLoading,
  setLoyaltyCpfResults,
  setLoyaltyCpfStepSkipped,
  setSelectedLoyaltyPerson,
}) {
  const [lookupError, setLookupError] = useState('');
  const [notFoundCpf, setNotFoundCpf] = useState('');
  const [registrationVisible, setRegistrationVisible] = useState(false);
  const [registrationSaving, setRegistrationSaving] = useState(false);
  const [registrationErrors, setRegistrationErrors] = useState({});
  const [registrationError, setRegistrationError] = useState('');

  const companyId = resolvePeopleId(currentCompany?.id || currentCompany?.['@id']);
  const selectedCpfDigits = digitsOnly(
    selectedLoyaltyPerson?.cpf || selectedLoyaltyPerson?.cpfDisplay || '',
  );

  useEffect(() => {
    setLoyaltyCpfResults([]);
    setLookupError('');

    if (
      !requiresLoyaltyCpfStep ||
      loyaltyCpfStepCompleted ||
      loyaltyCpfDigits.length < LOYALTY_CPF_MIN_SEARCH_LENGTH
    ) {
      setLoyaltyCpfLoading(false);
      setNotFoundCpf('');
      setRegistrationVisible(false);
      return undefined;
    }

    if (!isValidCpf(loyaltyCpfDigits)) {
      setLoyaltyCpfLoading(false);
      setNotFoundCpf('');
      setRegistrationVisible(false);
      setLookupError('CPF invalido. Confira os numeros digitados.');
      return undefined;
    }

    if (selectedCpfDigits === loyaltyCpfDigits) {
      setLoyaltyCpfLoading(false);
      return undefined;
    }

    let isActive = true;
    setLoyaltyCpfLoading(true);
    setNotFoundCpf('');

    (async () => {
      try {
        const response = await api.fetch('people', {
          params: buildLoyaltyCpfSearchParams({
            companyId,
            query: loyaltyCpfDigits,
          }),
        });
        if (!isActive) return;

        const [found] = buildLoyaltyCpfSearchResults(
          extractCollectionItems(response),
          loyaltyCpfDigits,
        );

        if (found) {
          await ensureClientLink({companyId, peopleId: found.id});
          if (!isActive) return;
          setSelectedLoyaltyPerson(found);
          setLoyaltyCpfInput(found.cpfDisplay);
          setLoyaltyCpfStepSkipped(false);
          return;
        }

        setNotFoundCpf(loyaltyCpfDigits);
        setRegistrationErrors({});
        setRegistrationError('');
        setRegistrationVisible(true);
      } catch (error) {
        if (isActive) {
          setLookupError(
            error?.message || 'Nao foi possivel consultar o CPF. Tente novamente.',
          );
        }
      } finally {
        if (isActive) setLoyaltyCpfLoading(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [
    companyId,
    loyaltyCpfDigits,
    loyaltyCpfStepCompleted,
    requiresLoyaltyCpfStep,
    selectedCpfDigits,
  ]);

  const handleCancelRegistration = useCallback(() => {
    if (registrationSaving) return;
    setRegistrationVisible(false);
  }, [registrationSaving]);

  const handleOpenRegistration = useCallback(() => {
    setRegistrationErrors({});
    setRegistrationError('');
    setRegistrationVisible(true);
  }, []);

  const handleSubmitRegistration = useCallback(
    async ({email, firstName, lastName, phone}) => {
      const errors = validateLoyaltyRegistration({
        cpf: notFoundCpf,
        email,
        firstName,
        lastName,
        phone,
      });
      setRegistrationErrors(errors);
      setRegistrationError('');
      if (Object.keys(errors).length > 0) return;

      setRegistrationSaving(true);
      try {
        const person = await registerLoyaltyPerson({
          companyId,
          cpf: notFoundCpf,
          email,
          firstName,
          lastName,
          phone,
        });
        setSelectedLoyaltyPerson(person);
        setLoyaltyCpfInput(person.cpfDisplay);
        setLoyaltyCpfStepSkipped(false);
        setNotFoundCpf('');
        setRegistrationVisible(false);
      } catch (error) {
        setRegistrationError(
          error?.message || 'Nao foi possivel cadastrar o cliente. Tente novamente.',
        );
      } finally {
        setRegistrationSaving(false);
      }
    },
    [companyId, notFoundCpf],
  );

  return {
    handleCancelRegistration,
    handleOpenRegistration,
    handleSubmitRegistration,
    loyaltyCpfLookupError: lookupError,
    loyaltyCpfNotFound: Boolean(notFoundCpf) && !selectedLoyaltyPerson?.id,
    loyaltyRegistrationCpf: notFoundCpf,
    registrationError,
    registrationErrors,
    registrationSaving,
    registrationVisible,
  };
}
