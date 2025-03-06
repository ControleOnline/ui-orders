import * as types from "./mutation_types";

export default {
  [types.SET_ERROR](state, error) {
    state.error = error || null;
  },

  [types.SET_ISLOADING](state, isLoading = true) {
    state.isLoading = isLoading || false;
  },

  [types.SET_ISSAVING](state, isSaving = true) {
    state.isSaving = isSaving || false;
  },

  [types.SET_VIOLATIONS](state, violations) {
    state.violations = violations || null;
  },

  [types.SET_ORDER](state, order) {
    state.order = order || {};
  },

  [types.SET_CUSTOM_PRODUCTS](state, customProducts) {
    state.customProducts = customProducts || [];
  },
  [types.SET_PRODUCT](state, product) {
    state.product = product || [];
  },
};