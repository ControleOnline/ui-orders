import {
  clearCreateInvoiceOnlyMode,
  isCreateInvoiceOnlyMode,
  setCreateInvoiceOnlyMode,
} from '../../../react/utils/createInvoiceSession';

describe('createInvoiceSession', () => {
  afterEach(() => {
    clearCreateInvoiceOnlyMode();
  });

  it('toggles create-invoice-only mode', () => {
    expect(isCreateInvoiceOnlyMode()).toBe(false);
    setCreateInvoiceOnlyMode(true);
    expect(isCreateInvoiceOnlyMode()).toBe(true);
    clearCreateInvoiceOnlyMode();
    expect(isCreateInvoiceOnlyMode()).toBe(false);
  });
});
