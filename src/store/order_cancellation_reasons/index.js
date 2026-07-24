import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    filters: {},
    resourceEndpoint: 'categories',
    isLoading: false,
    isSaving: false,
    error: '',
    totalItems: 0,
    messages: [],
    message: {},
    summary: {},
    add: true,
    columns: [
      {
        editable: false,
        isIdentity: true,
        sortable: true,
        name: 'id',
        align: 'left',
        label: 'id',
        format: value => `#${value}`,
      },
      {
        editable: true,
        sortable: true,
        name: 'name',
        align: 'left',
        label: 'reason',
        format: value => value,
      },
      {
        editable: true,
        sortable: true,
        name: 'color',
        align: 'left',
        label: 'color',
        inputType: 'color',
        format: value => value,
      },
      {
        editable: true,
        sortable: true,
        name: 'icon',
        align: 'left',
        label: 'icon',
        inputType: 'icon',
        format: value => value,
      },
    ],
  },
  actions,
  getters,
  mutations,
};

