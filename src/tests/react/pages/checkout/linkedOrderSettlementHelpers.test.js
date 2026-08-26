/* global describe, expect, it */

const {
  normalizeStatusKey,
  summarizeInvoices,
  isTerminalOrder,
  translateOrderStatus,
  isPendingCartOrder,
  listPendingCartOrders,
  partitionTreeRounds,
  collectOrderDescendants,
  listLinkedTabsUnderRoot,
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

describe('linkedOrderSettlementHelpers table tabs (#605)', () => {
  const table = {id: 700, orderType: 'table', externalCode: 'MESA-7'}
  const tabA = {
    id: 701,
    orderType: 'tab',
    externalCode: 'CMD-A',
    mainOrderId: 700,
  }
  const cartA = {id: 702, orderType: 'cart', mainOrderId: 701}
  const tabB = {
    id: 703,
    orderType: 'tab',
    externalCode: 'CMD-B',
    mainOrderId: 700,
  }
  const cartB = {id: 704, orderType: 'cart', mainOrderId: 703}

  it('keeps both tabs under the same table after the second is launched', () => {
    const afterFirst = [table, tabA, cartA]
    expect(listLinkedTabsUnderRoot(700, afterFirst).map(o => o.externalCode)).toEqual([
      'CMD-A',
    ])

    const afterSecond = [table, tabA, cartA, tabB, cartB]
    const tabs = listLinkedTabsUnderRoot(700, afterSecond)
    expect(tabs.map(o => o.externalCode)).toEqual(['CMD-A', 'CMD-B'])
    expect(tabs).toHaveLength(2)
    expect(collectOrderDescendants(700, afterSecond).map(o => o.id)).toEqual([
      701, 702, 703, 704,
    ])
  })

  it('does not drop the first tab when only the second cart is added later', () => {
    const orders = [table, tabA, tabB, cartB]
    expect(listLinkedTabsUnderRoot(700, orders).map(o => o.externalCode)).toEqual([
      'CMD-A',
      'CMD-B',
    ])
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
