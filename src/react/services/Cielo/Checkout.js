import CieloService from './Cielo';

export const formatCieloCheckoutProducts = orderProducts =>
  (Array.isArray(orderProducts) ? orderProducts : []).map(orderProduct => ({
    name: orderProduct?.product?.product,
    quantity: orderProduct?.quantity,
    sku:
      orderProduct?.product?.sku ||
      String(orderProduct?.product?.['@id'] || '').replace(/\D/g, ''),
    unitOfMeasure: 'unidade',
    unitPrice: Math.round(Number(orderProduct?.price || 0) * 100).toString(),
  }));

export const runCieloCheckoutPayment = async ({
  orderProducts = [],
  payment = null,
  total = 0,
}) => {
  const resolvedTotal = Number(total || 0);

  if (!payment?.paymentCode) {
    throw new Error('Meio de pagamento sem codigo de gateway.');
  }

  if (resolvedTotal <= 0) {
    throw new Error('Informe um valor de pagamento valido.');
  }

  const response = await new CieloService().payment(
    payment.paymentCode,
    formatCieloCheckoutProducts(orderProducts),
    Math.round(resolvedTotal * 100).toString(),
  );

  return {
    paidAmount: resolvedTotal,
    response,
  };
};
