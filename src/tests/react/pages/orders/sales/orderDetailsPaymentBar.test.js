const {describe, expect, it} = global

const {
  shouldRenderOrderDetailsInlineTotal,
  resolveOrderDetailsPrimaryActionIcon,
  resolveOrderDetailsPrimaryActionLabel,
  resolveOrderDetailsPrimaryActionMode,
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

  it('switches the primary action to produzir for POS carts with mesa context', () => {
    const options = {
      appType: 'POS',
      order: {
        app: 'POS',
        externalCode: 'MESA-10',
        orderType: 'cart',
      },
    }

    expect(resolveOrderDetailsPrimaryActionMode(options)).toBe('produce')
    expect(resolveOrderDetailsPrimaryActionLabel(options)).toBe('Produzir')
    expect(resolveOrderDetailsPrimaryActionIcon(options)).toBe('send')
  })

  it('switches the primary action to produzir when the comanda code comes from the main order', () => {
    const options = {
      appType: 'POS',
      order: {
        app: 'POS',
        mainOrder: {
          externalCode: 'COM-42',
        },
        mainOrderId: 42,
        orderType: 'cart',
      },
    }

    expect(resolveOrderDetailsPrimaryActionMode(options)).toBe('produce')
  })

  it('keeps quote orders out of the producao CTA', () => {
    const options = {
      appType: 'POS',
      order: {
        app: 'POS',
        externalCode: 'MESA-10',
        orderType: 'quote',
      },
    }

    expect(resolveOrderDetailsPrimaryActionMode(options)).toBe('pay')
    expect(resolveOrderDetailsPrimaryActionLabel(options)).toBe('Pagar')
    expect(resolveOrderDetailsPrimaryActionIcon(options)).toBe('credit-card')
  })
})
