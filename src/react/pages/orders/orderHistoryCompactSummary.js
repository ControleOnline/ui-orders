// The named summary field can wrap the sales resolver's payload.
export const resolveHistorySalesTotals = summary => {
  const totals = summary?.sales?.sales?.totals || summary?.sales?.totals;
  if (!totals || typeof totals !== 'object') return null;
  if (['revenue', 'averageTicket', 'orders'].some(key => totals[key] === null || totals[key] === undefined || totals[key] === '')) return null;
  const revenue = Number(totals.revenue);
  const averageTicket = Number(totals.averageTicket);
  const orders = Number(totals.orders);
  if (![revenue, averageTicket, orders].every(Number.isFinite)) return null;
  return {revenue, averageTicket, orders};
};
