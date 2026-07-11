const {
  buildLoyaltyCpfSearchParams,
  buildLoyaltyCpfSearchResults,
  extractPeopleCpfDigits,
  formatCpfDisplay,
  isLoyaltyCouponsEnabledForCheckout,
  resolveCheckoutCompanyConfigs,
  resolveCheckoutLoyaltySelection,
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

  it('filters and ranks search suggestions by typed cpf digits', () => {
    const results = buildLoyaltyCpfSearchResults(
      [
        {
          id: 8,
          name: 'Maria',
          alias: 'Silva',
          document: [{document: '52998224725'}],
        },
        {
          id: 9,
          name: 'Joao',
          alias: 'Souza',
          document: [{document: '11529982247'}],
        },
      ],
      '52998',
    )

    expect(results).toHaveLength(2)
    expect(results[0].id).toBe(8)
    expect(results[0].cpfDisplay).toBe('529.982.247-25')
  })

  it('keeps api results when the collection payload omits document data', () => {
    const results = buildLoyaltyCpfSearchResults(
      [
        {
          id: 8,
          name: 'Maria',
          alias: 'Silva',
        },
      ],
      '52998',
    )

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual(
      expect.objectContaining({
        id: 8,
        cpf: '',
        cpfDisplay: '',
      }),
    )
  })

  it('builds loyalty cpf search params against the parent company context', () => {
    expect(
      buildLoyaltyCpfSearchParams({
        companyId: '/people/3',
        query: '151.57',
      }),
    ).toEqual({
      itemsPerPage: 8,
      peopleType: 'F',
      search: '15157',
      company: '/people/3',
      linkType: 'client',
      'link.company': '/people/3',
      'link.linkType': 'client',
      context: 'loyalty-cpf',
    })
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
        defaultCompanyConfigs: {
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
})
