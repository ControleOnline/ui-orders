import { useMemo } from 'react'

import {
  formatInvoiceTypeLabel,
  getInvoicePaymentTypeLabel,
} from '@controleonline/ui-common/src/react/utils/invoicePresentation'
import { calculateOrderProductsSubtotal } from '@controleonline/ui-orders/src/utils/orderState'
import {
  resolveOperationalDisplayAmount,
  resolveOperationalDisplayLabelKey,
} from '@controleonline/ui-orders/src/react/utils/checkoutInvoices'
import { resolveMarketplaceInvoicePresentation } from '../orderMarketplaceFinancialPresentation'
import { shouldRenderOrderDetailsInlineTotal } from '../orderDetailsPaymentBar'

import {
  getEntityId,
  hasOrderProducts,
  resolveEmbeddedOrderProducts,
  resolveInvoiceDisplayAmount,
  resolveInvoiceKind,
  resolveInvoiceStatusPresentation,
  resolveInvoiceTitle,
  resolvePreferredText,
} from './helpers'

/**
 * Invoice cards, totals and display amount derived state for OrderDetails.
 */
export default function useOrderDetailsFinancials({
  orderInvoices,
  item,
  orderParam,
  defaultCompany,
  hasMarketplaceIntegration,
  resolvedDisplayOrderProductsWithProductDetails,
  resolvedDisplayOrder,
  useUnifiedKdsLayout,
  isKds,
  isTvDisplay,
}) {
  const activeLocalInvoices = useMemo(
    () => (
      Array.isArray(orderInvoices)
        ? orderInvoices.filter(invoice => {
            const invoiceStatus = String(
              invoice?.status?.realStatus ||
              invoice?.status?.real_status ||
              invoice?.status?.status ||
              '',
            ).trim().toLowerCase()

            return !['canceled', 'cancelled'].includes(invoiceStatus)
          })
        : []
    ),
    [orderInvoices],
  )
  const localFinancialCompanyId = useMemo(
    () => (
      getEntityId(item?.provider) ||
      getEntityId(orderParam?.provider) ||
      getEntityId(defaultCompany)
    ),
    [defaultCompany, item?.provider, orderParam?.provider],
  )
  const notInformedLabel = global.t?.t('orders', 'label', 'notInformed')
  const localInvoiceCards = useMemo(
    () => activeLocalInvoices
      .map(invoice => {
        const statusPresentation = resolveInvoiceStatusPresentation(invoice)
        const invoiceKind = resolveInvoiceKind(invoice, localFinancialCompanyId)
        const marketplacePresentation = resolveMarketplaceInvoicePresentation(invoice)
        const title = marketplacePresentation?.title || resolveInvoiceTitle(invoice)
        const invoiceId = String(invoice?.id || '').trim()
        const paymentTypeLabel =
          getInvoicePaymentTypeLabel(invoice) ||
          notInformedLabel
        const invoiceAmount = resolveInvoiceDisplayAmount(invoice)
        const invoiceType = resolvePreferredText(invoice?.invoiceType, invoice?.invoice_type)

        return {
          id: invoiceId || `${title}-${invoice?.invoice_date || invoice?.dueDate || 'local'}`,
          invoiceId,
          invoice,
          invoiceLinkLabel: invoiceId ? `Invoice #${invoiceId}` : '',
          title,
          subtitle: invoiceId && title !== `Invoice #${invoiceId}` ? `Invoice #${invoiceId}` : '',
          amount: invoiceAmount,
          descriptionLabel:
            marketplacePresentation?.description ||
            resolvePreferredText(invoice?.description),
          paymentTypeLabel,
          kindLabel:
            marketplacePresentation?.kindLabel ||
            (invoiceType ? formatInvoiceTypeLabel(invoiceType) : invoiceKind.label),
          counterpartyLabel: invoiceKind.counterpartyLabel,
          kindKey:
            marketplacePresentation?.purposeKey ||
            invoiceType ||
            invoiceKind.kind,
          purposeKey: marketplacePresentation?.purposeKey || '',
          sectionKey: marketplacePresentation?.sectionKey || '',
          sectionLabel: marketplacePresentation?.sectionLabel || '',
          sortOrder: Number(marketplacePresentation?.sortOrder ?? 999),
          payerLabel: resolveInvoicePartyLabel(invoice, 'payer'),
          receiverLabel: resolveInvoicePartyLabel(invoice, 'receiver'),
          statusLabel: statusPresentation.label,
          statusColor: statusPresentation.color,
          statusBackgroundColor: statusPresentation.backgroundColor,
        }
      })
      .sort((left, right) => {
        const sortOrderDifference =
          Number(left?.sortOrder ?? 999) - Number(right?.sortOrder ?? 999)

        if (sortOrderDifference !== 0) {
          return sortOrderDifference
        }

        return Number(right?.invoiceId || 0) - Number(left?.invoiceId || 0)
      }),
    [activeLocalInvoices, localFinancialCompanyId, notInformedLabel],
  )
  const localPaidAmount = useMemo(
    () => activeLocalInvoices.reduce((sum, invoice) => {
      const invoiceStatusName = String(invoice?.status?.status || '').trim().toLowerCase()
      const invoiceRealStatus = String(
        invoice?.status?.realStatus ||
        invoice?.status?.real_status ||
        '',
      ).trim().toLowerCase()
      const isInvoicePaid =
        invoiceRealStatus === 'closed' ||
        invoiceStatusName === 'closed' ||
        invoiceStatusName === 'paid'

      const receiverId = getEntityId(invoice?.receiver)
      const companyIsReceiver =
        !!localFinancialCompanyId &&
        !!receiverId &&
        receiverId === localFinancialCompanyId

      return isInvoicePaid && companyIsReceiver
        ? sum + resolveInvoiceDisplayAmount(invoice)
        : sum
    }, 0),
    [activeLocalInvoices, localFinancialCompanyId],
  )
  const localReceivedAmount = useMemo(
    () => (
      hasMarketplaceIntegration
        ? resolveMarketplaceReceivableAmount({
            localInvoiceCards,
            fallbackAmount: localPaidAmount,
          })
        : localPaidAmount
    ),
    [hasMarketplaceIntegration, localInvoiceCards, localPaidAmount],
  )
  const groupedInvoiceSections = useMemo(() => {
    if (!localInvoiceCards.some(invoiceCard => !!invoiceCard?.sectionLabel)) {
      return [
        {
          key: 'default',
          label: '',
          cards: localInvoiceCards,
        },
      ]
    }

    const sectionsMap = localInvoiceCards.reduce((accumulator, invoiceCard) => {
      const sectionKey = invoiceCard?.sectionKey || 'other'
      if (!accumulator[sectionKey]) {
        accumulator[sectionKey] = {
          key: sectionKey,
          label: invoiceCard?.sectionLabel || '',
          cards: [],
        }
      }

      accumulator[sectionKey].cards.push(invoiceCard)
      return accumulator
    }, {})

    return Object.values(sectionsMap)
  }, [localInvoiceCards])
  const hasAuthoritativeEmptyOrderProducts = useMemo(() => {
    const itemOrderProductsPayload = resolveEmbeddedOrderProducts(item)
    if (itemOrderProductsPayload.hasOwnOrderProducts) {
      return !hasOrderProducts(itemOrderProductsPayload.orderProducts)
    }

    const orderParamOrderProductsPayload = resolveEmbeddedOrderProducts(orderParam)
    return (
      orderParamOrderProductsPayload.hasOwnOrderProducts &&
      !hasOrderProducts(orderParamOrderProductsPayload.orderProducts)
    )
  }, [item, item?.orderProducts, orderParam, orderParam?.orderProducts])
  const localOrderTotal = useMemo(() => {
    if (
      hasOrderProducts(resolvedDisplayOrderProductsWithProductDetails) ||
      hasAuthoritativeEmptyOrderProducts
    ) {
      return calculateOrderProductsSubtotal(resolvedDisplayOrderProductsWithProductDetails)
    }

    const fallbackTotal = Number(
      resolvedDisplayOrder?.price ?? item?.price ?? orderParam?.price ?? 0,
    )
    return Number.isFinite(fallbackTotal) ? fallbackTotal : 0
  }, [
    hasAuthoritativeEmptyOrderProducts,
    item?.price,
    orderParam?.price,
    resolvedDisplayOrder?.price,
    resolvedDisplayOrderProductsWithProductDetails,
  ])
  const localPendingAmount = Math.max(localOrderTotal - localPaidAmount, 0)
  const localDisplayAmount = useMemo(
    () => resolveOperationalDisplayAmount({
      orderTotal: localOrderTotal,
      pendingAmount: localPendingAmount,
      receivedAmount: localReceivedAmount,
    }),
    [localOrderTotal, localPendingAmount, localReceivedAmount],
  )
  const localDisplayLabel = (() => {
    const labelKey = resolveOperationalDisplayLabelKey({
      pendingAmount: localPendingAmount,
      receivedAmount: localReceivedAmount,
    })

    if (labelKey === 'pending') {
      return global.t?.t('orders', 'label', 'pending') || 'Pendente'
    }

    if (labelKey === 'paid') {
      return global.t?.t('orders', 'label', 'paid') || 'Paga'
    }

    return global.t?.t('orders', 'label', 'localTotal') || 'Total'
  })()
  const shouldShowInlineOrderTotal = shouldRenderOrderDetailsInlineTotal({
    useUnifiedKdsLayout,
    isKds,
    isTvDisplay,
    displayAmount: localDisplayAmount,
  })

  return {
    activeLocalInvoices,
    localFinancialCompanyId,
    localInvoiceCards,
    localPaidAmount,
    localReceivedAmount,
    groupedInvoiceSections,
    hasAuthoritativeEmptyOrderProducts,
    localOrderTotal,
    localPendingAmount,
    localDisplayAmount,
    localDisplayLabel,
    shouldShowInlineOrderTotal,
  }
}
