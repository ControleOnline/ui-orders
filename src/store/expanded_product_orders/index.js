import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";
import Formatter from "@controleonline/ui-common/src/utils/formatter.js";
import { store } from "quasar/wrappers";

export default {
  namespaced: true,
  state: {
    resourceEndpoint: "order_products",
    store: "expanded_product_orders",
    isLoading: false,
    error: "",
    violations: null,
    totalItems: 0,
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
          if (value)
            return {
              value: value["@id"].split("/").pop(),
              label: (value?.sku ? value?.sku + " - " : "") + value?.product,
            };
        },
        saveFormat: function (value) {
          return value ? "/products/" + (value?.value || value) : null;
        },
      },
      {
        inputType: "increase",
        sortable: true,
        editable: false,
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
        name: "price",
        prefix: "R$ ",
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
        prefix: "R$ ",
        label: "total",
        sum: true,
        align: "left",
        format(value) {
          return Formatter.formatMoney(value);
        },
      },
    ],
  },

  actions: actions,
  getters,
  mutations,
};
