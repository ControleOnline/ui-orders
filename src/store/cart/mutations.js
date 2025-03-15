import * as types from './mutation_types';

export default {
  [types.SET_ERROR](state, error) {
    state.error = error || null;
    return 'error';
  },

  [types.SET_ISLOADING](state, isLoading = true) {
    state.isLoading = isLoading || false;
    return 'isLoading';
  },

  [types.SET_ISSAVING](state, isSaving = true) {
    state.isSaving = isSaving || false;
    return 'isSaving';
  },

  [types.SET_ORDER](state, order) {
    state.order = order || {};
    return 'order';
  },

  [types.SET_CUSTOM_PRODUCTS](state, customProducts) {
    state.customProducts = customProducts || [];
    return 'customProducts';
  },
  [types.SET_PRODUCT](state, product) {
    state.product = product || [];
    return 'product';
  },
  [types.SET_RELOAD](state, reload) {
    state.reload = reload || false;
    return 'reload';
  },
};
