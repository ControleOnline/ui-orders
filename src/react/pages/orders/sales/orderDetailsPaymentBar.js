import {getLinkedOrderContext} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext'

export const shouldRenderOrderDetailsPaymentBar = ({
  useUnifiedKdsLayout,
  isKds,
  isTvDisplay,
}) => Boolean(useUnifiedKdsLayout && !isKds && !isTvDisplay)

export const shouldRenderOrderDetailsInlineTotal = ({
  displayAmount = 0,
  ...options
} = {}) =>
  !options.isKds &&
  !options.isTvDisplay &&
  !shouldRenderOrderDetailsPaymentBar(options) &&
  Number(displayAmount || 0) > 0.009

export const shouldRenderOrderDetailsPaymentAction = ({
  canAddOrderPayment,
}) => Boolean(canAddOrderPayment)

// `cart` is the canonical draft sale order. `quote` belongs to purchase flows
// and must not trigger the production CTA.
const DRAFT_ORDER_TYPES = ['cart']

const normalizeText = value => String(value ?? '').trim().toLowerCase()

const resolveOrderDetailsAppType = ({appType, order} = {}) =>
  String(order?.app || appType || '').trim().toUpperCase()

const resolveOrderDetailsDraftOrderType = order => {
  return normalizeText(order?.orderType || order?.order_type)
}

const hasProductionContext = order => {
  const linkedOrderContext = getLinkedOrderContext(order)
  const mainOrderExternalCode = String(order?.mainOrder?.externalCode || '').trim()

  return Boolean(
    linkedOrderContext.externalCode ||
      linkedOrderContext.mainOrderId ||
      linkedOrderContext.isLinkedParent ||
      linkedOrderContext.isLinkedChild ||
      mainOrderExternalCode,
  )
}

export const resolveOrderDetailsPrimaryActionMode = ({appType, order} = {}) => {
  if (resolveOrderDetailsAppType({appType, order}) !== 'POS') {
    return 'pay'
  }

  if (!DRAFT_ORDER_TYPES.includes(resolveOrderDetailsDraftOrderType(order))) {
    return 'pay'
  }

  return hasProductionContext(order) ? 'produce' : 'pay'
}

export const resolveOrderDetailsPrimaryActionLabel = (options = {}) =>
  resolveOrderDetailsPrimaryActionMode(options) === 'produce'
    ? global.t?.t('orders', 'button', 'produce') || 'Produzir'
    : global.t?.t('orders', 'button', 'pay') || 'Pagar'

export const resolveOrderDetailsPrimaryActionIcon = (options = {}) =>
  resolveOrderDetailsPrimaryActionMode(options) === 'produce'
    ? 'send'
    : 'credit-card'
