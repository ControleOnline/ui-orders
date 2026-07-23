import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";
import Formatter from "@controleonline/ui-common/src/utils/formatter.js";
import * as customActions from "./customActions";

export const ORDER_CHANNEL_OPTIONS = [
  {value: "POS", label: "POS"},
  {value: "Food99", label: "Food99"},
  {value: "iFood", label: "iFood"},
  {value: "SHOP", label: "SHOP"},
];

export default {
  namespaced: true,
  state: {
    item: null,
    items: null,
    resourceEndpoint: "orders",
    isLoading: false,
    isSaving: false,
    payable: 0,
    error: "",
    totalItems: 0,
    summary: {},
    debug: {},
    isLoadingList: false,
    loadedKey: '',
    loadedAt: 0,
    add: true,
    messages: [],
    message: {},
    filters: {},
    reload: false,
    columns: [
      {
        externalFilter: false,
        //filter:false,
        isIdentity: true,
        sortable: true,
        editable: false,
        name: "id",
        label: "id",
        align: "left",
        defaultSort: {
          direction: "desc",
        },
        to: function (value) {
          return {
            name: 'OrderDetails',
            params: { id: value },
          };
        },
        format(value) {
          return "#" + value;
        },
      },
      {
        sortable: true,
        name: "app",
        editable: true,
        label: "app",
        externalFilter: true,
        /*
         * @agents
         * Order channels are fixed application origins, not values inferred
         * from the current page of orders or report summary.
         */
        list: ORDER_CHANNEL_OPTIONS,
        align: "left",
        format(value, _column, _row) {
          return value;
        },
      },
      {
        sortable: true,
        name: "orderType",
        editable: false,
        label: "orderType",
        align: "left",
        format(value, _column, _row) {
          return value;
        },
      },
      {
        sortable: true,
        sortField: "status.status",
        name: "status",
        align: "left",
        label: "status",
        list: "status/getItems",
        /*
         * @agents
         * Order status filters must load only order-context statuses when the
         * default list selector opens; do not prefetch or fetch all statuses in
         * the screen.
         */
        listRequestParams: {context: "order"},
        emptyOptionLabel: "all",
        searchParam: "status",
        externalFilter: true,
        style: function (row) {
          return { color: row?.status?.color };
        },
        format: function (value) {
          return value?.status;
        },

        saveFormat: function (value) {
          return value ? "/statuses/" + (value.value || value) : null;
        },
      },
      {
        sortable: true,
        sortField: "client.name",
        name: "client",
        align: "left",
        label: "client",
        list: "people/getItems",
        externalFilter: false,
        format: function (value) {
          return value ? value?.name + " - " + value?.alias : " - ";
        },
        formatList: function (value) {
          if (value && value["@id"])
            return {
              value: value["@id"].split("/").pop(),
              label: value?.name + " - " + value?.alias,
            };

          return value;
        },
        saveFormat: function (value) {
          return value ? "/people/" + (value.value || value) : null;
        },
      },
      {
        inputType: "address",
        sortable: true,
        editable: true,
        name: "addressDestination",
        show: false,
        align: "center",
        label: "addressDestination",
        externalFilter: false,
        list: "address/getItems",
        saveFormat: function (data) {
          return data ? "addresses/" + data : null;
        },
        formatList: function (data) {
          if (!data) return null;

          return {
            value: data["@id"].split("/").pop(),
            label: `${data.nickname} - ${data.street.street}, ${data.number} - ${data.street.district.district} - ${data.street.district.city.city} - ${data.street.district.city.state.uf} - ${data.street.cep.cep} - ${data.street.district.city.state.country.countryname}`,
          };
        },
        format: function (data) {
          if (!data) return null;
          return `${data.nickname} - ${data.street.street}, ${data.number} - ${data.street.district.district} - ${data.street.district.city.city} - ${data.street.district.city.state.uf} - ${data.street.cep.cep} - ${data.street.district.city.state.country.countryname}`;
        },
      },
      {
        inputType: "date-range",
        sortable: true,
        editable: false,
        name: "orderDate",
        show: false,
        align: "center",
        label: "orderDate",
        externalFilter: false,
        saveFormat: function (_value) {
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
        externalFilter: true,
        inputType: "date-range",
        name: "alterDate",
        label: "period",
        align: "left",
        saveFormat: function (_value) {
          return undefined;
        },
        format: (val) => (val ? Formatter.formatDateYmdTodmY(val, true) : ""),
      },

      {
        inputType: "float",
        filterClass: "col-2 q-pa-xs",
        formClass: "col-6",
        filters: false,
        editable: false,
        sortable: true,
        name: "price",
        align: "left",
        label: "price",
        sum: true,
        editFormat(value) {
          return Formatter.formatMoney(value);
        },
        saveFormat(_value) {
          return Formatter.formatFloat(_value);
        },
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
