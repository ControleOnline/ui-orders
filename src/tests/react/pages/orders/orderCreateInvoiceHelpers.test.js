import {
  getEntityId,
  resolveOrderIri,
  resolveOrderPrice,
  extractCollectionItems,
  buildStatusIriFromId,
} from '../../../../react/pages/orders/orderCreateInvoiceHelpers';

describe('orderCreateInvoiceHelpers', () => {
  it('resolves entity id from object and iri', () => {
    expect(getEntityId({ id: 12 })).toBe(12);
    expect(getEntityId('/orders/99')).toBe(99);
  });

  it('builds order iri', () => {
    expect(resolveOrderIri({ '@id': '/orders/7' })).toBe('/orders/7');
    expect(resolveOrderIri({ id: 5 })).toBe('/orders/5');
  });

  it('resolves order price and requires value for invoice', () => {
    expect(resolveOrderPrice({ price: 17.5 })).toBe(17.5);
    expect(resolveOrderPrice({ price: 0 })).toBe(0);
  });

  it('extracts collection members', () => {
    expect(extractCollectionItems({ 'hydra:member': [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });

  it('builds status iri', () => {
    expect(buildStatusIriFromId(3)).toBe('/statuses/3');
  });
});
