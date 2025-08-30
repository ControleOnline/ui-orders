import * as types from "./mutation_types";

export default {
  [types.SET_CUSTOM_PRODUCTS](state, products) {
    state.products = products;
    return "products";
  },

  [types.SET_PRODUCT](state, product) {
    state.product = product;
    return "product";
  },
};
