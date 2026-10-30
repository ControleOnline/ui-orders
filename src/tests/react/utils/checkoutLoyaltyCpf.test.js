const {
  buildLoyaltyCpfSearchParams,
  buildLoyaltyCpfSearchResults,
  extractPeopleCpfDigits,
  filterLoyaltySnapshotCardsByProvider,
  formatCpfDisplay,
  isValidCpf,
  LOYALTY_CPF_MIN_SEARCH_LENGTH,
  isLoyaltyCouponsEnabledForCheckout,
  resolveLoyaltyStampCount,
  resolveCheckoutCompanyConfigs,
  resolveCheckoutLoyaltySelection,
  resolveRewardableLoyaltyCard,
} = require('../../../react/utils/checkoutLoyaltyCpf')

describe('checkoutLoyaltyCpf helpers', () => {
  it('extracts and formats cpf values from people documents', () => {
    const person = {
      document: [
        {
          document: '52998224725',
          documentType: {documentType: 'CPF'},
        },
      ],
    }

    expect(extractPeopleCpfDigits(person)).toBe('52998224725')
    expect(formatCpfDisplay('52998224725')).toBe('529.982.247-25')
  })

  it('only searches once the cpf is complete', () => {
    const items = [{id: 8, name: 'Maria', document: [{document: '52998224725'}]}]

    expect(LOYALTY_CPF_MIN_SEARCH_LENGTH).toBe(11)
    expect(buildLoyaltyCpfSearchResults(items, '52998')).toEqual([])
    expect(buildLoyaltyCpfSearchResults(items, '529.982.247-2')).toEqual([])
  })

  it('keeps only the exact cpf match', () => {
    const results = buildLoyaltyCpfSearchResults(
      [
        {id: 8, name: 'Maria', document: [{document: '52998224725'}]},
        {id: 9, name: 'Joao', document: [{document: '11529982247'}]},
      ],
      '529.982.247-25',
    )

    expect(results).toHaveLength(1)
    expect(results[0].id).toBe(8)
    expect(results[0].cpfDisplay).toBe('529.982.247-25')
  })

  it('restores the leading zero lost by integer documents', () => {
    expect(
      extractPeopleCpfDigits({
        document: [{document: 1234567890, documentType: {documentType: 'CPF'}}],
      }),
    ).toBe('01234567890')
  })

  it('trusts the api exact match when the payload omits document data', () => {
    const results = buildLoyaltyCpfSearchResults(
      [{id: 8, name: 'Maria', alias: 'Silva'}],
      '52998224725',
    )

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual(
      expect.objectContaining({id: 8, cpf: '52998224725', cpfDisplay: '529.982.247-25'}),
    )
  })

  it('validates cpf check digits', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('52998224726')).toBe(false)
    expect(isValidCpf('11111111111')).toBe(false)
    expect(isValidCpf('5299822472')).toBe(false)
  })

  it('builds the exact cpf lookup params against the current company', () => {
    expect(
      buildLoyaltyCpfSearchParams({companyId: '/people/3', query: '529.982.247-25'}),
    ).toEqual({
      itemsPerPage: 2,
      peopleType: 'F',
      cpf: '52998224725',
      company: '/people/3',
      context: 'checkout-cpf-lookup',
    })
  })

  it('keeps the leading zero of the cpf in the lookup params', () => {
    const params = buildLoyaltyCpfSearchParams({companyId: 3, query: '015.157.489-87'})
    expect(params.cpf).toBe('01515748987')
    expect(params.search).toBeUndefined()
    expect(isValidCpf('015.157.489-87')).toBe(true)
  })

  it('detects loyalty enablement from manager configs', () => {
    expect(
      isLoyaltyCouponsEnabledForCheckout({
        'shop-loyalty-coupons-enabled': '1',
      }),
    ).toBe(true)
    expect(isLoyaltyCouponsEnabledForCheckout({})).toBe(false)
  })

  it('inherits loyalty configs from the parent company for checkout', () => {
    expect(
      resolveCheckoutCompanyConfigs({
        companyConfigs: {
          'pos-cash-wallet': '9',
          'shop-loyalty-coupons-enabled': '0',
        },
        currentCompanyConfigs: {
          'shop-loyalty-coupons-enabled': '0',
        },
        mainCompanyConfigs: {
          'shop-loyalty-coupons-enabled': '1',
          'shop-loyalty-required-sales': '10',
          'shop-loyalty-product-ids': '[12,13]',
        },
      }),
    ).toEqual({
      'pos-cash-wallet': '9',
      'shop-loyalty-coupons-enabled': '1',
      'shop-loyalty-required-sales': '10',
      'shop-loyalty-product-ids': '[12,13]',
    })
  })

  it('restores a preselected payer/client from the order payload', () => {
    const selection = resolveCheckoutLoyaltySelection({
      payer: {
        id: 55,
        name: 'Ana',
        alias: 'Costa',
        document: [{document: '52998224725'}],
      },
    })

    expect(selection).toEqual(
      expect.objectContaining({
        id: 55,
        cpf: '52998224725',
        cpfDisplay: '529.982.247-25',
      }),
    )
  })

  it('filters loyalty cards and reward eligibility by the current provider', () => {
    const snapshot = {
      member: [
        {
          provider: {id: 3},
          card: {id: 600},
          requiredSales: 3,
          stamps: [{id: 701}, {id: 702}, {id: 703}],
        },
        {
          provider: {id: 4},
          card: {id: 601},
          requiredSales: 3,
          stamps: [{id: 801}],
        },
      ],
    }

    expect(filterLoyaltySnapshotCardsByProvider(snapshot, 3)).toHaveLength(1)
    expect(resolveLoyaltyStampCount(snapshot, 3)).toBe(3)
    expect(resolveLoyaltyStampCount(snapshot, 4)).toBe(1)
    expect(resolveRewardableLoyaltyCard(snapshot, 3)).toEqual(
      expect.objectContaining({
        card: expect.objectContaining({id: 600}),
      }),
    )
    expect(resolveRewardableLoyaltyCard(snapshot, 4)).toBeNull()
  })
})
