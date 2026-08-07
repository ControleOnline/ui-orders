/* global describe, expect, it */

const {
  normalizeStatusKey,
  summarizeInvoices,
  isTerminalOrder,
  translateOrderStatus,
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
