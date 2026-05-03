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

  it('falls back to the inline total only for kds or tv displays', () => {
    expect(
      shouldRenderOrderDetailsInlineTotal({
        useUnifiedKdsLayout: true,
        isKds: true,
        isTvDisplay: false,
      }),
    ).toBe(true)

    expect(
      shouldRenderOrderDetailsInlineTotal({
        useUnifiedKdsLayout: true,
        isKds: false,
        isTvDisplay: true,
      }),
    ).toBe(true)
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
