import {formatPhoneDisplay, resolveAddressDisplayParts} from '@controleonline/ui-common/src/react/utils/entityDisplay';

const normalizeText = value => String(value ?? '').trim();

const resolveUberState = order => {
  const otherInformations = order?.otherInformations;

  if (!otherInformations || typeof otherInformations !== 'object') {
    return {};
  }

  if (otherInformations.Uber && typeof otherInformations.Uber === 'object') {
    return otherInformations.Uber;
  }

  return otherInformations.uber && typeof otherInformations.uber === 'object'
    ? otherInformations.uber
    : {};
};

const resolvePeopleContact = people => {
  if (!people || typeof people !== 'object') {
    return {
      name: '',
      phone: '',
      email: '',
    };
  }

  const phone = Array.isArray(people.phone)
    ? people.phone.map(formatPhoneDisplay).find(Boolean)
    : formatPhoneDisplay(people.phone);
  const email = Array.isArray(people.email)
    ? people.email.map(item => normalizeText(item?.email)).find(Boolean)
    : normalizeText(people.email?.email || people.email);

  return {
    name: normalizeText(people.alias || people.name),
    phone: normalizeText(phone),
    email,
  };
};

export const resolveOrderLogisticsSnapshot = order => {
  const uberState = resolveUberState(order);
  const pickupAddress = order?.addressOrigin || order?.provider?.address?.[0] || null;
  const dropoffAddress = order?.addressDestination || null;
  const pickupContact = order?.retrieveContact || order?.provider || null;
  const dropoffContact = order?.deliveryContact || order?.client || null;
  const pickupAddressParts = pickupAddress ? resolveAddressDisplayParts(pickupAddress) : null;
  const dropoffAddressParts = dropoffAddress ? resolveAddressDisplayParts(dropoffAddress) : null;
  const pickupManagedByStore = Boolean(
    uberState?.managed_by_store ??
      uberState?.managedByStore ??
      uberState?.requested_at ??
      uberState?.delivery_id ??
      uberState?.estimate_id ??
      uberState?.store_id,
  );

  return {
    uberState,
    pickupAddress,
    pickupAddressParts,
    pickupContact: resolvePeopleContact(pickupContact),
    dropoffAddress,
    dropoffAddressParts,
    dropoffContact: resolvePeopleContact(dropoffContact),
    managedByStore: pickupManagedByStore,
    managedByStoreLabel: pickupManagedByStore
      ? 'Gerenciada pela loja'
      : 'Nao gerenciada pela loja',
    canRequestDriver:
      !uberState?.delivery_id &&
      !uberState?.estimate_id &&
      !uberState?.requested_at,
    hasDriver: Boolean(
      uberState?.delivery_id ||
        uberState?.rider_name ||
        uberState?.rider_phone ||
        uberState?.tracking_url,
    ),
  };
};

