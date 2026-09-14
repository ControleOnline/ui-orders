const packageJson = require('../../../../../../../package.json');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'API-TOKEN, APP-DOMAIN, DEVICE, ACCEPT, CONTENT-TYPE, X-Requested-With',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

const APP_VERSION = packageJson?.version || '1.0.0';
const SINGLE_ITEM_SCREENSHOT_DIR = require('path').join(
  __dirname,
  'screenshots',
  'single-item-official',
);

const LAVEGO_THEME_COLORS = {
  primary: '#FEBC1D',
  background: '#F3F7FB',
  text: '#111827',
  textSecondary: '#475569',
  border: '#D7E1EC',
  cardBackground: '#FFFFFF',
  cardBorder: '#D7E1EC',
  cardText: '#111827',
  cardShadow: '#0F172A',
  checkboxBorder: '#FEBC1D',
  checkboxSelectedBackground: '#000000',
  checkboxSelectedMark: '#FEBC1D',
  buttonBackground: '#000000',
  buttonText: '#FEBC1D',
};

const createRegisteredMedia = label => {
  return {
    id: `media-${label}`,
    file: {
      url: `https://media.test/service-${label}.svg`,
    },
  };
};

const jsonHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'application/ld+json; charset=utf-8',
});

const textHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'text/css; charset=utf-8',
});

const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  summary: {},
});

const createFakeSession = ({
  userId = 7,
  companyId = 3,
  apiKey = 'test-api-key',
  deviceId = 'web-7',
} = {}) => ({
  id: userId,
  people: `/people/${userId}`,
  api_key: apiKey,
  token: apiKey,
  active: 1,
  mycompany: companyId,
  deviceId,
});

const createCompany = (id, overrides = {}) => ({
  id,
  name: overrides.name || `Empresa ${id}`,
  alias: overrides.alias || `Empresa ${id}`,
  panel_enabled: overrides.panel_enabled !== undefined ? overrides.panel_enabled : true,
  enabled: overrides.enabled !== undefined ? overrides.enabled : true,
  commercial_enabled:
    overrides.commercial_enabled !== undefined ? overrides.commercial_enabled : true,
  theme:
    overrides.theme || {
      colors: {
        primary: '#0EA5E9',
        secondary: '#F97316',
      },
    },
  configs: overrides.configs || {},
});

const createPeopleSearchResult = (id, overrides = {}) => ({
  '@id': `/people/${id}`,
  id,
  name: overrides.name || `Pessoa ${id}`,
  alias: overrides.alias || '',
  document: overrides.document || [
    {
      documentType: {
        documentType: 'CPF',
      },
      document: overrides.cpf || '12345678901',
    },
  ],
});

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
  productFiles: Array.isArray(overrides.productFiles) ? overrides.productFiles : [],
});

const buildOrderProduct = (product, quantity = 1) => ({
  id: Number(product.id) * 10,
  '@id': `/order_products/${Number(product.id) * 10}`,
  product: { ...product },
  quantity,
  price: Number(product.price || 0),
  total: Number(product.price || 0) * Number(quantity || 0),
  order: '/orders/123',
});

const createOpenOrder = ({id = 123, products = [], price = 0}) => ({
  '@id': `/orders/${id}`,
  id,
  app: 'POS',
  orderType: 'cart',
  provider: '/people/3',
  people: '/people/3',
  status: {
    '@id': '/statuses/901',
    id: 901,
    status: 'open',
    realStatus: 'open',
  },
  price: Number(price || 0),
  payable: Number(price || 0),
  orderProducts: products.map(product => buildOrderProduct(product, 1)),
});

const createLoyaltySnapshotCard = ({
  cardId = 600,
  providerId = 3,
  providerAlias = 'Centro',
  requiredSales = 3,
  stampIds = [],
} = {}) => ({
  provider: {
    id: providerId,
    name: providerAlias,
    alias: providerAlias,
  },
  card: {
    '@id': `/orders/${cardId}`,
    id: cardId,
    orderType: 'fidelity',
  },
  requiredSales,
  stamps: stampIds.map(stampId => ({
    '@id': `/orders/${stampId}`,
    id: stampId,
    orderType: 'sale',
  })),
});

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
        {
          id: 'pos-home-cash',
          menuKey: 'cash_register',
          menuType: 'home',
          label: 'Caixa',
          route: 'CashRegisterIndex',
          icon: 'credit-card',
          color: '#4682B4',
          sortOrder: 20,
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
        {
          id: 'pos-toolbar-cash',
          menuKey: 'cash_register',
          menuType: 'toolbar',
          label: 'Caixa',
          route: 'CashRegisterIndex',
          icon: 'credit-card',
          color: '#4682B4',
          sortOrder: 30,
        },
        {
          id: 'pos-toolbar-profile',
          menuKey: 'profile',
          menuType: 'toolbar',
          label: 'Perfil',
          route: 'ProfilePage',
          icon: 'user',
          color: '#64748B',
          sortOrder: 40,
        },
      ],
    },
  },
});

const createPaymentOption = ({
  id,
  walletId,
  walletLabel,
  paymentTypeLabel,
  paymentCode = '',
}) => ({
  '@id': `/wallet_payment_types/${id}`,
  id,
  wallet: {
    '@id': `/wallets/${walletId}`,
    id: walletId,
    wallet: walletLabel,
  },
  paymentType: {
    '@id': `/payment_types/${id}`,
    id,
    paymentType: paymentTypeLabel,
    name: paymentTypeLabel,
  },
  paymentCode,
});

const buildRemotePaymentResultMessage = ({
  invoiceId,
  orderId,
  paidAmount,
  payment,
  requestKey,
  targetDeviceId,
  targetDeviceLabel,
  targetGateway,
}) => ({
  destination: 'web-7',
  store: 'invoice',
  action: 'pay-result',
  requestKey,
  status: 'success',
  order: String(orderId || '').replace(/\D/g, ''),
  total: Number(paidAmount || 0),
  paidAmount: Number(paidAmount || 0),
  paymentLabel: payment?.paymentType?.paymentType || 'Pagamento',
  targetDeviceId,
  targetDeviceLabel,
  targetGateway,
  invoice: {
    '@id': `/invoices/${invoiceId}`,
    id: invoiceId,
    dueDate: '2026-06-11T00:00:00.000Z',
    status: '/statuses/902',
    destinationWallet: payment?.wallet?.['@id'] || '/wallets/102',
    paymentType: payment?.paymentType?.['@id'] || '/payment_types/2',
    price: Number(paidAmount || 0),
    receiver: '/people/3',
    order: `/orders/${String(orderId || '').replace(/\D/g, '')}`,
  },
});
module.exports = {
  API_ORIGIN,
  APP_VERSION,
  CORS_HEADERS,
  LAVEGO_THEME_COLORS,
  SINGLE_ITEM_SCREENSHOT_DIR,
  buildOrderProduct,
  buildRemotePaymentResultMessage,
  collection,
  createCompany,
  createFakeSession,
  createLoyaltySnapshotCard,
  createPaymentOption,
  createPeopleSearchResult,
  createPosMenus,
  createProduct,
  createRegisteredMedia,
  createOpenOrder,
  jsonHeaders,
  textHeaders,
};
