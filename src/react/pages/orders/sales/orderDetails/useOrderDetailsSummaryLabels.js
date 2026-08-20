import { useMemo, useCallback } from 'react'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import { formatHumanLabel } from '@controleonline/ui-common/src/react/utils/entityDisplay'
import { resolveMarketplaceAppLabel } from '@controleonline/ui-orders/src/react/utils/orderIdentity'
import { app_type } from '@appType'

export default function useOrderDetailsSummaryLabels({
  orderAdditionalInfoEntries,
  isTerminalOrder,
  orderWaitingLabel,
  item,
  orderParam,
  localDisplayLabel,
  localDisplayAmount,
  setDetailsModalVisible,
  setFinancialDetailsVisible,
  itemId,
  orderParamId,
  routeOrderId,
}) {
  const localInvoicesEmptyText =
    global.t?.t('orders', 'message', 'noInvoicesLinkedToOrder') ||
    'Nenhuma invoice vinculada a este pedido.'
  const localInvoicesSectionTitle =
    global.t?.t('orders', 'label', 'payment') ||
    global.t?.t('orders', 'title', 'payments') ||
    'Pagamentos'
  const shouldShowPreparationTime = !isTerminalOrder && !!orderWaitingLabel
  const summaryInformationEntries = (() => {
    const entries = orderAdditionalInfoEntries.map(entry => ({
      key: entry.id,
      label: formatHumanLabel(entry.label || entry.name || entry.context) || 'Campo',
      value: entry.value,
    }))

    if (!shouldShowPreparationTime && orderWaitingLabel) {
      entries.unshift({
        key: 'preparation-time',
        label: global.t?.t('orders', 'label', 'preparationTime') || 'Tempo de preparo',
        value: orderWaitingLabel,
      })
    }

    return entries
  })()
  const orderAppLabel = useMemo(() => {
    const resolvedApp = resolveMarketplaceAppLabel(item || orderParam)
    if (resolvedApp) {
      return resolvedApp
    }

    return String(app_type || '').trim().toUpperCase()
  }, [item, orderParam])
  const compactOrderSummary = useMemo(
    () => ({
      accessibilityLabel: [
        `${localDisplayLabel}: ${Formatter.formatMoney(localDisplayAmount || 0)}`,
      ].join('. '),
      totalValue: Formatter.formatMoney(localDisplayAmount || 0),
    }),
    [localDisplayAmount, localDisplayLabel],
  )
  const closeDetailsModal = useCallback(() => {
    setDetailsModalVisible(false)
  }, [setDetailsModalVisible])
  const closeFinancialDetailsModal = useCallback(() => {
    setFinancialDetailsVisible(false)
  }, [setFinancialDetailsVisible])

  const topBarOrderId = itemId || orderParamId || routeOrderId

  return {
    localInvoicesEmptyText,
    localInvoicesSectionTitle,
    shouldShowPreparationTime,
    summaryInformationEntries,
    orderAppLabel,
    compactOrderSummary,
    closeDetailsModal,
    closeFinancialDetailsModal,
    topBarOrderId,
  }
}
