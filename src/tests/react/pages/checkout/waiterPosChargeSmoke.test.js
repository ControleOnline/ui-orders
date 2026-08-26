/* global describe, expect, it */

const {
  WAITER_POS_CHARGE_SMOKE,
  applyPosPayment,
  buildReadyTableTree,
  closeSettlementTree,
  isPosChargeSurface,
  isTableStillOpen,
} = require('./waiterPosChargeSmoke')

describe('waiterPosChargeSmoke (#606)', () => {
  it('declares flowchart 1 and financeiro-cobranca', () => {
    expect(WAITER_POS_CHARGE_SMOKE.fluxo).toBe('financeiro-cobranca')
    expect(WAITER_POS_CHARGE_SMOKE.flowchartIds).toEqual([1])
    expect(WAITER_POS_CHARGE_SMOKE.chargeSurface).toBe('POS')
    expect(WAITER_POS_CHARGE_SMOKE.forbiddenChargeSurface).toBe('CHECKOUT')
    expect(WAITER_POS_CHARGE_SMOKE.prints).toEqual([
      'ready',
      'close-table-action',
      'pos-charge-screen',
      'payment',
      'closed',
    ])
  })

  it('builds a ready table with a linked sale still payable', () => {
    const tree = buildReadyTableTree()
    expect(tree.table).toMatchObject({
      orderType: 'table',
      externalCode: 'Mesa-12',
      status: {status: 'ready', realStatus: 'open'},
    })
    expect(tree.sale).toMatchObject({
      orderType: 'sale',
      mainOrderId: tree.table.id,
      payable: tree.table.price,
    })
    expect(isTableStillOpen(tree.orders, tree.table.id)).toBe(true)
  })

  it('closes the table only after POS payment reaches zero', () => {
    const tree = buildReadyTableTree({price: 36.9})
    const partial = applyPosPayment(tree.orders, 10)
    expect(isTableStillOpen(partial, tree.table.id)).toBe(true)

    const paid = applyPosPayment(tree.orders, 36.9)
    expect(paid.every(order => Number(order.payable) === 0)).toBe(true)

    const closed = closeSettlementTree(paid)
    expect(isTableStillOpen(closed, tree.table.id)).toBe(false)
    expect(closed[0].status.realStatus).toBe('closed')
  })

  it('accepts POS checkout and rejects ON CHECKOUT app', () => {
    expect(isPosChargeSurface('POS', 'http://127.0.0.1:4173/checkout?id=501')).toBe(
      true,
    )
    expect(
      isPosChargeSurface('CHECKOUT', 'https://checkout.controleonline.com/'),
    ).toBe(false)
    expect(
      isPosChargeSurface('POS', 'https://checkout.controleonline.com/pagamento'),
    ).toBe(false)
  })
})
