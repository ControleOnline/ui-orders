const {describe, expect, it, jest} = require('@jest/globals')

jest.mock('@controleonline/ui-common/src/react/utils/entityDisplay', () => ({
  formatHumanLabel: value => `human:${value}`,
}))

const {
  resolveInvoiceStatusPresentation,
  translateOrderStatus,
} = require('../../../../../react/pages/orders/sales/orderDetails/helpers')

describe('orderDetails helpers', () => {
  it('formats untranslated order statuses without ReferenceError', () => {
    expect(translateOrderStatus('waiting_customer')).toBe('human:waiting_customer')
  })

  it('formats invoice status fallback labels without ReferenceError', () => {
    expect(resolveInvoiceStatusPresentation({status: {status: 'pending_review'}})).toEqual(
      expect.objectContaining({
        label: 'human:pending_review',
      }),
    )
  })
})
