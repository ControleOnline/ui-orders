
export const formatApiError = error => {
  if (!error) return global.t?.t('orders', 'message', 'unableCompleteOperation')
  if (typeof error === 'string') return error
  if (Array.isArray(error?.message)) {
    return error.message
      .map(item => item?.message || item?.title || String(item))
      .filter(Boolean)
      .join('\n')
  }

  return error?.message || error?.description || error?.errmsg || global.t?.t('orders', 'message', 'unableCompleteOperation')
}


export const TERMINAL_ORDER_STATUSES = ['closed', 'canceled', 'cancelled']
// `cart` is the canonical draft sale order. `quote` is a separate purchase draft
// and must stay distinct so sale-only actions never treat it as a cart.
export const DRAFT_SALE_ORDER_TYPE = 'cart'
export const POS_DELIVERY_ENABLED_CONFIG_KEY = 'pos-delivery-enabled'

export const isTerminalOrderStatus = value =>
  TERMINAL_ORDER_STATUSES.includes(String(value ?? '').trim().toLowerCase())

export const resolveEditableOrderType = value => {
  const normalizedOrderType = String(value || '').trim().toLowerCase()

  if (!normalizedOrderType) {
    return DRAFT_SALE_ORDER_TYPE
  }

  return normalizedOrderType
}

export const translateOrderStatus = value => {
  const normalizedStatus = normalizeText(value).toLowerCase()
  if (!normalizedStatus) return ''

  return global.t?.t('orders', 'status', normalizedStatus) || formatHumanLabel(value)
}

export const resolveEmbeddedOrderProducts = sourceOrder => {
  const hasOwnOrderProducts =
    !!sourceOrder && Object.prototype.hasOwnProperty.call(sourceOrder, 'orderProducts')

  if (Array.isArray(sourceOrder?.orderProducts)) {
    return {
      hasOwnOrderProducts: true,
      orderProducts: sourceOrder.orderProducts,
    }
  }

  if (Array.isArray(sourceOrder?.orderProducts?.member)) {
    return {
      hasOwnOrderProducts: true,
      orderProducts: sourceOrder.orderProducts.member,
    }
  }

  if (Array.isArray(sourceOrder?.orderProducts?.['hydra:member'])) {
    return {
      hasOwnOrderProducts: true,
      orderProducts: sourceOrder.orderProducts['hydra:member'],
    }
  }

  return {
    hasOwnOrderProducts,
    orderProducts: [],
  }
}

export const hasOrderProducts = orderProducts =>
  Array.isArray(orderProducts) && orderProducts.length > 0

export const getEmbeddedOrderProductComponents = orderProduct => {
  if (Array.isArray(orderProduct?.orderProductComponents)) {
    return orderProduct.orderProductComponents
  }

  if (Array.isArray(orderProduct?.orderProductComponents?.member)) {
    return orderProduct.orderProductComponents.member
  }

  if (Array.isArray(orderProduct?.orderProductComponents?.['hydra:member'])) {
    return orderProduct.orderProductComponents['hydra:member']
  }

  if (Array.isArray(orderProduct?.order_product_components)) {
    return orderProduct.order_product_components
  }

  if (Array.isArray(orderProduct?.order_product_components?.member)) {
    return orderProduct.order_product_components.member
  }

  if (Array.isArray(orderProduct?.order_product_components?.['hydra:member'])) {
    return orderProduct.order_product_components['hydra:member']
  }

  return []
}

export const hasGroupingMetadata = orderProducts =>
  Array.isArray(orderProducts) &&
  orderProducts.some(
    orderProduct =>
      !!(
        orderProduct?.orderProduct ||
        orderProduct?.parentProduct ||
        orderProduct?.productGroup
      ),
  )

export const hasEmbeddedOrderProductComponents = orderProducts =>
  Array.isArray(orderProducts) &&
  orderProducts.some(orderProduct => getEmbeddedOrderProductComponents(orderProduct).length > 0)

export const hasDetailedOrderProductsPayload = orderProducts =>
  hasGroupingMetadata(orderProducts) ||
  hasEmbeddedOrderProductComponents(orderProducts)

export const filterOrderProductsByOrderId = (orderProducts, orderId) =>
  (Array.isArray(orderProducts) ? orderProducts : []).filter(orderProduct => {
    const orderProductOrderId = getEntityId(orderProduct?.order)
    if (!orderId || !orderProductOrderId) return true
    return orderProductOrderId === orderId
  })

