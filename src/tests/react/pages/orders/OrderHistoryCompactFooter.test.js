const React = require('react');
const ReactDOMServer = require('react-dom/server');

const {describe, expect, it} = global;

let mockConfigs = {};

jest.mock('@store', () => ({
  useStore: jest.fn(() => ({getters: {configs: mockConfigs, totalItems: 45, summary: {}}})),
}));
jest.mock('react-native', () => {
  const React = require('react');
  const el = name => props => React.createElement(name, null, props.children);
  return {StyleSheet: {create: v => v}, Text: el('text'), View: el('view')};
});
jest.mock('@controleonline/ui-default/src/react/components/table/useDefaultTableTheme', () => () => ({themeColors: {}}));
jest.mock('@controleonline/ui-common/src/utils/formatter', () => ({formatMoney: v => String(v)}));
jest.mock('@controleonline/ui-default/src/react/components/table/DefaultTablePaginationBar', () => props => require('react').createElement('pager', {embedded: String(props.embedded)}, 'PAGINATION_BAR'));

const OrderHistoryCompactFooter = require('../../../../react/pages/orders/OrderHistoryCompactFooter').default;

const render = () => ReactDOMServer.renderToStaticMarkup(React.createElement(OrderHistoryCompactFooter, {storeName: 'orders'}));

jest.mock('../../../../react/pages/orders/orderHistoryCompactSummary', () => ({
  resolveHistorySalesTotals: () => ({orders: 7, revenue: 100, averageTicket: 14}),
}));

describe('OrderHistoryCompactFooter', () => {
  it('keeps totals and the embedded paginator in a single row', () => {
    mockConfigs = {paginationMode: 'pages', showTotalItemsInFooter: true, requestParams: {summary: 'sales'}};
    const html = render();
    expect(html).toContain('embedded="true"');
    expect(html).toContain('Vendas concluídas');
    expect(html).toContain('Receita concluída');
    expect(html).toContain('Ticket médio');
    // Exactly one footer container holds both the metrics and the pager.
    expect(html.indexOf('PAGINATION_BAR')).toBeGreaterThan(html.indexOf('Ticket médio'));
    expect(html).not.toContain('filtros aplicados');
  });

  it('renders the paginator next to the totals', () => {
    mockConfigs = {paginationMode: 'pages', showTotalItemsInFooter: true};
    const html = render();
    expect(html).toContain('PAGINATION_BAR');
    expect(html).toContain('45');
  });

  it('keeps the paginator when the totals are hidden', () => {
    mockConfigs = {paginationMode: 'pages', showTotalItemsInFooter: false};
    expect(render()).toContain('PAGINATION_BAR');
  });
});
