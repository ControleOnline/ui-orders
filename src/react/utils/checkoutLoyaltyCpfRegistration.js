import {api} from '@controleonline/ui-common/src/api';
import {extractCollectionItems} from '@controleonline/ui-orders/src/react/utils/posCartHelpers';
import {
  digitsOnly,
  formatCpfDisplay,
  isValidCpf,
  resolvePeopleId,
} from '@controleonline/ui-orders/src/react/utils/checkoutLoyaltyCpf';

export const CLIENT_LINK_TYPE = 'client';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const splitLoyaltyPhone = value => {
  const digits = digitsOnly(value).replace(/^55(?=\d{10,11}$)/, '');
  if (digits.length < 10) {
    return null;
  }

  return {ddi: 55, ddd: Number(digits.slice(0, 2)), phone: Number(digits.slice(2))};
};

export const validateLoyaltyRegistration = ({
  cpf,
  email,
  firstName,
  lastName,
  phone,
}) => {
  const errors = {};

  if (!isValidCpf(cpf)) errors.cpf = 'CPF invalido.';
  if (!String(firstName || '').trim()) errors.firstName = 'Informe o nome.';
  if (!String(lastName || '').trim()) errors.lastName = 'Informe o sobrenome.';
  if (String(phone || '').trim() && !splitLoyaltyPhone(phone)) {
    errors.phone = 'Telefone invalido. Informe DDD + numero.';
  }
  if (String(email || '').trim() && !EMAIL_PATTERN.test(String(email).trim())) {
    errors.email = 'E-mail invalido.';
  }

  return errors;
};

export const buildLoyaltySelectionFromPeople = (people, cpf, fallbackLabel = '') => {
  const peopleId = resolvePeopleId(people);
  const label =
    [people?.name, people?.alias].filter(Boolean).join(' ').trim() ||
    fallbackLabel ||
    `Pessoa ${peopleId}`;

  return {
    id: peopleId,
    cpf: digitsOnly(cpf),
    cpfDisplay: formatCpfDisplay(cpf),
    label,
    raw: people,
  };
};

// Links an existing person to the company as client. POST /people_links is an
// upsert that rewrites commission fields, so we only create it when missing.
export const ensureClientLink = async ({companyId, peopleId}) => {
  const company = resolvePeopleId(companyId);
  const people = resolvePeopleId(peopleId);
  if (!company || !people) {
    throw new Error('Nao foi possivel identificar a empresa ou o cliente para o vinculo.');
  }

  const existing = extractCollectionItems(
    await api.fetch('people_links', {
      params: {
        company: `/people/${company}`,
        people: `/people/${people}`,
        // people_links only accepts linkType as an array (serialized as linkType[]).
        linkType: [CLIENT_LINK_TYPE],
        itemsPerPage: 1,
      },
    }),
  );
  if (existing.length > 0) {
    return existing[0];
  }

  return api.fetch('people_links', {
    method: 'POST',
    body: {
      company: `/people/${company}`,
      people: `/people/${people}`,
      linkType: CLIENT_LINK_TYPE,
    },
  });
};

const resolveCpfDocumentTypeIri = async () => {
  const types = extractCollectionItems(
    await api.fetch('document_types', {params: {itemsPerPage: 100}}),
  );
  const cpfType = types.find(
    item => String(item?.documentType || '').trim().toUpperCase() === 'CPF',
  );
  const id = resolvePeopleId(cpfType);
  if (!id) {
    throw new Error('Tipo de documento CPF nao encontrado.');
  }

  return `/document_types/${id}`;
};

// POST /people with company + linkType already creates the client link.
export const registerLoyaltyPerson = async ({
  companyId,
  cpf,
  email,
  firstName,
  lastName,
  phone,
}) => {
  const company = resolvePeopleId(companyId);
  if (!company) {
    throw new Error('Empresa atual nao identificada.');
  }

  const cpfDigits = digitsOnly(cpf);
  const documentTypeIri = await resolveCpfDocumentTypeIri();

  const person = await api.fetch('people', {
    method: 'POST',
    body: {
      name: String(firstName).trim(),
      alias: String(lastName).trim(),
      peopleType: 'F',
      company: `/people/${company}`,
      linkType: CLIENT_LINK_TYPE,
      'extra-data': {},
    },
  });
  const peopleId = resolvePeopleId(person);
  if (!peopleId) {
    throw new Error('Nao foi possivel criar a pessoa.');
  }
  const peopleIri = `/people/${peopleId}`;

  await api.fetch('documents', {
    method: 'POST',
    body: {document: Number(cpfDigits), documentType: documentTypeIri, people: peopleIri},
  });

  const phonePayload = String(phone || '').trim() ? splitLoyaltyPhone(phone) : null;
  if (phonePayload) {
    await api.fetch('phones', {
      method: 'POST',
      body: {...phonePayload, people: peopleIri},
    });
  }

  if (String(email || '').trim()) {
    await api.fetch('emails', {
      method: 'POST',
      body: {email: String(email).trim().toLowerCase(), people: peopleIri},
    });
  }

  return buildLoyaltySelectionFromPeople(
    {...person, name: String(firstName).trim(), alias: String(lastName).trim()},
    cpfDigits,
  );
};
