import { useCallback } from 'react'

/**
 * Top-bar / tools / invoice navigation handlers for OrderDetails.
 */
export default function useOrderDetailsToolbarActions({
  canShowDebugActions,
  localInvoiceCards,
  loadOrderInvoices,
  setFinancialDetailsVisible,
  closeFinancialDetailsModal,
  invoiceActions,
  navigation,
  marketplaceSummary,
  setDetailsModalVisible,
  setAttachmentsVisible,
  topBarOrderId,
  itemId,
  orderParamId,
}) {
  const handleOpenFinancialDetails = useCallback(async () => {
    setFinancialDetailsVisible(true)
    if (!localInvoiceCards.length) {
      await loadOrderInvoices({ silent: true })
    }
  }, [loadOrderInvoices, localInvoiceCards.length, setFinancialDetailsVisible])

  const handleOpenInvoiceDetails = useCallback(
    invoiceCard => {
      const invoiceId = Number(invoiceCard?.invoiceId || 0)
      if (!invoiceId) {
        return
      }

      const storeInvoice =
        invoiceCard?.invoice && typeof invoiceCard.invoice === 'object'
          ? invoiceCard.invoice
          : {
              id: invoiceId,
              '@id': `/invoices/${invoiceId}`,
            }

      invoiceActions?.setItem?.(storeInvoice)
      closeFinancialDetailsModal()

      const openInvoiceDetails = () => {
        navigation.navigate('InvoiceDetailsPage', {
          id: invoiceId,
        })
      }

      const scheduleOpenInvoiceDetails = globalThis?.requestAnimationFrame

      if (typeof scheduleOpenInvoiceDetails === 'function') {
        scheduleOpenInvoiceDetails(openInvoiceDetails)
        return
      }

      setTimeout(openInvoiceDetails, 0)
    },
    [closeFinancialDetailsModal, invoiceActions, navigation],
  )

  const handleOrderTools = useCallback(async () => {
    if (!canShowDebugActions) {
      return
    }

    setDetailsModalVisible(true)
    await marketplaceSummary.ensureMarketplaceSummary()
  }, [canShowDebugActions, marketplaceSummary, setDetailsModalVisible])

  const handleOrderAttachments = useCallback(() => {
    if (!topBarOrderId) {
      return
    }

    setAttachmentsVisible(true)
  }, [setAttachmentsVisible, topBarOrderId])

  const handleOrderLogs = useCallback(() => {
    if (!canShowDebugActions) {
      return
    }

    const currentOrderId = itemId || orderParamId
    if (!currentOrderId) return

    navigation.navigate('EntityLogPage', {
      id: currentOrderId,
      store: 'orders',
    })
  }, [canShowDebugActions, itemId, navigation, orderParamId])

  const handleOrderLogistics = useCallback(() => {
    if (!topBarOrderId) {
      return
    }

    navigation.navigate('OrderLogisticsPage', {
      id: topBarOrderId,
    })
  }, [navigation, topBarOrderId])

  const handleOrderNf = useCallback(() => {
    if (!topBarOrderId) {
      return
    }

    navigation.navigate('OrderNfPage', {
      id: topBarOrderId,
    })
  }, [navigation, topBarOrderId])

  return {
    handleOpenFinancialDetails,
    handleOpenInvoiceDetails,
    handleOrderTools,
    handleOrderAttachments,
    handleOrderLogs,
    handleOrderLogistics,
    handleOrderNf,
  }
}
