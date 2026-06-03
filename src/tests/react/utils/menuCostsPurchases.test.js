/* global test */

const assert = require('node:assert/strict');
const {
  buildPurchaseHistoryLoadedKey,
  buildPurchaseHistoryQuery,
  resolveOrderAttachmentLabel,
  resolvePurchaseOrderLineLabel,
  resolvePurchaseOrderLineQuantity,
  resolvePurchaseOrderLineUnit,
  resolvePurchaseSupplierLabel,
} = require('../../../react/utils/menuCostsPurchases');

test('purchase history query scopes to the company purchase feed', () => {
  const query = buildPurchaseHistoryQuery({
    companyId: 7,
    searchText: ' NF 123 ',
    page: 2,
  });

  assert.equal(query.provider, '/people/7');
  assert.equal(query.orderType, 'purchase');
  assert.equal(query.itemsPerPage, 50);
  assert.equal(query.page, 2);
  assert.equal(query.search, 'NF 123');
});

test('purchase helpers resolve supplier, lines and attachments', () => {
  assert.equal(
    resolvePurchaseSupplierLabel({client: {name: 'Casa do Pão'}}),
    'Casa do Pão',
  );
  assert.equal(
    resolvePurchaseOrderLineLabel({product: {name: 'Óleo de soja'}}),
    'Óleo de soja',
  );
  assert.equal(resolvePurchaseOrderLineQuantity({quantity: '2.5'}), 2.5);
  assert.equal(resolvePurchaseOrderLineUnit({unit: 'lt'}), 'lt');
  assert.equal(
    resolveOrderAttachmentLabel({file: {fileName: 'nf-purchase.pdf'}}),
    'nf-purchase.pdf',
  );
  assert.match(
    buildPurchaseHistoryLoadedKey({companyId: 7, searchText: 'abc'}),
    /7\|purchase-history\|abc\|50\|id\|desc/,
  );
});

