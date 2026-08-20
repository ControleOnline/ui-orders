/* global describe, expect, it */

const {
  normalizeStatusKey,
  summarizeInvoices,
  isTerminalOrder,
  translateOrderStatus,
  isPendingCartOrder,
  listPendingCartOrders,
  partitionTreeRounds,
} = require('../../../../react/pages/checkout/linkedOrderSettlementHelpers')

describe('linkedOrderSettlementHelpers (#290)', () => {
  it('normalizeStatusKey lowercases', () => {
    expect(normalizeStatusKey('Closed')).toBe('closed')
  })

  it('summarizeInvoices counts paid closed invoices', () => {
    const summary = summarizeInvoices([
      {price: 10, status: {realStatus: 'closed'}},
      {price: 5, status: {realStatus: 'open'}},
      {price: 7, status: {realStatus: 'closed'}},
    ])
    expect(summary.count).toBe(3)
    expect(summary.paidAmount).toBe(17)
  })

  it('isTerminalOrder detects closed', () => {
    expect(isTerminalOrder({status: {realStatus: 'closed'}})).toBe(true)
    expect(isTerminalOrder({status: {realStatus: 'open'}})).toBe(false)
  })
})

describe('linkedOrderSettlementHelpers pending carts (#21)', () => {
  it('isPendingCartOrder detects cart orderType', () => {
    expect(isPendingCartOrder({orderType: 'cart', status: {realStatus: 'open'}})).toBe(true)
    expect(isPendingCartOrder({orderType: 'sale', status: {realStatus: 'open'}})).toBe(false)
    expect(isPendingCartOrder({orderType: 'table', status: {realStatus: 'open'}})).toBe(false)
    expect(isPendingCartOrder({orderType: 'cart', status: {realStatus: 'closed'}})).toBe(false)
  })

  it('listPendingCartOrders filters tree', () => {
    const orders = [
      {id: 1, orderType: 'cart', status: {realStatus: 'open'}},
      {id: 2, orderType: 'sale', status: {realStatus: 'open'}},
      {id: 3, orderType: 'cart', status: {realStatus: 'closed'}},
    ]
    expect(listPendingCartOrders(orders).map(o => o.id)).toEqual([1])
  })

  it('partitionTreeRounds separates carts and sales', () => {
    const {pendingCarts, sales} = partitionTreeRounds([
      {id: 1, orderType: 'cart', status: {realStatus: 'open'}},
      {id: 2, orderType: 'sale', status: {realStatus: 'open'}},
      {id: 3, orderType: 'table', status: {realStatus: 'open'}},
    ])
    expect(pendingCarts.map(o => o.id)).toEqual([1])
    expect(sales.map(o => o.id)).toEqual([2])
  })
})
