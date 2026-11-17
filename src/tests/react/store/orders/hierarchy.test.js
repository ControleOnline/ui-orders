import {withOrderProductHierarchy} from '../../../../store/orders/hierarchy'
import {calculateOrderProductsSubtotal} from '../../../../utils/orderState'

it('preserves hierarchy in the committed payload and returned order after a refresh clears the item', async () => {
  const previous = {id: 1, orderProducts: [{id: 10, quantity: 1, total: 73},
    {id: 11, quantity: 1, total: 10, orderProduct: '/order_products/10'}]}
  const getters = {item: previous, items: [previous]}
  const commits = []
  const context = {getters, commit: (type, payload) => {
    commits.push({type, payload})
    if (type === 'SET_ITEM') getters.item = payload
  }}
  const partial = {id: 1, orderProducts: [{id: 10, quantity: 2, total: 146}, {id: 11, quantity: 2, total: 20}]}
  const refresh = withOrderProductHierarchy(async ({commit}) => {
    commit('SET_ITEM', {})
    await Promise.resolve()
    commit('SET_ITEM', partial)
    return partial
  })
  const result = await refresh(context)
  expect(calculateOrderProductsSubtotal(getters.item.orderProducts)).toBe(146)
  expect(calculateOrderProductsSubtotal(result.orderProducts)).toBe(146)
  expect(commits.at(-1).payload.orderProducts[1].orderProduct).toBe('/order_products/10')
  expect(partial.orderProducts[1].orderProduct).toBeUndefined()
})
