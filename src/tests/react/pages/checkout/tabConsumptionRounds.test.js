const {partitionTabConsultationRounds} = require('../../../../react/pages/checkout/pendingCartHelpers')

it('keeps sent and closed sales, separates drafts and excludes canceled records from tab consumption', () => {
  const result = partitionTabConsultationRounds([
    {id: 1, orderType: 'sale', status: {realStatus: 'open'}},
    {id: 2, orderType: 'sale', status: {realStatus: 'closed'}},
    {id: 3, orderType: 'cart', status: {realStatus: 'open'}},
    {id: 4, orderType: 'sale', status: {realStatus: 'canceled'}},
    {id: 5, orderType: 'cart', status: {realStatus: 'cancelled'}},
  ])
  expect(result.sales.map(order => order.id)).toEqual([1, 2])
  expect(result.pendingCarts.map(order => order.id)).toEqual([3])
  expect(result.other).toEqual([])
})
