import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";

export default {
  namespaced: true,
  state: {
    item: null,
    items: null,
    resourceEndpoint: "order_invoices",
    store: "order_invoices",
    isLoading: false,
    isSaving: false,
    error: "",
    totalItems: 0,
    summary: {},
    messages: [],
    message: {},
    filters: {},
    columns: [],
  },

  actions,
  getters,
  mutations,
};
