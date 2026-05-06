const normalizeText = value => String(value ?? '').trim()

const parseJsonObject = value => {
  if (!value) {
    return {}
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return {}
  }

  try {
    const parsed = JSON.parse(value)
    return parseJsonObject(parsed)
  } catch {
    return {}
  }
}

const findMarketplaceMetadataCandidate = source => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return null
  }

  if (normalizeText(source?.invoice_purpose)) {
    return source
  }

  for (const value of Object.values(source)) {
    const nested = parseJsonObject(value)
    if (normalizeText(nested?.invoice_purpose)) {
      return nested
    }
  }

  return null
}

export const resolveMarketplaceInvoiceMetadata = invoice => {
  const rawOtherInformations =
    invoice?.otherInformations ??
    invoice?.other_information ??
    invoice?.otherInformationsJson ??
    invoice?.other_information_json

  const decoded = parseJsonObject(rawOtherInformations)
  return findMarketplaceMetadataCandidate(decoded) || {}
}

const PURPOSE_BY_DESCRIPTION = [
  {pattern: /pagamento online do cliente/i, purpose: 'customer_marketplace_payment'},
  {pattern: /recebimento na entrega/i, purpose: 'customer_collection'},
  {pattern: /repasse semanal/i, purpose: 'weekly_settlement'},
  {pattern: /taxa de servico/i, purpose: 'service_fee'},
  {pattern: /taxa de pedido minimo/i, purpose: 'small_order_fee'},
  {pattern: /complemento de beneficio/i, purpose: 'meal_top_up_fee'},
  {pattern: /comissao e distribuicao/i, purpose: 'commission_distribution'},
  {pattern: /taxa de processamento de pagamento/i, purpose: 'payment_processing'},
  {pattern: /custos logisticos/i, purpose: 'logistics_cost'},
  {pattern: /desconto subsidiado pela loja/i, purpose: 'merchant_discount'},
  {pattern: /desconto subsidiado pela plataforma/i, purpose: 'platform_discount'},
  {pattern: /pagamento do motoboy/i, purpose: 'courier_payment'},
]

export const resolveMarketplaceInvoicePurpose = invoice => {
  const metadata = resolveMarketplaceInvoiceMetadata(invoice)
  const explicitPurpose = normalizeText(metadata?.invoice_purpose).toLowerCase()

  if (explicitPurpose) {
    return explicitPurpose
  }

  const description = normalizeText(invoice?.description)
  const match = PURPOSE_BY_DESCRIPTION.find(({pattern}) => pattern.test(description))
  return match?.purpose || ''
}

const MARKETPLACE_PURPOSE_PRESENTATIONS = {
  customer_marketplace_payment: {
    sectionKey: 'order-amount',
    sectionLabel: 'Valor do pedido',
    title: 'Pagamento do cliente',
    kindLabel: 'Pagamento online',
    description: 'Valor pago pelo cliente no pedido',
    sortOrder: 10,
  },
  customer_collection: {
    sectionKey: 'order-amount',
    sectionLabel: 'Valor do pedido',
    title: 'Cobrança na entrega',
    kindLabel: 'Pagamento na entrega',
    description: 'Valor cobrado do cliente na entrega',
    sortOrder: 20,
  },
  weekly_settlement: {
    sectionKey: 'payment-amount',
    sectionLabel: 'Valor do pagamento',
    title: 'Repasse da plataforma',
    kindLabel: 'Repasse',
    description: 'Valor líquido a receber da plataforma',
    sortOrder: 30,
  },
  service_fee: {
    sectionKey: 'platform-charges',
    sectionLabel: 'Cobranças da plataforma',
    title: 'Comissão',
    kindLabel: 'Taxa',
    description: 'Comissão cobrada pelo marketplace',
    sortOrder: 40,
  },
  small_order_fee: {
    sectionKey: 'platform-charges',
    sectionLabel: 'Cobranças da plataforma',
    title: 'Taxa de pedido mínimo',
    kindLabel: 'Taxa',
    description: 'Ajuste de pedido mínimo cobrado pela plataforma',
    sortOrder: 41,
  },
  meal_top_up_fee: {
    sectionKey: 'platform-charges',
    sectionLabel: 'Cobranças da plataforma',
    title: 'Complemento de benefício',
    kindLabel: 'Taxa',
    description: 'Complemento cobrado pela plataforma',
    sortOrder: 42,
  },
  commission_distribution: {
    sectionKey: 'platform-charges',
    sectionLabel: 'Cobranças da plataforma',
    title: 'Comissão e distribuição',
    kindLabel: 'Taxa',
    description: 'Comissão cobrada pela plataforma no pedido',
    sortOrder: 43,
  },
  payment_processing: {
    sectionKey: 'platform-charges',
    sectionLabel: 'Cobranças da plataforma',
    title: 'Taxa de processamento',
    kindLabel: 'Taxa',
    description: 'Taxa de processamento do pagamento',
    sortOrder: 44,
  },
  logistics_cost: {
    sectionKey: 'platform-charges',
    sectionLabel: 'Cobranças da plataforma',
    title: 'Custo logístico',
    kindLabel: 'Taxa',
    description: 'Custo logístico cobrado pela plataforma',
    sortOrder: 45,
  },
  courier_payment: {
    sectionKey: 'platform-charges',
    sectionLabel: 'Cobranças da plataforma',
    title: 'Custo logístico',
    kindLabel: 'Taxa',
    description: 'Entrega paga pela plataforma',
    sortOrder: 46,
  },
  merchant_discount: {
    sectionKey: 'discounts',
    sectionLabel: 'Descontos e subsídios',
    title: 'Desconto da loja',
    kindLabel: 'Desconto',
    description: 'Subsídio da loja aplicado no pedido',
    sortOrder: 50,
  },
  platform_discount: {
    sectionKey: 'discounts',
    sectionLabel: 'Descontos e subsídios',
    title: 'Desconto da plataforma',
    kindLabel: 'Desconto',
    description: 'Subsídio da plataforma aplicado no pedido',
    sortOrder: 51,
  },
}

export const resolveMarketplaceInvoicePresentation = invoice => {
  const purposeKey = resolveMarketplaceInvoicePurpose(invoice)
  const presentation = MARKETPLACE_PURPOSE_PRESENTATIONS[purposeKey]

  if (!presentation) {
    return null
  }

  return {
    ...presentation,
    purposeKey,
  }
}

export const resolveMarketplaceReceivableAmount = ({
  localInvoiceCards = [],
  platformReceivableAmount = 0,
  fallbackAmount = 0,
}) => {
  const weeklySettlementAmount = (Array.isArray(localInvoiceCards) ? localInvoiceCards : [])
    .filter(card => card?.purposeKey === 'weekly_settlement')
    .reduce((total, card) => total + Number(card?.amount || 0), 0)

  if (weeklySettlementAmount > 0) {
    return weeklySettlementAmount
  }

  const summaryAmount = Number(platformReceivableAmount || 0)
  if (summaryAmount > 0) {
    return summaryAmount
  }

  return Math.max(Number(fallbackAmount || 0), 0)
}
