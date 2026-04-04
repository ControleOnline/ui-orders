import * as customActions from "./actions";
import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";
import custom_mutations from "./mutations";

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    customProducts: [],
    product: {},
    resourceEndpoint: "orders",
    isLoading: false,
    isSaving: false,
    error: "",
    payable: 0,
    totalItems: 0,
    summary: {},
    messages: [],
    message: {},
    filters: {},
    reload: false,
  },
  actions: { ...actions, ...customActions },
  getters,
  mutations: { ...custom_mutations, ...mutations },
};
