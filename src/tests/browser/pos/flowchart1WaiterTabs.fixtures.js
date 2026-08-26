const path = require('path')

const FLOWCHART_IDS = [1]
const FLUXO = 'pedido-criacao'
const SCREENSHOT_DIR = path.join(
  __dirname,
  'screenshots',
  'flowchart-1-waiter-tabs',
)

const TABLE_ID = 700
const TAB_A_ID = 701
const CART_A_ID = 702
const TAB_B_ID = 703
const CART_B_ID = 704
const SALE_A_ID = 705
const SALE_B_ID = 706

const TABLE_CODE = 'MESA-7'
const TAB_A_CODE = 'CMD-A'
const TAB_B_CODE = 'CMD-B'

const openStatus = (label = 'open') => ({
  '@id': '/statuses/901',
  id: 901,
  status: label,
  realStatus: label,
})

const readyStatus = () => ({
  '@id': '/statuses/940',
  id: 940,
  status: 'ready',
  realStatus: 'ready',
})

const createProduct = (id, overrides = {}) => ({
  '@id': `/products/${id}`,
  id,
  product: overrides.product || `Produto ${id}`,
  description: overrides.description || '',
  type: overrides.type || 'product',
  price: Number(overrides.price ?? 0),
  quantity: Number(overrides.quantity ?? 0),
  sku: overrides.sku || `SKU-${id}`,
  active: overrides.active !== undefined ? overrides.active : 1,
})

const PRODUCT_A = createProduct(101, {product: 'Amendoim', price: 12.5})
const PRODUCT_B = createProduct(102, {product: 'Refrigerante', price: 8.9})

const buildOrderProduct = (id, product, quantity = 1) => ({
  id,
  '@id': `/order_products/${id}`,
  product: {...product},
  quantity,
  price: Number(product.price || 0),
  total: Number(product.price || 0) * Number(quantity || 0),
})

const createOrder = ({
  id,
  orderType,
  externalCode = '',
  mainOrderId = null,
  products = [],
  price = 0,
  status = openStatus(),
} = {}) => ({
  '@id': `/orders/${id}`,
  id,
  app: 'POS',
  orderType,
  ...(externalCode ? {externalCode} : {}),
  ...(mainOrderId ? {mainOrderId} : {}),
  provider: '/people/3',
  people: '/people/3',
  status,
  price: Number(price || 0),
  payable: Number(price || 0),
  orderProducts: products,
})

const createWaiterTableDeviceConfig = (appVersion = '1.0.0') => ({
  id: 1,
  '@id': '/device_configs/1',
  device: {id: 1, device: 'web-7'},
  people: {id: 3},
  type: 'PDV',
  configs: {
    'config-version': appVersion,
    'pos-operation-mode': 'waiter',
    'check-order-type': 'table',
    'check-order-management-mode': 'manage',
    'check-type': 'manual',
    'pos-gateway': 'cielo',
    'pos-type': 'simple',
    'pos-local-charge-enabled': false,
    'order-charge-enabled': false,
    manage_pos_check_orders: true,
    'pos-default-status': 901,
    'pos-paid-status': 902,
  },
})

const createTableOnlyTree = () => [
  createOrder({
    id: TABLE_ID,
    orderType: 'table',
    externalCode: TABLE_CODE,
  }),
]

const attachTab = (orders, {tabId, cartId, code, product, orderProductId}) => {
  const next = orders.filter(
    order => Number(order.id) !== Number(tabId) && Number(order.id) !== Number(cartId),
  )
  next.push(
    createOrder({
      id: tabId,
      orderType: 'tab',
      externalCode: code,
      mainOrderId: TABLE_ID,
      price: Number(product.price || 0),
    }),
    createOrder({
      id: cartId,
      orderType: 'cart',
      externalCode: code,
      mainOrderId: tabId,
      price: Number(product.price || 0),
      products: [buildOrderProduct(orderProductId, product, 1)],
    }),
  )
  return next
}

const createTwoTabTree = () => {
  let orders = createTableOnlyTree()
  orders = attachTab(orders, {
    tabId: TAB_A_ID,
    cartId: CART_A_ID,
    code: TAB_A_CODE,
    product: PRODUCT_A,
    orderProductId: 801,
  })
  orders = attachTab(orders, {
    tabId: TAB_B_ID,
    cartId: CART_B_ID,
    code: TAB_B_CODE,
    product: PRODUCT_B,
    orderProductId: 802,
  })
  return orders
}

const withReadySales = orders => [
  ...orders,
  createOrder({
    id: SALE_A_ID,
    orderType: 'sale',
    externalCode: TAB_A_CODE,
    mainOrderId: TAB_A_ID,
    price: PRODUCT_A.price,
    status: readyStatus(),
    products: [buildOrderProduct(901, PRODUCT_A, 1)],
  }),
  createOrder({
    id: SALE_B_ID,
    orderType: 'sale',
    externalCode: TAB_B_CODE,
    mainOrderId: TAB_B_ID,
    price: PRODUCT_B.price,
    status: readyStatus(),
    products: [buildOrderProduct(902, PRODUCT_B, 1)],
  }),
]

module.exports = {
  FLOWCHART_IDS,
  FLUXO,
  SCREENSHOT_DIR,
  TABLE_ID,
  TAB_A_ID,
  CART_A_ID,
  TAB_B_ID,
  CART_B_ID,
  TABLE_CODE,
  TAB_A_CODE,
  TAB_B_CODE,
  PRODUCT_A,
  PRODUCT_B,
  attachTab,
  createOrder,
  createTableOnlyTree,
  createTwoTabTree,
  createWaiterTableDeviceConfig,
  withReadySales,
}
