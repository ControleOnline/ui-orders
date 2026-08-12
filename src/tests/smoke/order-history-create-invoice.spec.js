import {
  clearCreateInvoiceOnlyMode, isCreateInvoiceOnlyMode, setCreateInvoiceOnlyMode,
} from '../../react/utils/createInvoiceSession';
import { tryCreateInvoiceOnlyPayment } from '../../react/utils/createInvoiceCheckout';

describe('smoke: order-history create invoice', () => {
  afterEach(() => clearCreateInvoiceOnlyMode());
  it('toggles create-invoice-only mode', () => {
    setCreateInvoiceOnlyMode(true);
    expect(isCreateInvoiceOnlyMode()).toBe(true);
  });
  it('tryCreateInvoiceOnlyPayment no-ops when off', async () => {
    const createPaidInvoice = jest.fn();
    const handled = await tryCreateInvoiceOnlyPayment({
      payment: {}, total: 1, order: {}, createPaidInvoice,
      setSubmittingPayment: jest.fn(), invoiceActions: { setError: jest.fn() },
    });
    expect(handled).toBe(false);
    expect(createPaidInvoice).not.toHaveBeenCalled();
  });
  it('tryCreateInvoiceOnlyPayment persists when on', async () => {
    setCreateInvoiceOnlyMode(true);
    const createPaidInvoice = jest.fn().mockResolvedValue({});
    const handled = await tryCreateInvoiceOnlyPayment({
      payment: {}, total: 10, order: {}, createPaidInvoice,
      setSubmittingPayment: jest.fn(), invoiceActions: { setError: jest.fn() },
    });
    expect(handled).toBe(true);
    expect(createPaidInvoice).toHaveBeenCalled();
    expect(isCreateInvoiceOnlyMode()).toBe(false);
  });
});
