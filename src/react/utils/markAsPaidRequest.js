const extractId = value => {
  if (value == null) return null;
  const raw = typeof value === 'string' ? value : value?.id || value?.['@id'];
  const match = String(raw || '').match(/(\d+)/);
  return match ? match[1] : null;
};

export const buildMarkAsPaidRequest = ({
  order,
  selectedProduct,
  selectedPayment,
  amount,
} = {}) => {
  const orderId = extractId(order);
  if (!orderId) return null;

  const productIri =
    selectedProduct?.['@id'] || `/products/${extractId(selectedProduct)}`;
  const paymentTypeIri =
    selectedPayment?.paymentType?.['@id'] ||
    selectedPayment?.paymentType ||
    selectedPayment?.['@id'];
  const walletIri =
    selectedPayment?.wallet?.['@id'] || selectedPayment?.wallet || null;

  return {
    endpoint: `orders/${orderId}/mark-as-paid`,
    options: {
      method: 'POST',
      body: {
        product: productIri,
        paymentType: paymentTypeIri,
        destinationWallet: walletIri,
        // The server authorizes references and computes the outstanding amount.
      },
    },
  };
};
