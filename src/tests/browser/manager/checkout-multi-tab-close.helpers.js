/**
 * Smoke metadata and fixtures for ON CHECKOUT / MANAGER multi-tab close.
 * fluxo: financeiro-cobranca · flowchartIds: [1]
 * Charge path is LinkedOrderSettlementPage → Checkout, not waiter POS charge.
 */

const FLOWCHART_IDS = [1];
const FLUXO = 'financeiro-cobranca';
const ADMIN_FLOWCHART_URL = 'https://admin.controleonline.com/admin/flowcharts/1';

const SMOKE_STEPS = [
  'comandas pendentes',
  'tela CHECKOUT/MANAGER settlement',
  'selecao das comandas',
  'pagamento',
  'order closed',
];

const createTableRoot = ({
  id = 501,
  externalCode = 'Mesa-12',
  price = 40,
  status = 'ready',
} = {}) => ({
  '@id': `/orders/${id}`,
  id,
  app: 'POS',
  orderType: 'table',
  externalCode,
  provider: '/people/3',
  people: '/people/3',
  price,
  payable: price,
  status: {status, realStatus: status === 'closed' ? 'closed' : 'open'},
  context: {externalCode, orderType: 'table'},
  otherInformations: {
    linked_order: {order_type: 'table', input_type: 'manual'},
  },
});

const createTabOrder = ({
  id,
  externalCode,
  mainOrderId = 501,
  price = 20,
  status = 'ready',
} = {}) => ({
  '@id': `/orders/${id}`,
  id,
  app: 'POS',
  orderType: 'tab',
  externalCode,
  mainOrder: `/orders/${mainOrderId}`,
  mainOrderId,
  provider: '/people/3',
  people: '/people/3',
  price,
  payable: price,
  status: {status, realStatus: status === 'closed' ? 'closed' : 'open'},
  context: {externalCode, orderType: 'tab'},
  otherInformations: {
    linked_order: {order_type: 'tab', input_type: 'manual'},
  },
});

const createSaleCart = ({
  id,
  mainOrderId,
  price = 20,
  status = 'ready',
} = {}) => ({
  '@id': `/orders/${id}`,
  id,
  app: 'POS',
  orderType: 'cart',
  mainOrder: `/orders/${mainOrderId}`,
  mainOrderId,
  provider: '/people/3',
  people: '/people/3',
  price,
  payable: price,
  status: {status, realStatus: 'open'},
});

const buildMultiTabSettlementFixture = (overrides = {}) => {
  const table = createTableRoot(overrides.table);
  const tabA = createTabOrder({
    id: 601,
    externalCode: 'Comanda-A',
    mainOrderId: table.id,
    price: 22,
    ...(overrides.tabA || {}),
  });
  const tabB = createTabOrder({
    id: 602,
    externalCode: 'Comanda-B',
    mainOrderId: table.id,
    price: 18,
    ...(overrides.tabB || {}),
  });
  const saleA = createSaleCart({
    id: 701,
    mainOrderId: tabA.id,
    price: tabA.price,
    ...(overrides.saleA || {}),
  });
  const saleB = createSaleCart({
    id: 702,
    mainOrderId: tabB.id,
    price: tabB.price,
    ...(overrides.saleB || {}),
  });

  const orders = [table, tabA, tabB, saleA, saleB];
  const totalPrice = Number(tabA.price || 0) + Number(tabB.price || 0);
  table.price = overrides.table?.price ?? totalPrice;
  table.payable = table.price;

  return {
    flowchartIds: FLOWCHART_IDS,
    fluxo: FLUXO,
    flowchartLinks: [ADMIN_FLOWCHART_URL],
    steps: [...SMOKE_STEPS],
    table,
    tabs: [tabA, tabB],
    sales: [saleA, saleB],
    orders,
    paymentOption: {
      id: 1,
      '@id': '/wallet_payment_types/1',
      paymentType: {id: 1, paymentType: 'Dinheiro'},
      wallet: {id: 101},
    },
  };
};

const buildSmokeManifest = ({
  screenshots = [],
  extra = {},
} = {}) => ({
  flowchartIds: FLOWCHART_IDS,
  fluxo: FLUXO,
  flowchartLinks: [ADMIN_FLOWCHART_URL],
  steps: [...SMOKE_STEPS],
  chargeSurface: 'ON_CHECKOUT_MANAGER',
  excludedSurface: 'waiterPosCharge',
  screenshots,
  ...extra,
});

module.exports = {
  ADMIN_FLOWCHART_URL,
  FLOWCHART_IDS,
  FLUXO,
  SMOKE_STEPS,
  buildMultiTabSettlementFixture,
  buildSmokeManifest,
  createSaleCart,
  createTabOrder,
  createTableRoot,
};
