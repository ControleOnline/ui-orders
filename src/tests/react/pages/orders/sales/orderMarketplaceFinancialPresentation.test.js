const {describe, expect, it} = global

const {
  resolveMarketplaceInvoicePresentation,
  resolveMarketplaceReceivableAmount,
} = require('../../../../../react/pages/orders/sales/orderMarketplaceFinancialPresentation')

describe('orderMarketplaceFinancialPresentation', () => {
  it('maps invoice purpose metadata to a simple marketplace presentation', () => {
    const presentation = resolveMarketplaceInvoicePresentation({
      description:
        'Compensacao interna iFood do desconto subsidiado pela plataforma no pedido #71043',
      otherInformations: JSON.stringify({
        ifood: {
          invoice_purpose: 'platform_discount',
        },
      }),
    })

    expect(presentation).toEqual(
      expect.objectContaining({
        purposeKey: 'platform_discount',
        sectionLabel: 'Descontos e subsídios',
        title: 'Desconto da plataforma',
        kindLabel: 'Desconto',
      }),
    )
  })

  it('prefers weekly settlement real price when resolving the footer received amount', () => {
    expect(
      resolveMarketplaceReceivableAmount({
        localInvoiceCards: [
          {purposeKey: 'service_fee', amount: 6.68},
          {purposeKey: 'weekly_settlement', amount: 50.05},
        ],
        platformReceivableAmount: 75.04,
        fallbackAmount: 234.55,
      }),
    ).toBe(50.05)
  })
})
