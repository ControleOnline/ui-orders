const {describe, expect, it} = global

const {
  shouldRenderOrderDetailsInlineTotal,
  shouldRenderOrderDetailsPaymentAction,
  shouldRenderOrderDetailsPaymentBar,
} = require('../../../../../react/pages/orders/sales/orderDetailsPaymentBar')

describe('orderDetailsPaymentBar', () => {
  it('keeps the payment bar visible in regular order details flows', () => {
    expect(
      shouldRenderOrderDetailsPaymentBar({
        useUnifiedKdsLayout: true,
        isKds: false,
        isTvDisplay: false,
      }),
    ).toBe(true)
  })

  it('does not show the inline total for kds or tv displays', () => {
    expect(
      shouldRenderOrderDetailsInlineTotal({
        useUnifiedKdsLayout: true,
        isKds: true,
        isTvDisplay: false,
        displayAmount: 12.5,
      }),
    ).toBe(false)

    expect(
      shouldRenderOrderDetailsInlineTotal({
        useUnifiedKdsLayout: true,
        isKds: false,
        isTvDisplay: true,
        displayAmount: 12.5,
      }),
    ).toBe(false)
  })

  it('hides the inline total when the amount is zero', () => {
    expect(
      shouldRenderOrderDetailsInlineTotal({
        useUnifiedKdsLayout: true,
        isKds: true,
        isTvDisplay: false,
        displayAmount: 0,
      }),
    ).toBe(false)
  })

  it('shows the pay action only when the order can still receive payment', () => {
    expect(
      shouldRenderOrderDetailsPaymentAction({canAddOrderPayment: true}),
    ).toBe(true)
    expect(
      shouldRenderOrderDetailsPaymentAction({canAddOrderPayment: false}),
    ).toBe(false)
  })
})
