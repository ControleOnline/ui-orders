const {describe, expect, it} = global

const {
  buildAddProductsRouteParams,
  buildOrderDetailsRouteParams,
  isPdvRouteContext,
  shouldShowOrderHistoryCompanyFilter,
} = require('../../../react/utils/orderRoute')

describe('orderRoute', () => {
  it('detects pdv context from interaction mode or explicit toolbar flag', () => {
    expect(isPdvRouteContext({interactionMode: 'pdv'})).toBe(true)
    expect(isPdvRouteContext({showBottomToolBar: true})).toBe(true)
    expect(isPdvRouteContext({interactionMode: 'manager'})).toBe(false)
  })

  it('hides the company filter in the order history for every POS runtime', () => {
    expect(
      shouldShowOrderHistoryCompanyFilter({
        appType: 'POS',
        params: {},
      }),
    ).toBe(false)

    expect(
      shouldShowOrderHistoryCompanyFilter({
        appType: 'POS',
        params: {interactionMode: 'waiter'},
      }),
    ).toBe(false)
  })

  it('also hides the company filter when another app hosts the pdv flow', () => {
    expect(
      shouldShowOrderHistoryCompanyFilter({
        appType: 'MANAGER',
        params: {interactionMode: 'pdv'},
      }),
    ).toBe(false)
  })

  it('keeps the company filter for non-operational order history flows', () => {
    expect(
      shouldShowOrderHistoryCompanyFilter({
        appType: 'MANAGER',
        params: {interactionMode: 'manager'},
      }),
    ).toBe(true)
  })

  it('marks add-product navigation to resume the selected order', () => {
    expect(
      buildAddProductsRouteParams({id: 71736}, {interactionMode: 'pdv'}),
    ).toEqual({
      id: '71736',
      interactionMode: 'pdv',
      resumeExistingOrder: true,
    })
  })

  it('carries the explicit order type into the order details params', () => {
    expect(
      buildOrderDetailsRouteParams({id: 72532, orderType: 'delivery'}),
    ).toEqual({
      id: '72532',
      orderType: 'delivery',
    })
  })
})
