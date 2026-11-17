jest.mock('../../../../../react/pages/orders/sales/components/OrderTopBarActions', () => ({
  ORDER_TOP_BAR_ACTIONS: {PRINT: 'print', NF: 'nf', LOGISTICS: 'logistics', ATTACHMENTS: 'attachments', TOOLS: 'tools', LOGS: 'logs'},
}))
const {resolveOrderTopBarButtons} = require('../../../../../react/pages/orders/sales/orderDetails/resolveOrderTopBarButtons')

describe('order top bar button availability', () => {
  it.each([
    [null, false, ['print']],
    [123, false, ['print', 'nf', 'logistics', 'attachments']],
    [null, true, ['print', 'tools', 'logs']],
    [123, true, ['print', 'nf', 'logistics', 'attachments', 'tools', 'logs']],
  ])('preserves order identity and debug gates (%s, %s)', (topBarOrderId, canShowDebugActions, expected) => {
    expect(resolveOrderTopBarButtons({topBarOrderId, canShowDebugActions})).toEqual(expected)
  })
})
