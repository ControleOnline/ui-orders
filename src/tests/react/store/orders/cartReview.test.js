const mockFetch = jest.fn()
jest.mock('@controleonline/ui-common/src/api', () => ({api: {fetch: (...args) => mockFetch(...args)}}))
jest.mock('@assets/ppc/channels', () => ({getOrderChannelLogo: () => null}))
const {addProducts, syncOrder} = require('../../../../store/orders/customActions')
const {withOrderProductHierarchy} = require('../../../../store/orders/hierarchy')
const {confirmPendingProducts} = require('../../../../react/utils/confirmPendingProducts')
const {clearPendingAddProducts} = require('../../../../react/utils/addProductSession')
const {buildOrderProductCards} = require('../../../../react/components/OrderProducts.utils')
const {calculateOrderProductsSubtotal, removeOrderProductFromList, withOrderProductQuantity} = require('../../../../utils/orderState')
const {needsDetailedOrderProductsFetch} = require('../../../../react/utils/orderProductsFetchPolicy')

it('reviews simple/custom/simple/custom additions immediately from acknowledged store data', async () => {
  clearPendingAddProducts()
  const getters = {resourceEndpoint: 'orders', item: {id: 72952, orderProducts: []}, items: []}
  const context = {getters, commit: (type, value) => {
    if (type === 'SET_ITEM') getters.item = value
    if (type === 'SET_ITEMS') getters.items = value
    if (type === 'SET_LOADED_AT') getters.loadedAt = value
    if (type === 'SET_LOADED_KEY') getters.loadedKey = value
  }}
  const ordersActions = {
    addProducts: (...args) => withOrderProductHierarchy(addProducts)(context, ...args),
    syncOrder: item => withOrderProductHierarchy(syncOrder)(context, item),
    get: () => {throw new Error('Unexpected order reread')},
  }
  const orderProductsActions = {setItems: () => {}, getItems: () => {throw new Error('Unexpected item reread')}}
  const water = {id: 1, product: {id: 9, product: 'Água'}, quantity: 1, price: 5, total: 5, hierarchyComplete: true}
  const group = {id: 20, productGroup: 'Bebida', showInDisplay: true, required: false, minimum: 0}
  const combo = id => [{id, product: {id: 10, product: 'Combo', type: 'custom'}, quantity: 1,
    price: 73, total: 73, hierarchyComplete: true},
    {id: id + 1, product: {id: 9, product: 'Água'}, quantity: 1, price: 5, total: 5,
      orderProduct: `/order_products/${id}`, parentProduct: '/products/10', productGroup: group,
      showInParentQueue: true, hierarchyComplete: true}]
  const stages = [[water], [water, ...combo(10)], [{...water, quantity: 2, total: 10}, ...combo(10)],
    [{...water, quantity: 2, total: 10}, ...combo(10), ...combo(20)]]
  const totals = [5, 78, 83, 156]
  for (let index = 0; index < stages.length; index++) {
    mockFetch.mockResolvedValueOnce({id: 72952, app: 'POS', orderType: 'cart', price: totals[index], orderProducts: stages[index]})
    await ordersActions.addProducts(72952, [{product: index % 2 ? 10 : 9, quantity: 1}])
    expect(getters.loadedKey).toBe('72952')
    expect(getters.loadedAt).toBeGreaterThan(0)
    const review = await confirmPendingProducts({order: getters.item, ordersActions, orderProductsActions})
    expect(calculateOrderProductsSubtotal(review.orderProducts)).toBe(totals[index])
    expect(needsDetailedOrderProductsFetch(review.orderProducts)).toBe(false)
    const cards = buildOrderProductCards(review.orderProducts)
    expect(cards.filter(card => card.name === 'Água')).toHaveLength(1)
    const combos = cards.filter(card => card.name === 'Combo')
    expect(combos).toHaveLength(index === 0 ? 0 : index === 3 ? 2 : 1)
    combos.forEach(card => expect(card.groups[0].items[0].name).toBe('Água'))
  }
  expect(mockFetch.mock.calls.map(call => call[0])).toEqual(Array(4).fill('orders/72952/add-products'))
  const adjusted = getters.item.orderProducts.map(line => line.id === 1 ? withOrderProductQuantity(line, 3) : line)
  expect(calculateOrderProductsSubtotal(adjusted)).toBe(161)
  const removed = removeOrderProductFromList(adjusted, {id: 10})
  expect(removed.map(line => line.id)).toEqual([1, 20, 21])
  expect(calculateOrderProductsSubtotal(removed)).toBe(88)
  expect(buildOrderProductCards(removed).filter(card => card.name === 'Combo')).toHaveLength(1)
})
