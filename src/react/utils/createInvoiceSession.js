/**
 * Session flag for "Criar fatura" from Order History.
 * Reuses POS product selection + Checkout, but skips payment gateway (Cielo)
 * and only persists the invoice.
 */

let createInvoiceOnlyMode = false;

export const setCreateInvoiceOnlyMode = enabled => {
  createInvoiceOnlyMode = !!enabled;
};

export const isCreateInvoiceOnlyMode = () => createInvoiceOnlyMode;

export const clearCreateInvoiceOnlyMode = () => {
  createInvoiceOnlyMode = false;
};
