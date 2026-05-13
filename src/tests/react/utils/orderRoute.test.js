const {describe, expect, it} = global

const {
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
})
