import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";
import Formatter from "@controleonline/ui-common/src/utils/formatter.js";


export default {
  namespaced: true,
  state: {
    resourceEndpoint: "orders",
    isLoading: false,
    error: "",
    violations: null,
    totalItems: 0,
    filters: {},
    columns: [
      {
        externalFilter:true,
        //filter:false,
        isIdentity: true,
        sortable: true,
        name: "id",
        label: "id",
        align: "left",
        format(value) {
          return "#" + value;
        },
      },
      {
        sortable: true,
        name: "app",
        editable: true,
        label: "app",
        align: "left",
        format(value, column, row) {
          return value;
        },
      },
      {
        sortable: true,
        name: "orderType",
        editable: false,
        label: "orderType",
        align: "left",
        format(value, column, row) {
          return value;
        },
      },
      {
        sortable: true,
        name: "status",
        align: "left",
        label: "status",
        list: "status/getItems",
        searchParam: "status",
        externalFilter: true,
        style: function (row) {
          return { color: row.status.color };
        },
        format: function (value) {
          return value?.status;
        },
        formatList: function (value) {
          if (value)
            return {
              value: value["@id"].split("/").pop(),
              label: value?.status,
            };
        },
        saveFormat: function (value) {
          return value ? "/statuses/" + (value.value || value) : null;
        },
      },
      {
        sortable: true,
        name: "client",
        align: "left",
        label: "client",
        list: "people/getItems",
        externalFilter: false,
        format: function (value) {
          return value ? value?.name + " - " + value?.alias : " - ";
        },
        formatList: function (value) {
          if (value)
            return {
              value: value["@id"].split("/").pop(),
              label: value?.name + " - " + value?.alias,
            };
        },
        saveFormat: function (value) {
          return value ? "/people/" + (value.value || value) : null;
        },
      },
      {
        externalFilter: true,
        inputType: "date-range",
        sortable: true,
        editable: false,
        name: "orderDate",
        align: "center",
        label: "orderDate",
        externalFilter: true,
        saveFormat: function (value) {
          return undefined;
        },
        format: function (value) {
          return Formatter.formatDateYmdTodmY(value);
        },
      },

      {
        editable: false,
        sortable: true,
        type: "range-date",
        name: "alterDate",
        label: "alterDate",
        align: "left",
        saveFormat: function (value) {
          return undefined;
        },
        format: (val) => (val ? Formatter.formatDateYmdTodmY(val, true) : ""),
      },
    ],
  },
  actions: actions,
  getters,
  mutations,
};
