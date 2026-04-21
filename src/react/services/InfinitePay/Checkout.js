import InfinitePayService from './InfinitePay';

export const runInfinitePayCheckoutPayment = async ({
  installments = null,
  order = null,
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

  const response = await new InfinitePayService().payment(
    payment.paymentCode,
    installments || payment.installments || 1,
    order?.['@id'] || order?.id || '',
    Math.round(resolvedTotal * 100).toString(),
  );

  return {
    paidAmount:
      Number(response?.result?.paidAmount || 0) > 0
        ? Number(response.result.paidAmount) / 100
        : resolvedTotal,
    response,
  };
};
