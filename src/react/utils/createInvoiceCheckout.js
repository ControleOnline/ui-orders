import { clearCreateInvoiceOnlyMode, isCreateInvoiceOnlyMode } from './createInvoiceSession';
import { normalizeGatewayPaymentError } from '@controleonline/ui-common/src/react/services/paymentGatewayExecution';

export async function tryCreateInvoiceOnlyPayment({
  payment, total, order, createPaidInvoice, setSubmittingPayment, invoiceActions,
}) {
  if (!isCreateInvoiceOnlyMode()) return false;
  setSubmittingPayment(true);
  try {
    await createPaidInvoice(payment, total, order);
    clearCreateInvoiceOnlyMode();
  } catch (error) {
    invoiceActions.setError(
      normalizeGatewayPaymentError(error, 'Nao foi possivel registrar a fatura.'),
    );
  } finally {
    setSubmittingPayment(false);
  }
  return true;
}

export function clearCreateInvoiceFlagIfActive() {
  if (isCreateInvoiceOnlyMode()) clearCreateInvoiceOnlyMode();
}
