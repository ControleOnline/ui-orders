const assert = require('node:assert/strict')
const {describe, it} = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

// Load pure ESM helpers by stripping export keywords for CJS eval
const srcPath = path.join(
  __dirname,
  '../../../../react/pages/checkout/pendingCartHelpers.js',
)
const raw = fs.readFileSync(srcPath, 'utf8')
const cjs = raw
  .replace(/export const /g, 'const ')
  .replace(/export \{[^}]+\};?/g, '')
const sandbox = {module: {exports: {}}, exports: {}}
vm.runInNewContext(
  cjs +
    '\nmodule.exports = { normalizeStatusKey, isTerminalOrder, isPendingCartOrder, listPendingCartOrders, partitionTreeRounds };',
  sandbox,
)
const {
  isPendingCartOrder,
  listPendingCartOrders,
  partitionTreeRounds,
  isTerminalOrder,
} = sandbox.module.exports

describe('pending cart helpers (#21)', () => {
  it('detects cart as pending', () => {
    assert.equal(
      isPendingCartOrder({orderType: 'cart', status: {realStatus: 'open'}}),
      true,
    )
  })
  it('sale is not pending cart', () => {
    assert.equal(
      isPendingCartOrder({orderType: 'sale', status: {realStatus: 'open'}}),
      false,
    )
  })
  it('table root is not pending cart', () => {
    assert.equal(
      isPendingCartOrder({orderType: 'table', status: {realStatus: 'open'}}),
      false,
    )
  })
  it('closed cart is not pending', () => {
    assert.equal(
      isPendingCartOrder({orderType: 'cart', status: {realStatus: 'closed'}}),
      false,
    )
  })
  it('listPendingCartOrders filters', () => {
    const ids = listPendingCartOrders([
      {id: 1, orderType: 'cart', status: {realStatus: 'open'}},
      {id: 2, orderType: 'sale', status: {realStatus: 'open'}},
      {id: 3, orderType: 'cart', status: {realStatus: 'closed'}},
    ]).map(o => o.id)
    assert.equal(ids.length, 1)
    assert.equal(ids[0], 1)
  })
  it('partitionTreeRounds separates carts and sales', () => {
    const {pendingCarts, sales} = partitionTreeRounds([
      {id: 1, orderType: 'cart', status: {realStatus: 'open'}},
      {id: 2, orderType: 'sale', status: {realStatus: 'open'}},
      {id: 3, orderType: 'table', status: {realStatus: 'open'}},
    ])
    assert.equal(pendingCarts.length, 1)
    assert.equal(pendingCarts[0].id, 1)
    assert.equal(sales.length, 1)
    assert.equal(sales[0].id, 2)
  })
  it('isTerminalOrder still works', () => {
    assert.equal(isTerminalOrder({status: {realStatus: 'closed'}}), true)
    assert.equal(isTerminalOrder({status: {realStatus: 'open'}}), false)
  })
})
