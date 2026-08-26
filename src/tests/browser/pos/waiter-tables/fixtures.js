const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
})

const createCompany = (id, overrides = {}) => ({
  id,
  name: overrides.name || `Empresa ${id}`,
  alias: overrides.alias || `Empresa ${id}`,
  panel_enabled: true,
  enabled: true,
  commercial_enabled: true,
  theme: {colors: {primary: '#0EA5E9', secondary: '#F97316'}},
  configs: overrides.configs || {},
})

const createProduct = (id, overrides = {}) => ({
  '@id': `/products/${id}`,
  id,
  product: overrides.product || `Produto ${id}`,
  description: overrides.description || '',
  type: overrides.type || 'product',
  price: Number(overrides.price ?? 0),
  quantity: Number(overrides.quantity ?? 1),
  sku: overrides.sku || `SKU-${id}`,
  active: 1,
})

const buildOrderProduct = (product, quantity = 1) => ({
  id: Number(product.id) * 10,
  '@id': `/order_products/${Number(product.id) * 10}`,
  product: {...product},
  quantity,
  price: Number(product.price || 0),
  total: Number(product.price || 0) * Number(quantity || 0),
  order: '/orders/123',
  queue: overridesQueue(product),
})

const overridesQueue = product =>
  product?.queue
    ? {
        '@id': `/product_queues/${product.queue}`,
        id: product.queue,
        queue: 'Cozinha',
      }
    : {
        '@id': '/product_queues/1',
        id: 1,
        queue: 'Cozinha',
      }

const createOpenOrder = ({
  id = 123,
  products = [],
  price = 0,
  orderType = 'cart',
  externalCode = '',
  mainOrderId = null,
  status = {id: 901, status: 'open', realStatus: 'open', '@id': '/statuses/901'},
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
  orderProducts: products.map(product => buildOrderProduct(product, 1)),
})

const createPosMenus = () => ({
  modules: {
    home: {
      id: 'pos-home',
      label: 'Operacao',
      icon: 'shopping-bag',
      menus: [
        {
          id: 'pos-home-orders',
          menuKey: 'orders',
          menuType: 'home',
          label: 'Pedidos',
          route: 'OrderHistoryPage',
          icon: 'shopping-bag',
          color: '#0EA5E9',
          sortOrder: 10,
        },
      ],
    },
    toolbar: {
      id: 'pos-toolbar',
      label: 'Navegacao',
      icon: 'menu',
      menus: [
        {
          id: 'pos-toolbar-home',
          menuKey: 'home',
          menuType: 'toolbar',
          label: 'Home',
          route: 'HomePage',
          icon: 'home',
          color: '#0EA5E9',
          sortOrder: 10,
        },
        {
          id: 'pos-toolbar-orders',
          menuKey: 'orders',
          menuType: 'toolbar',
          label: 'Pedidos',
          route: 'OrderHistoryPage',
          icon: 'shopping-bag',
          color: '#0EA5E9',
          sortOrder: 20,
        },
      ],
    },
  },
})

const OPEN_STATUS = {
  '@id': '/statuses/901',
  id: 901,
  status: 'open',
  realStatus: 'open',
}
const PREPARING_STATUS = {
  '@id': '/statuses/910',
  id: 910,
  status: 'preparing',
  realStatus: 'open',
}
const READY_STATUS = {
  '@id': '/statuses/911',
  id: 911,
  status: 'ready',
  realStatus: 'open',
}

module.exports = {
  OPEN_STATUS,
  PREPARING_STATUS,
  READY_STATUS,
  buildOrderProduct,
  collection,
  createCompany,
  createOpenOrder,
  createPosMenus,
  createProduct,
}