export const choosePreferredOrderProducts = ({
  primaryOrderProducts,
  fallbackOrderProducts,
  primaryHasOwnOrderProducts = false,
}) => {
  if (hasOrderProducts(primaryOrderProducts)) {
    if (
      !hasDetailedOrderProductsPayload(primaryOrderProducts) &&
      hasDetailedOrderProductsPayload(fallbackOrderProducts)
    ) {
      return fallbackOrderProducts
    }

    return primaryOrderProducts
  }

  if (primaryHasOwnOrderProducts) {
    return []
  }

  if (hasOrderProducts(fallbackOrderProducts)) {
    return fallbackOrderProducts
  }

  return []
}

export const getOrderProductCollectionSignature = orderProducts =>
  (Array.isArray(orderProducts) ? orderProducts : [])
    .map(orderProduct =>
      [
        getEntityId(orderProduct),
        getEntityId(orderProduct?.product),
        getEntityId(orderProduct?.order),
        getEntityId(orderProduct?.orderProduct),
        getEntityId(orderProduct?.parentProduct),
        getEntityId(orderProduct?.productGroup),
        Number(orderProduct?.quantity || 0),
        getEmbeddedOrderProductComponents(orderProduct)
          .map(component => getEntityId(component))
          .filter(Boolean)
          .join(','),
      ].join(':'),
    )
    .join('|')

export const areOrderProductCollectionsEquivalent = (leftOrderProducts, rightOrderProducts) =>
  getOrderProductCollectionSignature(leftOrderProducts) ===
  getOrderProductCollectionSignature(rightOrderProducts)

export const resolveInvoiceStatusPresentation = invoice => {
  const rawStatus = normalizeText(invoice?.status?.status)
  const rawRealStatus = normalizeText(invoice?.status?.realStatus || invoice?.status?.real_status)
  const normalizedStatus = rawStatus.toLowerCase()
  const normalizedRealStatus = rawRealStatus.toLowerCase()

  if (
    ['canceled', 'cancelled'].includes(normalizedStatus) ||
    ['canceled', 'cancelled'].includes(normalizedRealStatus)
  ) {
    return {
      label: formatHumanLabel(rawStatus || rawRealStatus || 'Canceled'),
      color: '#c10015',
      backgroundColor: '#c1001522',
    }
  }

  if (
    normalizedRealStatus === 'closed' ||
    ['closed', 'paid'].includes(normalizedStatus)
  ) {
    return {
      label: formatHumanLabel(rawStatus || rawRealStatus || 'Paid'),
      color: '#16A34A',
      backgroundColor: '#16A34A22',
    }
  }

  if (
    normalizedRealStatus === 'pending' ||
    ['pending', 'waiting payment', 'waiting_payment', 'open'].includes(normalizedStatus)
  ) {
    return {
      label: formatHumanLabel(rawStatus || rawRealStatus || 'Pending'),
      color: '#D97706',
      backgroundColor: '#D9770622',
    }
  }

  return {
    label: formatHumanLabel(rawStatus || rawRealStatus || 'Open'),
    color: '#0EA5E9',
    backgroundColor: '#0EA5E922',
  }
}

export const resolveInvoiceTitle = invoice => {
  const categoryName = formatHumanLabel(invoice?.category?.name || invoice?.category?.context)
  if (categoryName) return categoryName

  const invoiceId = String(invoice?.id || '').trim()
  return invoiceId ? `Invoice #${invoiceId}` : 'Invoice'
}

export const getEntityId = entity => {
  if (!entity) return null

  if (typeof entity === 'number' || typeof entity === 'string') {
    const matches = String(entity).match(/\d+/g)
    return matches ? Number(matches[matches.length - 1]) : null
  }

  if (typeof entity === 'object') {
    if (entity.id) return Number(entity.id)
    if (entity['@id']) {
      const matches = String(entity['@id']).match(/\d+/g)
      return matches ? Number(matches[matches.length - 1]) : null
    }
  }

  return null
}

export const getPeopleLabel = entity =>
  normalizeText(
    entity?.alias ||
    entity?.name ||
    entity?.fantasy_name ||
    entity?.company ||
    entity?.document
  )

export const resolveInvoicePartyLabel = (invoice, role) => {
  if (role === 'payer') {
    return resolvePreferredText(
      getPeopleLabel(invoice?.payer),
      invoice?.sourceWallet?.wallet,
    )
  }

  return resolvePreferredText(
    getPeopleLabel(invoice?.receiver),
    invoice?.destinationWallet?.wallet,
  )
}

