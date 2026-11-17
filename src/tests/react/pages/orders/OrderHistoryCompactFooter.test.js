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
jest.mock('@controleonline/ui-default/src/react/components/table/DefaultTablePaginationBar', () => () => 'PAGINATION_BAR');

const OrderHistoryCompactFooter = require('../../../../react/pages/orders/OrderHistoryCompactFooter').default;

const render = () => ReactDOMServer.renderToStaticMarkup(React.createElement(OrderHistoryCompactFooter, {storeName: 'orders'}));

describe('OrderHistoryCompactFooter', () => {
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
