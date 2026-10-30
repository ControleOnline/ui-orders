const mockFetch = jest.fn()

jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {fetch: (...args) => mockFetch(...args)},
}))
jest.mock('@controleonline/ui-common/src/utils/formatter', () => ({
  __esModule: true,
  default: {maskCPF: v => v},
}))
jest.mock('@controleonline/ui-common/src/react/utils/shopConfig', () => ({
  normalizeBooleanConfig: v => v,
}))

const {
  ensureClientLink,
  registerLoyaltyPerson,
  splitLoyaltyPhone,
  validateLoyaltyRegistration,
} = require('../../../react/utils/checkoutLoyaltyCpfRegistration')

describe('checkoutLoyaltyCpfRegistration', () => {
  beforeEach(() => mockFetch.mockReset())

  it('requires name and surname, validates optional phone and email', () => {
    expect(
      validateLoyaltyRegistration({cpf: '52998224725', firstName: '', lastName: ' '}),
    ).toEqual({firstName: 'Informe o nome.', lastName: 'Informe o sobrenome.'})
    expect(
      validateLoyaltyRegistration({
        cpf: '52998224725',
        firstName: 'Ana',
        lastName: 'Silva',
        phone: '123',
        email: 'x',
      }),
    ).toEqual(
      expect.objectContaining({phone: expect.any(String), email: expect.any(String)}),
    )
    expect(
      validateLoyaltyRegistration({cpf: '52998224725', firstName: 'Ana', lastName: 'Silva'}),
    ).toEqual({})
  })

  it('splits brazilian phones', () => {
    expect(splitLoyaltyPhone('(11) 98765-4321')).toEqual({ddi: 55, ddd: 11, phone: 987654321})
    expect(splitLoyaltyPhone('123')).toBeNull()
  })

  it('does not recreate an existing client link', async () => {
    mockFetch.mockResolvedValueOnce({member: [{id: 5}]})

    await ensureClientLink({companyId: 3, peopleId: 8})

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][1].params).toEqual(
      expect.objectContaining({company: '/people/3', people: '/people/8', linkType: ['client']}),
    )
  })

  it('creates the client link when missing', async () => {
    mockFetch.mockResolvedValueOnce({member: []}).mockResolvedValueOnce({id: 9})

    await ensureClientLink({companyId: 3, peopleId: 8})

    expect(mockFetch).toHaveBeenLastCalledWith('people_links', {
      method: 'POST',
      body: {company: '/people/3', people: '/people/8', linkType: 'client'},
    })
  })

  it('registers person, cpf document and optional contacts', async () => {
    mockFetch
      .mockResolvedValueOnce({member: [{id: 1, documentType: 'CPF'}]})
      .mockResolvedValueOnce({id: 20})
      .mockResolvedValue({id: 1})

    const person = await registerLoyaltyPerson({
      companyId: 3,
      cpf: '529.982.247-25',
      firstName: 'Ana',
      lastName: 'Silva',
      phone: '(11) 98765-4321',
      email: 'Ana@Mail.com',
    })

    const calls = mockFetch.mock.calls.map(([resource, options]) => [resource, options?.body])
    expect(calls[1]).toEqual([
      'people',
      expect.objectContaining({
        name: 'Ana',
        alias: 'Silva',
        peopleType: 'F',
        company: '/people/3',
        linkType: 'client',
      }),
    ])
    expect(calls[2]).toEqual([
      'documents',
      {document: 52998224725, documentType: '/document_types/1', people: '/people/20'},
    ])
    expect(calls[3][0]).toBe('phones')
    expect(calls[4]).toEqual(['emails', {email: 'ana@mail.com', people: '/people/20'}])
    expect(person).toEqual(expect.objectContaining({id: 20, cpf: '52998224725', label: 'Ana Silva'}))
  })

  it('skips phone and email when not informed', async () => {
    mockFetch
      .mockResolvedValueOnce({member: [{id: 1, documentType: 'CPF'}]})
      .mockResolvedValueOnce({id: 20})
      .mockResolvedValue({id: 1})

    await registerLoyaltyPerson({companyId: 3, cpf: '52998224725', firstName: 'Ana', lastName: 'S'})

    expect(mockFetch.mock.calls.map(c => c[0])).toEqual(['document_types', 'people', 'documents'])
  })
})