export const resolveInvoiceDisplayAmount = invoice => {
  const rawRealPrice = invoice?.realPrice ?? invoice?.real_price

  if (rawRealPrice !== undefined && rawRealPrice !== null && rawRealPrice !== '') {
    const normalizedRealPrice = Number(rawRealPrice)
    return Number.isFinite(normalizedRealPrice) ? normalizedRealPrice : 0
  }

  const normalizedInvoicePrice = Number(invoice?.price || 0)
  return Number.isFinite(normalizedInvoicePrice) ? normalizedInvoicePrice : 0
}

export const resolveInvoiceKind = (invoice, companyId) => {
  const payerId = getEntityId(invoice?.payer)
  const receiverId = getEntityId(invoice?.receiver)
  const companyIsPayer = !!companyId && payerId === companyId
  const companyIsReceiver = !!companyId && receiverId === companyId

  if (companyIsPayer && !companyIsReceiver) {
    return {
      kind: 'payable',
      label: 'Conta a pagar',
      counterpartyLabel: getPeopleLabel(invoice?.receiver),
    }
  }

  if (companyIsReceiver && !companyIsPayer) {
    return {
      kind: 'receivable',
      label: 'Conta a receber',
      counterpartyLabel: getPeopleLabel(invoice?.payer),
    }
  }

  if (companyIsPayer && companyIsReceiver) {
    return {
      kind: 'transfer',
      label: 'Transferência interna',
      counterpartyLabel: '',
    }
  }

  if ((payerId || receiverId) && !companyIsPayer && !companyIsReceiver) {
    return {
      kind: 'marketplace_flow',
      label: 'Movimentação financeira',
      counterpartyLabel: '',
    }
  }

  if (invoice?.sourceWallet && !invoice?.destinationWallet) {
    return {
      kind: 'payable',
      label: 'Conta a pagar',
      counterpartyLabel: getPeopleLabel(invoice?.receiver),
    }
  }

  if (!invoice?.sourceWallet && invoice?.destinationWallet) {
    return {
      kind: 'receivable',
      label: 'Conta a receber',
      counterpartyLabel: getPeopleLabel(invoice?.payer),
    }
  }

  if (invoice?.sourceWallet && invoice?.destinationWallet) {
    return {
      kind: 'transfer',
      label: 'Transferência',
      counterpartyLabel: '',
    }
  }

  return {
    kind: 'unknown',
    label: 'Movimentação financeira',
    counterpartyLabel: getPeopleLabel(invoice?.payer) || getPeopleLabel(invoice?.receiver),
  }
}

export const resolvePreferredText = (...values) => {
  for (const value of values) {
    const normalized = normalizeText(value)
    if (normalized) return normalized
  }

  return ''
}

export const resolveDocumentLabel = (documentType, documentNumber) => {
  const normalizedType = normalizeText(documentType).toUpperCase()
  if (normalizedType) return normalizedType

  const digits = String(documentNumber ?? '').replace(/\D/g, '')
  if (digits.length === 14) return 'CNPJ'
  if (digits.length === 11) return 'CPF'

  return 'Documento'
}

export const formatOrderDateTime = value => {
  if (!value) return ''

  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleString('pt-BR')
  }

  return String(value)
}

export const resolveOrderDateValue = order =>
  resolvePreferredText(order?.alterDate, order?.alter_date, order?.orderDate)

export const resolveOrderItemUnitLabel = orderProduct =>
  String(
    resolvePreferredText(
      orderProduct?.product?.productUnit?.productUnit,
      orderProduct?.product?.productUnit?.unit,
      orderProduct?.product?.productUnity?.productUnit,
      orderProduct?.product?.productUnity?.unit,
      orderProduct?.productUnit?.productUnit,
      orderProduct?.productUnit?.unit,
      orderProduct?.unit,
      orderProduct?.product?.unit,
    ) || '',
  ).trim().toUpperCase()

export const resolveProductUnitLabel = product =>
  resolveOrderItemUnitLabel({ product })

export const mergeOrderProductWithResolvedProduct = (orderProduct, resolvedProduct) => {
  if (!orderProduct || !resolvedProduct) return orderProduct

  return {
    ...orderProduct,
    product: {
      ...(orderProduct?.product || {}),
      ...resolvedProduct,
      productUnit:
        resolvedProduct?.productUnit ||
        orderProduct?.product?.productUnit ||
        orderProduct?.product?.productUnity ||
        null,
      productUnity:
        resolvedProduct?.productUnity ||
        resolvedProduct?.productUnit ||
        orderProduct?.product?.productUnity ||
        orderProduct?.product?.productUnit ||
        null,
    },
  }
}

export const pendingOrderDetailRefreshes = new Map()
export const recentOrderDetailRefreshStarts = new Map()
export const ORDER_DETAIL_REFRESH_COOLDOWN_MS = 1500

