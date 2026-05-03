export const shouldRenderOrderDetailsPaymentBar = ({
  useUnifiedKdsLayout,
  isKds,
  isTvDisplay,
}) => Boolean(useUnifiedKdsLayout && !isKds && !isTvDisplay)

export const shouldRenderOrderDetailsInlineTotal = options =>
  !shouldRenderOrderDetailsPaymentBar(options)

export const shouldRenderOrderDetailsPaymentAction = ({
  canAddOrderPayment,
}) => Boolean(canAddOrderPayment)
