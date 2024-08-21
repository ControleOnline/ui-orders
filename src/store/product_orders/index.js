import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";
import Formatter from "@controleonline/ui-common/src/utils/formatter.js";


export default {
  namespaced: true,
  state: {
    resourceEndpoint: "order_products",
    isLoading: false,
    error: "",
    violations: null,
    totalItems: 0,
    filters: {},
    columns: [
      {
        externalFilter: false,
        //filter:false,
        isIdentity: true,
        sortable: true,
        editable: false,
        to: function (value) {
          return {
            name: "ProductDetails",
            params: { id: value },
          };
        },
        name: "id",
        label: "id",
        align: "left",
        format(value) {
          return "#" + value;
        },
      },
      {
        sortable: true,
        editable: false,
        add: false,
        list: "products/getItems",
        name: "product",
        label: "product",
        align: "left",
        format(value, column, row) {
          return (row.product?.sku ? row.product?.sku + ' - ' : '') + row.product.product;
        },
        formatList: function (value, column, row) {
          if (value)
            return {
              value: value["@id"].split("/").pop(),
              label: (value?.sku ? value?.sku + ' - ' : '') + value?.product,
            };
        },
        saveFormat: function (value) {
          return value ? "/products/" + (value?.value || value) : null;
        },
      },
      {
        sortable: true,
        editable: true,
        name: "quantity",
        label: "quantity",
        align: "left",
        format(value, column, row) {
          return row.quantity;
        },
      },
      {
        sortable: true,
        editable: true,
        name: "price",
        label: "price",
        align: "left",
        format(value, column, row) {
          return value;
        },
      },
      {
        sortable: true,
        editable: false,
        name: "total",
        label: "total",
        sum: true,
        align: "left",
        format(value, column, row) {
          value = parseFloat(row.price) * parseFloat(row.quantity);
          return parseFloat(value);
        },
      },      
    ],
  },
  actions: actions,
  getters,
  mutations,
};
