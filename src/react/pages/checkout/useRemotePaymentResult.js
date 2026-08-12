import {useEffect} from 'react';
import {
  isRemotePaymentResultMessage,
  normalizeRemotePaymentResultStatus,
  normalizeRemotePaymentRequestKey,
} from '@controleonline/ui-common/src/react/utils/remotePayment';

export default function useRemotePaymentResult({
  appendInvoiceToStore,
  appendOrderInvoiceToStore,
  buildOrderDetailsNavigationParams,
  invoiceActions,
  invoiceMessage,
  isSingleItemMode,
  navigation,
  order,
  ordersActions,
  pendingRemotePaymentRequest,
  resetCompletedOrderState,
  resetToOrderHistory,
  resolveNextPayableAfterPayment,
  routeOrderId,
  setPendingRemotePaymentRequest,
  setSubmittingPayment,
  syncLoyaltySelectionToOrder,
}) {
  useEffect(() => {
    if (!isRemotePaymentResultMessage(invoiceMessage)) return;

    const messageRequestKey = normalizeRemotePaymentRequestKey(
      invoiceMessage?.requestKey,
    );

    if (!messageRequestKey) {
      invoiceActions.setMessage(null);
      return;
    }

    if (pendingRemotePaymentRequest?.requestKey !== messageRequestKey) {
      invoiceActions.setMessage(null);
      return;
    }

    const handleRemotePaymentResult = async () => {
      try {
        const resultStatus = normalizeRemotePaymentResultStatus(invoiceMessage);

        if (resultStatus === 'success') {
          const paidAmount = Number(
            invoiceMessage?.paidAmount ??
              invoiceMessage?.invoice?.price ??
              0,
          );
          const nextPayable = resolveNextPayableAfterPayment(paidAmount);

          if (invoiceMessage?.invoice) {
            appendInvoiceToStore(invoiceMessage.invoice);
            appendOrderInvoiceToStore(invoiceMessage.invoice, paidAmount);
          }

          ordersActions.setPayable(nextPayable < 0 ? nextPayable : 0);

          let resolvedOrder = invoiceMessage?.order || order;
          if (routeOrderId) {
            const fetchedOrder = await ordersActions.get(routeOrderId).catch(() => null);
            if (fetchedOrder) resolvedOrder = fetchedOrder;
          }

          const syncedOrder = await syncLoyaltySelectionToOrder(resolvedOrder);
          const navigationOrder =
            syncedOrder || resolvedOrder || invoiceMessage?.order || routeOrderId || order;

          if (isSingleItemMode && nextPayable >= 0) {
            resetCompletedOrderState();
            resetToOrderHistory();
            return;
          }

          navigation.navigate(
            'OrderDetails',
            buildOrderDetailsNavigationParams(navigationOrder),
          );
          return;
        }

        if (resultStatus === 'canceled') {
          invoiceActions.setError('');
          return;
        }

        invoiceActions.setError(
          invoiceMessage?.error || 'Nao foi possivel concluir o pagamento remoto.',
        );
      } finally {
        setPendingRemotePaymentRequest(null);
        setSubmittingPayment(false);
        invoiceActions.setMessage(null);
      }
    };

    handleRemotePaymentResult();
  }, [
    appendInvoiceToStore,
    appendOrderInvoiceToStore,
    buildOrderDetailsNavigationParams,
    invoiceActions,
    invoiceMessage,
    isSingleItemMode,
    navigation,
    order,
    ordersActions,
    pendingRemotePaymentRequest?.requestKey,
    resetCompletedOrderState,
    resetToOrderHistory,
    resolveNextPayableAfterPayment,
    routeOrderId,
    setPendingRemotePaymentRequest,
    setSubmittingPayment,
    syncLoyaltySelectionToOrder,
  ]);
}
