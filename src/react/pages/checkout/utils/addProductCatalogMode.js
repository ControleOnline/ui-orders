/** Same id as ALL_PRODUCTS_SENTINEL_ID in ui-products categorySentinels. */
const ALL_PRODUCTS_SENTINEL_ID = '__all_products__';

/**
 * Decide whether AddProductScreen should render ProductsPage instead of Categories.
 * - single-item / POS single mode always lists products
 * - when categories finished loading and there are no real categories, list products
 *   so the UI never shows a blank "Empty" state in PDV.
 */
export function hasRealCategoryItems(categoryItems) {
  if (!Array.isArray(categoryItems)) {
    return false;
  }

  return categoryItems.some(item => {
    if (!item || item?._isAllProducts) {
      return false;
    }
    const id = item?.id ?? item?.['@id'];
    if (id == null || String(id) === '') {
      return false;
    }
    return String(id) !== ALL_PRODUCTS_SENTINEL_ID;
  });
}

export function resolveShouldListProductsDirectly({
  isSingleItemMode = false,
  categoriesLoading = false,
  categoryItems,
} = {}) {
  if (isSingleItemMode) {
    return true;
  }

  if (categoriesLoading) {
    return false;
  }

  if (!Array.isArray(categoryItems)) {
    return false;
  }

  return !hasRealCategoryItems(categoryItems);
}
