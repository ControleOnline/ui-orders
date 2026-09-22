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
        // These references and the amount are advisory; the API authorizes and
        // recomputes the final invoice/order mutation server-side.
        price: amount,
      },
    },
  };
