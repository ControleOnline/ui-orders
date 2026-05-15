export const shouldRenderOrderDetailsPaymentBar = ({
  useUnifiedKdsLayout,
  isKds,
  isTvDisplay,
}) => Boolean(useUnifiedKdsLayout && !isKds && !isTvDisplay)

export const shouldRenderOrderDetailsInlineTotal = ({
  displayAmount = 0,
  ...options
} = {}) =>
  !shouldRenderOrderDetailsPaymentBar(options) &&
  Number(displayAmount || 0) > 0.009

export const shouldRenderOrderDetailsPaymentAction = ({
  canAddOrderPayment,
}) => Boolean(canAddOrderPayment)
