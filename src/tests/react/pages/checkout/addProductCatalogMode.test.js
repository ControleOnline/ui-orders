const {describe, expect, it} = global;

const {
  hasRealCategoryItems,
  resolveShouldListProductsDirectly,
} = require('../../../../react/pages/checkout/utils/addProductCatalogMode');

describe('addProductCatalogMode', () => {
  describe('hasRealCategoryItems', () => {
    it('returns false for non-array', () => {
      expect(hasRealCategoryItems(undefined)).toBe(false);
      expect(hasRealCategoryItems(null)).toBe(false);
    });

    it('returns false for empty list', () => {
      expect(hasRealCategoryItems([])).toBe(false);
    });

    it('ignores all-products sentinel', () => {
      expect(
        hasRealCategoryItems([
          {_isAllProducts: true, id: '__all_products__'},
          {'@id': '__all_products__', name: 'Todos'},
        ]),
      ).toBe(false);
    });

    it('returns true when a real category exists', () => {
      expect(hasRealCategoryItems([{id: 10, name: 'Bebidas'}])).toBe(true);
      expect(
        hasRealCategoryItems([
          {_isAllProducts: true},
          {'@id': '/categories/22', name: 'Lanches'},
        ]),
      ).toBe(true);
    });
  });

  describe('resolveShouldListProductsDirectly', () => {
    it('always lists products in single-item mode', () => {
      expect(
        resolveShouldListProductsDirectly({
          isSingleItemMode: true,
          categoriesLoading: true,
          categoriesFetched: false,
          categoryItems: undefined,
        }),
      ).toBe(true);
    });

    it('keeps Categories while categories are loading', () => {
      expect(
        resolveShouldListProductsDirectly({
          isSingleItemMode: false,
          categoriesLoading: true,
          categoriesFetched: false,
          categoryItems: [],
        }),
      ).toBe(false);
    });

    it('keeps Categories until a fetch has completed (initial empty array is not definitive)', () => {
      expect(
        resolveShouldListProductsDirectly({
          isSingleItemMode: false,
          categoriesLoading: false,
          categoriesFetched: false,
          categoryItems: [],
        }),
      ).toBe(false);

      expect(
        resolveShouldListProductsDirectly({
          isSingleItemMode: false,
          categoriesLoading: false,
          categoriesFetched: false,
          categoryItems: undefined,
        }),
      ).toBe(false);
    });

    it('lists products when categories resolved empty after fetch', () => {
      expect(
        resolveShouldListProductsDirectly({
          isSingleItemMode: false,
          categoriesLoading: false,
          categoriesFetched: true,
          categoryItems: [],
        }),
      ).toBe(true);
    });

    it('keeps Categories when real categories exist after fetch', () => {
      expect(
        resolveShouldListProductsDirectly({
          isSingleItemMode: false,
          categoriesLoading: false,
          categoriesFetched: true,
          categoryItems: [{id: 5, name: 'Pizzas'}],
        }),
      ).toBe(false);
    });
  });
});
