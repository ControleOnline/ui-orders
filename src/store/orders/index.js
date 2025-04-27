import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';
import Formatter from '@controleonline/ui-common/src/utils/formatter.js';
import * as customActions from './customActions';

export default {
  namespaced: true,
  state: {
    item: null,
    items: null,
    resourceEndpoint: 'orders',
    isLoading: false,
    isSaving: false,
    error: '',
    totalItems: 0,
    filters: {},
    reload: false,
    columns: [
      {
        externalFilter: false,
        //filter:false,
        isIdentity: true,
        sortable: true,
        name: 'id',
        label: 'id',
        align: 'left',
        format(value) {
          return '#' + value;
        },
      },
      {
        sortable: true,
        name: 'app',
        editable: true,
        label: 'app',
        align: 'left',
        format(value, column, row) {
          return value;
        },
      },
      {
        sortable: true,
        name: 'orderType',
        editable: false,
        label: 'orderType',
        align: 'left',
        format(value, column, row) {
          return value;
        },
      },
      {
        sortable: true,
        name: 'status',
        align: 'left',
        label: 'status',
        list: 'status/getItems',
        searchParam: 'status',
        externalFilter: false,
        style: function (row) {
          return {color: row?.status?.color};
        },
        format: function (value) {
          return value?.status;
        },

        saveFormat: function (value) {
          return value ? '/statuses/' + (value.value || value) : null;
        },
      },
      {
        sortable: true,
        name: 'client',
        align: 'left',
        label: 'client',
        list: 'people/getItems',
        externalFilter: false,
        format: function (value) {
          return value ? value?.name + ' - ' + value?.alias : ' - ';
        },
        formatList: function (value) {
          if (value && value['@id'])
            return {
              value: value['@id'].split('/').pop(),
              label: value?.name + ' - ' + value?.alias,
            };

          return value;
        },
        saveFormat: function (value) {
          return value ? '/people/' + (value.value || value) : null;
        },
      },
      {
        inputType: 'address',
        sortable: true,
        editable: true,
        name: 'addressDestination',
        align: 'center',
        label: 'addressDestination',
        externalFilter: false,
        list: 'address/getItems',
        saveFormat: function (data) {
          return data ? 'addresses/' + data : null;
        },
        formatList: function (data) {
          if (!data) return null;

          return {
            value: data['@id'].split('/').pop(),
            label: `${data.nickname} - ${data.street.street}, ${data.number} - ${data.street.district.district} - ${data.street.district.city.city} - ${data.street.district.city.state.uf} - ${data.street.cep.cep} - ${data.street.district.city.state.country.countryname}`,
          };
        },
        format: function (data) {
          if (!data) return null;
          return `${data.nickname} - ${data.street.street}, ${data.number} - ${data.street.district.district} - ${data.street.district.city.city} - ${data.street.district.city.state.uf} - ${data.street.cep.cep} - ${data.street.district.city.state.country.countryname}`;
        },
      },
      {
        inputType: 'date-range',
        sortable: true,
        editable: false,
        name: 'orderDate',
        align: 'center',
        label: 'orderDate',
        externalFilter: false,
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
        type: 'range-date',
        name: 'alterDate',
        label: 'alterDate',
        align: 'left',
        saveFormat: function (value) {
          return undefined;
        },
        format: val => (val ? Formatter.formatDateYmdTodmY(val, true) : ''),
      },

      {
        inputType: 'float',
        filterClass: 'col-2 q-pa-xs',
        formClass: 'col-6',
        prefix: 'R$ ',
        filters: false,
        editable: false,
        sortable: true,
        name: 'price',
        align: 'left',
        label: 'price',
        sum: true,
        editFormat(value) {
          return Formatter.formatMoney(value);
        },
        saveFormat(value) {
          return Formatter.formatFloat(value);
        },
        format(value) {
          return Formatter.formatMoney(value);
        },
      },
    ],
  },
  actions: {...actions, ...customActions},
  getters,
  mutations,
};
