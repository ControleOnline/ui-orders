const {describe, expect, it} = global;

const {
  buildAddProductCatalogRouteParams,
} = require('../../../../react/pages/checkout/utils/addProductCatalogOrderContext');

describe('buildAddProductCatalogRouteParams', () => {
  it('forwards the active POS session id to the catalog route', () => {
    expect(buildAddProductCatalogRouteParams({
      activeOrderId: 72908,
      routeParams: {context: 'products', interactionMode: 'pdv'},
    })).toEqual({
      context: 'products',
      interactionMode: 'pdv',
      orderId: '72908',
    });
  });

  it('resolves an order object returned by the session confirmation', () => {
    expect(buildAddProductCatalogRouteParams({
      activeOrderId: {'@id': '/orders/72909'},
      routeParams: {context: 'products'},
    })).toEqual({
      context: 'products',
      orderId: '72909',
    });
  });

  it('keeps a route order id when no active session id is supplied', () => {
    expect(buildAddProductCatalogRouteParams({
      routeParams: {context: 'products', id: 72908},
    })).toEqual({
      context: 'products',
      id: 72908,
      orderId: '72908',
    });
  });
});
