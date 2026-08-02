import * as customActions from "./actions";
import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";
import Formatter from "@controleonline/ui-common/src/utils/formatter.js";

export default {
  namespaced: true,
  state: {
    item: null,
    items: null,
    resourceEndpoint: "order_products",
    store: "order_products",
    isLoading: false,
    isSaving: false,
    error: "",
    reload: false,
    totalItems: 0,
    summary: {},
    messages: [],
    message: {},
    filters: {},
    columns: [
      {
        isIdentity: true,
        sortable: true,
        editable: false,
        add: false,
        list: "products/getItems",
        name: "product",
        label: "product",
        align: "left",
        format(value, column, row) {
          return (value?.sku ? value?.sku + " - " : "") + value?.product;
        },
        formatList: function (value, column, row) {
          if (value && value["@id"])
            return {
              value: value["@id"].split("/").pop(),
              label: (value?.sku ? value?.sku + " - " : "") + value?.product,
            };
          return value;
        },
        saveFormat: function (value) {
          return value ? "/products/" + (value?.value || value) : null;
        },
      },
      {
        inputType: "increase",
        sortable: true,
        editable: true,
        name: "quantity",
        label: "quantity",
        align: "left",
        format(value, column, row) {
          return parseFloat(value);
        },
      },

      {
        sortable: true,
        editable: false,
        name: "orderProductQueues",
        label: "status",
        align: "left",
        format(value, column, row) {          
          return value && value[0]
            ? value[0].queue?.queue + "/" + value[0].status?.status
            : "---";
        },
      },
      {
        sortable: true,
        editable: false,
        name: "price",
        label: "price",
        align: "left",
        format(value) {
          return Formatter.formatMoney(value);
        },
      },
      {
        sortable: true,
        editable: false,
        name: "total",
        label: "total",
        sum: true,
        align: "left",
        format(value) {
          return Formatter.formatMoney(value);
        },
      },
    ],
  },

  actions: { ...actions, ...customActions },
  getters,
  mutations,
};
