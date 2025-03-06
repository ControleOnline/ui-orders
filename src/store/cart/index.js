import * as actions from "./actions";
import * as getters from "./getters";
import mutations from "./mutations";

export default {
  namespaced: true,
  state: {
    order: {},
    customProducts: [],
    product: {},
    isLoading: false,
    error: "",
    violations: null,
  },
  actions,
  getters,
  mutations,
};
